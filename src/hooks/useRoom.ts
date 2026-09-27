'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataConnection, Peer, PeerOptions } from 'peerjs';
import {
  PROTOCOL_VERSION,
  ROOM_PREFIX,
  generateRoomCode,
  validateMessage,
  type Message,
  type RejectReason,
  type Role,
} from '@/lib/net/protocol';
import { MAX_PLAYERS } from '@/lib/game-state';

// Rooms use PeerJS's free public broker only to introduce the phones; the game itself runs over
// direct WebRTC data channels (PeerJS's public TURN relay is the fallback when a direct path is
// blocked, e.g. on some mobile networks). The host holds one connection per guest phone.

export type RoomStatus =
  | 'idle'
  | 'connecting'
  | 'waiting' // host: room open, nobody connected
  | 'connected' // host: at least one phone connected; guest: connected to the host
  | 'reconnecting' // guest: lost the host, retrying
  | 'error';

export interface GuestHello {
  role: Role;
  name: string;
  avatarId: number;
}

export type HelloMessage = Extract<Message, { t: 'hello' }>;

/** Decides whether the host lets a phone in; returns a reason to turn it away, or null. */
export type Admit = (hello: HelloMessage) => RejectReason | null;

const MAX_MESSAGES_PER_SECOND = 400;
const RECONNECT_INTERVAL_MS = 2000;
const RECONNECT_ATTEMPTS = 15;
// Connections must introduce themselves quickly; strangers can't pile up unanswered ones.
const HELLO_TIMEOUT_MS = 5000;
const MAX_PENDING_CONNECTIONS = 3;
const MAX_GUEST_CONNECTIONS = MAX_PLAYERS - 1 + 4;

const REJECT_TEXT: Record<RejectReason, string> = {
  full: 'That room is full.',
  started: 'That game has already started. Ask the host to start a new one, or join as a TV screen to watch.',
  version: 'The host is on a different version. Refresh every phone and try again.',
};

// Optional self-hosted PeerJS server (e.g. `npx peer --port 9000`). Unset = PeerJS's free cloud.
function brokerOptions(): PeerOptions {
  const host = process.env.NEXT_PUBLIC_PEER_HOST;
  if (!host) return { debug: 0 };
  return {
    debug: 0,
    host,
    port: Number(process.env.NEXT_PUBLIC_PEER_PORT) || 443,
    path: process.env.NEXT_PUBLIC_PEER_PATH || '/',
    secure: process.env.NEXT_PUBLIC_PEER_SECURE !== 'false',
  };
}

function clientId(): string {
  try {
    const existing = sessionStorage.getItem('wtp-client-id');
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem('wtp-client-id', id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * @param onMessage receives every validated message; `from` is the sending phone's client id
 *   on the host (taken from the connection, never from the message), or null on a guest.
 * @param admit host only: rules for letting a phone in.
 */
export function useRoom(onMessage: (msg: Message, from: string | null) => void, admit: Admit) {
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  /** Host: client ids of phones currently connected. */
  const [connected, setConnected] = useState<string[]>([]);

  const peerRef = useRef<Peer | null>(null);
  const hostConnRef = useRef<DataConnection | null>(null); // guest → host
  const guestConnsRef = useRef(new Map<string, DataConnection>()); // host → guests
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUser = useRef(false);
  const onMessageRef = useRef(onMessage);
  const admitRef = useRef(admit);
  useEffect(() => {
    onMessageRef.current = onMessage;
    admitRef.current = admit;
  });

  const fail = useCallback((message: string) => {
    setError(message);
    setStatus('error');
  }, []);

  const refreshConnected = useCallback(() => {
    const ids = [...guestConnsRef.current.entries()].filter(([, c]) => c.open).map(([id]) => id);
    setConnected(ids);
    setStatus(ids.length ? 'connected' : 'waiting');
  }, []);

  // Wires up an open connection: rate limiting, validation, then dispatch.
  const attach = useCallback(
    (conn: DataConnection, from: string | null, onClose: () => void, filter?: (msg: Message) => boolean) => {
      let windowStart = Date.now();
      let count = 0;
      conn.on('data', (raw) => {
        const now = Date.now();
        if (now - windowStart > 1000) {
          windowStart = now;
          count = 0;
        }
        if (++count > MAX_MESSAGES_PER_SECOND) return;
        const msg = validateMessage(raw);
        if (!msg) return;
        if (filter && !filter(msg)) return;
        onMessageRef.current(msg, from);
      });
      conn.on('close', onClose);
      conn.on('error', onClose);
    },
    [],
  );

  /** Guest: send to the host. */
  const send = useCallback((msg: Message) => {
    const conn = hostConnRef.current;
    if (conn?.open) conn.send(msg);
  }, []);

  /** Host: send to one phone. */
  const sendTo = useCallback((id: string, msg: Message) => {
    const conn = guestConnsRef.current.get(id);
    if (conn?.open) conn.send(msg);
  }, []);

  /** Host: send to every connected phone; `build` may tailor or skip (null) per phone. */
  const broadcast = useCallback((build: Message | ((id: string) => Message | null)) => {
    for (const [id, conn] of guestConnsRef.current) {
      if (!conn.open) continue;
      const msg = typeof build === 'function' ? build(id) : build;
      if (msg) conn.send(msg);
    }
  }, []);

  /** Host: disconnect a phone. */
  const kick = useCallback(
    (id: string, reason?: RejectReason) => {
      const conn = guestConnsRef.current.get(id);
      if (!conn) return;
      if (reason && conn.open) conn.send({ t: 'reject', reason } satisfies Message);
      guestConnsRef.current.delete(id);
      setTimeout(() => conn.close(), 200);
      refreshConnected();
    },
    [refreshConnected],
  );

  const leave = useCallback(() => {
    closedByUser.current = true;
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    hostConnRef.current?.close();
    for (const conn of guestConnsRef.current.values()) conn.close();
    guestConnsRef.current.clear();
    peerRef.current?.destroy();
    hostConnRef.current = null;
    peerRef.current = null;
    setConnected([]);
    setStatus('idle');
    setError(null);
    setCode(null);
    setIsHost(false);
  }, []);

  const host = useCallback(
    async (attempt = 0): Promise<void> => {
      closedByUser.current = false;
      setIsHost(true);
      setError(null);
      setStatus('connecting');
      const { Peer } = await import('peerjs');
      const roomCode = generateRoomCode();
      const peer = new Peer(ROOM_PREFIX + roomCode, brokerOptions());
      peerRef.current = peer;

      peer.on('open', () => {
        setCode(roomCode);
        setStatus('waiting');
      });
      peer.on('disconnected', () => {
        if (!closedByUser.current && !peer.destroyed) peer.reconnect();
      });
      peer.on('error', (err) => {
        if (err.type === 'unavailable-id' && attempt < 3) {
          peer.destroy();
          void host(attempt + 1);
        } else if (err.type !== 'peer-unavailable') {
          fail('Could not reach the matchmaking server. Check your connection and try again.');
        }
      });

      let pending = 0;
      peer.on('connection', (conn) => {
        // The joining side picks the encoding; only the default (chunked binary) is expected.
        if (conn.serialization !== 'binary' || pending >= MAX_PENDING_CONNECTIONS) {
          conn.close();
          return;
        }
        pending++;
        let settled = false;
        let accepted: string | null = null;
        const settle = () => {
          if (!settled) {
            settled = true;
            pending--;
          }
        };
        const helloTimer = setTimeout(() => {
          if (!accepted) conn.close();
          settle();
        }, HELLO_TIMEOUT_MS);
        const reject = (reason: RejectReason) => {
          conn.send({ t: 'reject', reason } satisfies Message);
          setTimeout(() => conn.close(), 200);
        };

        conn.on('open', () => {
          attach(
            conn,
            null, // replaced by the real id once the phone has said hello
            () => {
              clearTimeout(helloTimer);
              settle();
              if (accepted && guestConnsRef.current.get(accepted) === conn) {
                guestConnsRef.current.delete(accepted);
                if (!closedByUser.current) refreshConnected();
              }
            },
            (msg) => {
              if (accepted) {
                if (msg.t === 'hello') return false;
                // Hand the message on with the sender's id from this connection.
                onMessageRef.current(msg, accepted);
                return false;
              }
              if (msg.t !== 'hello') return false;
              if (msg.v !== PROTOCOL_VERSION) {
                reject('version');
                return false;
              }
              const returning = guestConnsRef.current.has(msg.clientId);
              if (!returning && guestConnsRef.current.size >= MAX_GUEST_CONNECTIONS) {
                reject('full');
                return false;
              }
              const verdict = admitRef.current(msg);
              if (verdict) {
                reject(verdict);
                return false;
              }
              accepted = msg.clientId;
              clearTimeout(helloTimer);
              settle();
              // A returning phone's new connection replaces its old one, which may not have
              // noticed the drop yet.
              const stale = guestConnsRef.current.get(msg.clientId);
              guestConnsRef.current.set(msg.clientId, conn);
              if (stale && stale !== conn) stale.close();
              refreshConnected();
              onMessageRef.current(msg, msg.clientId);
              return false;
            },
          );
        });
      });
    },
    [attach, fail, refreshConnected],
  );

  const join = useCallback(
    async (roomCode: string, hello: GuestHello) => {
      closedByUser.current = false;
      setIsHost(false);
      setError(null);
      setStatus('connecting');
      setCode(roomCode);
      const { Peer } = await import('peerjs');
      const peer = new Peer(brokerOptions());
      peerRef.current = peer;
      let everConnected = false;
      // Set once the host has admitted us (sent the lobby); only then is "full" worth retrying.
      let admitted = false;
      let attempts = 0;

      const connect = () => {
        if (closedByUser.current || peer.destroyed) return;
        const conn = peer.connect(ROOM_PREFIX + roomCode, { reliable: true });
        conn.on('open', () => {
          everConnected = true;
          attempts = 0;
          hostConnRef.current = conn;
          conn.send({ t: 'hello', v: PROTOCOL_VERSION, clientId: clientId(), ...hello } satisfies Message);
          setStatus('connected');
        });
        attach(
          conn,
          null,
          () => {
            if (hostConnRef.current !== conn || closedByUser.current) return;
            hostConnRef.current = null;
            retry();
          },
          (msg) => {
            if (msg.t === 'lobby') admitted = true;
            if (msg.t === 'reject') {
              // While reconnecting, "full" usually means the host still holds our old connection.
              if (msg.reason === 'full' && admitted) {
                conn.close();
                return false;
              }
              closedByUser.current = true;
              fail(REJECT_TEXT[msg.reason]);
              return false;
            }
            return true;
          },
        );
      };

      const retry = () => {
        if (closedByUser.current) return;
        if (++attempts > RECONNECT_ATTEMPTS) {
          fail('Lost the connection to the host.');
          return;
        }
        setStatus('reconnecting');
        reconnectTimer.current = setTimeout(connect, RECONNECT_INTERVAL_MS);
      };

      peer.on('open', connect);
      peer.on('disconnected', () => {
        if (!closedByUser.current && !peer.destroyed) peer.reconnect();
      });
      peer.on('error', (err) => {
        if (err.type === 'peer-unavailable') {
          if (everConnected) retry();
          else fail('No room with that code. Check the code and try again.');
        } else if (!everConnected) {
          fail('Could not reach the matchmaking server. Check your connection and try again.');
        }
      });
    },
    [attach, fail],
  );

  useEffect(
    () => () => {
      closedByUser.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      peerRef.current?.destroy();
    },
    [],
  );

  const hostRoom = useCallback(() => host(0), [host]);
  return useMemo(
    () => ({ status, error, code, isHost, connected, host: hostRoom, join, send, sendTo, broadcast, kick, leave }),
    [status, error, code, isHost, connected, hostRoom, join, send, sendTo, broadcast, kick, leave],
  );
}

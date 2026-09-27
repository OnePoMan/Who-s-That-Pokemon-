'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataConnection, Peer, PeerOptions } from 'peerjs';
import {
  PROTOCOL_VERSION,
  ROOM_PREFIX,
  generateRoomCode,
  validateMessage,
  type Message,
} from '@/lib/net/protocol';

// Rooms use PeerJS's free public broker only to introduce the two phones; the game itself runs
// over a direct WebRTC data channel (PeerJS's public TURN relay is the fallback when a direct
// path is blocked, e.g. on some mobile networks).

export type RoomStatus =
  | 'idle'
  | 'connecting'
  | 'waiting' // host: room open, no guest yet
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface GuestHello {
  name: string;
  avatarId: number;
}

const MAX_MESSAGES_PER_SECOND = 400;

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
const RECONNECT_INTERVAL_MS = 2000;
const RECONNECT_ATTEMPTS = 15;
// Connections must introduce themselves quickly; strangers can't pile up unanswered ones.
const HELLO_TIMEOUT_MS = 5000;
const MAX_PENDING_CONNECTIONS = 3;

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

export function useRoom(onMessage: (msg: Message) => void) {
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const guestClientRef = useRef<string | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUser = useRef(false);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  const fail = useCallback((message: string) => {
    setError(message);
    setStatus('error');
  }, []);

  // Wires up an open connection: validation, rate limiting and dispatch to onMessage.
  const attach = useCallback((conn: DataConnection, onClose: () => void, filter?: (msg: Message) => boolean) => {
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
      onMessageRef.current(msg);
    });
    conn.on('close', onClose);
    conn.on('error', onClose);
  }, []);

  const send = useCallback((msg: Message) => {
    const conn = connRef.current;
    if (conn?.open) conn.send(msg);
  }, []);

  const leave = useCallback(() => {
    closedByUser.current = true;
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    connRef.current?.close();
    peerRef.current?.destroy();
    connRef.current = null;
    peerRef.current = null;
    guestClientRef.current = null;
    setStatus('idle');
    setError(null);
    setCode(null);
    setIsHost(false);
  }, []);

  const host = useCallback(async (attempt = 0): Promise<void> => {
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
      conn.on('close', () => {
        clearTimeout(helloTimer);
        settle();
      });
      let accepted = false;
      conn.on('open', () => {
        attach(
          conn,
          () => {
            if (connRef.current === conn && !closedByUser.current) {
              connRef.current = null;
              setStatus('reconnecting');
            }
          },
          (msg) => {
            if (accepted) return msg.t !== 'hello';
            if (msg.t !== 'hello') return false;
            if (msg.v !== PROTOCOL_VERSION) {
              conn.send({ t: 'reject', reason: 'version' } satisfies Message);
              setTimeout(() => conn.close(), 200);
              return false;
            }
            // One guest per room. The same guest may come back after a dropped connection, in
            // which case the new connection replaces the old one (which may not have noticed
            // the drop yet).
            const known = guestClientRef.current;
            const returning = known === msg.clientId;
            const busy = connRef.current?.open && connRef.current !== conn;
            if ((known && !returning) || (busy && !returning)) {
              conn.send({ t: 'reject', reason: 'full' } satisfies Message);
              setTimeout(() => conn.close(), 200);
              return false;
            }
            accepted = true;
            clearTimeout(helloTimer);
            settle();
            const stale = connRef.current;
            guestClientRef.current = msg.clientId;
            connRef.current = conn;
            if (stale && stale !== conn) stale.close();
            setStatus('connected');
            return true;
          },
        );
      });
    });
  }, [attach, fail]);

  const join = useCallback(async (roomCode: string, hello: GuestHello) => {
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
        connRef.current = conn;
        conn.send({ t: 'hello', v: PROTOCOL_VERSION, clientId: clientId(), ...hello } satisfies Message);
        setStatus('connected');
      });
      attach(conn, () => {
        if (connRef.current !== conn || closedByUser.current) return;
        connRef.current = null;
        retry();
      }, (msg) => {
        if (msg.t === 'lobby') admitted = true;
        if (msg.t === 'reject') {
          // While reconnecting, "full" usually means the host still holds our old connection.
          if (msg.reason === 'full' && admitted) {
            conn.close();
            return false;
          }
          closedByUser.current = true;
          fail(msg.reason === 'full' ? 'That room already has two players.' : 'The host is on a different version. Refresh both phones.');
          return false;
        }
        return true;
      });
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
  }, [attach, fail]);

  useEffect(() => () => {
    closedByUser.current = true;
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    peerRef.current?.destroy();
  }, []);

  const hostRoom = useCallback(() => host(0), [host]);
  return useMemo(
    () => ({ status, error, code, isHost, host: hostRoom, join, send, leave }),
    [status, error, code, isHost, hostRoom, join, send, leave],
  );
}

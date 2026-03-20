'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { DrawEvent } from '@/lib/canvas-utils';

interface PeerMessage {
  type: 'draw-event' | 'chat' | 'game-action' | 'player-info' | 'ping' | 'pong';
  payload: unknown;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function usePeerConnection() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('new');
  const handlersRef = useRef<Map<string, (payload: unknown) => void>>(new Map());

  const cleanup = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    dcRef.current = null;
    pcRef.current = null;
    setConnected(false);
    setConnectionState('closed');
  }, []);

  const setupDataChannel = useCallback((dc: RTCDataChannel) => {
    dcRef.current = dc;
    dc.onopen = () => {
      setConnected(true);
      setConnectionState('connected');
    };
    dc.onclose = () => {
      setConnected(false);
      setConnectionState('disconnected');
    };
    dc.onmessage = (e) => {
      try {
        const msg: PeerMessage = JSON.parse(e.data);
        if (msg.type === 'ping') {
          dc.send(JSON.stringify({ type: 'pong', payload: null }));
          return;
        }
        const handler = handlersRef.current.get(msg.type);
        handler?.(msg.payload);
      } catch {
        // Ignore malformed messages
      }
    };
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setConnected(false);
      }
    };

    return pc;
  }, []);

  const createOffer = useCallback(async (): Promise<string> => {
    const pc = createPeerConnection();
    const dc = pc.createDataChannel('game', { ordered: true });
    setupDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') resolve();
      };
      // Timeout after 5 seconds
      setTimeout(resolve, 5000);
    });

    return btoa(JSON.stringify(pc.localDescription));
  }, [createPeerConnection, setupDataChannel]);

  const acceptOffer = useCallback(async (offerStr: string): Promise<string> => {
    const pc = createPeerConnection();
    pc.ondatachannel = (e) => setupDataChannel(e.channel);

    const offer = JSON.parse(atob(offerStr));
    await pc.setRemoteDescription(offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') resolve();
      };
      setTimeout(resolve, 5000);
    });

    return btoa(JSON.stringify(pc.localDescription));
  }, [createPeerConnection, setupDataChannel]);

  const acceptAnswer = useCallback(async (answerStr: string) => {
    const pc = pcRef.current;
    if (!pc) throw new Error('No peer connection');
    const answer = JSON.parse(atob(answerStr));
    await pc.setRemoteDescription(answer);
  }, []);

  const send = useCallback((type: PeerMessage['type'], payload: unknown) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const sendDrawEvent = useCallback((event: DrawEvent) => {
    send('draw-event', event);
  }, [send]);

  const onMessage = useCallback((type: string, handler: (payload: unknown) => void) => {
    handlersRef.current.set(type, handler);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    connected,
    connectionState,
    createOffer,
    acceptOffer,
    acceptAnswer,
    send,
    sendDrawEvent,
    onMessage,
    cleanup,
  };
}

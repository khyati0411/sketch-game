import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { EV, SERVER_HELLO, type Ack, type RoomView, type ServerHello } from '@sketch/shared';

const MESSAGES: Record<string, (name: string) => string> = {
  'name-required': () => 'Please enter a nickname',
  'name-taken': (name) => `${name.trim()} is taken, choose another nickname`,
  'room-full': () => 'This room is full',
  'room-not-found': () => 'Room not found',
  'not-allowed': () => 'That is not allowed right now',
};

export type RoomError = { code: string; message: string };

/** One socket per tab, plus the room this player is in (ADR-004: the server sends full views). */
export function useRoom() {
  // The socket lives as long as the tab; effects only add and remove listeners (safe under StrictMode).
  const [socket] = useState<Socket>(() => io());
  const [status, setStatus] = useState('connecting…');
  const [hello, setHello] = useState<ServerHello>();
  const [view, setView] = useState<RoomView>();
  const [error, setError] = useState<RoomError>();
  // The room this tab is in or was last in; from the invite path until the player enters one.
  const [code, setCode] = useState(() => /^\/r\/([A-Za-z]{6})$/.exec(location.pathname)?.[1].toUpperCase());
  const inRoom = useRef(false);
  inRoom.current = view !== undefined;

  useEffect(() => {
    const onHello = (h: ServerHello) => {
      setHello(h);
      setStatus(`connected v${h.version}`);
    };
    const onState = (v: RoomView) => setView(v);
    // The server drops a disconnected player (Sprint 1), so a stale room view would show a game
    // this player is no longer in. Go back to the join screen for the same room instead.
    const onDisconnect = () => {
      setStatus('disconnected');
      if (!inRoom.current) return;
      setView(undefined);
      setError({ code: 'disconnected', message: 'You were disconnected. Join again when you are back online.' });
    };
    socket.on(SERVER_HELLO, onHello);
    socket.on(EV.roomState, onState);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off(SERVER_HELLO, onHello);
      socket.off(EV.roomState, onState);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  const enter = useCallback(
    (event: string, payload: { name: string; color?: string; code?: string }) => {
      setError(undefined);
      socket.emit(event, payload, (ack: Ack<RoomView>) => {
        if (ack.ok) {
          setView(ack.value);
          setCode(ack.value.code);
          history.replaceState(null, '', `/r/${ack.value.code}`);
        } else setError({ code: ack.error, message: MESSAGES[ack.error](payload.name) });
      });
    },
    [socket],
  );

  return {
    socket,
    status,
    hello,
    view,
    error,
    code,
    forgetCode: () => {
      setCode(undefined);
      history.replaceState(null, '', '/');
    },
    create: (name: string, color?: string) => enter(EV.roomCreate, { name, color }),
    join: (code: string, name: string, color?: string) => enter(EV.roomJoin, { code, name, color }),
    start: () => socket.emit(EV.gameStart, () => {}),
  };
}

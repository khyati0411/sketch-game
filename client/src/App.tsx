import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SERVER_HELLO, type ServerHello } from '@sketch/shared';

export function App() {
  const [status, setStatus] = useState('connecting…');

  useEffect(() => {
    const socket = io();
    socket.on(SERVER_HELLO, ({ version }: ServerHello) => setStatus(`connected v${version}`));
    socket.on('disconnect', () => setStatus('disconnected'));
    return () => {
      socket.close();
    };
  }, []);

  return (
    <main>
      <h1>Sketch Game</h1>
      <p data-testid="conn-status">{status}</p>
    </main>
  );
}

import { useState } from 'react';
import { useRoom } from './useRoom';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { Game } from './screens/Game';

const codeFromPath = () => /^\/r\/([A-Za-z]{6})$/.exec(location.pathname)?.[1].toUpperCase();

export function App() {
  const room = useRoom();
  const [code, setCode] = useState(codeFromPath);
  const { view, hello } = room;

  return (
    <>
      <p className="sr-only" data-testid="conn-status" aria-live="polite">
        {room.status}
      </p>
      {!view ? (
        <Home
          code={code}
          error={room.error}
          onCreate={room.create}
          onJoin={room.join}
          onForgetCode={() => {
            setCode(undefined);
            history.replaceState(null, '', '/');
          }}
        />
      ) : view.phase === 'lobby' ? (
        <Lobby view={view} inviteUrl={`${hello?.joinBase || location.origin}/r/${view.code}`} onStart={room.start} />
      ) : (
        <Game view={view} socket={room.socket} />
      )}
    </>
  );
}

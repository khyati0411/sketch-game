import { useRoom } from './useRoom';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { Game } from './screens/Game';

export function App() {
  const room = useRoom();
  const { view, hello } = room;

  return (
    <>
      <p className="sr-only" data-testid="conn-status" aria-live="polite">
        {room.status}
      </p>
      {!view ? (
        <Home
          code={room.code}
          error={room.error}
          onCreate={room.create}
          onJoin={room.join}
          onForgetCode={room.forgetCode}
        />
      ) : view.phase === 'lobby' ? (
        <Lobby view={view} inviteUrl={`${hello?.joinBase || location.origin}/r/${view.code}`} onStart={room.start} />
      ) : (
        <Game view={view} socket={room.socket} />
      )}
    </>
  );
}

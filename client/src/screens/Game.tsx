import type { Socket } from 'socket.io-client';
import type { RoomView } from '@sketch/shared';
import { PlayerCard } from './PlayerCard';
import { Canvas } from '../canvas/Canvas';

type Props = { view: RoomView; socket: Socket };

/** The drawing turn. Sprint 1: the host draws and everyone watches (US-005). */
export function Game({ view, socket }: Props) {
  const drawer = view.players.find((p) => p.isDrawer);
  return (
    <main className="page">
      <header className="wrap panel" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
        <span className="logo" style={{ fontSize: 28 }}>
          Screw<span>dle</span>
        </span>
        <span className="muted">{drawer ? `${drawer.name} is drawing` : ''}</span>
      </header>
      <div className="wrap row">
        <aside className="panel" style={{ flex: '1 1 200px' }}>
          <h2 style={{ fontSize: 22 }}>Players</h2>
          <ul className="players" data-testid="player-list">
            {view.players.map((p) => (
              <PlayerCard key={p.id} player={p} you={p.id === view.youId} />
            ))}
          </ul>
        </aside>
        <section style={{ flex: '999 1 520px', minWidth: 0 }}>
          <Canvas canDraw={view.players.some((p) => p.isDrawer && p.id === view.youId)} socket={socket} />
        </section>
      </div>
    </main>
  );
}

import type { PlayerView } from '@sketch/shared';

/** One player in a list: avatar color, nickname and badges. */
export function PlayerCard({ player, you }: { player: PlayerView; you: boolean }) {
  return (
    <li className={`player${you ? ' you' : ''}`} data-testid="player">
      <span className="avatar" data-testid="player-color" aria-hidden="true" style={{ background: player.color }} />
      <span style={{ fontWeight: 800 }} data-testid="player-name">
        {player.name}
      </span>
      {player.isHost && (
        <span className="badge" data-testid="host-badge">
          Host
        </span>
      )}
      {player.isDrawer && (
        <span className="badge" data-testid="drawer-badge">
          Drawing
        </span>
      )}
      {you && <span className="muted" style={{ fontSize: 13 }}>you</span>}
    </li>
  );
}

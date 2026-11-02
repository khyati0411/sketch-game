import { useState } from 'react';
import { MIN_PLAYERS, type RoomView } from '@sketch/shared';
import { PlayerCard } from './PlayerCard';

type Props = { view: RoomView; inviteUrl: string; onStart: () => void };

/** Players waiting for the host, plus the invite link (US-001, US-003, US-004). */
export function Lobby({ view, inviteUrl, onStart }: Props) {
  const [copied, setCopied] = useState(false);
  const you = view.players.find((p) => p.id === view.youId);
  const canStart = view.players.length >= MIN_PLAYERS;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      (document.getElementById('invite') as HTMLInputElement | null)?.select();
    }
  };

  return (
    <main className="page">
      <header className="wrap row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="logo">
          Screw<span>dle</span>
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          Room <b className="display" style={{ fontSize: 24, letterSpacing: 3, color: 'var(--text)' }}>{view.code}</b>
        </p>
      </header>
      <div className="wrap row">
        <section className="panel" style={{ flex: '999 1 480px' }}>
          <h2>
            Players <span className="muted">{view.players.length} / 8</span>
          </h2>
          <ul className="players" data-testid="player-list">
            {view.players.map((p) => (
              <PlayerCard key={p.id} player={p} you={p.id === view.youId} />
            ))}
          </ul>
          <p className="muted" style={{ margin: 0 }}>
            3 rounds · 80 seconds to draw · faster guesses score more
          </p>
        </section>
        <aside style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <div className="panel">
            <h2>Invite friends</h2>
            <label htmlFor="invite" className="muted">
              Anyone on this Wi‑Fi can join with this link
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="invite" type="text" readOnly data-testid="invite-link" value={inviteUrl} />
              <button type="button" data-testid="copy-link" onClick={copy}>
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>
          {you?.isHost && (
            <button type="button" className="primary" data-testid="start-game" disabled={!canStart} onClick={onStart}>
              Start game
            </button>
          )}
          <p className="muted" data-testid="lobby-hint" style={{ margin: 0, textAlign: 'center' }}>
            {you?.isHost ? (canStart ? 'Everyone in? Start when ready.' : 'At least 2 players are needed') : 'Waiting for the host to start'}
          </p>
        </aside>
      </div>
    </main>
  );
}

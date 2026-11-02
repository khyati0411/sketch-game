import { useState, type FormEvent } from 'react';
import { NAME_MAX, PLAYER_COLORS } from '@sketch/shared';
import type { RoomError } from '../useRoom';

type Props = {
  code?: string; // set when the page was opened from an invite link
  error?: RoomError;
  onCreate: (name: string, color: string) => void;
  onJoin: (code: string, name: string, color: string) => void;
  onForgetCode: () => void;
};

/** Create a room, or join one from an invite link (US-001, US-002). */
export function Home({ code, error, onCreate, onJoin, onForgetCode }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PLAYER_COLORS[0]);
  const notFound = error?.code === 'room-not-found';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code && !notFound) onJoin(code, name, color);
    else onCreate(name, color);
  };

  return (
    <main className="page">
      <h1 className="logo">
        Screw<span>dle</span>
      </h1>
      <form className="panel wrap" style={{ maxWidth: 480 }} onSubmit={submit}>
        <h2>{code && !notFound ? `Join room ${code}` : 'Start a game'}</h2>
        <label htmlFor="nickname">Nickname</label>
        <input id="nickname" type="text" data-testid="nickname" maxLength={NAME_MAX} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
        <span className="muted" id="color-label">Your color</span>
        <div className="swatches" role="group" aria-labelledby="color-label">
          {PLAYER_COLORS.map((c, i) => (
            <button key={c} type="button" className="swatch" aria-label={`Color ${i + 1}`} aria-pressed={c === color} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
        {error && (
          <p className="error" role="alert" data-testid="join-error">
            {error.message}
          </p>
        )}
        {code && !notFound ? (
          <button type="submit" className="primary" data-testid="join-room">
            Join
          </button>
        ) : (
          <button type="submit" className="primary" data-testid="create-room" onClick={notFound ? onForgetCode : undefined}>
            Create room
          </button>
        )}
      </form>
    </main>
  );
}

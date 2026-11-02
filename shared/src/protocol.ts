// Socket.IO events and payloads shared by client and server (architecture.md, ADR-003, ADR-004).

export const EV = {
  roomCreate: 'room:create',
  roomJoin: 'room:join',
  roomState: 'room:state',
  gameStart: 'game:start',
  drawBegin: 'draw:begin',
  drawPoints: 'draw:points',
  drawEnd: 'draw:end',
  canvasSync: 'canvas:sync',
} as const;

export type ServerHello = { version: string; joinBase: string };

export type PlayerView = { id: string; name: string; color: string; isHost: boolean; isDrawer: boolean };

export type Phase = 'lobby' | 'drawing';

/** What one player sees of their room; built per player by the server. */
export type RoomView = { code: string; phase: Phase; players: PlayerView[]; youId: string };

export type JoinError = 'name-required' | 'name-taken' | 'room-full' | 'room-not-found';

export type Ack<T> = { ok: true; value: T } | { ok: false; error: JoinError | 'not-allowed' };

export type StrokeBegin = { id: string; color: string; size: number; x: number; y: number };
export type StrokePoints = { id: string; points: number[] };

/** One entry in a turn's action log. Points are flat [x, y, x, y, ...] in logical canvas units. */
export type Action = { kind: 'stroke'; id: string; color: string; size: number; points: number[] };

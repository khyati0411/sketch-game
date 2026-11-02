import { randomUUID } from 'node:crypto';
import {
  BRUSH_SIZES,
  clampPoint,
  MAX_PLAYERS,
  MAX_POINTS_PER_TURN,
  MIN_PLAYERS,
  NAME_MAX,
  PALETTE,
  PLAYER_COLORS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_TTL_MS,
  type Ack,
  type Action,
  type Phase,
  type RoomView,
  type StrokeBegin,
  type StrokePoints,
} from '@sketch/shared';

type Player = { id: string; socketId: string; name: string; color: string; seq: number };

type Room = {
  code: string;
  phase: Phase;
  players: Player[]; // in join order
  hostId: string;
  drawerId?: string;
  log: Action[];
  openStroke?: Action;
  pointCount: number;
  ttl?: ReturnType<typeof setTimeout>;
};

const PALETTE_HEX = new Set<string>(PALETTE.map((c) => c.hex));
const SIZES = new Set<number>(BRUSH_SIZES);

const fail = (error: Exclude<Ack<never>, { ok: true }>['error']) => ({ ok: false, error }) as const;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Trimmed nickname of 1–NAME_MAX characters, or undefined (US-002). */
export function normalizeName(n: unknown): string | undefined {
  if (typeof n !== 'string') return undefined;
  const name = n.trim();
  return name.length >= 1 && name.length <= NAME_MAX ? name : undefined;
}

/**
 * All rooms in memory (ADR-004). Pure game rules, no sockets: callers pass socket ids
 * and broadcast whatever these methods return.
 */
export class Rooms {
  private readonly rooms = new Map<string, Room>();
  private readonly socketRoom = new Map<string, string>();
  private readonly rand: () => number;
  private seq = 0;

  constructor(opts: { rand?: () => number; now?: () => number }) {
    this.rand = opts.rand ?? Math.random;
  }

  create(socketId: string, name: unknown, color: unknown): Ack<RoomView> {
    const clean = normalizeName(name);
    if (!clean) return fail('name-required');
    const room: Room = { code: this.newCode(), phase: 'lobby', players: [], hostId: '', log: [], pointCount: 0 };
    this.rooms.set(room.code, room);
    const player = this.addPlayer(room, socketId, clean, color);
    room.hostId = player.id;
    return { ok: true, value: this.viewFor(room.code, socketId) };
  }

  join(socketId: string, code: unknown, name: unknown, color: unknown): Ack<RoomView> {
    const room = typeof code === 'string' ? this.rooms.get(code.toUpperCase()) : undefined;
    if (!room) return fail('room-not-found');
    const clean = normalizeName(name);
    if (!clean) return fail('name-required');
    if (room.players.length >= MAX_PLAYERS) return fail('room-full');
    if (room.players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) return fail('name-taken');
    this.addPlayer(room, socketId, clean, color);
    return { ok: true, value: this.viewFor(room.code, socketId) };
  }

  /** Removes the socket's player. Returns the code of the room it was in. */
  leave(socketId: string): string | undefined {
    const room = this.roomFor(socketId);
    if (!room) return undefined;
    this.socketRoom.delete(socketId);
    const leaving = room.players.find((p) => p.socketId === socketId)!;
    room.players = room.players.filter((p) => p !== leaving);
    if (room.hostId === leaving.id && room.players.length) room.hostId = room.players[0].id;
    if (room.phase === 'drawing' && (room.players.length < MIN_PLAYERS || room.drawerId === leaving.id)) this.toLobby(room);
    if (!room.players.length) room.ttl = setTimeout(() => this.rooms.delete(room.code), ROOM_TTL_MS);
    return room.code;
  }

  start(socketId: string): Ack<null> {
    const room = this.roomFor(socketId);
    const player = room?.players.find((p) => p.socketId === socketId);
    if (!room || !player || room.hostId !== player.id || room.phase !== 'lobby' || room.players.length < MIN_PLAYERS)
      return fail('not-allowed');
    room.phase = 'drawing';
    room.drawerId = room.players[0].id;
    room.log = [];
    room.pointCount = 0;
    return { ok: true, value: null };
  }

  begin(socketId: string, b: unknown): StrokeBegin | undefined {
    const room = this.drawerRoom(socketId);
    if (!room || !isObject(b)) return undefined;
    const { id, color, size, x, y } = b;
    if (typeof id !== 'string' || typeof color !== 'string' || !PALETTE_HEX.has(color)) return undefined;
    if (typeof size !== 'number' || !SIZES.has(size)) return undefined;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    if (room.pointCount >= MAX_POINTS_PER_TURN) return undefined;
    const start = clampPoint(x, y);
    room.openStroke = { kind: 'stroke', id, color, size, points: start };
    room.log.push(room.openStroke);
    room.pointCount += 1;
    return { id, color, size, x: start[0], y: start[1] };
  }

  points(socketId: string, p: unknown): StrokePoints | undefined {
    const room = this.drawerRoom(socketId);
    const stroke = room?.openStroke;
    if (!room || !stroke || !isObject(p) || !Array.isArray(p.points) || stroke.id !== p.id) return undefined;
    const clean: number[] = [];
    const left = MAX_POINTS_PER_TURN - room.pointCount;
    for (let i = 0; i + 1 < p.points.length && clean.length / 2 < left; i += 2) {
      const [x, y] = [p.points[i], p.points[i + 1]];
      if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y))
        clean.push(...clampPoint(x, y));
    }
    if (!clean.length) return undefined;
    stroke.points.push(...clean);
    room.pointCount += clean.length / 2;
    return { id: p.id as string, points: clean };
  }

  end(socketId: string, id: unknown): string | undefined {
    const room = this.drawerRoom(socketId);
    if (!room || typeof id !== 'string' || room.openStroke?.id !== id) return undefined;
    room.openStroke = undefined;
    return id;
  }

  roomOf(socketId: string): string | undefined {
    return this.socketRoom.get(socketId);
  }

  viewFor(code: string, socketId: string): RoomView {
    const room = this.rooms.get(code)!;
    const you = room.players.find((p) => p.socketId === socketId);
    return {
      code: room.code,
      phase: room.phase,
      youId: you?.id ?? '',
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        isHost: p.id === room.hostId,
        isDrawer: room.phase === 'drawing' && p.id === room.drawerId,
      })),
    };
  }

  socketsIn(code: string): string[] {
    return this.rooms.get(code)?.players.map((p) => p.socketId) ?? [];
  }

  log(code: string): Action[] {
    return this.rooms.get(code)?.log ?? [];
  }

  private addPlayer(room: Room, socketId: string, name: string, color: unknown): Player {
    clearTimeout(room.ttl);
    room.ttl = undefined;
    const used = new Set(room.players.map((p) => p.color));
    const wanted = typeof color === 'string' && (PLAYER_COLORS as readonly string[]).includes(color) && !used.has(color);
    const player: Player = {
      id: randomUUID(),
      socketId,
      name,
      color: wanted ? (color as string) : (PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0]),
      seq: this.seq++,
    };
    room.players.push(player);
    this.socketRoom.set(socketId, room.code);
    return player;
  }

  private toLobby(room: Room) {
    room.phase = 'lobby';
    room.drawerId = undefined;
    room.log = [];
    room.openStroke = undefined;
    room.pointCount = 0;
  }

  private roomFor(socketId: string): Room | undefined {
    const code = this.socketRoom.get(socketId);
    return code ? this.rooms.get(code) : undefined;
  }

  private drawerRoom(socketId: string): Room | undefined {
    const room = this.roomFor(socketId);
    if (room?.phase !== 'drawing') return undefined;
    const player = room.players.find((p) => p.socketId === socketId);
    return player && player.id === room.drawerId ? room : undefined;
  }

  private newCode(): string {
    for (;;) {
      const code = Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[Math.floor(this.rand() * ROOM_CODE_ALPHABET.length)]).join('');
      if (!this.rooms.has(code)) return code;
    }
  }
}

import { describe, it, expect, vi, afterEach } from 'vitest';
import { PLAYER_COLORS, type Ack, type RoomView } from '@sketch/shared';
import { Rooms } from '../src/game/rooms';

const ok = <T,>(a: Ack<T>): T => {
  if (!a.ok) throw new Error(`expected ok, got ${a.error}`);
  return a.value;
};

/** A room with host "Host" (socket h) and guests g1..gN. */
function roomWith(guests: number, rooms = new Rooms({})) {
  const code = ok(rooms.create('h', 'Host', undefined)).code;
  for (let i = 1; i <= guests; i++) ok(rooms.join(`g${i}`, code, `Guest${i}`, undefined));
  return { rooms, code };
}

function drawing() {
  const r = roomWith(2);
  ok(r.rooms.start('h'));
  return r;
}

afterEach(() => vi.useRealTimers());

describe('Rooms: create and join', () => {
  it('creates a private room with a 6-letter code and the creator as host', () => {
    const view = ok(new Rooms({}).create('h', 'Khyati', undefined));
    expect(view.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(view.phase).toBe('lobby');
    expect(view.players).toEqual([expect.objectContaining({ name: 'Khyati', isHost: true, id: view.youId })]);
  });

  it('refuses empty, blank and over-long nicknames', () => {
    const { rooms, code } = roomWith(0);
    expect(rooms.join('x', code, '', undefined)).toEqual({ ok: false, error: 'name-required' });
    expect(rooms.join('x', code, '   ', undefined)).toEqual({ ok: false, error: 'name-required' });
    expect(rooms.join('x', code, 'a'.repeat(25), undefined)).toEqual({ ok: false, error: 'name-required' });
    expect(rooms.create('y', '', undefined)).toEqual({ ok: false, error: 'name-required' });
  });

  it('accepts a 20-character nickname and trims it', () => {
    const { rooms, code } = roomWith(0);
    const view = ok(rooms.join('x', code, ` ${'a'.repeat(20)} `, undefined));
    expect(view.players.map((p) => p.name)).toContain('a'.repeat(20));
  });

  it('refuses a nickname already in the room, ignoring case and spaces', () => {
    const rooms = new Rooms({});
    const code = ok(rooms.create('h', 'Sam', undefined)).code;
    expect(rooms.join('x', code, 'sam ', undefined)).toEqual({ ok: false, error: 'name-taken' });
  });

  it('refuses a ninth player and an unknown room', () => {
    const { rooms, code } = roomWith(7);
    expect(rooms.join('x', code, 'Ninth', undefined)).toEqual({ ok: false, error: 'room-full' });
    expect(rooms.join('x', 'ZZZZZZ', 'Maya', undefined)).toEqual({ ok: false, error: 'room-not-found' });
  });

  it('gives the first free player color, or the requested one when it is free', () => {
    const rooms = new Rooms({});
    const host = ok(rooms.create('h', 'Host', undefined));
    expect(host.players[0].color).toBe(PLAYER_COLORS[0]);
    const g = ok(rooms.join('g', host.code, 'Guest', PLAYER_COLORS[5]));
    expect(g.players.find((p) => p.id === g.youId)?.color).toBe(PLAYER_COLORS[5]);
    const taken = ok(rooms.join('t', host.code, 'Third', PLAYER_COLORS[0]));
    expect(taken.players.find((p) => p.id === taken.youId)?.color).toBe(PLAYER_COLORS[1]);
  });

  it('ignores junk payloads without throwing', () => {
    const { rooms } = roomWith(0);
    expect(rooms.join('x', 42, {}, null)).toEqual({ ok: false, error: 'room-not-found' });
    expect(rooms.create('y', { name: 'x' }, 7)).toEqual({ ok: false, error: 'name-required' });
    expect(rooms.points('nobody', { points: 'x' })).toBeUndefined();
  });
});

describe('Rooms: start', () => {
  it('only the host can start, and only with 2 or more players', () => {
    const solo = roomWith(0);
    expect(solo.rooms.start('h')).toEqual({ ok: false, error: 'not-allowed' });
    const { rooms, code } = roomWith(1);
    expect(rooms.start('g1')).toEqual({ ok: false, error: 'not-allowed' });
    ok(rooms.start('h'));
    const view: RoomView = rooms.viewFor(code, 'g1');
    expect(view.phase).toBe('drawing');
    expect(view.players.find((p) => p.isDrawer)?.name).toBe('Host');
  });
});

describe('Rooms: drawing', () => {
  const begin = { id: 's1', color: '#000000', size: 10, x: 5, y: 5 };

  it('ignores draw events from guessers and in the lobby', () => {
    const lobby = roomWith(1);
    expect(lobby.rooms.begin('h', begin)).toBeUndefined();
    const { rooms, code } = drawing();
    expect(rooms.begin('g1', begin)).toBeUndefined();
    expect(rooms.points('g1', { id: 's1', points: [1, 2] })).toBeUndefined();
    expect(rooms.log(code)).toEqual([]);
  });

  it('logs the drawer\'s stroke with clamped, rounded points and drops non-finite pairs', () => {
    const { rooms, code } = drawing();
    expect(rooms.begin('h', begin)).toEqual(begin);
    expect(rooms.points('h', { id: 's1', points: [900, -5, 10.6, NaN, 20, 30] })).toEqual({ id: 's1', points: [800, 0, 20, 30] });
    expect(rooms.end('h', 's1')).toBe('s1');
    expect(rooms.log(code)).toEqual([{ kind: 'stroke', id: 's1', color: '#000000', size: 10, points: [5, 5, 800, 0, 20, 30] }]);
  });

  it('ignores points with no open stroke, even without an id', () => {
    const { rooms } = drawing();
    expect(rooms.points('h', { points: [1, 2] })).toBeUndefined();
    expect(rooms.end('h', undefined)).toBeUndefined();
  });

  it('rounds coordinates', () => {
    const { rooms } = drawing();
    rooms.begin('h', { ...begin, x: 1.4, y: 2.6 });
    expect(rooms.points('h', { id: 's1', points: [10.4, 10.6] })).toEqual({ id: 's1', points: [10, 11] });
  });

  it('refuses colors outside the palette and sizes outside the brush sizes', () => {
    const { rooms } = drawing();
    expect(rooms.begin('h', { ...begin, color: '#123456' })).toBeUndefined();
    expect(rooms.begin('h', { ...begin, size: 7 })).toBeUndefined();
    expect(rooms.begin('h', { ...begin, x: 'a' })).toBeUndefined();
  });

  it('drops points past the 50,000-point cap', () => {
    const { rooms } = drawing();
    rooms.begin('h', begin); // 1 point
    const batch = Array.from({ length: 2 * 49_999 }, () => 1);
    expect(rooms.points('h', { id: 's1', points: batch })).toBeDefined();
    expect(rooms.points('h', { id: 's1', points: [1, 1] })).toBeUndefined();
  });
});

describe('Rooms: leaving', () => {
  it('passes host to the next player who joined', () => {
    const { rooms, code } = roomWith(2);
    expect(rooms.leave('h')).toBe(code);
    expect(rooms.viewFor(code, 'g1').players.find((p) => p.isHost)?.name).toBe('Guest1');
  });

  it('returns to the lobby and clears the log when fewer than 2 players remain while drawing', () => {
    const { rooms, code } = roomWith(1);
    ok(rooms.start('h'));
    rooms.begin('h', { id: 's1', color: '#000000', size: 10, x: 5, y: 5 });
    rooms.leave('g1');
    expect(rooms.viewFor(code, 'h').phase).toBe('lobby');
    expect(rooms.log(code)).toEqual([]);
  });

  it('deletes an empty room after 5 minutes', () => {
    vi.useFakeTimers();
    const { rooms, code } = roomWith(0);
    rooms.leave('h');
    vi.advanceTimersByTime(299_000);
    ok(rooms.join('x', code, 'Back', undefined));
    rooms.leave('x');
    vi.advanceTimersByTime(300_000);
    expect(rooms.join('y', code, 'Late', undefined)).toEqual({ ok: false, error: 'room-not-found' });
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { EV, SERVER_HELLO, type Ack, type RoomView, type ServerHello, type StrokePoints } from '@sketch/shared';
import { createServer } from '../src/app';

let cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.forEach((c) => c());
  cleanup = [];
});

async function server(joinBase = 'http://192.168.1.20:3000') {
  const { httpServer, io } = createServer({ joinBase });
  await new Promise<void>((r) => httpServer.listen(0, r));
  const { port } = httpServer.address() as AddressInfo;
  cleanup.push(() => io.close());
  const client = () => {
    const c: Socket = connect(`http://localhost:${port}`, { transports: ['websocket'] });
    cleanup.unshift(() => c.close());
    return c;
  };
  return { client };
}

const call = <T,>(c: Socket, ev: string, ...args: unknown[]) =>
  new Promise<Ack<T>>((r) => c.emit(ev, ...args, r));
const next = <T,>(c: Socket, ev: string) => new Promise<T>((r) => c.once(ev, r));

describe('game sockets', () => {
  it('sends joinBase in the hello', async () => {
    const { client } = await server('http://10.0.0.5:3000');
    const hello = await next<ServerHello>(client(), SERVER_HELLO);
    expect(hello.joinBase).toBe('http://10.0.0.5:3000');
  });

  it('creates, joins and broadcasts the room to everyone in it', async () => {
    const { client } = await server();
    const a = client();
    const b = client();
    const created = await call<RoomView>(a, EV.roomCreate, { name: 'Khyati' });
    if (!created.ok) throw new Error(created.error);
    const aSees = next<RoomView>(a, EV.roomState);
    const joined = await call<RoomView>(b, EV.roomJoin, { code: created.value.code, name: 'Maya' });
    expect(joined.ok).toBe(true);
    expect((await aSees).players.map((p) => p.name)).toEqual(['Khyati', 'Maya']);
  });

  it('relays the drawer\'s strokes and ignores a guesser\'s', async () => {
    const { client } = await server();
    const a = client();
    const b = client();
    const created = await call<RoomView>(a, EV.roomCreate, { name: 'Khyati' });
    if (!created.ok) throw new Error(created.error);
    await call(b, EV.roomJoin, { code: created.value.code, name: 'Maya' });
    expect((await call(a, EV.gameStart)).ok).toBe(true);

    const begun = next(b, EV.drawBegin);
    a.emit(EV.drawBegin, { id: 's1', color: '#000000', size: 10, x: 5, y: 5 });
    expect(await begun).toEqual({ id: 's1', color: '#000000', size: 10, x: 5, y: 5 });
    const pts = next<StrokePoints>(b, EV.drawPoints);
    a.emit(EV.drawPoints, { id: 's1', points: [900, 10] });
    expect(await pts).toEqual({ id: 's1', points: [800, 10] });

    let aGot = 0;
    a.on(EV.drawBegin, () => aGot++);
    b.emit(EV.drawBegin, { id: 's2', color: '#000000', size: 10, x: 1, y: 1 });
    await new Promise((r) => setTimeout(r, 100));
    expect(aGot).toBe(0);
  });

  it('sends the current canvas to a player who joins while drawing', async () => {
    const { client } = await server();
    const a = client();
    const b = client();
    const created = await call<RoomView>(a, EV.roomCreate, { name: 'Khyati' });
    if (!created.ok) throw new Error(created.error);
    await call(b, EV.roomJoin, { code: created.value.code, name: 'Maya' });
    await call(a, EV.gameStart);
    a.emit(EV.drawBegin, { id: 's1', color: '#000000', size: 10, x: 5, y: 5 });
    await new Promise((r) => setTimeout(r, 50));
    const c = client();
    const sync = next(c, EV.canvasSync);
    await call(c, EV.roomJoin, { code: created.value.code, name: 'Arjun' });
    expect(await sync).toEqual([{ kind: 'stroke', id: 's1', color: '#000000', size: 10, points: [5, 5] }]);
  });

  it('tells the room when a player disconnects', async () => {
    const { client } = await server();
    const a = client();
    const b = client();
    const created = await call<RoomView>(a, EV.roomCreate, { name: 'Khyati' });
    if (!created.ok) throw new Error(created.error);
    await call(b, EV.roomJoin, { code: created.value.code, name: 'Maya' });
    await call(a, EV.gameStart);
    const after = next<RoomView>(a, EV.roomState);
    b.close();
    const view = await after;
    expect(view.players).toHaveLength(1);
    expect(view.phase).toBe('lobby');
  });

  it('survives junk payloads and missing acks', async () => {
    const { client } = await server();
    const a = client();
    a.emit(EV.roomCreate, 'not an object');
    a.emit(EV.roomJoin, null, 'nope');
    a.emit(EV.drawPoints, { points: Array(10).fill('x') });
    const created = await call<RoomView>(a, EV.roomCreate, { name: 'Still here' });
    expect(created.ok).toBe(true);
  });
});

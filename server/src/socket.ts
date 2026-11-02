import type { Server, Socket } from 'socket.io';
import { EV, type Ack } from '@sketch/shared';
import type { Rooms } from './game/rooms';

type Reply = (a: Ack<unknown>) => void;
const field = (payload: unknown, key: string): unknown =>
  typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>)[key] : undefined;

/** Translates Socket.IO events to Rooms calls and broadcasts the results (ADR-004). */
export function attachGame(io: Server, rooms: Rooms): void {
  // Each player gets a room view built for them, so state goes out socket by socket.
  const broadcastState = (code: string) => {
    for (const sid of rooms.socketsIn(code)) io.to(sid).emit(EV.roomState, rooms.viewFor(code, sid));
  };

  io.on('connection', (socket: Socket) => {
    const reply = (ack: unknown, result: Ack<unknown>) => {
      if (typeof ack === 'function') (ack as Reply)(result);
    };
    const entered = (code: string) => {
      void socket.join(code);
      broadcastState(code);
    };

    socket.on(EV.roomCreate, (payload: unknown, ack: unknown) => {
      if (rooms.roomOf(socket.id)) return reply(ack, { ok: false, error: 'not-allowed' });
      const result = rooms.create(socket.id, field(payload, 'name'), field(payload, 'color'));
      reply(ack, result);
      if (result.ok) entered(result.value.code);
    });

    socket.on(EV.roomJoin, (payload: unknown, ack: unknown) => {
      if (rooms.roomOf(socket.id)) return reply(ack, { ok: false, error: 'not-allowed' });
      const result = rooms.join(socket.id, field(payload, 'code'), field(payload, 'name'), field(payload, 'color'));
      reply(ack, result);
      if (!result.ok) return;
      entered(result.value.code);
      if (result.value.phase === 'drawing') socket.emit(EV.canvasSync, rooms.log(result.value.code));
    });

    socket.on(EV.gameStart, (ack: unknown) => {
      const result = rooms.start(socket.id);
      reply(ack, result);
      const code = rooms.roomOf(socket.id);
      if (result.ok && code) broadcastState(code);
    });

    // Draw events: Rooms returns the sanitized payload for the drawer, undefined for anyone else.
    const relay = (event: string, apply: (payload: unknown) => unknown) =>
      socket.on(event, (payload: unknown) => {
        const out = apply(payload);
        const code = rooms.roomOf(socket.id);
        if (out !== undefined && code) socket.to(code).emit(event, out);
      });
    relay(EV.drawBegin, (p) => rooms.begin(socket.id, p));
    relay(EV.drawPoints, (p) => rooms.points(socket.id, p));
    relay(EV.drawEnd, (p) => rooms.end(socket.id, p));

    socket.on('disconnect', () => {
      const code = rooms.leave(socket.id);
      if (code) broadcastState(code);
    });
  });
}

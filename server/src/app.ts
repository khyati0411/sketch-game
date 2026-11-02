import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import express from 'express';
import { Server } from 'socket.io';
import { SERVER_HELLO, type ServerHello } from '@sketch/shared';
import { Rooms } from './game/rooms';
import { attachGame } from './socket';

// Resolves to server/package.json from both src/ (tests, dev) and dist/ (production).
const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

export function createServer(opts: { clientDist?: string; joinBase?: string }): { httpServer: http.Server; io: Server } {
  const app = express();
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const { clientDist } = opts;
  if (clientDist && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  const httpServer = http.createServer(app);
  // Notice a dropped player within about 10 s instead of Socket.IO's default 45 s, so a player
  // who rejoins is not refused for a name still held by their old connection.
  const io = new Server(httpServer, { pingInterval: 5000, pingTimeout: 5000 });
  io.on('connection', (socket) => {
    const hello: ServerHello = { version, joinBase: opts.joinBase ?? '' };
    socket.emit(SERVER_HELLO, hello);
  });
  attachGame(io, new Rooms({}));
  return { httpServer, io };
}

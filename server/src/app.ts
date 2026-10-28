import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import express from 'express';
import { Server } from 'socket.io';
import { SERVER_HELLO, type ServerHello } from '@sketch/shared';

// Resolves to server/package.json from both src/ (tests, dev) and dist/ (production).
const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

export function createServer(opts: { clientDist?: string }): { httpServer: http.Server; io: Server } {
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
  const io = new Server(httpServer);
  io.on('connection', (socket) => {
    const hello: ServerHello = { version };
    socket.emit(SERVER_HELLO, hello);
  });
  return { httpServer, io };
}

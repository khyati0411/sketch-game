import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { SERVER_HELLO, type ServerHello } from '@sketch/shared';
import { createServer } from '../src/app';

describe('createServer', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => cleanup?.());

  it('GET /health returns ok', async () => {
    const { httpServer } = createServer({});
    const res = await request(httpServer).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('emits server:hello on socket connect', async () => {
    const { httpServer, io } = createServer({});
    await new Promise<void>((r) => httpServer.listen(0, r));
    const { port } = httpServer.address() as AddressInfo;
    const client: Socket = connect(`http://localhost:${port}`, { transports: ['websocket'] });
    cleanup = () => { client.close(); io.close(); };
    const payload = await new Promise<ServerHello>((r) => client.on(SERVER_HELLO, r));
    expect(payload.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

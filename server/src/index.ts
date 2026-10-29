import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from './app';
import { joinUrls } from './lan';

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const { httpServer } = createServer({ clientDist: path.resolve(here, '../../client/dist') });

// Listen on every interface so players on the same Wi-Fi can join.
httpServer.listen(port, '0.0.0.0', () => {
  const [local, ...lan] = joinUrls(port, os.networkInterfaces());
  console.log(`Sketch Game is running.\n  On this PC:     ${local}`);
  for (const url of lan) console.log(`  Same network:   ${url}`);
});

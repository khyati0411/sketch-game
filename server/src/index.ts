import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from './app';
import { joinUrls } from './lan';

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const [local, ...lan] = joinUrls(port, os.networkInterfaces());
// Invite links use the first same-network address so other devices can open them (US-001 AC3).
const { httpServer } = createServer({ clientDist: path.resolve(here, '../../client/dist'), joinBase: lan[0] });

// Listen on every interface so players on the same Wi-Fi can join.
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Screwdle is running.\n  On this PC:     ${local}`);
  for (const url of lan) console.log(`  Same network:   ${url}`);
});

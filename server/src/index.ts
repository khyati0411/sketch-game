import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from './app';

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const { httpServer } = createServer({ clientDist: path.resolve(here, '../../client/dist') });

httpServer.listen(port, () => {
  console.log(`sketch-game server listening on :${port}`);
});

import fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { buildSite } from '../site';

const OUT = 'site';
const read = (file: string) => fs.readFile(file, 'utf8');

const commit = process.env.GITHUB_SHA?.slice(0, 7) ?? execSync('git rev-parse --short HEAD').toString().trim();
const repoUrl = process.env.GITHUB_REPOSITORY ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}` : undefined;

await buildSite({
  backlogMd: await read('docs/sdlc/backlog.md'),
  traceMd: await read('docs/sdlc/traceability.md'),
  outDir: OUT,
  commit,
  repoUrl,
});
await fs.cp('playwright-report', `${OUT}/playwright`, { recursive: true }).catch(() => {
  console.warn('no playwright-report/ to copy');
});
console.log(`wrote ${OUT}/`);

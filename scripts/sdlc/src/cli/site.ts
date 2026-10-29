import fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { buildSite } from '../site';
import { loadItems } from '../load';
import { listPlaywrightTests, parsePlaywrightReport, readPlaywrightJson } from '../playwright-report';

const OUT = 'site';

const commit = process.env.GITHUB_SHA?.slice(0, 7) ?? execSync('git rev-parse --short HEAD').toString().trim();
const repoUrl = process.env.GITHUB_REPOSITORY ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}` : undefined;
// The site has no stories/ folder: link story files on GitHub, or back into the checkout when built locally.
const linkBase = repoUrl ? `${repoUrl}/blob/${process.env.GITHUB_SHA ?? 'main'}/docs/sdlc/` : '../docs/sdlc/';

const report = await readPlaywrightJson('test-results/results.json');

await buildSite({
  items: (await loadItems('docs/sdlc')).items,
  results: report === undefined ? new Map() : parsePlaywrightReport(report),
  run: report === undefined ? undefined : listPlaywrightTests(report),
  outDir: OUT,
  commit,
  generatedAt: new Date().toISOString(),
  linkBase,
  repoUrl,
});
await fs.cp('playwright-report', `${OUT}/playwright`, { recursive: true }).catch(() => {
  console.warn('no playwright-report/ to copy');
});
console.log(`wrote ${OUT}/`);

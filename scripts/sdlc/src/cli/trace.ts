import fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { loadItems } from '../load';
import { readPlaywrightReport } from '../playwright-report';
import { renderTraceability } from '../trace';

const { items, errors } = await loadItems('docs/sdlc');
if (errors.length) console.warn(`warning: ${errors.length} item file(s) failed to load; run sdlc:validate`);

const results = await readPlaywrightReport('test-results/results.json');
const commit = process.env.GITHUB_SHA?.slice(0, 7) ?? execSync('git rev-parse --short HEAD').toString().trim();
const generatedAt = new Date().toISOString();
await fs.writeFile('docs/sdlc/traceability.md', renderTraceability(items, results, { generatedAt, commit }));
console.log('wrote docs/sdlc/traceability.md');

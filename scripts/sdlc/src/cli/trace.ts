import fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { loadItems } from '../load';
import { parsePlaywrightReport, type TestResult } from '../playwright-report';
import { renderTraceability } from '../trace';

const REPORT = 'test-results/results.json';

const { items, errors } = await loadItems('docs/sdlc');
if (errors.length) console.warn(`warning: ${errors.length} item file(s) failed to load; run sdlc:validate`);

let results = new Map<string, TestResult>();
try {
  results = parsePlaywrightReport(JSON.parse(await fs.readFile(REPORT, 'utf8')));
} catch {
  console.warn(`no Playwright report at ${REPORT}; every automated test case shows "not run"`);
}

const commit = process.env.GITHUB_SHA?.slice(0, 7) ?? execSync('git rev-parse --short HEAD').toString().trim();
const generatedAt = new Date().toISOString();
await fs.writeFile('docs/sdlc/traceability.md', renderTraceability(items, results, { generatedAt, commit }));
console.log('wrote docs/sdlc/traceability.md');

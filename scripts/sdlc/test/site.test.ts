import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildSite } from '../src/site';
import type { TestResult } from '../src/playwright-report';
import { tempTree } from './helpers';
import { validItems, withPatch } from './fixtures';

async function build(items = validItems(), results = new Map<string, TestResult>([['TC-001', 'passed']])) {
  const outDir = path.join(tempTree({}), 'site');
  await buildSite({ items, results, outDir, commit: 'abc1234', generatedAt: '2026-10-30T09:00:00Z', linkBase: 'https://x/docs/sdlc/' });
  return (f: string) => fs.readFileSync(path.join(outDir, f), 'utf8');
}

/** The HTML of the backlog column headed `status`, up to the next column. */
const column = (html: string, status: string) => html.split(`data-status="${status}"`)[1]?.split('data-status=')[0] ?? '';

describe('buildSite', () => {
  it('links every page from a shared nav, including the Playwright report', async () => {
    const read = await build();
    for (const page of ['index.html', 'backlog.html', 'traceability.html']) {
      const html = read(page);
      expect(html).toContain('href="backlog.html"');
      expect(html).toContain('href="traceability.html"');
      expect(html).toContain('href="playwright/index.html"');
    }
  });

  it('home shows the commit, counts and pass rate of automated test cases', async () => {
    const index = (await build())('index.html');
    expect(index).toContain('abc1234');
    expect(index).toMatch(/data-kpi="stories">2</);
    expect(index).toMatch(/data-kpi="test-cases">2</);
    expect(index).toMatch(/data-kpi="pass-rate">100%</);
    expect(index).toContain('1 of 1 automated passing');
    expect(index).toMatch(/data-kpi="coverage">50%</);
  });

  it('home gives each release a status from its stories', async () => {
    const index = (await build())('index.html');
    expect(index).toMatch(/data-release="R1"[\s\S]*?In progress/);
    expect(index).toMatch(/data-release="R2"[\s\S]*?Not started/);
    const allDone = (await build(withPatch('US-002', (s) => ({ ...s, status: 'Done' }))))('index.html');
    expect(allDone).toMatch(/data-release="R1"[\s\S]*?Done/);
  });

  it('backlog places each story card in its status column, linked to its file', async () => {
    const backlog = (await build())('backlog.html');
    expect(column(backlog, 'Done')).toContain('href="https://x/docs/sdlc/stories/US-001.md"');
    expect(column(backlog, 'Draft')).toContain('US-002');
    expect(column(backlog, 'Done')).not.toContain('US-002');
  });

  it('traceability shows a labelled result chip per test case', async () => {
    const trace = (await build(validItems(), new Map([['TC-001', 'failed']])))('traceability.html');
    expect(trace).toMatch(/TC-001[\s\S]*?✗ Failed/);
    expect(trace).toMatch(/TC-002[\s\S]*?Manual/);
    expect(trace).toMatch(/US-002[\s\S]*?No test cases/);
    const notRun = (await build(validItems(), new Map()))('traceability.html');
    expect(notRun).toMatch(/TC-001[\s\S]*?○ Not run/);
  });

  it('escapes item titles', async () => {
    const read = await build(withPatch('US-001', (s) => ({ ...s, title: '<b>Room</b> & "lobby"' })));
    for (const page of ['backlog.html', 'traceability.html']) {
      expect(read(page)).toContain('&lt;b&gt;Room&lt;/b&gt; &amp; &quot;lobby&quot;');
      expect(read(page)).not.toContain('<b>Room</b>');
    }
  });
});

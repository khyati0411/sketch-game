import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildSite } from '../src/site';
import type { TestResult } from '../src/playwright-report';
import type { Item } from '../src/schema';
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
    for (const page of ['index.html', 'initiatives.html', 'backlog.html', 'traceability.html', 'tests.html']) {
      const html = read(page);
      expect(html).toContain('href="initiatives.html"');
      expect(html).toContain('href="backlog.html"');
      expect(html).toContain('href="traceability.html"');
      expect(html).toContain('href="tests.html"');
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

  it('initiatives page nests initiative → epic → story, each linked to its file', async () => {
    const html = (await build())('initiatives.html');
    const init = html.split('data-initiative="INIT-001"')[1] ?? '';
    expect(init).toContain('href="https://x/docs/sdlc/initiatives/INIT-001.md"');
    const epic = init.split('data-epic="EP-001"')[1] ?? '';
    expect(epic).toContain('href="https://x/docs/sdlc/epics/EP-001.md"');
    expect(epic).toMatch(/data-story="US-001"[\s\S]*data-story="US-002"/);
    expect(epic).toContain('href="https://x/docs/sdlc/stories/US-001.md"');
  });

  it('initiatives page shows status and progress at each level', async () => {
    const html = (await build())('initiatives.html');
    expect(html).toMatch(/data-initiative="INIT-001"[\s\S]*?Approved/);
    expect(html).toMatch(/data-epic="EP-001"[\s\S]*?R1[\s\S]*?In Progress/);
    expect(html).toContain('1 of 2 stories done');
    expect(html).toMatch(/data-story="US-001"[\s\S]*?Done[\s\S]*?2 test cases/);
  });

  it('initiatives page shows initiatives and epics that have no children yet', async () => {
    const items = [
      ...validItems(),
      { id: 'INIT-002', type: 'initiative', title: 'Later idea', status: 'Draft' },
      { id: 'EP-002', type: 'epic', title: 'Empty epic', parent: 'INIT-001', release: 'R2', status: 'Draft' },
    ] as Item[];
    const html = (await build(items))('initiatives.html');
    expect(html.split('data-initiative="INIT-002"')[1]).toContain('No epics yet');
    expect(html.split('data-epic="EP-002"')[1]).toContain('No stories yet');
  });

  it('initiatives page says so when there are no initiatives', async () => {
    expect((await build([]))('initiatives.html')).toContain('No initiatives yet');
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

  it('test report lists each test with a result chip and links the full Playwright report', async () => {
    const outDir = path.join(tempTree({}), 'site');
    await buildSite({
      items: validItems(), results: new Map(), outDir, commit: 'abc1234', generatedAt: '2026-10-30T09:00:00Z', linkBase: '',
      run: { startedAt: '2026-10-30T08:59:00.000Z', durationMs: 4200, tests: [
        { title: 'TC-001 room link', file: 'room.spec.ts', project: 'chromium', result: 'passed', durationMs: 800, retried: true },
        { title: 'smoke: <app> loads', file: 'smoke.spec.ts', project: 'chromium', result: 'failed', durationMs: 30000, retried: false, error: 'Timeout' },
      ] },
    });
    const tests = fs.readFileSync(path.join(outDir, 'tests.html'), 'utf8');
    expect(tests).toContain('href="playwright/index.html"');
    expect(tests).toMatch(/TC-001[\s\S]*?Passed on retry[\s\S]*?✓ Passed/);
    expect(tests).toMatch(/smoke: &lt;app&gt; loads[\s\S]*?Timeout[\s\S]*?✗ Failed/);
    expect(tests).toContain('0.8 s');
    expect(fs.readFileSync(path.join(outDir, 'index.html'), 'utf8')).toContain('href="tests.html"');
  });

  it('test report says so when there is no run', async () => {
    expect((await build())('tests.html')).toContain('No test run yet');
  });

  it('escapes item titles', async () => {
    const read = await build(withPatch('US-001', (s) => ({ ...s, title: '<b>Room</b> & "lobby"' })));
    for (const page of ['initiatives.html', 'backlog.html', 'traceability.html']) {
      expect(read(page)).toContain('&lt;b&gt;Room&lt;/b&gt; &amp; &quot;lobby&quot;');
      expect(read(page)).not.toContain('<b>Room</b>');
    }
  });
});

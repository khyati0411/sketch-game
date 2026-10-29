import { describe, it, expect } from 'vitest';
import { listPlaywrightTests, parsePlaywrightReport } from '../src/playwright-report';
import { renderTraceability } from '../src/trace';
import { validItems } from './fixtures';

const spec = (title: string, ...attempts: string[]) => ({ title, tests: [{ results: attempts.map((status) => ({ status })) }] });
const meta = { generatedAt: '2026-10-28T12:00:00Z', commit: 'abc1234' };

describe('parsePlaywrightReport', () => {
  it('reads nested suites and takes the last attempt', () => {
    const report = {
      suites: [{ title: 'room.spec.ts', specs: [spec('TC-001 room link', 'failed', 'passed')], suites: [{ title: 'describe', specs: [spec('TC-005 nested', 'timedOut')] }] }],
    };
    const results = parsePlaywrightReport(report);
    expect(results.get('TC-001')).toBe('passed');
    expect(results.get('TC-005')).toBe('failed');
  });

  it('lets failed win when one TC has several specs', () => {
    const report = { suites: [{ title: 'a', specs: [spec('TC-001 a', 'passed'), spec('TC-001 b', 'failed'), spec('TC-001 c', 'passed')] }] };
    expect(parsePlaywrightReport(report).get('TC-001')).toBe('failed');
  });

  it('ignores specs without a TC id', () => {
    expect(parsePlaywrightReport({ suites: [{ title: 's', specs: [spec('smoke: app loads', 'passed')] }] }).size).toBe(0);
  });
});

describe('renderTraceability', () => {
  it('shows not run for every automated TC when there are no results', () => {
    const md = renderTraceability(validItems(), new Map(), meta);
    expect(md).toContain('| INIT-001 | EP-001 | US-001 | Done | TC-001 | automated | not run |');
  });

  it('shows the result and marks manual test cases', () => {
    const md = renderTraceability(validItems(), new Map([['TC-001', 'passed']]), meta);
    expect(md).toContain('| TC-001 | automated | passed |');
    expect(md).toContain('| TC-002 | manual | manual |');
  });

  it('lists stories without test cases', () => {
    expect(renderTraceability(validItems(), new Map(), meta)).toContain('| INIT-001 | EP-001 | US-002 | Draft | — | — | — |');
  });

  it('summarizes results and coverage', () => {
    const md = renderTraceability(validItems(), new Map([['TC-001', 'failed']]), meta);
    expect(md).toContain('Passed: 0 · Failed: 1 · Skipped: 0 · Not run: 0 · Manual: 1');
    expect(md).toContain('Coverage: 1/2 stories have test cases (50%)');
    expect(md).toContain('abc1234');
  });

  it('handles an empty item set', () => {
    expect(renderTraceability([], new Map(), meta)).toContain('Coverage: n/a');
  });
});

describe('listPlaywrightTests', () => {
  const run = (title: string, file: string, ...attempts: { status: string; duration: number; error?: { message: string } }[]) =>
    ({ title, file, tests: [{ projectName: 'chromium', results: attempts }] });

  it('lists every test, with or without a TC id, with its last attempt', () => {
    const report = {
      stats: { startTime: '2026-10-30T09:00:00.000Z', duration: 4200 },
      suites: [{ title: 'room.spec.ts', specs: [run('TC-001 room link', 'room.spec.ts', { status: 'failed', duration: 900 }, { status: 'passed', duration: 800 })],
        suites: [{ title: 'smoke', specs: [run('smoke: app loads', 'smoke.spec.ts', { status: 'timedOut', duration: 30000, error: { message: 'Timeout\nat line 3' } })] }] }],
    };
    const { startedAt, durationMs, tests } = listPlaywrightTests(report);
    expect(startedAt).toBe('2026-10-30T09:00:00.000Z');
    expect(durationMs).toBe(4200);
    expect(tests).toEqual([
      { title: 'TC-001 room link', file: 'room.spec.ts', project: 'chromium', result: 'passed', durationMs: 800, retried: true, error: undefined },
      { title: 'smoke: app loads', file: 'smoke.spec.ts', project: 'chromium', result: 'failed', durationMs: 30000, retried: false, error: 'Timeout' },
    ]);
  });
});

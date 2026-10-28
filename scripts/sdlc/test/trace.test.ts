import { describe, it, expect } from 'vitest';
import { parsePlaywrightReport } from '../src/playwright-report';
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

import fs from 'node:fs/promises';

export type TestResult = 'passed' | 'failed' | 'skipped' | 'not run';

/** One Playwright test (a spec in one project) as it ended in the run. */
export type TestRun = {
  title: string;
  file: string;
  project: string;
  result: TestResult;
  durationMs: number;
  /** An earlier attempt failed before the last one. */
  retried: boolean;
  /** The first line of the last attempt's error. */
  error?: string;
};
export type RunSummary = { startedAt?: string; durationMs?: number; tests: TestRun[] };

type Attempt = { status: string; duration?: number; error?: { message?: string } };
type Suite = { specs?: Spec[]; suites?: Suite[] };
type Spec = { title: string; file?: string; tests?: { projectName?: string; results?: Attempt[] }[] };
type Report = { stats?: { startTime?: string; duration?: number }; suites?: Suite[] };

const TC_PREFIX = /^(TC-\d{3})\b/;
const RANK: Record<TestResult, number> = { 'not run': 0, skipped: 1, passed: 2, failed: 3 };
const ANSI = /\u001b\[[0-9;]*m/g;

function toResult(status: string | undefined): TestResult {
  if (status === 'passed' || status === 'skipped') return status;
  if (status === undefined) return 'not run';
  return 'failed'; // failed, timedOut, interrupted
}

function eachSpec(json: unknown, visit: (spec: Spec) => void): void {
  const walk = (suite: Suite) => {
    for (const spec of suite.specs ?? []) visit(spec);
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of (json as Report).suites ?? []) walk(suite);
}

/** Reads Playwright's JSON report at `file`, or returns undefined (with a warning) when there is none. */
export async function readPlaywrightJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    console.warn(`no Playwright report at ${file}; every automated test case shows "not run"`);
    return undefined;
  }
}

/** Reads Playwright's JSON report at `file`; with no report, every automated test case counts as not run. */
export async function readPlaywrightReport(file: string): Promise<Map<string, TestResult>> {
  const json = await readPlaywrightJson(file);
  return json === undefined ? new Map() : parsePlaywrightReport(json);
}

/** Maps TC id → result from Playwright's JSON reporter output. The last attempt counts; across specs and projects, failed wins. */
export function parsePlaywrightReport(json: unknown): Map<string, TestResult> {
  const results = new Map<string, TestResult>();
  eachSpec(json, (spec) => {
    const id = TC_PREFIX.exec(spec.title)?.[1];
    if (!id) return;
    for (const test of spec.tests ?? []) {
      const result = toResult(test.results?.at(-1)?.status);
      const prev = results.get(id);
      if (!prev || RANK[result] > RANK[prev]) results.set(id, result);
    }
  });
  return results;
}

/** Every test in the run, TC id or not, as its last attempt ended. */
export function listPlaywrightTests(json: unknown): RunSummary {
  const tests: TestRun[] = [];
  eachSpec(json, (spec) => {
    for (const test of spec.tests ?? []) {
      const attempts = test.results ?? [];
      const last = attempts.at(-1);
      const result = toResult(last?.status);
      tests.push({
        title: spec.title,
        file: spec.file ?? '',
        project: test.projectName ?? '',
        result,
        durationMs: last?.duration ?? 0,
        retried: attempts.slice(0, -1).some((a) => toResult(a.status) === 'failed'),
        error: result === 'failed' ? last?.error?.message?.replace(ANSI, '').split('\n')[0] : undefined,
      });
    }
  });
  const { stats } = json as Report;
  return { startedAt: stats?.startTime, durationMs: stats?.duration, tests };
}

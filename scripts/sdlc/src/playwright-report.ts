export type TestResult = 'passed' | 'failed' | 'skipped' | 'not run';

type Suite = { specs?: Spec[]; suites?: Suite[] };
type Spec = { title: string; tests?: { results?: { status: string }[] }[] };

const TC_PREFIX = /^(TC-\d{3})\b/;
const RANK: Record<TestResult, number> = { 'not run': 0, skipped: 1, passed: 2, failed: 3 };

function toResult(status: string | undefined): TestResult {
  if (status === 'passed' || status === 'skipped') return status;
  if (status === undefined) return 'not run';
  return 'failed'; // failed, timedOut, interrupted
}

/** Maps TC id → result from Playwright's JSON reporter output. The last attempt counts; across specs and projects, failed wins. */
export function parsePlaywrightReport(json: unknown): Map<string, TestResult> {
  const results = new Map<string, TestResult>();
  const record = (id: string, result: TestResult) => {
    const prev = results.get(id);
    if (!prev || RANK[result] > RANK[prev]) results.set(id, result);
  };
  const walk = (suite: Suite) => {
    for (const spec of suite.specs ?? []) {
      const id = TC_PREFIX.exec(spec.title)?.[1];
      if (!id) continue;
      for (const test of spec.tests ?? []) record(id, toResult(test.results?.at(-1)?.status));
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of (json as Suite).suites ?? []) walk(suite);
  return results;
}

import fs from 'node:fs/promises';
import fg from 'fast-glob';

// test('TC-001 …'), test.only("TC-001 …"), test.skip(`TC-001 …`), test.fixme(…), test.fail(…)
const TEST_TITLE = /\btest(?:\.only|\.skip|\.fixme|\.fail)?\(\s*(['"`])(TC-\d{3})\b/g;

/** Maps each TC id found at the start of a Playwright test title to the spec file (relative to testDir) of every test using it, one entry per test. */
export async function collectE2eTestIds(testDir: string): Promise<Map<string, string[]>> {
  const ids = new Map<string, string[]>();
  const files = (await fg('**/*.spec.ts', { cwd: testDir }).catch(() => [])).sort();
  for (const file of files) {
    const source = await fs.readFile(`${testDir}/${file}`, 'utf8');
    for (const [, , id] of source.matchAll(TEST_TITLE)) {
      ids.set(id, [...(ids.get(id) ?? []), file]);
    }
  }
  return ids;
}

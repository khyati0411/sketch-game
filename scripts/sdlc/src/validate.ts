import type { Item, Story, TestCase } from './schema';

export type ValidationError = { rule: string; id?: string; file?: string; message: string };

const ACTIVE_STATUSES = new Set(['In Progress', 'In Review', 'Done']);

/**
 * `baseFiles` (item paths relative to docs/sdlc that exist on the PR's base branch) turns on the
 * tests-on-base gate: an active story's test cases must already be merged before its code.
 */
export function validate(
  items: Item[],
  e2e: Map<string, string[]>,
  { baseFiles }: { baseFiles?: Set<string> } = {},
): ValidationError[] {
  const errors: ValidationError[] = [];
  const byId = new Map<string, Item>();
  const fileOf = (item: Item) => (item as Item & { file?: string }).file;
  const err = (rule: string, item: Item | undefined, message: string, id = item?.id) =>
    errors.push({ rule, id, ...(item && fileOf(item) ? { file: fileOf(item) } : {}), message });

  for (const item of items) {
    if (byId.has(item.id)) err('unique-id', item, `${item.id} is defined more than once`);
    else byId.set(item.id, item);
  }

  const isType = (id: string, type: Item['type']) => byId.get(id)?.type === type;
  const stories = items.filter((i): i is Story => i.type === 'story');
  const testCases = items.filter((i): i is TestCase => i.type === 'test-case');
  const testsOf = (storyId: string) => testCases.filter((tc) => tc.parent.includes(storyId)).map((tc) => tc.id);

  for (const item of items) {
    if (item.type === 'epic' && !isType(item.parent, 'initiative'))
      err('parent-type', item, `parent ${item.parent} is not an existing initiative`);
    if (item.type === 'story' && !isType(item.parent, 'epic'))
      err('parent-type', item, `parent ${item.parent} is not an existing epic`);
    if (item.type === 'test-case')
      for (const p of item.parent.filter((p) => !isType(p, 'story')))
        err('parent-type', item, `parent ${p} is not an existing story`);
    if (item.type === 'adr')
      for (const s of item.stories.filter((s) => !isType(s, 'story')))
        err('link-resolves', item, `story ${s} does not exist`);
  }

  for (const story of stories) {
    for (const d of (story.links?.design ?? []).filter((d) => !isType(d, 'adr')))
      err('link-resolves', story, `design ${d} does not exist`);
    for (const t of (story.links?.tests ?? []).filter((t) => !isType(t, 'test-case')))
      err('link-resolves', story, `test ${t} does not exist`);
    if (story.sprint) {
      const sprint = byId.get(story.sprint);
      if (sprint?.type !== 'sprint') err('link-resolves', story, `sprint ${story.sprint} does not exist`);
      else if (sprint.release !== story.release)
        err('sprint-release', story, `story is ${story.release} but ${sprint.id} is ${sprint.release}`);
    }

    const actual = testsOf(story.id);
    if (story.links?.tests) {
      const listed = [...story.links.tests].sort();
      if (listed.join() !== [...actual].sort().join())
        err('story-tests-consistent', story, `links.tests [${listed}] differs from test cases with this parent [${actual}]`);
    }
    if (ACTIVE_STATUSES.has(story.status) && actual.length === 0)
      err('story-has-tests', story, `story is ${story.status} but has no test cases`);
    if (baseFiles && ACTIVE_STATUSES.has(story.status)) {
      const missing = testCases
        .filter((tc) => tc.parent.includes(story.id) && !baseFiles.has(fileOf(tc) ?? ''))
        .map((tc) => tc.id);
      if (missing.length)
        err('tests-on-base', story, `story is ${story.status} but test cases [${missing}] are not merged to the base branch yet`);
    }
  }

  for (const tc of testCases) {
    const allDone = tc.parent.every((p) => (byId.get(p) as Story | undefined)?.status === 'Done');
    const tests = e2e.get(tc.id) ?? [];
    if (tc.automation === 'automated' && allDone && tests.length === 0)
      err('automated-has-e2e', tc, `automated test case of a Done story has no Playwright test titled "${tc.id} …"`);
    if (tc.automation === 'automated' && tests.length > 1)
      err('e2e-unique', tc, `${tests.length} Playwright tests are titled "${tc.id} …" (${tests.join(', ')}); expected exactly one`);
    if (tc.automation === 'manual' && tests.length > 0)
      err('manual-has-no-e2e', tc, `manual test case has a Playwright test in ${tests.join(', ')}; make it automated or drop the test`);
  }

  for (const [id, files] of e2e)
    if (!isType(id, 'test-case')) err('e2e-known-tc', undefined, `${files.join(', ')} references unknown test case ${id}`, id);

  return errors;
}

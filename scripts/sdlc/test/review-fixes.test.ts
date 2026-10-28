import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { renderBacklog } from '../src/backlog';
import { collectE2eTestIds } from '../src/e2e-ids';
import { loadItems } from '../src/load';
import { validate } from '../src/validate';
import type { Item } from '../src/schema';
import { tempTree } from './helpers';
import { validItems, validE2e, withPatch } from './fixtures';

const rules = (errors: { rule: string; id?: string }[]) => errors.map((e) => [e.rule, e.id]);

describe('backlog link base', () => {
  it('prefixes story links with linkBase', () => {
    const md = renderBacklog(validItems(), { linkBase: 'https://github.com/o/r/blob/main/docs/sdlc/' });
    expect(md).toContain('[US-001](https://github.com/o/r/blob/main/docs/sdlc/stories/US-001.md)');
  });
});

describe('one automated test per test case', () => {
  it('counts every occurrence, including test.fixme and test.fail', async () => {
    const root = tempTree({
      'a.spec.ts': `test('TC-005 a', () => {});\ntest('TC-005 b', () => {});\ntest.fixme('TC-006 later', () => {});\ntest.fail('TC-007 known bug', () => {});`,
    });
    const ids = await collectE2eTestIds(root);
    expect(ids.get('TC-005')).toEqual(['a.spec.ts', 'a.spec.ts']);
    expect(ids.has('TC-006')).toBe(true);
    expect(ids.has('TC-007')).toBe(true);
  });

  it('e2e-unique flags a TC with more than one test', () => {
    const e2e = validE2e().set('TC-001', ['a.spec.ts', 'b.spec.ts']);
    expect(rules(validate(validItems(), e2e))).toContainEqual(['e2e-unique', 'TC-001']);
  });

  it('manual-has-no-e2e flags a manual TC that has a test', () => {
    const e2e = validE2e().set('TC-002', ['a.spec.ts']);
    expect(rules(validate(validItems(), e2e))).toContainEqual(['manual-has-no-e2e', 'TC-002']);
  });
});

describe('tests-on-base gate', () => {
  const withFiles = (items: Item[]) => items.map((i) => ({ ...i, file: `x/${i.id}.md` }));

  it('flags an active story whose test case is not on the base branch', () => {
    const items = withFiles(validItems());
    const baseFiles = new Set(['x/TC-002.md']); // TC-001 only exists on this branch
    expect(rules(validate(items, validE2e(), { baseFiles }))).toEqual([['tests-on-base', 'US-001']]);
  });

  it('passes when every test case of active stories is on the base branch', () => {
    const items = withFiles(validItems());
    expect(validate(items, validE2e(), { baseFiles: new Set(['x/TC-001.md', 'x/TC-002.md']) })).toEqual([]);
  });

  it('ignores stories that are not active yet', () => {
    const items = withFiles(withPatch('US-001', (s) => ({ ...s, status: 'Ready' })));
    expect(validate(items, new Map(), { baseFiles: new Set() })).toEqual([]);
  });
});

describe('templates', () => {
  it('story template loads cleanly once its XXX placeholders are filled', async () => {
    const template = fs.readFileSync(path.resolve(__dirname, '../../../docs/sdlc/templates/story.md'), 'utf8');
    const root = tempTree({ 'stories/US-001.md': template.replaceAll('XXX', '001') });
    expect((await loadItems(root)).errors).toEqual([]);
  });
});

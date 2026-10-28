import { describe, it, expect } from 'vitest';
import { validate } from '../src/validate';
import type { Item } from '../src/schema';
import { validItems, validE2e, withPatch } from './fixtures';

const rulesFor = (items: Item[], e2e = validE2e()) => validate(items, e2e).map((e) => [e.rule, e.id]);

describe('validate', () => {
  it('accepts a consistent item set', () => {
    expect(validate(validItems(), validE2e())).toEqual([]);
  });

  it('unique-id', () => {
    const items = [...validItems(), { id: 'US-002', type: 'story', title: 'dup', parent: 'EP-001', release: 'R1', status: 'Draft' } as Item];
    expect(rulesFor(items)).toContainEqual(['unique-id', 'US-002']);
  });

  it('parent-type: missing parent', () => {
    expect(rulesFor(withPatch('EP-001', (e) => ({ ...e, parent: 'INIT-009' })))).toContainEqual(['parent-type', 'EP-001']);
  });

  it('parent-type: test case parent that is not a story', () => {
    const items = withPatch('TC-002', (t) => ({ ...t, parent: ['US-001', 'US-009'] }));
    expect(rulesFor(items)).toContainEqual(['parent-type', 'TC-002']);
  });

  it('link-resolves: design, sprint and ADR stories', () => {
    expect(rulesFor(withPatch('US-001', (s) => ({ ...s, links: { ...s.links, design: ['ADR-009'] } })))).toContainEqual(['link-resolves', 'US-001']);
    expect(rulesFor(withPatch('US-002', (s) => ({ ...s, sprint: 'SPRINT-09' })))).toContainEqual(['link-resolves', 'US-002']);
    expect(rulesFor(withPatch('ADR-001', (a) => ({ ...a, stories: ['US-009'] })))).toContainEqual(['link-resolves', 'ADR-001']);
  });

  it('story-tests-consistent', () => {
    expect(rulesFor(withPatch('US-001', (s) => ({ ...s, links: { ...s.links, tests: ['TC-001'] } })))).toContainEqual(['story-tests-consistent', 'US-001']);
  });

  it('story-has-tests', () => {
    expect(rulesFor(withPatch('US-002', (s) => ({ ...s, status: 'In Progress' })))).toContainEqual(['story-has-tests', 'US-002']);
  });

  it('automated-has-e2e', () => {
    expect(rulesFor(validItems(), new Map())).toContainEqual(['automated-has-e2e', 'TC-001']);
  });

  it('automated-has-e2e ignores test cases of unfinished stories', () => {
    const items = withPatch('US-001', (s) => ({ ...s, status: 'In Progress' }));
    expect(validate(items, new Map())).toEqual([]);
  });

  it('e2e-known-tc', () => {
    const e2e = validE2e().set('TC-099', ['tests/e2e/x.spec.ts']);
    expect(rulesFor(validItems(), e2e)).toContainEqual(['e2e-known-tc', 'TC-099']);
  });

  it('sprint-release', () => {
    expect(rulesFor(withPatch('SPRINT-01', (s) => ({ ...s, release: 'R2' })))).toContainEqual(['sprint-release', 'US-001']);
  });
});

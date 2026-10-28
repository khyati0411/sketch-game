import type { Item } from '../src/schema';

/** A small, fully valid item set: one of each type, linked together. */
export function validItems(): Item[] {
  return [
    { id: 'INIT-001', type: 'initiative', title: 'Game', status: 'Approved' },
    { id: 'EP-001', type: 'epic', title: 'Core loop', parent: 'INIT-001', release: 'R1', status: 'In Progress' },
    { id: 'SPRINT-01', type: 'sprint', title: 'Sprint 1', release: 'R1', goal: 'Play a round', start: '2026-11-02', end: '2026-11-15', status: 'Active' },
    {
      id: 'US-001', type: 'story', title: 'Create room', parent: 'EP-001', release: 'R1', sprint: 'SPRINT-01',
      status: 'Done', points: 3, links: { tests: ['TC-001', 'TC-002'], design: ['ADR-001'] },
    },
    { id: 'US-002', type: 'story', title: 'Join room', parent: 'EP-001', release: 'R1', status: 'Draft' },
    { id: 'ADR-001', type: 'adr', title: 'Rooms in memory', status: 'Accepted', stories: ['US-001'] },
    { id: 'TC-001', type: 'test-case', title: 'Room link', parent: ['US-001'], priority: 'High', testType: 'functional', automation: 'automated', status: 'Ready' },
    { id: 'TC-002', type: 'test-case', title: 'Looks right', parent: ['US-001'], priority: 'Low', testType: 'functional', automation: 'manual', manualReason: 'visual', status: 'Ready' },
  ];
}

export const validE2e = () => new Map([['TC-001', ['tests/e2e/room.spec.ts']]]);

/** Returns validItems() with the item `id` replaced by `patch(item)`. */
export function withPatch(id: string, patch: (item: any) => any): Item[] {
  return validItems().map((i) => (i.id === id ? patch(structuredClone(i)) : i));
}

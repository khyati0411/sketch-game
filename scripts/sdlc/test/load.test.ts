import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadItems } from '../src/load';
import { tempTree, md, story } from './helpers';

const repoSdlc = path.resolve(__dirname, '../../../docs/sdlc');

describe('loadItems', () => {
  it('loads a valid story', async () => {
    const root = tempTree({ 'stories/US-001.md': story() });
    const { items, errors } = await loadItems(root);
    expect(errors).toEqual([]);
    expect(items[0]).toMatchObject({ id: 'US-001', type: 'story', parent: 'EP-001', file: 'stories/US-001.md' });
  });

  it('parses CRLF files the same as LF', async () => {
    const lf = await loadItems(tempTree({ 'stories/US-001.md': story() }));
    const crlf = await loadItems(tempTree({ 'stories/US-001.md': story().replace(/\n/g, '\r\n') }));
    expect(crlf.errors).toEqual([]);
    expect(crlf.items).toEqual(lf.items);
  });

  it('reports bad YAML with file path, no throw', async () => {
    const root = tempTree({ 'stories/US-002.md': '---\nid: US-002\ntitle: [unclosed\n---\n' });
    const { items, errors } = await loadItems(root);
    expect(items).toEqual([]);
    expect(errors[0].file.endsWith('US-002.md')).toBe(true);
  });

  it('reports missing required field', async () => {
    const root = tempTree({ 'stories/US-003.md': md('id: US-003\ntype: story\ntitle: T\nrelease: R1\nstatus: Draft') });
    const { errors } = await loadItems(root);
    expect(errors[0].message).toContain('parent');
  });

  it('rejects id not matching its type', async () => {
    const root = tempTree({ 'stories/x.md': story('TC-001') });
    const { errors } = await loadItems(root);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('id');
  });

  it('normalizes unquoted sprint dates', async () => {
    const root = tempTree({
      'sprints/SPRINT-01.md': md('id: SPRINT-01\ntype: sprint\ntitle: S1\nrelease: R1\ngoal: G\nstart: 2026-11-02\nend: 2026-11-15\nstatus: Planned'),
    });
    const { items, errors } = await loadItems(root);
    expect(errors).toEqual([]);
    expect(items[0]).toMatchObject({ start: '2026-11-02', end: '2026-11-15' });
  });

  it('requires manualReason for manual test cases', async () => {
    const tc = (extra: string) =>
      md(`id: TC-001\ntype: test-case\ntitle: T\nparent: [US-001]\npriority: High\ntestType: functional\nautomation: manual\nstatus: Draft\n${extra}`);
    expect((await loadItems(tempTree({ 'test-cases/TC-001.md': tc('') }))).errors[0].message).toContain('manualReason');
    expect((await loadItems(tempTree({ 'test-cases/TC-001.md': tc('manualReason: needs a human eye') }))).errors).toEqual([]);
  });

  it('skips templates/ and README', async () => {
    const { items, errors } = await loadItems(repoSdlc);
    expect(errors).toEqual([]);
    expect(items.filter((i) => i.id.includes('XXX'))).toEqual([]);
  });
});

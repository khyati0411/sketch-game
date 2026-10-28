import { describe, it, expect } from 'vitest';
import { collectE2eTestIds } from '../src/e2e-ids';
import { tempTree } from './helpers';

describe('collectE2eTestIds', () => {
  it('maps TC ids to files across quote styles, including test.skip', async () => {
    const root = tempTree({
      'a.spec.ts': `test('TC-001 single', async () => {});\ntest("TC-002 double", async () => {});`,
      'nested/b.spec.ts': 'test(`TC-003 backtick`, async () => {});\ntest.skip(\'TC-001 again\', async () => {});',
    });
    const ids = await collectE2eTestIds(root);
    expect(ids.get('TC-001')).toEqual(['a.spec.ts', 'nested/b.spec.ts']);
    expect(ids.get('TC-002')).toEqual(['a.spec.ts']);
    expect(ids.get('TC-003')).toEqual(['nested/b.spec.ts']);
  });

  it('ignores titles without a TC prefix and TC ids not at the start', async () => {
    const root = tempTree({ 'smoke.spec.ts': `test('smoke: app loads', () => {});\ntest('covers TC-004', () => {});` });
    expect((await collectE2eTestIds(root)).size).toBe(0);
  });

  it('returns an empty map when the test dir does not exist', async () => {
    expect((await collectE2eTestIds('does/not/exist')).size).toBe(0);
  });
});

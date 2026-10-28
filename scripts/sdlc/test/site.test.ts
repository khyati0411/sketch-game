import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildSite } from '../src/site';
import { tempTree } from './helpers';

describe('buildSite', () => {
  it('writes index, backlog and traceability pages', async () => {
    const outDir = path.join(tempTree({}), 'site');
    await buildSite({
      backlogMd: '# Backlog\n\n## R1\n',
      traceMd: '# Traceability matrix\n\n| Story | Result |\n|---|---|\n| US-001 | passed |\n',
      outDir,
      commit: 'abc1234',
    });
    const read = (f: string) => fs.readFileSync(path.join(outDir, f), 'utf8');
    expect(read('traceability.html')).toContain('<table>');
    expect(read('backlog.html')).toContain('<h1>Backlog</h1>');
    const index = read('index.html');
    expect(index).toContain('href="backlog.html"');
    expect(index).toContain('href="traceability.html"');
    expect(index).toContain('href="playwright/index.html"');
    expect(index).toContain('abc1234');
  });
});

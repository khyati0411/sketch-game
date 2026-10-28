import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Writes `files` (relative path → content) into a fresh temp dir and returns its path. */
export function tempTree(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}

export const md = (frontmatter: string, body = 'Body.') => `---\n${frontmatter.trim()}\n---\n\n${body}\n`;

export const story = (id = 'US-001', extra = '') =>
  md(`id: ${id}\ntype: story\ntitle: A story\nparent: EP-001\nrelease: R1\nstatus: Draft\n${extra}`);

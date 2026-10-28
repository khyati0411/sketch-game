import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { ITEM_SCHEMAS, type Item, type LoadedItem } from './schema';

export type LoadError = { file: string; message: string };

// Files under docs/sdlc that are not items: docs, templates, generated views, release notes.
const IGNORE = ['templates/**', 'design/architecture.md', 'releases/**', 'README.md', 'test-plan.md', 'backlog.md', 'traceability.md'];

export async function loadItems(sdlcRoot: string): Promise<{ items: LoadedItem[]; errors: LoadError[] }> {
  const files = (await fg('**/*.md', { cwd: sdlcRoot, ignore: IGNORE })).sort();
  const items: LoadedItem[] = [];
  const errors: LoadError[] = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(sdlcRoot, file), 'utf8');
    let data: unknown;
    try {
      // Passing options disables gray-matter's content cache; normalize CRLF from Windows checkouts.
      data = matter(raw.replace(/\r\n/g, '\n'), {}).data;
    } catch (e) {
      errors.push({ file, message: `invalid frontmatter: ${(e as Error).message.split('\n')[0]}` });
      continue;
    }
    const type = (data as { type?: unknown }).type;
    const schema = ITEM_SCHEMAS[type as keyof typeof ITEM_SCHEMAS];
    if (!schema) {
      errors.push({ file, message: `type: must be one of ${Object.keys(ITEM_SCHEMAS).join(', ')}` });
      continue;
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const message = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
      errors.push({ file, message });
      continue;
    }
    items.push({ ...(parsed.data as Item), file });
  }
  return { items, errors };
}

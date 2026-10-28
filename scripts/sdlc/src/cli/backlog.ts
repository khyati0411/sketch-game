import fs from 'node:fs/promises';
import { loadItems } from '../load';
import { renderBacklog } from '../backlog';

const { items, errors } = await loadItems('docs/sdlc');
if (errors.length) console.warn(`warning: ${errors.length} item file(s) failed to load; run sdlc:validate`);
await fs.writeFile('docs/sdlc/backlog.md', renderBacklog(items));
console.log(`wrote docs/sdlc/backlog.md (${items.length} items)`);

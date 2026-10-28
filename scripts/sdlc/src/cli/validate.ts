import { loadItems } from '../load';
import { collectE2eTestIds } from '../e2e-ids';
import { validate, type ValidationError } from '../validate';

const { items, errors: loadErrors } = await loadItems('docs/sdlc');
const errors: ValidationError[] = [
  ...loadErrors.map((e) => ({ rule: 'load', file: e.file, message: e.message })),
  ...validate(items, await collectE2eTestIds('tests/e2e')),
];

if (errors.length === 0) {
  console.log(`SDLC OK: ${items.length} items`);
} else {
  const byFile = Map.groupBy(errors, (e) => e.file ?? '(tests)');
  for (const [file, list] of byFile) {
    console.error(file);
    for (const e of list) console.error(`  [${e.rule}] ${e.id ? `${e.id}: ` : ''}${e.message}`);
  }
  console.error(`\nSDLC FAILED: ${errors.length} problem(s)`);
  process.exit(1);
}

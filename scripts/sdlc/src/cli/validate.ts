import { execFileSync } from 'node:child_process';
import { loadItems } from '../load';
import { collectE2eTestIds } from '../e2e-ids';
import { validate, type ValidationError } from '../validate';

const SDLC_ROOT = 'docs/sdlc';

// `--base <git ref>` (used by CI on pull requests) enables the tests-on-base gate.
const baseIdx = process.argv.indexOf('--base');
const baseRef = baseIdx > -1 ? process.argv[baseIdx + 1] : undefined;
const baseFiles = baseRef
  ? new Set(
      execFileSync('git', ['ls-tree', '-r', '--name-only', baseRef, `${SDLC_ROOT}/`])
        .toString()
        .split('\n')
        .filter(Boolean)
        .map((f) => f.slice(SDLC_ROOT.length + 1)),
    )
  : undefined;

const { items, errors: loadErrors } = await loadItems(SDLC_ROOT);
const errors: ValidationError[] = [
  ...loadErrors.map((e) => ({ rule: 'load', file: e.file, message: e.message })),
  ...validate(items, await collectE2eTestIds('tests/e2e'), { baseFiles }),
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

// Validates src/data/awards.json (run: npm run validate). Exits non-zero on hard errors.
// Uses Node's built-in TypeScript type-stripping (Node ≥ 22.18) to reuse the same validator as the renderer.
import fs from 'node:fs';
import {validateAwards} from '../src/utils/validation.ts';

const data = JSON.parse(fs.readFileSync(new URL('../src/data/awards.json', import.meta.url), 'utf8'));
const issues = validateAwards(data);
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');

const nominees = data.categories.reduce((n, c) => n + c.nominees.length, 0);
console.log(`Categories: ${data.categories.length}   Nominees: ${nominees}`);
for (const w of warnings) console.log(`  warning  ${w.where}: ${w.message}`);
for (const e of errors) console.log(`  ERROR    ${e.where}: ${e.message}`);
console.log(errors.length ? `\n${errors.length} error(s) — fix before rendering.` : '\nData OK.');
process.exit(errors.length ? 1 : 0);

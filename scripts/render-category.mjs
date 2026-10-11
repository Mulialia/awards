// Programmatic production renderer.
//   node scripts/render-category.mjs <categoryId> [--only=intro,nominees,roster,sequence] [--nominee=youth-003]
// Outputs (silent masters) to out/<categoryId>/ :
//   00-category-intro.mp4, 01-<nomineeId>.mp4 …, 99-category-roster.mp4, category-sequence-silent.mp4
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2);
const categoryId = args.find((a) => !a.startsWith('--'));
if (!categoryId) {
  console.error('Usage: node scripts/render-category.mjs <categoryId> [--only=intro,nominees,roster,sequence] [--nominee=<id>]');
  process.exit(1);
}
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const only = (flag('only') ?? 'intro,nominees,roster,sequence').split(',');
const onlyNominee = flag('nominee');

const awards = JSON.parse(fs.readFileSync('src/data/awards.json', 'utf8'));
const category = awards.categories.find((c) => c.id === categoryId);
if (!category) {
  console.error(`Unknown category "${categoryId}". Known: ${awards.categories.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

const outDir = path.join('out', categoryId);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

const job = async (compositionId, inputProps, file) => {
  const composition = await selectComposition({serveUrl, id: compositionId, inputProps, browserExecutable});
  const outputLocation = path.join(outDir, file);
  let last = -1;
  await renderMedia({
    composition, serveUrl, inputProps, outputLocation, browserExecutable,
    codec: 'h264', crf: 16, pixelFormat: 'yuv420p', colorSpace: 'bt709', imageFormat: 'jpeg', jpegQuality: 95,
    onProgress: ({progress}) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) { last = pct; process.stdout.write(`\r  ${file}  ${pct}%   `); }
    },
  });
  console.log(`\r  ${file}  done      `);
};

if (only.includes('intro')) await job('CategoryIntro', {categoryId}, '00-category-intro.mp4');
if (only.includes('nominees')) {
  for (let i = 0; i < category.nominees.length; i++) {
    const n = category.nominees[i];
    if (onlyNominee && n.id !== onlyNominee) continue;
    await job('NomineeReveal', {categoryId, nomineeId: n.id}, `${String(i + 1).padStart(2, '0')}-${n.id}.mp4`);
  }
}
if (only.includes('roster')) await job('CategoryRoster', {categoryId}, '99-category-roster.mp4');
if (only.includes('sequence')) await job('CategorySequence', {categoryId}, 'category-sequence-silent.mp4');
console.log('All requested renders complete →', outDir);

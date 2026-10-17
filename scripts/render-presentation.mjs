// Award presentation screens (screen 2 — organisations & individuals, incl. special awards).
//   node scripts/render-presentation.mjs <presentationId>   → out/presentations/<id>.mp4
//   node scripts/render-presentation.mjs --all             → one file per presentation
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2);
const targetId = args.find((a) => !a.startsWith('--'));
const all = args.includes('--all');

const awards = JSON.parse(fs.readFileSync('src/data/awards.json', 'utf8'));
const presentations = Array.isArray(awards.presentations) ? awards.presentations : [];

if (!all && !targetId) {
  console.error('Usage: node scripts/render-presentation.mjs <presentationId> | --all');
  process.exit(1);
}
if (!all && !presentations.some((p) => p.id === targetId)) {
  console.error(`Unknown presentation "${targetId}". Known: ${presentations.map((p) => p.id).join(', ') || '(none — add one in the editor, Awards tab)'}`);
  process.exit(1);
}
const targets = all ? presentations : presentations.filter((p) => p.id === targetId);
if (!targets.length) {
  console.log('No award presentations in the data — nothing to render.');
  process.exit(0);
}
for (const p of targets) {
  if (!/^[\w.-]+$/.test(p.id)) {
    console.error(`Presentation id "${p.id}" contains characters that are not safe for file names (allowed: letters, digits, . _ -).`);
    process.exit(1);
  }
}

const outDir = path.join('out', 'presentations');
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

for (const p of targets) {
  const inputProps = {presentationId: p.id};
  const composition = await selectComposition({serveUrl, id: 'AwardPresentation', inputProps, browserExecutable});
  const file = `${p.id}.mp4`;
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
}
console.log('All requested renders complete →', outDir);
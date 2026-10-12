// Lists every category available in src/data/awards.json — i.e. the ids accepted by
// scripts/render-category.mjs, scripts/make-placeholder-audio.py, scripts/mux-audio.mjs and
// scripts/category-steps.mjs.
//   node scripts/list-categories.mjs            (or: npm run categories)
// The silent / wav / mix columns show which production artefacts already exist under out/.
import fs from 'node:fs';
import path from 'node:path';

const awards = JSON.parse(fs.readFileSync('src/data/awards.json', 'utf8'));
const timing = JSON.parse(fs.readFileSync('src/data/timing.json', 'utf8'));

const rows = awards.categories.map((c) => {
  const frames = timing.introFrames + c.nominees.length * timing.nomineeFrames + timing.rosterFrames;
  return {
    number: c.number,
    id: c.id,
    name: c.name,
    nominees: c.nominees.length,
    seconds: frames / timing.fps,
    silent: fs.existsSync(path.join('out', c.id, 'category-sequence-silent.mp4')),
    wav: fs.existsSync(path.join('out', 'audio', `${c.id}-soundtrack.wav`)),
    mix: fs.existsSync(path.join('out', c.id, 'with-audio', 'category-sequence.mp4')),
  };
});

const w = (s, n) => String(s).padEnd(n);
const mark = (b) => (b ? '✓' : '·');
const numW = Math.max(1, ...rows.map((r) => String(r.number).length));
const idW = Math.max(2, ...rows.map((r) => r.id.length));
const nameW = Math.max(4, ...rows.map((r) => r.name.length));

const header = `${w('#', numW + 2)}${w('id', idW + 2)}${w('name', nameW + 2)}${w('nominees', 10)}${w('length', 8)}${w('silent', 8)}${w('wav', 5)}mix`;
const rule = `${'-'.repeat(numW + 2)}${'-'.repeat(idW + 2)}${'-'.repeat(nameW + 2)}${'-'.repeat(10)}${'-'.repeat(8)}${'-'.repeat(8)}${'-'.repeat(5)}${'-'.repeat(3)}`;

const event = [awards.event?.name, awards.event?.year].filter(Boolean).join(' · ');
if (event) console.log(event);
console.log(header);
console.log(rule);
for (const r of rows) {
  console.log(
    `${w(r.number, numW + 2)}${w(r.id, idW + 2)}${w(r.name, nameW + 2)}${w(r.nominees, 10)}${w(`${Math.round(r.seconds)} s`, 8)}${w(mark(r.silent), 8)}${w(mark(r.wav), 5)}${mark(r.mix)}`,
  );
}
console.log(rule);

const nominees = rows.reduce((n, r) => n + r.nominees, 0);
const seconds = rows.reduce((n, r) => n + r.seconds, 0);
const length = seconds >= 60 ? `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s` : `${Math.round(seconds)} s`;
console.log(`${rows.length} categories · ${nominees} nominees · ${length} of footage · ✓ exists · · not yet produced`);
console.log('\nNext: node scripts/category-steps.mjs <id>   — the 3 filled-in steps for one category');
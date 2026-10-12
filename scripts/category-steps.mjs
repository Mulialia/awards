// Shows the three production steps for one category with the commands filled in and ready to copy:
//   1. render the silent clips   2. generate the soundtrack   3. mix the audio into the silent clips
//   node scripts/category-steps.mjs <categoryId>        (or: npm run steps -- <categoryId>)
// Display only — it never runs anything; paste the printed commands (or chain them with &&) to execute.
// The python launcher is chosen per platform (Windows ships `python`, POSIX `python3`).
import fs from 'node:fs';
import {findSoundtrack} from './soundtrack.mjs';

const args = process.argv.slice(2);
const categoryId = args.find((a) => !a.startsWith('--'));
const awards = JSON.parse(fs.readFileSync('src/data/awards.json', 'utf8'));
const timing = JSON.parse(fs.readFileSync('src/data/timing.json', 'utf8'));

if (!categoryId) {
  console.error('Usage: node scripts/category-steps.mjs <categoryId>');
  console.error(`Known: ${awards.categories.map((c) => c.id).join(', ')}`);
  process.exit(1);
}
const category = awards.categories.find((c) => c.id === categoryId);
if (!category) {
  console.error(`Unknown category "${categoryId}". Known: ${awards.categories.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

const py = process.platform === 'win32' ? 'python' : 'python3';
const n = category.nominees.length;
const frames = timing.introFrames + n * timing.nomineeFrames + timing.rosterFrames;
const seconds = frames / timing.fps;
// Display paths with forward slashes (like the README) — existsSync accepts them on Windows too.
const status = (p) => `   status:  ${fs.existsSync(p) ? '✓ exists — ' : '· missing — '}${p}`;

const outDir = `out/${categoryId}`;
const silentSeq = `${outDir}/category-sequence-silent.mp4`;
const track = findSoundtrack(categoryId);
const wav = track ? track.replace(/\\/g, '/') : `out/audio/${categoryId}-soundtrack.wav`;
const mixedSeq = `${outDir}/with-audio/category-sequence.mp4`;

console.log(`${category.number}. ${category.name}  —  ${categoryId}`);
console.log(`${n} nominees · intro ${timing.introFrames} f + ${n}×${timing.nomineeFrames} f + roster ${timing.rosterFrames} f @ ${timing.fps} fps = ${seconds} s\n`);

console.log(`1. Silent clips  →  ${outDir}/`);
console.log(`   node scripts/render-category.mjs ${categoryId}`);
console.log(`   writes  00-category-intro.mp4 · 01-${category.nominees[0]?.id ?? '<nomineeId>'}.mp4 … ${String(n).padStart(2, '0')}-${category.nominees[n - 1]?.id ?? '<nomineeId>'}.mp4 · 99-category-roster.mp4 · category-sequence-silent.mp4`);
console.log(status(silentSeq));

console.log(`\n2. Soundtrack  →  ${wav}`);
console.log(`   ${py} scripts/make-placeholder-audio.py ${categoryId}`);
console.log(track
  ? '   a soundtrack is already in place — run only to replace it with the placeholder'
  : `   synthesises a ${seconds} s stereo 48 kHz master sized to the ${n} nominees (reads src/data/timing.json); or upload a finished track (music + voice-over) in the editor — npm run editor`);
console.log(status(wav));

console.log(`\n3. Mix the audio into the silent clips  →  ${outDir}/with-audio/`);
console.log(`   node scripts/mux-audio.mjs ${categoryId}`);
console.log(`   cuts each clip's audio from the master at its sequence position, video stream copied → with-audio/*.mp4`);
console.log(status(mixedSeq));
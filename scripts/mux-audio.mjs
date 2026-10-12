// Adds the soundtrack to the silent masters (video stream is copied, never re-encoded).
//   node scripts/mux-audio.mjs <categoryId> [path/to/soundtrack.wav]
// Reads  out/<categoryId>/*.mp4 (silent)  →  writes out/<categoryId>/with-audio/*.mp4
// Audio for each clip is cut from the master track at the clip's position in the sequence, so
// every individual file and the full sequence share identical, frame-synchronised sound.
// When no WAV is given, prefers the per-category master out/audio/<categoryId>-soundtrack.*
// (upload your own or generate it with: python3 scripts/make-placeholder-audio.py <categoryId>),
// falling back to the generic placeholder.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {findSoundtrack} from './soundtrack.mjs';

const [categoryId, wavArg] = process.argv.slice(2);
if (!categoryId) { console.error('Usage: node scripts/mux-audio.mjs <categoryId> [soundtrack.wav]'); process.exit(1); }
const wav = wavArg ?? findSoundtrack(categoryId) ?? 'out/audio/placeholder-soundtrack.wav';
if (!fs.existsSync(wav)) {
  console.error(`Soundtrack not found: ${wav}\nGenerate it with: python3 scripts/make-placeholder-audio.py ${categoryId}`);
  process.exit(1);
}
console.log('soundtrack:', wav);

const timing = JSON.parse(fs.readFileSync('src/data/timing.json', 'utf8'));
const awards = JSON.parse(fs.readFileSync('src/data/awards.json', 'utf8'));
const category = awards.categories.find((c) => c.id === categoryId);
const dir = path.join('out', categoryId);
const outDir = path.join(dir, 'with-audio');
fs.mkdirSync(outDir, {recursive: true});

// Normalise the MASTER once (so every clip keeps identical, consistent gain), then cut clips from it.
const norm = path.join(path.dirname(wav), '_normalised-master.wav');
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11', '-ar', '48000', norm]);

const sec = (frames) => (frames / timing.fps).toFixed(6);
const clips = [
  {file: '00-category-intro.mp4', start: 0, frames: timing.introFrames},
  ...category.nominees.map((n, i) => ({
    file: `${String(i + 1).padStart(2, '0')}-${n.id}.mp4`,
    start: timing.introFrames + i * timing.nomineeFrames,
    frames: timing.nomineeFrames,
  })),
  {file: '99-category-roster.mp4', start: timing.introFrames + category.nominees.length * timing.nomineeFrames, frames: timing.rosterFrames},
  {file: 'category-sequence-silent.mp4', start: 0, frames: timing.introFrames + category.nominees.length * timing.nomineeFrames + timing.rosterFrames, outName: 'category-sequence.mp4'},
];

for (const c of clips) {
  const input = path.join(dir, c.file);
  if (!fs.existsSync(input)) { console.log('  skip (not rendered):', c.file); continue; }
  const out = path.join(outDir, c.outName ?? c.file);
  const fade = 0.35; const dur = Number(sec(c.frames));
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', input, '-ss', sec(c.start), '-t', sec(c.frames), '-i', norm,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
    '-af', `afade=t=in:d=0.05,afade=t=out:st=${(dur - fade).toFixed(3)}:d=${fade}`,
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-t', dur.toFixed(6), '-movflags', '+faststart', out,
  ]);
  console.log('  wrote', out);
}

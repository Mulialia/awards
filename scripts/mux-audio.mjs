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

// Intro length per category — mirrors introHoldFrames in src/utils/timing.ts: a voice-over longer
// than the intro-exit frame stretches the intro by a hold, so every cut point below shifts.
const voSec = Number(category.introVoiceOverSeconds) || 0;
const introFrames = timing.introFrames + (voSec > 0 ? Math.max(0, Math.ceil(voSec * timing.fps) - (timing.introExitStart ?? 126)) : 0);
if (introFrames !== timing.introFrames) console.log(`intro: ${introFrames} frames (${voSec} s voice-over hold)`);

const dir = path.join('out', categoryId);
const outDir = path.join(dir, 'with-audio');
fs.mkdirSync(outDir, {recursive: true});

// Normalise the MASTER once (so every clip keeps identical, consistent gain), then cut clips from it.
const norm = path.join(path.dirname(wav), '_normalised-master.wav');
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11', '-ar', '48000', norm]);

const sec = (frames) => (frames / timing.fps).toFixed(6);
const clips = [
  {file: '00-category-intro.mp4', start: 0, frames: introFrames},
  ...category.nominees.map((n, i) => ({
    file: `${String(i + 1).padStart(2, '0')}-${n.id}.mp4`,
    start: introFrames + i * timing.nomineeFrames,
    frames: timing.nomineeFrames,
  })),
  {file: '99-category-roster.mp4', start: introFrames + category.nominees.length * timing.nomineeFrames, frames: timing.rosterFrames},
  {file: 'category-sequence-silent.mp4', start: 0, frames: introFrames + category.nominees.length * timing.nomineeFrames + timing.rosterFrames, outName: 'category-sequence.mp4'},
];

// Refuse to mix a track that runs out before the video (it would produce dead audio from that
// point on with no error) — extend it first instead. A LONGER track is fine: it gets trimmed.
// Probe `norm` — the exact file the clips are cut from.
const totalFrames = introFrames + category.nominees.length * timing.nomineeFrames + timing.rosterFrames;
const masterDur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', norm]).toString().trim());
if (masterDur + 0.1 < totalFrames / timing.fps && !process.argv.includes('--allow-short')) {
  console.error(`Soundtrack is SHORTER than the video: ${masterDur.toFixed(1)} s < ${(totalFrames / timing.fps).toFixed(1)} s — the audio would end early.`);
  console.error(`Extend it first:  node scripts/stretch-audio.mjs ${categoryId}`);
  console.error('(or pass --allow-short to mix anyway)');
  process.exit(1);
}

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

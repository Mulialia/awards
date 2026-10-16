// Extends an EXISTING soundtrack master in sync with a voice-over-stretched video intro.
//   node scripts/stretch-audio.mjs <categoryId> [--in=file] [--out=file] [--seconds=s] [--at=frame]
//                                       [--fill=bed|silence] [--window=start:end] [--fade=s] [--dry-run] [--force]
// The video intro is stretched by inserting a hold at INTRO.exit (src/utils/timing.ts — the frame
// the title starts leaving). This script performs the SAME edit on the audio: everything before
// that point is untouched, `hold` seconds are spliced in, and everything after (every nominee cue,
// the roster chimes) shifts later by exactly the hold — so audio and video stay frame-locked.
// The inserted segment (default --fill=bed): the track's OWN ambience — a punctuation-free window
// (the hum/pad, no bells/sweeps/sub hits) is detected and crossfade-looped to fill the hold, so the
// bed keeps breathing under the spoken intro. --fill=silence splices a clean silent pocket instead.
// When it edits a file in place it first copies the original to out/audio/backup/.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {findSoundtrack} from './soundtrack.mjs';

const args = process.argv.slice(2);
const categoryId = args.find((a) => !a.startsWith('--'));
const flag = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const has = (n) => args.includes(`--${n}`);

if (!categoryId || !/^[\w.-]+$/.test(categoryId)) {
  console.error('Usage: node scripts/stretch-audio.mjs <categoryId> [--in=file] [--out=file] [--seconds=s] [--at=frame] [--fill=bed|silence] [--window=start:end] [--fade=s] [--dry-run] [--force]');
  process.exit(1);
}

const timing = JSON.parse(fs.readFileSync('src/data/timing.json', 'utf8'));
const awards = JSON.parse(fs.readFileSync('src/data/awards.json', 'utf8'));
const category = awards.categories.find((c) => c.id === categoryId);
if (!category) {
  console.error(`Unknown category "${categoryId}". Known: ${awards.categories.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

const fps = timing.fps;
const exitStart = timing.introExitStart ?? 126; // where the video inserts the hold (title fully revealed)
const voSec = Number(category.introVoiceOverSeconds) || 0;
const holdSecOverride = flag('seconds') != null ? Number(flag('seconds')) : null;
// Same formula as introHoldFrames in src/utils/timing.ts.
const holdFrames = holdSecOverride != null
  ? Math.round(holdSecOverride * fps)
  : voSec > 0 ? Math.max(0, Math.ceil(voSec * fps) - exitStart) : 0;
const atFrames = flag('at') != null ? Number(flag('at')) : exitStart;
const fillMode = flag('fill') ?? 'bed';
const fade = flag('fade') != null ? Number(flag('fade')) : fillMode === 'silence' ? 0.25 : 0.12;

if (!(holdFrames > 0)) {
  console.log(`No voice-over hold on "${categoryId}" (introVoiceOverSeconds = ${category.introVoiceOverSeconds ?? 'unset'}) — nothing to insert.`);
  console.log('Set the Voice Over field in the editor (Category tab) or pass --seconds=<s>.');
  process.exit(0);
}

const src = flag('in') ?? findSoundtrack(categoryId);
if (!src || !fs.existsSync(src)) {
  console.error(`No soundtrack found for "${categoryId}". Generate the placeholder or upload a track first (editor → Audio tab).`);
  process.exit(1);
}

const probe = (f) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).toString().trim());
const dur = probe(src);

const atSec = atFrames / fps;
const introLen = timing.introFrames + holdFrames;
const expected = (introLen + category.nominees.length * timing.nomineeFrames + timing.rosterFrames) / fps;
const near = (a, b) => Math.abs(a - b) <= 0.1;

console.log(`track   ${src}  (${dur.toFixed(3)} s)`);
console.log(`video   intro ${introLen} f (incl. ${holdFrames} f voice-over hold) + ${category.nominees.length}×${timing.nomineeFrames} f + roster ${timing.rosterFrames} f = ${expected.toFixed(3)} s`);

if (near(dur, expected)) {
  console.log('Already in sync — no change needed.');
  process.exit(0);
}

// How much to insert: the exact shortfall between track and video (a voice-over that grew again
// only inserts the difference), or an exact --seconds override.
let insertSec;
if (holdSecOverride != null) {
  insertSec = holdSecOverride;
  if (!near(dur + insertSec, expected) && !has('force')) {
    console.error(`\nLength mismatch: ${dur.toFixed(1)} s + ${insertSec.toFixed(1)} s ≠ ${expected.toFixed(1)} s expected — adjust --seconds, or pass --force to insert anyway.`);
    process.exit(1);
  }
} else {
  if (dur > expected + 0.1 && !has('force')) {
    console.error(`\nThe track is LONGER than the video (${dur.toFixed(1)} s > ${expected.toFixed(1)} s) — refusing to cut anything.`);
    console.error('Replace/regenerate the track (editor → Audio tab), or pass --seconds=<s> / --force.');
    process.exit(1);
  }
  insertSec = expected - dur;
}
console.log(`insert  ${insertSec.toFixed(3)} s at ${atSec.toFixed(3)} s (frame ${atFrames}) — everything after that point shifts later`);

/** Mono 8 kHz PCM of the whole file, for the cheap level/flux analysis below. */
function probeMono(file) {
  return execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], {maxBuffer: 1 << 26});
}

/**
 * Longest low-flux, low-level window ≥ 2 s — the hum/pad without any punctuation cues.
 * Per 40 ms hop: RMS; "clean" = level ≤ ~8 dB over the typical bed level AND no upward
 * transient > 3 dB (a bell/sweep/sub onset). Returns [startSec, endSec] or null.
 */
function findCleanWindow(file) {
  const raw = probeMono(file);
  const hop = 320; // 40 ms @ 8 kHz
  const frames = Math.floor(raw.length / 2 / hop);
  if (frames < 50) return null;
  const rms = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let j = 0; j < hop; j++) {
      const v = raw.readInt16LE((i * hop + j) * 2) / 32768;
      s += v * v;
    }
    rms[i] = Math.sqrt(s / hop);
  }
  const eps = 1e-6;
  const db = (i) => 20 * Math.log10(rms[i] + eps);
  const sorted = Array.from(rms).sort((a, b) => a - b);
  const bed = sorted[Math.floor(frames * 0.2)]; // typical (quiet) level = the hum
  const levelThr = bed * 2.5; // ~8 dB above the bed
  let runStart = -1;
  let best = null;
  for (let i = 1; i < frames; i++) {
    const clean = rms[i] <= levelThr && db(i) - db(i - 1) < 3;
    if (clean && runStart < 0) runStart = i;
    if (!clean && runStart >= 0) {
      if (!best || i - runStart > best[1] - best[0]) best = [runStart, i];
      runStart = -1;
    }
  }
  if (runStart >= 0 && (!best || frames - runStart > best[1] - best[0])) best = [runStart, frames];
  if (!best) return null;
  const margin = 4; // 0.16 s of padding inside the run
  const s = ((best[0] + margin) * hop) / 8000;
  const e = ((best[1] - margin) * hop) / 8000;
  return e - s >= 2.0 ? [s, e] : null;
}

const out = flag('out') ?? src;

// ── the inserted segment ──────────────────────────────────────────────────────────────────────
// bed (default): continue the track's OWN ambience. A punctuation-free window (hum/pad only —
// no bells, sweeps or sub hits) is detected below and crossfade-looped to fill the hold, so the
// extension breathes with the rest of the bed while the accent cues stay out of it.
// silence: a clean silent pocket (the classic splice).
let windowUsed = null;
if (fillMode === 'bed') {
  windowUsed = flag('window') ? flag('window').split(':').map(Number) : findCleanWindow(src);
  if (!windowUsed) {
    console.warn('· no punctuation-free ambience window found — falling back to a silent pocket (or pass --window=start:end)');
  }
} else if (fillMode !== 'silence') {
  console.error(`Unknown --fill=${fillMode} — use "bed" or "silence".`);
  process.exit(1);
}

if (has('dry-run')) {
  if (windowUsed) console.log(`bed     window ${windowUsed[0].toFixed(2)}–${windowUsed[1].toFixed(2)} s, crossfade-looped to ${insertSec.toFixed(3)} s`);
  console.log(`fill    ${windowUsed ? 'ambience bed (no punctuations)' : 'silence'}${has('fade') ? ` · seam fade ${fade} s` : ''}`);
  console.log('Dry run — nothing written.');
  process.exit(0);
}

// Ambience seams need only click protection; a silent pocket needs a longer, softer fade.
const fadeOutSt = Math.max(0, atSec - fade);
const head = `[0:a]atrim=0:${atSec.toFixed(6)},afade=t=out:st=${fadeOutSt.toFixed(6)}:d=${fade}[a];`;
const tail = `[0:a]atrim=start=${atSec.toFixed(6)},afade=t=in:d=${fade}[b];`;
const inputs = ['-i', src];
let filter;
if (windowUsed) {
  // Crossfade-loop the ambience window to exactly `insertSec`, then concat head + bed + tail.
  const fillTmp = `${out}.fill.tmp.wav`;
  const xf = 0.5;
  const wDur = windowUsed[1] - windowUsed[0];
  const copies = Math.max(2, Math.ceil((insertSec - xf) / (wDur - xf)));
  const labels = Array.from({length: copies}, (_, i) => `[w${i}]`).join('');
  let loop = `[0:a]atrim=start=${windowUsed[0].toFixed(6)}:end=${windowUsed[1].toFixed(6)},asetpts=PTS-STARTPTS[wsrc];[wsrc]asplit=${copies}${labels};`;
  let prev = '[w0]';
  for (let i = 1; i < copies; i++) {
    const dst = i === copies - 1 ? '[out]' : `[x${i}]`;
    loop += `${prev}[w${i}]acrossfade=d=${xf}${dst};`;
    prev = dst;
  }
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-filter_complex', loop, '-map', '[out]', '-t', insertSec.toFixed(6), '-ar', '48000', '-c:a', 'pcm_s16le', fillTmp], {stdio: 'inherit'});
  inputs.push('-i', fillTmp);
  filter = `${head}[1:a]asetpts=PTS-STARTPTS[g];${tail}[a][g][b]concat=n=3:v=0:a=1[out]`;
} else {
  filter = `${head}${tail}[a]apad=pad_dur=${insertSec.toFixed(6)}[g];[g][b]concat=n=2:v=0:a=1[out]`;
}
const tmp = `${out}.tmp.wav`;

if (path.resolve(out) === path.resolve(src)) {
  const backupDir = path.join('out', 'audio', 'backup');
  fs.mkdirSync(backupDir, {recursive: true});
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const backup = path.join(backupDir, `${path.parse(src).name}-${stamp}.wav`);
  fs.copyFileSync(src, backup);
  console.log('backup →', backup.split(path.sep).join('/'));
}

execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', tmp], {stdio: 'inherit'});
fs.copyFileSync(tmp, out);
fs.rmSync(tmp);
try { fs.rmSync(`${out}.fill.tmp.wav`); } catch {}

const newDur = probe(out);
console.log(`wrote ${out}  (${newDur.toFixed(1)} s, filled with ${windowUsed ? 'ambience bed' : 'silence'}) — re-run the Mix step to cut the clips from the extended track`);

// YORA awards editor — zero-dependency local web UI covering the whole process:
// view/edit categories & nominees, upload portraits & company logos, upload polished soundtracks
// (music + voice-over) or generate the placeholder, and run render → audio → mix with live logs.
//   node scripts/editor-server.mjs [port]        (or: npm run editor → http://127.0.0.1:4173)
// Loopback-only local tool. Saves are validated with the same rules as `npm run validate`
// (blocked while errors exist unless force=true) and written atomically to src/data/awards.json.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn, execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateAwards} from '../src/utils/validation.ts';
import {findSoundtrack, listSoundtracks, AUDIO_DIR} from './soundtrack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UI_DIR = path.join(ROOT, 'scripts', 'editor');
const DATA = path.join(ROOT, 'src', 'data', 'awards.json');
const TIMING = path.join(ROOT, 'src', 'data', 'timing.json');
const STILLS = path.join(ROOT, 'out', 'stills');
const PORT = Number(process.env.PORT ?? process.argv[2] ?? 4173);
const HOST = process.env.HOST ?? '127.0.0.1';
const PY = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.gif': 'image/gif', '.woff2': 'font/woff2',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
  '.flac': 'audio/flac', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

// Media roots the UI may read; only these two groups are editable (public/logos holds template
// artwork referenced by the React components, so it is view-only).
const MEDIA_DIRS = {
  portraits: path.join(ROOT, 'public', 'portraits'),
  recipients: path.join(ROOT, 'public', 'recipients'),
  'logos/company': path.join(ROOT, 'public', 'logos', 'company'),
  logos: path.join(ROOT, 'public', 'logos'),
};
const READONLY_MEDIA = new Set(['logos']);
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const AUDIO_EXT = new Set(['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg']);
const LIMITS = {data: 10 * 1024 * 1024, image: 30 * 1024 * 1024, audio: 500 * 1024 * 1024, json: 1024 * 1024};

const readAwards = () => JSON.parse(fs.readFileSync(DATA, 'utf8'));
const readTiming = () => JSON.parse(fs.readFileSync(TIMING, 'utf8'));

function issuesFor(data) {
  try {
    return validateAwards(data);
  } catch (e) {
    return [{level: 'error', where: 'data', message: `unreadable data — ${e.message}`}];
  }
}

function normalize(data) {
  data.event = data.event && typeof data.event === 'object' ? data.event : {name: '', brand: '', year: null};
  data.categories = Array.isArray(data.categories) ? data.categories : [];
  for (const c of data.categories) {
    if (!Array.isArray(c.nominees)) c.nominees = [];
    if (typeof c.number !== 'number') c.number = 0;
    if (c.introVoiceOverSeconds != null && typeof c.introVoiceOverSeconds !== 'number') {
      c.introVoiceOverSeconds = Number(c.introVoiceOverSeconds) || null;
    }
    // Winner's screen (screen 1)
    if (c.winner != null && (typeof c.winner !== 'object' || Array.isArray(c.winner))) c.winner = null;
    if (c.winner && c.winner.year != null && typeof c.winner.year !== 'number') {
      c.winner.year = Number(String(c.winner.year).replace(/\D/g, '')) || null;
    }
  }
  // Award presentations (screen 2)
  data.presentations = Array.isArray(data.presentations) ? data.presentations : [];
  for (const p of data.presentations) {
    if (p && p.year != null && typeof p.year !== 'number') {
      p.year = Number(String(p.year).replace(/\D/g, '')) || null;
    }
  }
  return data;
}

const shapeOk = (data) => !!data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.categories);

/** Serialise in the file's existing style: 2-space indent, primitive arrays inline (≤100 cols). */
function formatData(value, depth) {
  const ind = '  '.repeat(depth);
  const ind2 = '  '.repeat(depth + 1);
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const primitives = value.every((v) => v === null || typeof v !== 'object');
    if (primitives) {
      const inline = `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
      if (ind.length + inline.length <= 100) return inline;
      return `[\n${value.map((v) => ind2 + JSON.stringify(v)).join(',\n')}\n${ind}]`;
    }
    return `[\n${value.map((v) => ind2 + formatData(v, depth + 1)).join(',\n')}\n${ind}]`;
  }
  const keys = Object.entries(value);
  if (keys.length === 0) return '{}';
  return `{\n${keys.map(([k, v]) => `${ind2}${JSON.stringify(k)}: ${formatData(v, depth + 1)}`).join(',\n')}\n${ind}}`;
}

function writeData(data) {
  // Build with \n, then match the line endings the file already uses (CRLF on a Windows checkout).
  // JSON.stringify escapes newlines inside strings, so this only touches our own formatting.
  let eol = '\n';
  try {
    if (fs.readFileSync(DATA, 'utf8').includes('\r\n')) eol = '\r\n';
  } catch {}
  const text = `${formatData(data, 0)}\n`.replace(/\n/g, eol);
  const tmp = `${DATA}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, DATA);
}

function sendJson(res, status, obj) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify(obj));
}

function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > max) { reject(new Error(`payload larger than ${Math.round(max / 1024 / 1024)} MB`)); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function serveFile(req, res, abs, {download = false} = {}) {
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) return sendJson(res, 404, {error: 'file not found'});
    const headers = {
      'Content-Type': MIME[path.extname(abs).toLowerCase()] ?? 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    };
    if (download) headers['Content-Disposition'] = `attachment; filename="${path.basename(abs).replace(/"/g, '')}"`;
    const range = req.headers.range && /^bytes=\d*-\d*$/.test(req.headers.range) ? req.headers.range : null;
    if (range) {
      const [s, e] = range.slice(6).split('-');
      const start = s === '' ? Math.max(0, st.size - Number(e)) : Number(s);
      const end = s !== '' && e === '' ? st.size - 1 : Number(e);
      if (Number.isFinite(start) && Number.isFinite(end) && start <= end && start < st.size) {
        const stop = Math.min(end, st.size - 1);
        headers['Content-Range'] = `bytes ${start}-${stop}/${st.size}`;
        headers['Content-Length'] = stop - start + 1;
        res.writeHead(206, headers);
        fs.createReadStream(abs, {start, end: stop}).pipe(res);
        return;
      }
    }
    headers['Content-Length'] = st.size;
    res.writeHead(200, headers);
    fs.createReadStream(abs).pipe(res);
  });
}

/** Sanitised upload name: keeps word chars / spaces / . - (), enforces a whitelisted extension. */
function safeName(name, extSet) {
  const base = path.basename(String(name ?? '')).replace(/[^\w.\- ()]+/g, '').trim();
  const ext = path.extname(base).toLowerCase();
  if (!base || base.startsWith('.') || !extSet.has(ext)) return null;
  return base;
}

function listFiles(abs, extSet = null) {
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, {withFileTypes: true})
    .filter((d) => d.isFile() && (!extSet || extSet.has(path.extname(d.name).toLowerCase())))
    .map((d) => {
      const st = fs.statSync(path.join(abs, d.name));
      return {name: d.name, size: st.size, mtime: st.mtimeMs};
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const mediaInfo = (dirKey, f) => ({name: f.name, rel: `${dirKey}/${f.name}`, url: `/media/${dirKey}/${f.name}`, size: f.size, mtime: f.mtime});
const audioSourcePath = (id) => path.join(ROOT, AUDIO_DIR, `${id}.source.json`);

/** Duration in seconds via ffprobe, cached per file+mtime so polling stays cheap. */
const durationCache = new Map();
function probeDuration(file) {
  try {
    const mtime = fs.statSync(file).mtimeMs;
    const hit = durationCache.get(file);
    if (hit && hit.mtime === mtime) return hit.dur;
    const raw = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], {windowsHide: true}).toString().trim();
    const dur = Number.isFinite(Number(raw)) ? Number(raw) : null;
    durationCache.set(file, {mtime, dur});
    return dur;
  } catch {
    return null;
  }
}

function audioInfo(id) {
  const file = findSoundtrack(id, ROOT);
  if (!file) return {file: null};
  const st = fs.statSync(file);
  let source = path.basename(file).includes('-soundtrack.') ? 'placeholder' : 'manual';
  let uploaded = null;
  try { uploaded = JSON.parse(fs.readFileSync(audioSourcePath(id), 'utf8')); source = 'uploaded'; } catch {}
  return {
    file: path.relative(ROOT, file).split(path.sep).join('/'),
    name: path.basename(file),
    size: st.size,
    mtime: st.mtimeMs,
    duration: probeDuration(file),
    source,
    uploaded,
  };
}

function clearSoundtrack(id) {
  const removed = listSoundtracks(id, ROOT).map((f) => {
    fs.unlinkSync(f);
    return path.basename(f);
  });
  try { fs.unlinkSync(audioSourcePath(id)); } catch {}
  return removed;
}

const categoryStatus = (id) => ({
  silent: fs.existsSync(path.join(ROOT, 'out', id, 'category-sequence-silent.mp4')),
  mixed: fs.existsSync(path.join(ROOT, 'out', id, 'with-audio', 'category-sequence.mp4')),
  winner: fs.existsSync(path.join(ROOT, 'out', id, 'winner.mp4')),
});

/** Where is this media file referenced in the awards data? (blocks deletion) */
function mediaUsage(relPath, data) {
  const hits = [];
  for (const c of data.categories ?? []) {
    for (const n of c.nominees ?? []) {
      if (n.portrait === relPath) hits.push(`${c.id} / ${n.id} (portrait)`);
      if (n.companyLogo === relPath) hits.push(`${c.id} / ${n.id} (logo)`);
    }
    const w = c.winner;
    if (w) {
      if (w.portrait === relPath) hits.push(`${c.id} / winner (portrait)`);
      if (w.companyLogo === relPath) hits.push(`${c.id} / winner (logo)`);
    }
  }
  for (const p of data.presentations ?? []) {
    if (p.image === relPath) hits.push(`presentation ${p.id} (image)`);
    if (p.logo === relPath) hits.push(`presentation ${p.id} (logo)`);
  }
  return hits;
}

// ── Job runner ─────────────────────────────────────────────────────────────────────────────────
// One job at a time (the queue keeps a non-technical user from overloading the machine); each job
// is a list of steps run in order and its combined stdout/stderr is kept in job.log for the UI.
const jobs = [];
const queue = [];
let running = null;

const jobView = (j) => ({
  id: j.id, action: j.action, categoryId: j.categoryId, nomineeId: j.nomineeId ?? null,
  presentationId: j.presentationId ?? null, screen: j.screen ?? null, state: j.state, step: j.step,
  labels: j.labels, log: j.log, created: j.created, started: j.started, ended: j.ended,
});

function stepsFor(action, p) {
  const render = {label: 'Render silent clips', cmd: 'node', args: ['scripts/render-category.mjs', p.categoryId]};
  const audio = {
    label: 'Generate placeholder soundtrack',
    cmd: PY,
    args: ['scripts/make-placeholder-audio.py', p.categoryId],
    pre: () => clearSoundtrack(p.categoryId),
  };
  const mux = {label: 'Mix audio into clips', cmd: 'node', args: ['scripts/mux-audio.mjs', p.categoryId]};
  const stretch = {label: 'Extend audio for the voice-over hold', cmd: 'node', args: ['scripts/stretch-audio.mjs', p.categoryId]};
  if (action === 'render') return [render];
  if (action === 'audio') return [audio];
  if (action === 'mux') return [mux];
  if (action === 'stretch') return [stretch];
  if (action === 'winner') {
    return [{label: 'Render winner screen · WinnerReveal', cmd: 'node', args: ['scripts/render-category.mjs', p.categoryId, '--only=winner']}];
  }
  if (action === 'presentation') {
    return [{label: 'Render award presentation · AwardPresentation', cmd: 'node', args: ['scripts/render-presentation.mjs', p.presentationId]}];
  }
  if (action === 'presentations') {
    return [{label: 'Render all award presentations · AwardPresentation', cmd: 'node', args: ['scripts/render-presentation.mjs', '--all']}];
  }
  if (action === 'pipeline') {
    // With an existing soundtrack: render → keep it → extend it for the voice-over hold if the
    // video grew (stretch no-ops when in sync / no VO; --if-short tolerates a baked full-length
    // track) → mix. Without a soundtrack: generate the placeholder (bakes the hold in) → mix.
    let voSet = false;
    try { voSet = Number(readAwards().categories.find((c) => c.id === p.categoryId)?.introVoiceOverSeconds) > 0; } catch {}
    return findSoundtrack(p.categoryId, ROOT)
      ? [render, {note: true, label: 'Soundtrack already present — keeping it'},
         ...(voSet ? [{...stretch, args: [...stretch.args, '--if-short']}] : []), mux]
      : [render, audio, mux];
  }
  if (action === 'still') {
    const frame = String(p.frame ?? 130);
    if (p.screen === 'winner') {
      const props = JSON.stringify({categoryId: p.categoryId});
      return [{label: 'Render preview still · WinnerReveal', cmd: 'node', args: ['scripts/stills.mjs', 'WinnerReveal', props, frame, 'out/stills', `preview-${p.categoryId}-winner`]}];
    }
    if (p.screen === 'presentation') {
      const props = JSON.stringify({presentationId: p.presentationId});
      return [{label: 'Render preview still · AwardPresentation', cmd: 'node', args: ['scripts/stills.mjs', 'AwardPresentation', props, frame, 'out/stills', `preview-${p.presentationId}-presentation`]}];
    }
    const comp = p.nomineeId ? 'NomineeReveal' : 'CategoryIntro';
    const props = JSON.stringify(p.nomineeId ? {categoryId: p.categoryId, nomineeId: p.nomineeId} : {categoryId: p.categoryId});
    const stillFrame = String(p.nomineeId ? (p.frame ?? 110) : (p.frame ?? 100));
    const prefix = p.nomineeId ? `preview-${p.nomineeId}` : `preview-${p.categoryId}-intro`;
    return [{label: `Render preview still · ${comp}`, cmd: 'node', args: ['scripts/stills.mjs', comp, props, stillFrame, 'out/stills', prefix]}];
  }
  return null;
}

function enqueue(job) {
  jobs.push(job);
  if (jobs.length > 50) jobs.splice(0, jobs.length - 50);
  queue.push(job);
  pump();
}

function pump() {
  if (running || queue.length === 0) return;
  runJob(queue.shift());
}

async function runJob(job) {
  running = job;
  job.state = 'running';
  job.started = Date.now();
  for (const step of job.steps) {
    job.step = step.label;
    if (step.note) { job.log += `\n· ${step.label}\n`; continue; }
    job.log += `\n$ ${step.cmd} ${step.args.join(' ')}\n`;
    if (step.pre) step.pre();
    const code = await execStep(step, job);
    if (job.state === 'killed') break;
    if (code !== 0) {
      job.state = 'error';
      job.log += `\n✗ step failed (exit code ${code})\n`;
      break;
    }
  }
  if (job.state === 'running') { job.state = 'done'; job.log += '\n✓ finished\n'; }
  job.ended = Date.now();
  job.step = null;
  running = null;
  pump();
}

function execStep(step, job) {
  return new Promise((resolve) => {
    const child = spawn(step.cmd, step.args, {cwd: ROOT, env: process.env, shell: false, windowsHide: true});
    job.child = child;
    const onData = (d) => {
      job.log += d.toString().replace(/\r(?!\n)/g, '\n');
      if (job.log.length > 400_000) job.log = job.log.slice(-300_000);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', (e) => { job.log += `✗ ${e.message}\n`; resolve(-1); });
    child.on('close', (code) => { job.child = null; resolve(code ?? -1); });
  });
}

/** Resolve `rel` under `root`, refusing anything that escapes it (path traversal guard). */
function safeJoin(root, rel) {
  const abs = path.resolve(root, rel);
  return abs === root || abs.startsWith(root + path.sep) ? abs : null;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const p = decodeURIComponent(url.pathname);
    const q = url.searchParams;
    const jsonBody = async () => JSON.parse((await readBody(req, LIMITS.json)).toString('utf8') || '{}');

    // ── static UI ───────────────────────────────────────────────────────────────────────────────
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) return serveFile(req, res, path.join(UI_DIR, 'index.html'));
    if (req.method === 'GET' && (p === '/app.js' || p === '/style.css')) return serveFile(req, res, path.join(UI_DIR, p.slice(1)));

    // ── media under public/ ─────────────────────────────────────────────────────────────────────
    if (p.startsWith('/media/')) {
      const rel = p.slice('/media/'.length);
      const dirKey = ['logos/company', 'portraits', 'recipients', 'logos'].find((k) => rel.startsWith(`${k}/`));
      const abs = dirKey && safeJoin(MEDIA_DIRS[dirKey], rel.slice(dirKey.length + 1));
      if (req.method !== 'GET' || !abs) return sendJson(res, 404, {error: 'not found'});
      return serveFile(req, res, abs);
    }
    if (p === '/api/media' && req.method === 'GET') {
      const dirKey = q.get('dir') ?? '';
      if (!MEDIA_DIRS[dirKey]) return sendJson(res, 400, {error: 'unknown media directory'});
      return sendJson(res, 200, {
        readonly: READONLY_MEDIA.has(dirKey),
        files: listFiles(MEDIA_DIRS[dirKey], IMAGE_EXT).map((f) => mediaInfo(dirKey, f)),
      });
    }
    if (p === '/api/media/upload' && req.method === 'POST') {
      const dirKey = q.get('dir') ?? '';
      if (!MEDIA_DIRS[dirKey]) return sendJson(res, 400, {error: 'unknown media directory'});
      if (READONLY_MEDIA.has(dirKey)) return sendJson(res, 403, {error: 'event logos are template artwork referenced by the components — view only'});
      const name = safeName(q.get('name'), IMAGE_EXT);
      if (!name) return sendJson(res, 400, {error: 'file name must end in .jpg, .jpeg, .png or .webp'});
      const body = await readBody(req, LIMITS.image);
      if (body.length === 0) return sendJson(res, 400, {error: 'empty upload'});
      fs.writeFileSync(path.join(MEDIA_DIRS[dirKey], name), body);
      const rel = `${dirKey}/${name}`;
      return sendJson(res, 200, {rel, url: `/media/${rel}`, replaced: true});
    }
    if (p === '/api/media' && req.method === 'DELETE') {
      const rel = q.get('path') ?? '';
      const dirKey = ['logos/company', 'portraits', 'recipients', 'logos'].find((k) => rel.startsWith(`${k}/`));
      if (!dirKey) return sendJson(res, 400, {error: 'unknown media path'});
      if (READONLY_MEDIA.has(dirKey)) return sendJson(res, 403, {error: 'event logos are template artwork referenced by the components — view only'});
      const abs = safeJoin(MEDIA_DIRS[dirKey], rel.slice(dirKey.length + 1));
      if (!abs || !fs.existsSync(abs)) return sendJson(res, 404, {error: 'file not found'});
      const hits = mediaUsage(rel, readAwards());
      if (hits.length) return sendJson(res, 409, {error: 'file is in use', hits});
      fs.unlinkSync(abs);
      return sendJson(res, 200, {deleted: rel});
    }

    // ── data ────────────────────────────────────────────────────────────────────────────────────
    if (p === '/api/state' && req.method === 'GET') {
      const data = readAwards();
      return sendJson(res, 200, {
        awards: data,
        issues: issuesFor(data),
        timing: readTiming(),
        media: {
          portraits: listFiles(MEDIA_DIRS.portraits, IMAGE_EXT).map((f) => mediaInfo('portraits', f)),
          recipients: listFiles(MEDIA_DIRS.recipients, IMAGE_EXT).map((f) => mediaInfo('recipients', f)),
          logos: listFiles(MEDIA_DIRS.logos, IMAGE_EXT).map((f) => mediaInfo('logos', f)),
          companyLogos: listFiles(MEDIA_DIRS['logos/company'], IMAGE_EXT).map((f) => mediaInfo('logos/company', f)),
        },
        audio: Object.fromEntries(data.categories.map((c) => [c.id, audioInfo(c.id)])),
        status: Object.fromEntries(data.categories.map((c) => [c.id, categoryStatus(c.id)])),
        jobs: jobs.map(jobView),
      });
    }
    if (p === '/api/data' && req.method === 'PUT') {
      const body = await jsonBody();
      if (!shapeOk(body.awards)) return sendJson(res, 400, {error: 'awards data must be an object with a categories array'});
      const data = normalize(body.awards);
      const issues = issuesFor(data);
      if (issues.some((i) => i.level === 'error') && !body.force) {
        return sendJson(res, 409, {blocked: true, issues, error: 'Fix the errors listed below before saving.'});
      }
      writeData(data);
      return sendJson(res, 200, {saved: true, issues});
    }
    if (p === '/api/validate' && req.method === 'POST') {
      const body = await jsonBody();
      if (!shapeOk(body.awards)) return sendJson(res, 400, {error: 'awards data must be an object with a categories array'});
      return sendJson(res, 200, {issues: issuesFor(normalize(body.awards))});
    }

    // ── soundtracks (out/audio) ─────────────────────────────────────────────────────────────────
    const audioMatch = p.match(/^\/api\/audio\/([\w.-]+)(\/file|\/upload)?$/);
    if (audioMatch) {
      const [, id, suffix] = audioMatch;
      if (req.method === 'GET' && suffix === '/file') {
        const file = findSoundtrack(id, ROOT);
        if (!file) return sendJson(res, 404, {error: 'no soundtrack for this category'});
        return serveFile(req, res, file);
      }
      if (req.method === 'GET') return sendJson(res, 200, audioInfo(id));
      if (req.method === 'POST' && suffix === '/upload') {
        const name = safeName(q.get('name'), AUDIO_EXT);
        if (!name) return sendJson(res, 400, {error: 'audio file must end in .wav, .mp3, .m4a, .aac, .flac or .ogg'});
        const body = await readBody(req, LIMITS.audio);
        if (body.length === 0) return sendJson(res, 400, {error: 'empty upload'});
        fs.mkdirSync(path.join(ROOT, AUDIO_DIR), {recursive: true});
        for (const f of listSoundtracks(id, ROOT)) if (path.basename(f).includes('-soundtrack.')) fs.unlinkSync(f);
        const target = path.join(ROOT, AUDIO_DIR, `${id}-soundtrack${path.extname(name).toLowerCase()}`);
        fs.writeFileSync(target, body);
        fs.writeFileSync(audioSourcePath(id), `${JSON.stringify({originalName: name, uploadedAt: new Date().toISOString()}, null, 2)}\n`);
        return sendJson(res, 200, {info: audioInfo(id)});
      }
      if (req.method === 'DELETE') {
        const removed = clearSoundtrack(id);
        if (!removed.length) return sendJson(res, 404, {error: 'no soundtrack to remove'});
        return sendJson(res, 200, {removed});
      }
    }

    // ── rendered outputs & preview stills ───────────────────────────────────────────────────────
    if (p === '/api/outputs' && req.method === 'GET') {
      const id = q.get('categoryId') ?? '';
      if (!/^[\w.-]+$/.test(id)) return sendJson(res, 400, {error: 'invalid category id'});
      return sendJson(res, 200, {
        silent: listFiles(path.join(ROOT, 'out', id), new Set(['.mp4'])),
        mixed: listFiles(path.join(ROOT, 'out', id, 'with-audio'), new Set(['.mp4'])),
      });
    }
    if (p === '/api/output' && req.method === 'GET') {
      const id = q.get('categoryId') ?? '';
      const rel = q.get('file') ?? '';
      if (!/^[\w.-]+$/.test(id)) return sendJson(res, 400, {error: 'invalid category id'});
      const abs = safeJoin(path.join(ROOT, 'out', id), rel);
      if (!abs) return sendJson(res, 400, {error: 'invalid file path'});
      return serveFile(req, res, abs, {download: q.get('dl') === '1'});
    }
    if (p === '/api/still' && req.method === 'GET') {
      const name = q.get('name') ?? '';
      if (!/^[\w.\-]+\.png$/.test(name)) return sendJson(res, 400, {error: 'invalid still name'});
      return serveFile(req, res, path.join(STILLS, name), {download: q.get('dl') === '1'});
    }

    // ── jobs (render / audio / mix / preview) ───────────────────────────────────────────────────
    if (p === '/api/jobs' && req.method === 'GET') {
      return sendJson(res, 200, {jobs: jobs.map(jobView), running: running ? running.id : null, queued: queue.map((j) => j.id)});
    }
    if (p === '/api/jobs' && req.method === 'POST') {
      const body = await jsonBody();
      const action = body.action;
      const categoryId = String(body.categoryId ?? '');
      const presentationId = String(body.presentationId ?? '');
      const screen = body.screen ? String(body.screen) : null;
      const KNOWN = ['render', 'audio', 'mux', 'pipeline', 'still', 'stretch', 'winner', 'presentation', 'presentations'];
      if (!KNOWN.includes(action)) return sendJson(res, 400, {error: 'unknown action'});
      if (categoryId && !/^[\w.-]+$/.test(categoryId)) return sendJson(res, 400, {error: 'invalid category id'});
      if (presentationId && !/^[\w.-]+$/.test(presentationId)) return sendJson(res, 400, {error: 'invalid presentation id'});
      if (body.nomineeId !== undefined && !/^[\w.-]*$/.test(String(body.nomineeId))) return sendJson(res, 400, {error: 'invalid nominee id'});
      const needsCategory = ['render', 'audio', 'mux', 'pipeline', 'stretch', 'winner'].includes(action)
        || (action === 'still' && screen !== 'presentation');
      const needsPresentation = action === 'presentation' || action === 'presentations' || (action === 'still' && screen === 'presentation');
      if (needsCategory && !categoryId) return sendJson(res, 400, {error: 'categoryId is required'});
      if (needsPresentation && action !== 'presentations' && !presentationId) return sendJson(res, 400, {error: 'presentationId is required'});
      const steps = stepsFor(action, {categoryId, nomineeId: body.nomineeId, presentationId, screen, frame: body.frame});
      if (!steps) return sendJson(res, 400, {error: 'unknown action'});
      const job = {
        id: randomUUID(), action, categoryId: categoryId || null, nomineeId: body.nomineeId ?? null,
        presentationId: presentationId || null, screen, state: 'queued', step: null,
        labels: steps.map((s) => s.label), log: '', created: Date.now(), started: null, ended: null,
        steps, child: null,
      };
      enqueue(job);
      return sendJson(res, 200, {job: jobView(job)});
    }
    const killMatch = p.match(/^\/api\/jobs\/([\w-]+)\/kill$/);
    if (killMatch && req.method === 'POST') {
      const job = jobs.find((j) => j.id === killMatch[1]);
      if (!job) return sendJson(res, 404, {error: 'job not found'});
      if (job.state === 'queued') {
        job.state = 'killed';
        const i = queue.indexOf(job);
        if (i >= 0) queue.splice(i, 1);
        job.ended = Date.now();
      } else if (job.state === 'running') {
        job.state = 'killed';
        job.child?.kill();
      }
      return sendJson(res, 200, {job: jobView(job)});
    }

    sendJson(res, 404, {error: `no route: ${req.method} ${p}`});

  } catch (e) {
    sendJson(res, e?.statusCode ?? 500, {error: e?.message ?? String(e)});
  }
});

server.listen(PORT, HOST, () => {
  console.log(`YORA Awards Editor → http://${HOST}:${PORT}`);
  console.log(`  data   ${DATA}`);
  console.log(`  audio  ${PY} (placeholder generator) · jobs run one at a time`);
});





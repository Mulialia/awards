'use strict';
// YORA Awards Editor front-end — plain JS, no build step. Served by scripts/editor-server.mjs.
// Working copy of awards.json lives in S.awards; explicit Save persists it (live-validated).

// ── state ────────────────────────────────────────────────
const S = {
  awards: null, baseline: '', issues: [], timing: null,
  media: {portraits: [], logos: [], companyLogos: []},
  audio: {}, status: {}, jobs: [],
  catId: null, tab: 'nominees', mediaDir: 'portraits',
  cacheBust: {}, modalSubmit: null,
};

// ── small helpers ────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const slug = (s) => String(s ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const idSafe = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '');
const fmtSize = (b) => (b == null ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const fmtDate = (ms) => new Date(ms).toLocaleString();
const cat = () => S.awards?.categories.find((c) => c.id === S.catId) ?? null;
const errors = () => S.issues.filter((i) => i.level === 'error');
const mediaUrl = (rel) => `/media/${rel}${S.cacheBust[rel] ? `?v=${S.cacheBust[rel]}` : ''}`;

async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  let body = null;
  try { body = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error(body?.error ?? `${res.status} ${res.statusText}`);
    err.body = body; err.status = res.status;
    throw err;
  }
  return body;
}
const postJson = (path, obj) => api(path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(obj)});

let toastTimer;
function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('error', isError);
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3800);
}

function openModal(html, onSubmit) {
  $('#modalCard').innerHTML = html;
  $('#modalRoot').classList.remove('hidden');
  S.modalSubmit = onSubmit ?? null;
  $('#modalCard input:not([type=file])')?.focus();
}
const closeModal = () => {
  $('#modalRoot').classList.add('hidden');
  $('#modalCard').innerHTML = '';
  S.modalSubmit = null;
};

// ── dirty / save / live validation ───────────────────────
const isDirty = () => !!S.awards && JSON.stringify(S.awards) !== S.baseline;

function updateSaveUI() {
  const dirty = isDirty();
  $('#btnSave').disabled = !dirty;
  $('#saveState').textContent = dirty ? 'Unsaved changes' : 'Saved';
  $('#saveState').classList.toggle('warn', dirty);
  $('#dirtyBanner').classList.toggle('hidden', !dirty);
}

function renderIssues() {
  const issues = S.issues;
  const errs = issues.filter((i) => i.level === 'error').length;
  const warns = issues.filter((i) => i.level === 'warning').length;
  const pill = $('#validationPill');
  pill.textContent = errs ? `${errs} error${errs > 1 ? 's' : ''}` : warns ? `${warns} warning${warns > 1 ? 's' : ''}` : 'Data OK';
  pill.className = `pill ${errs ? 'err' : warns ? 'warn' : 'ok'}`;
  const box = $('#issues');
  if (!issues.length) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  box.innerHTML = issues
    .map((i) => `<div class="issue ${i.level}"><span class="where">${esc(i.where)}</span> — ${esc(i.message)}</div>`)
    .join('');
}

async function save({force = false} = {}) {
  try {
    const r = await api('/api/data', {
      method: 'PUT', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({awards: S.awards, force}),
    });
    S.issues = r.issues;
    S.baseline = JSON.stringify(S.awards);
    renderIssues(); updateSaveUI();
    toast(force ? 'Saved with errors ⚠' : 'Saved ✓');
    renderSidebar();
  } catch (e) {
    if (e.status === 409 && e.body?.issues) {
      S.issues = e.body.issues;
      renderIssues();
      toast('Fix the errors listed above, then save again', true);
    } else {
      toast(`Save failed: ${e.message}`, true);
    }
  }
}

let validateTimer;
function scheduleValidate() {
  clearTimeout(validateTimer);
  validateTimer = setTimeout(async () => {
    try {
      const r = await postJson('/api/validate', {awards: S.awards});
      S.issues = r.issues;
      renderIssues();
    } catch {}
  }, 450);
}

// ── shell: sidebar + tabs ────────────────────────────────
function renderSidebar() {
  const list = $('#categoryList');
  list.innerHTML = S.awards.categories
    .map((c) => `
      <div class="cat-item ${c.id === S.catId ? 'active' : ''}" data-id="${esc(c.id)}" title="${esc(c.name)}">
        <span class="num">${c.number || '·'}</span>
        <span class="cat-name">${esc(c.name || '(unnamed category)')}</span>
        <span class="dot ${S.status[c.id]?.mixed ? 'on' : ''}" title="${S.status[c.id]?.mixed ? 'mixed ✓' : 'not mixed yet'}"></span>
      </div>`)
    .join('');
  const nominees = S.awards.categories.reduce((n, c) => n + c.nominees.length, 0);
  $('#sidebarFoot').innerHTML = `${S.awards.categories.length} categories · ${nominees} nominees<br>
    green dot = final mixed video exists`;
}

const selectCategory = (id) => { S.catId = id; renderSidebar(); renderTab(); };

function switchTab(name) {
  S.tab = name;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${name}`));
  renderTab();
}

function renderTab() {
  if (!S.awards) return;
  if (S.tab === 'nominees') renderNominees();
  if (S.tab === 'category') renderCategoryTab();
  if (S.tab === 'media') renderMediaTab();
  if (S.tab === 'audio') renderAudioTab();
  if (S.tab === 'pipeline') renderPipelineTab();
}

function renderAll() {
  renderSidebar();
  renderIssues();
  updateSaveUI();
  renderTab();
}

// ── tab: nominees ────────────────────────────────────────
function nomineeCard(n, i, c) {
  const photo = n.portrait
    ? `<img src="${mediaUrl(n.portrait)}" alt="" style="object-position:${esc(n.portraitFocus || '50% 25%')}">`
    : '<div class="no-photo">PORTRAIT<br>PLACEHOLDER</div>';
  return `
    <div class="nominee-card" data-i="${i}">
      <div class="nominee-photo">${photo}</div>
      <div class="nominee-body">
        <div class="n-name">${esc(n.name) || '<i>unnamed</i>'}</div>
        <div class="n-business">${esc(n.business)}</div>
        <div class="n-id">${esc(n.id)}</div>
        <div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap">
          ${n.portrait ? '<span class="badge">photo</span>' : ''}
          ${n.companyLogo ? '<span class="badge">logo</span>' : ''}
          ${n.achievement ? '<span class="badge">achievement</span>' : ''}
        </div>
      </div>
      <div class="nominee-actions">
        <button class="btn small" data-act="edit">Edit</button>
        <button class="btn small ghost" data-act="up" ${i === 0 ? 'disabled' : ''} title="Move up">↑</button>
        <button class="btn small ghost" data-act="down" ${i === c.nominees.length - 1 ? 'disabled' : ''} title="Move down">↓</button>
        <button class="btn small ghost" data-act="preview" title="Render a preview frame">Preview</button>
        <button class="btn small ghost danger" data-act="del" title="Remove">✕</button>
      </div>
    </div>`;
}

function renderNominees() {
  const c = cat();
  const el = $('#tab-nominees');
  if (!c) {
    el.innerHTML = '<p class="sub">No category selected — add one with <strong>＋ Add</strong> on the left.</p>';
    return;
  }
  el.innerHTML = `
    <div class="row" style="margin-bottom:14px">
      <div class="grow">
        <h2>${esc(c.name || 'Untitled category')}</h2>
        <p class="sub">${c.nominees.length} nominee(s) — the order here is the order in the video (01-, 02-, … file names)</p>
      </div>
      <button class="btn" id="btnPreviewIntro">Preview intro</button>
      <button class="btn primary" id="btnAddNominee">＋ Add nominee</button>
    </div>
    <div class="nominee-grid" id="nomineeGrid">
      ${c.nominees.map((n, i) => nomineeCard(n, i, c)).join('') ||
        '<p class="sub">No nominees yet — add the first one.</p>'}
    </div>`;

  $('#btnAddNominee').onclick = () => openNomineeModal(-1);
  $('#btnPreviewIntro').onclick = () => startJob('still');
  $('#nomineeGrid').onclick = (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const i = Number(btn.closest('.nominee-card').dataset.i);
    const act = btn.dataset.act;
    if (act === 'edit') openNomineeModal(i);
    if (act === 'up' || act === 'down') {
      const j = act === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= c.nominees.length) return;
      [c.nominees[i], c.nominees[j]] = [c.nominees[j], c.nominees[i]];
      renderNominees(); scheduleValidate(); updateSaveUI();
      toast('Order changed — Save, then re-render to apply it to the files');
    }
    if (act === 'preview') startJob('still', {nomineeId: c.nominees[i].id});
    if (act === 'del') {
      const n = c.nominees[i];
      if (!confirm(`Remove "${n.name}" from this category?\n\n(Their portrait file stays in public/portraits.)`)) return;
      c.nominees.splice(i, 1);
      renderNominees(); scheduleValidate(); updateSaveUI();
    }
  };
}

// ── nominee editor modal ─────────────────────────────────
function suggestNomineeId(c) {
  const prefix = slug(c.id).split('-')[0] || 'nominee';
  const used = new Set(S.awards.categories.flatMap((x) => x.nominees.map((n) => n.id)));
  let i = 1;
  while (used.has(`${prefix}-${String(i).padStart(3, '0')}`)) i++;
  return `${prefix}-${String(i).padStart(3, '0')}`;
}

function pickerStrip(kind, selected) {
  const files = kind === 'portrait' ? S.media.portraits : S.media.companyLogos;
  const noneLabel = kind === 'portrait' ? 'NO PHOTO' : 'NO LOGO';
  const none = `<div class="thumb ${selected ? '' : 'selected'}" data-rel="" title="None">
    <div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#555d73;text-align:center">${noneLabel}</div></div>`;
  return none + files.map((f) => `
    <div class="thumb ${f.rel === selected ? 'selected' : ''}" data-rel="${esc(f.rel)}" title="${esc(f.rel)}">
      <img src="${mediaUrl(f.rel)}" alt="">
    </div>`).join('');
}

function openNomineeModal(index) {
  const c = cat();
  const isNew = index < 0;
  const n = isNew
    ? {id: suggestNomineeId(c), name: '', business: '', title: null, country: null, portrait: null, portraitFocus: null, companyLogo: null, achievement: null}
    : {...c.nominees[index]};
  const v = (x) => (x == null ? '' : x);

  openModal(`
    <h3>${isNew ? 'Add nominee' : `Edit · ${esc(n.name)}`}</h3>
    <form id="nomineeForm">
      <div class="grid-2">
        <div class="field"><label>Name *</label><input type="text" name="name" value="${esc(v(n.name))}" required></div>
        <div class="field"><label>Business *</label><input type="text" name="business" value="${esc(v(n.business))}" required></div>
        <div class="field"><label>Title <span class="counter">optional</span></label><input type="text" name="title" value="${esc(v(n.title))}" placeholder="Founder &amp; CEO"></div>
        <div class="field"><label>Country <span class="counter">optional — never inferred</span></label><input type="text" name="country" value="${esc(v(n.country))}" placeholder="Kenya"></div>
      </div>
      <div class="field">
        <label>Achievement <span class="counter" id="achCount">${(n.achievement ?? '').length} / 140</span></label>
        <textarea name="achievement" maxlength="200" placeholder="One short VERIFIED statement — omit rather than invent">${esc(v(n.achievement))}</textarea>
      </div>
      <div class="grid-2">
        <div class="field">
          <label>ID <span class="counter">used in file names</span></label>
          <input type="text" name="nid" value="${esc(n.id)}" data-idsafe>
          <div class="hint">Unique across all categories; changing it renames output files.</div>
        </div>
        <div class="field">
          <label>Portrait focus</label>
          <input type="text" name="portraitFocus" value="${esc(v(n.portraitFocus))}" placeholder="50% 15%">
          <div class="hint">CSS object-position — fine-tunes the crop (x% y%).</div>
        </div>
      </div>
      <div class="field">
        <label>Portrait photo</label>
        <div class="row">
          <div class="thumb" style="cursor:default"><img id="portraitPreview" src="${n.portrait ? mediaUrl(n.portrait) : ''}" alt="" style="object-position:${esc(v(n.portraitFocus) || '50% 25%')};${n.portrait ? '' : 'display:none'}"></div>
          <div class="grow">
            <input type="hidden" name="portrait" value="${esc(v(n.portrait))}">
            <div class="thumb-strip" data-kind="portrait">${pickerStrip('portrait', n.portrait)}</div>
            <input type="file" accept=".jpg,.jpeg,.png,.webp" data-upload="portrait" hidden>
            <button type="button" class="btn small" data-act="upload-portrait">Upload photo…</button>
          </div>
        </div>
      </div>
      <div class="field">
        <label>Company logo</label>
        <input type="hidden" name="companyLogo" value="${esc(v(n.companyLogo))}">
        <div class="thumb-strip" data-kind="logo">${pickerStrip('logo', n.companyLogo)}</div>
        <input type="file" accept=".jpg,.jpeg,.png,.webp" data-upload="logo" hidden>
        <button type="button" class="btn small" data-act="upload-logo">Upload logo…</button>
      </div>
      <div class="modal-actions">
        ${isNew ? '' : '<button type="button" class="btn danger" id="delNominee">Delete nominee</button>'}
        <button type="button" class="btn" id="cancelModal">Cancel</button>
        <button type="submit" class="btn primary">${isNew ? 'Add nominee' : 'Apply'}</button>
      </div>
    </form>`,
    () => {
      const form = $('#nomineeForm');
      const get = (name) => (form.querySelector(`[name="${name}"]`).value ?? '').toString();
      const data = {
        id: idSafe(get('nid')),
        name: get('name').trim(),
        business: get('business').trim(),
        title: get('title').trim() || null,
        country: get('country').trim() || null,
        portrait: get('portrait') || null,
        portraitFocus: get('portraitFocus').trim() || null,
        companyLogo: get('companyLogo') || null,
        achievement: get('achievement').trim() || null,
      };
      if (!data.name || !data.business || !data.id) return toast('Name, business and ID are required', true);
      const dup = S.awards.categories.some((x) => x.nominees.some((o) => o.id === data.id && !(x === c && o === n)));
      if (dup) return toast(`ID "${data.id}" is already used by another nominee`, true);
      if (isNew) c.nominees.push(data);
      else c.nominees[index] = data;
      closeModal();
      renderNominees(); scheduleValidate(); updateSaveUI();
      toast(isNew ? 'Nominee added — remember to Save' : 'Nominee updated — remember to Save');
    });

  wireNomineeModal(c, n, index, isNew);
}

function wireNomineeModal(c, n, index, isNew) {
  const form = $('#nomineeForm');
  form.addEventListener('input', (e) => {
    if (e.target.name === 'achievement') {
      const cnt = $('#achCount');
      cnt.textContent = `${e.target.value.length} / 140`;
      cnt.classList.toggle('over', e.target.value.length > 140);
    }
    if (e.target.matches('[data-idsafe]')) e.target.value = idSafe(e.target.value);
    if (e.target.name === 'portraitFocus') $('#portraitPreview').style.objectPosition = e.target.value || '50% 25%';
    updateSaveUI();
  });
  $('#cancelModal').onclick = closeModal;
  $('#delNominee')?.addEventListener('click', () => {
    if (!confirm(`Remove "${n.name}" from this category?`)) return;
    c.nominees.splice(index, 1);
    closeModal(); renderNominees(); scheduleValidate(); updateSaveUI();
  });

  form.addEventListener('click', (e) => {
    const thumb = e.target.closest('.thumb[data-rel]');
    if (thumb) {
      const strip = thumb.closest('.thumb-strip');
      const isPortrait = strip.dataset.kind === 'portrait';
      strip.querySelectorAll('.thumb').forEach((t) => t.classList.toggle('selected', t === thumb));
      const rel = thumb.dataset.rel || '';
      form.querySelector(`input[name="${isPortrait ? 'portrait' : 'companyLogo'}"]`).value = rel;
      if (isPortrait) {
        const prev = $('#portraitPreview');
        prev.src = rel ? mediaUrl(rel) : '';
        prev.style.display = rel ? '' : 'none';
      }
      return;
    }
    const act = e.target.dataset.act;
    if (act === 'upload-portrait' || act === 'upload-logo') {
      form.querySelector(`[data-upload="${act === 'upload-portrait' ? 'portrait' : 'logo'}"]`).click();
    }
  });

  form.addEventListener('change', async (e) => {
    const kind = e.target.dataset.upload;
    if (!kind) return;
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const isPortrait = kind === 'portrait';
    const base = isPortrait
      ? (idSafe(form.querySelector('[name=nid]').value) || slug(form.querySelector('[name=name]').value) || 'portrait')
      : (slug(form.querySelector('[name=business]').value) || slug(file.name.replace(/\.[^.]+$/, '')) || 'logo');
    const ext = (file.name.match(/\.[^.]+$/) ?? ['.jpg'])[0].toLowerCase();
    try {
      const rel = await uploadMedia(isPortrait ? 'portraits' : 'logos/company', `${base}${ext}`, file);
      form.querySelector(`input[name="${isPortrait ? 'portrait' : 'companyLogo'}"]`).value = rel;
      const strip = form.querySelector(`.thumb-strip[data-kind="${isPortrait ? 'portrait' : 'logo'}"]`);
      strip.innerHTML = pickerStrip(isPortrait ? 'portrait' : 'logo', rel);
      if (isPortrait) { $('#portraitPreview').src = mediaUrl(rel); $('#portraitPreview').style.display = ''; }
      toast(`Uploaded ${rel} — remember to Save`);
    } catch (err) {
      toast(`Upload failed: ${err.message}`, true);
    }
  });
}

/** Raw-body upload to /api/media/upload; updates the in-memory media list. */
async function uploadMedia(dirKey, name, file) {
  const r = await api(`/api/media/upload?dir=${encodeURIComponent(dirKey)}&name=${encodeURIComponent(name)}`, {
    method: 'POST', body: file,
  });
  S.cacheBust[r.rel] = Date.now();
  const key = dirKey === 'portraits' ? 'portraits' : dirKey === 'logos' ? 'logos' : 'companyLogos';
  const list = S.media[key].filter((f) => f.rel !== r.rel);
  list.push({name, rel: r.rel, url: r.url, size: file.size, mtime: Date.now()});
  list.sort((a, b) => a.name.localeCompare(b.name));
  S.media[key] = list;
  return r.rel;
}

// ── tab: category ────────────────────────────────────────
function renderCategoryTab() {
  const c = cat();
  const el = $('#tab-category');
  if (!c) { el.innerHTML = '<p class="sub">No category selected.</p>'; return; }
  const ev = S.awards.event ?? (S.awards.event = {name: '', brand: '', year: null});
  const lines = c.introTitle?.lines?.join('\n') ?? '';
  const suffix = c.introTitle?.suffix ?? '';
  const frames = S.timing.introFrames + c.nominees.length * S.timing.nomineeFrames + S.timing.rosterFrames;

  el.innerHTML = `
    <h2>Category settings</h2>
    <p class="sub">Changes apply after <strong>Save</strong>. Re-render afterwards to see them in the video.</p>
    <div class="card">
      <h3>Event</h3>
      <div class="grid-2">
        <div class="field"><label>Event name</label><input type="text" data-bind="evt-name" value="${esc(ev.name)}"></div>
        <div class="field"><label>Brand</label><input type="text" data-bind="evt-brand" value="${esc(ev.brand)}"></div>
        <div class="field"><label>Year</label><input type="text" data-bind="evt-year" value="${esc(ev.year ?? '')}"></div>
      </div>
    </div>
    <div class="card">
      <h3>This category</h3>
      <div class="grid-2">
        <div class="field"><label>Name *</label><input type="text" data-bind="cat-name" value="${esc(c.name)}"></div>
        <div class="field"><label>Number</label><input type="text" inputmode="numeric" data-bind="cat-number" value="${c.number || ''}"></div>
        <div class="field">
          <label>ID</label><input type="text" data-idsafe data-bind="cat-id" value="${esc(c.id)}">
          <div class="hint">Used for the output folder <code>out/&lt;id&gt;/</code> — changing it starts a fresh folder.</div>
        </div>
        <div class="field">
          <label>Intro title — suffix</label><input type="text" data-bind="cat-suffix" value="${esc(suffix)}" placeholder="Award">
          <div class="hint">Leave the lines + suffix empty to auto-fit the category name instead.</div>
        </div>
      </div>
      <div class="field">
        <label>Intro title — lines <span class="counter">one per line, optional</span></label>
        <textarea data-bind="cat-lines" rows="2" placeholder="Youth Creative&#10;Business Concept">${esc(lines)}</textarea>
      </div>
      <div class="row">
        <button class="btn" id="btnPreviewIntro2">Preview intro still</button>
        <span class="grow"></span>
        <button class="btn danger" id="btnDeleteCategory">Delete category</button>
      </div>
    </div>
    <div class="card">
      <h3>Summary</h3>
      <p class="sub" style="margin:0">${c.nominees.length} nominees · ${frames} frames @ ${S.timing.fps} fps = ${Math.round(frames / S.timing.fps)} s · output → <code>out/${esc(c.id)}/</code></p>
    </div>`;

  el.oninput = (e) => {
    const bind = e.target.dataset.bind;
    if (!bind) return;
    if (bind.startsWith('evt-')) {
      const f = bind.slice(4);
      S.awards.event[f] = f === 'year' ? (e.target.value.replace(/\D/g, '') || null) : e.target.value;
      if (f === 'year') e.target.value = S.awards.event.year ?? '';
    } else if (bind === 'cat-name') {
      c.name = e.target.value;
    } else if (bind === 'cat-number') {
      c.number = Number(e.target.value.replace(/\D/g, '')) || 0;
      e.target.value = c.number || '';
    } else if (bind === 'cat-id') {
      c.id = idSafe(e.target.value);
      e.target.value = c.id;
      S.catId = c.id;
      renderSidebar();
    } else if (bind === 'cat-lines' || bind === 'cat-suffix') {
      const ls = el.querySelector('[data-bind="cat-lines"]').value.split('\n').map((s) => s.trim()).filter(Boolean);
      const sf = el.querySelector('[data-bind="cat-suffix"]').value.trim();
      c.introTitle = ls.length || sf ? {lines: ls, suffix: sf || null} : null;
    }
    updateSaveUI();
    scheduleValidate();
  };
  el.onclick = (e) => {
    if (e.target.id === 'btnPreviewIntro2') startJob('still');
    if (e.target.id === 'btnDeleteCategory') {
      if (!confirm(`Delete category "${c.name || c.id}" from the data?\n\nIts rendered files stay on disk.`)) return;
      const i = S.awards.categories.indexOf(c);
      S.awards.categories.splice(i, 1);
      S.catId = S.awards.categories[0]?.id ?? null;
      renderAll(); scheduleValidate();
      toast('Category deleted — remember to Save');
    }
  };
}

function addCategory() {
  const number = Math.max(0, ...S.awards.categories.map((c) => Number(c.number) || 0)) + 1;
  let id = 'new-category';
  let i = 2;
  while (S.awards.categories.some((c) => c.id === id)) id = `new-category-${i++}`;
  S.awards.categories.push({id, number, name: '', introTitle: null, nominees: []});
  S.catId = id;
  renderAll();
  switchTab('category');
  setTimeout(() => $('#tab-category [data-bind="cat-name"]')?.focus(), 50);
  toast('New category added — fill in the name, then Save');
}

// ── tab: media ───────────────────────────────────────────
const mediaKey = (dir) => (dir === 'portraits' ? 'portraits' : dir === 'logos' ? 'logos' : 'companyLogos');

function mediaUsageLocal(rel) {
  const hits = [];
  for (const c of S.awards.categories) {
    for (const n of c.nominees) {
      if (n.portrait === rel) hits.push(`${c.id} / ${n.id}`);
      if (n.companyLogo === rel) hits.push(`${c.id} / ${n.id}`);
    }
  }
  return hits;
}

function renderMediaTab() {
  const el = $('#tab-media');
  const dirs = [
    ['portraits', 'Portraits'],
    ['logos/company', 'Company logos'],
    ['logos', 'Event logos (view only)'],
  ];
  const readonly = S.mediaDir === 'logos';
  const files = S.media[mediaKey(S.mediaDir)];

  el.innerHTML = `
    <h2>Media library</h2>
    <p class="sub">Photos and logos are stored under <code>public/</code> and referenced from nominee records.
      Upload here, then pick them in the Nominees tab.</p>
    <div class="row" style="margin-bottom:14px">
      ${dirs.map(([d, label]) => `<button class="btn small ${S.mediaDir === d ? 'primary' : ''}" data-dir="${d}">${label}</button>`).join('')}
    </div>
    ${readonly
      ? '<div class="card"><p class="sub" style="margin:0">Artwork used by the video templates themselves — view only. Files live in <code>public/logos/</code>.</p></div>'
      : `<div class="dropzone" id="dropzone">Drag images here, or click to choose (.jpg · .jpeg · .png · .webp)</div>
         <input type="file" id="mediaFiles" accept=".jpg,.jpeg,.png,.webp" multiple hidden>`}
    <div class="media-grid">
      ${files.length
        ? files.map((f) => {
            const used = mediaUsageLocal(f.rel);
            return `<div class="media-item">
              <img src="${mediaUrl(f.rel)}" alt="">
              <div class="meta">${esc(f.name)}<br>${fmtSize(f.size)} · ${used.length ? `<strong style="color:var(--green)">used ${used.length}×</strong>` : 'unused'}</div>
              <div class="actions">
                <button class="btn small" data-copy="${esc(f.rel)}">Copy path</button>
                ${readonly ? '' : `<button class="btn small danger" data-del="${esc(f.rel)}">Delete</button>`}
              </div>
            </div>`;
          }).join('')
        : '<p class="sub">No files in this folder yet.</p>'}
    </div>`;

  el.onclick = async (e) => {
    const dirBtn = e.target.closest('[data-dir]');
    if (dirBtn) { S.mediaDir = dirBtn.dataset.dir; renderMediaTab(); return; }
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      try { await navigator.clipboard.writeText(copy.dataset.copy); toast(`Copied ${copy.dataset.copy}`); }
      catch { toast(copy.dataset.copy); }
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      const rel = del.dataset.del;
      const used = mediaUsageLocal(rel);
      const msg = used.length
        ? `Delete ${rel}?\n\n⚠ It is used by:\n${used.join('\n')}\n\nClear those references first, or the video will show a placeholder.`
        : `Delete ${rel}? This cannot be undone.`;
      if (!confirm(msg)) return;
      try {
        await api(`/api/media?path=${encodeURIComponent(rel)}`, {method: 'DELETE'});
        S.media[mediaKey(S.mediaDir)] = S.media[mediaKey(S.mediaDir)].filter((f) => f.rel !== rel);
        renderMediaTab();
        toast(`Deleted ${rel}`);
      } catch (err) {
        toast(err.body?.hits ? `In use by: ${err.body.hits.join(', ')}` : err.message, true);
      }
      return;
    }
    if (e.target.id === 'dropzone') $('#mediaFiles').click();
  };

  const input = $('#mediaFiles');
  if (input) {
    input.onchange = () => uploadMany(input.files);
    input.value = '';
    const dz = $('#dropzone');
    dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('drag'); };
    dz.ondragleave = () => dz.classList.remove('drag');
    dz.ondrop = (e) => {
      e.preventDefault();
      dz.classList.remove('drag');
      uploadMany(e.dataTransfer.files);
    };
  }
}

async function uploadMany(fileList) {
  const files = [...fileList].filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name));
  if (!files.length) return toast('Only .jpg, .jpeg, .png or .webp images are accepted', true);
  let ok = 0;
  for (const file of files) {
    try {
      await uploadMedia(S.mediaDir, file.name.replace(/[^\w.\- ()]+/g, ''), file);
      ok++;
    } catch (err) {
      toast(`${file.name}: ${err.message}`, true);
    }
  }
  renderMediaTab();
  if (ok) toast(`Uploaded ${ok} file${ok > 1 ? 's' : ''}`);
}

// ── tab: audio ───────────────────────────────────────────
function renderAudioTab() {
  const c = cat();
  const el = $('#tab-audio');
  if (!c) { el.innerHTML = '<p class="sub">No category selected.</p>'; return; }
  const info = S.audio[c.id] ?? {file: null};
  const totalFrames = S.timing.introFrames + c.nominees.length * S.timing.nomineeFrames + S.timing.rosterFrames;
  const seconds = Math.round(totalFrames / S.timing.fps);
  const srcLabel = {uploaded: 'Uploaded track', placeholder: 'Placeholder (generated)', manual: 'Manual WAV'}[info.source] ?? '';
  const accept = '.wav,.mp3,.m4a,.aac,.flac,.ogg';

  el.innerHTML = `
    <h2>Soundtrack</h2>
    <p class="sub">One track covers the <strong>whole sequence</strong> of this category (intro + every nominee + roster).
      Upload the polished mix — music <em>and</em> voice-over — or generate the placeholder.</p>
    <div class="card audio-card">
      ${info.file ? `
        <div class="grow">
          <div class="row">
            <strong>${esc(info.name)}</strong>
            <span class="src-badge ${info.source}">${srcLabel}</span>
          </div>
          <div class="sub" style="margin:4px 0 0">
            ${fmtSize(info.size)} ·
            ${info.source === 'uploaded' && info.uploaded
              ? `uploaded ${fmtDate(Date.parse(info.uploaded.uploadedAt))} as “${esc(info.uploaded.originalName)}”`
              : `file date ${fmtDate(info.mtime)}`}
          </div>
          <audio controls preload="none" src="/api/audio/${encodeURIComponent(c.id)}/file?v=${info.mtime}"></audio>
        </div>
        <div class="row" style="align-items:flex-start">
          <label class="btn">Replace…<input type="file" id="audioFile" accept="${accept}" hidden></label>
          <button class="btn" id="btnGenAudio">Generate placeholder</button>
          <button class="btn danger" id="btnRemoveAudio">Remove</button>
        </div>`
      : `
        <div class="grow">
          <strong>No soundtrack yet.</strong>
          <div class="sub" style="margin-top:4px">Generate the timing-accurate placeholder, or upload your finished mix.</div>
        </div>
        <div class="row" style="align-items:flex-start">
          <label class="btn primary">Upload track…<input type="file" id="audioFile" accept="${accept}" hidden></label>
          <button class="btn" id="btnGenAudio">Generate placeholder</button>
        </div>`}
    </div>
    <div class="card">
      <h3>Specs</h3>
      <p class="sub" style="margin:0">
        Stereo · 48 kHz · exactly <strong>${seconds} s</strong> (= the full category sequence, ${totalFrames} frames @ ${S.timing.fps} fps).<br>
        Loudness is normalised during mixing (−18 LUFS), so levels don't need pre-matching.<br>
        Accepted formats: WAV, MP3, M4A, AAC, FLAC, OGG. After changing the track, run step&nbsp;<strong>3 · Mix</strong> in the Pipeline tab.
      </p>
    </div>`;

  const fileInput = $('#audioFile');
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const r = await api(`/api/audio/${encodeURIComponent(c.id)}/upload?name=${encodeURIComponent(file.name)}`, {
        method: 'POST', body: file,
      });
      S.audio[c.id] = r.info;
      renderAudioTab();
      toast('Track uploaded — run the Mix step to apply it');
    } catch (err) {
      toast(`Upload failed: ${err.message}`, true);
    }
  };
  $('#btnGenAudio')?.addEventListener('click', () => {
    if (info.file && !confirm(`Replace the current track (${info.name}) with the generated placeholder?`)) return;
    startJob('audio');
  });
  $('#btnRemoveAudio')?.addEventListener('click', async () => {
    if (!confirm(`Remove ${info.name} from this category?`)) return;
    try {
      await api(`/api/audio/${encodeURIComponent(c.id)}`, {method: 'DELETE'});
      S.audio[c.id] = {file: null};
      renderAudioTab();
      toast('Soundtrack removed');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ── tab: pipeline ────────────────────────────────────────
const actionLabel = (a) => ({render: 'Render', audio: 'Soundtrack', mux: 'Mix', pipeline: 'Full pipeline', still: 'Preview still'})[a] ?? a;

function stepCard(n, title, statusHtml, runAction, disabled) {
  return `
    <div class="step-card">
      <div class="step-n">STEP ${n}</div>
      <div class="step-title">${title}</div>
      <div class="step-status">${statusHtml}</div>
      <button class="btn small" data-run="${runAction}" ${disabled ? 'disabled' : ''}>▶ Run</button>
    </div>`;
}

function renderPipelineTab() {
  const c = cat();
  const el = $('#tab-pipeline');
  if (!c) { el.innerHTML = '<p class="sub">No category selected.</p>'; return; }
  const st = S.status[c.id] ?? {};
  const audio = S.audio[c.id] ?? {file: null};
  const dirty = isDirty();
  const hasErrors = errors().length > 0;
  const blocked = dirty || hasErrors;

  const silentStatus = st.silent
    ? '<span class="on">✓ rendered</span><br>out/' + esc(c.id) + '/category-sequence-silent.mp4'
    : 'not rendered yet — intro, one clip per nominee, roster and the continuous sequence';
  const audioStatus = audio.file
    ? `<span class="on">✓ ${esc(audio.name)}</span><br>${audio.source === 'uploaded' ? 'your uploaded track' : audio.source === 'placeholder' ? 'generated placeholder' : 'manual WAV'}`
    : 'no soundtrack — generate the placeholder or upload your mix in the Audio tab';
  const mixStatus = st.mixed
    ? '<span class="on">✓ mixed</span><br>out/' + esc(c.id) + '/with-audio/*.mp4'
    : 'not mixed yet — needs steps 1 &amp; 2 first';

  el.innerHTML = `
    <h2>Pipeline</h2>
    <p class="sub">Three steps turn the saved data into the final deliverable. Runs happen one at a time — watch the logs below.</p>
    ${dirty ? '<div class="card" style="border-color:var(--gold-dim)"><strong>Unsaved changes.</strong> The pipeline runs on the saved data — press <strong>Save</strong> first.</div>' : ''}
    ${hasErrors ? '<div class="card" style="border-color:rgba(239,106,106,.5)"><strong>Data errors must be fixed first</strong> — see the red list at the top of the page.</div>' : ''}
    <div class="row" style="margin-bottom:14px">
      <button class="btn primary" id="btnRunAll" ${blocked ? 'disabled' : ''}>▶ Run full pipeline</button>
      <span class="sub" style="margin:0">render → soundtrack (kept when you uploaded one) → mix</span>
      <span class="grow"></span>
      <button class="btn" id="btnRefreshOut">↻ Refresh</button>
    </div>
    <div class="steps">
      ${stepCard(1, 'Render silent clips', silentStatus, 'render', blocked)}
      ${stepCard(2, 'Soundtrack', audioStatus, 'audio', blocked)}
      ${stepCard(3, 'Mix audio into clips', mixStatus, 'mux', blocked || !st.silent || !audio.file)}
    </div>
    <div class="card"><h3>Jobs &amp; logs</h3><div id="jobList"></div></div>
    <div class="card"><h3>Outputs</h3><div id="outputTables"><p class="sub" style="margin:0">Loading…</p></div></div>`;

  el.onclick = (e) => {
    const run = e.target.closest('[data-run]');
    if (run) startJob(run.dataset.run);
    if (e.target.id === 'btnRunAll') startJob('pipeline');
    if (e.target.id === 'btnRefreshOut') { renderOutputs(); refreshCaches(); }
  };
  renderJobs();
  renderOutputs();
}

async function renderOutputs() {
  const c = cat();
  const box = $('#outputTables');
  if (!box || !c) return;
  try {
    const r = await api(`/api/outputs?categoryId=${encodeURIComponent(c.id)}`);
    const table = (title, files, prefix) => `
      <div style="margin-bottom:14px">
        <div class="row" style="margin-bottom:6px"><strong>${title}</strong><span class="sub" style="margin:0">${files.length} file(s)</span></div>
        ${files.length
          ? `<table class="file-table">${files.map((f) => {
              const href = `/api/output?categoryId=${encodeURIComponent(c.id)}&file=${encodeURIComponent(prefix + f.name)}`;
              return `<tr>
                <td class="f-name">${esc(prefix + f.name)}</td>
                <td class="f-size">${fmtSize(f.size)}</td>
                <td style="text-align:right;white-space:nowrap">
                  <a class="btn small" target="_blank" rel="noopener" href="${href}">Open</a>
                  <a class="btn small" href="${href}&amp;dl=1">Download</a>
                </td>
              </tr>`;
            }).join('')}</table>`
          : '<p class="sub" style="margin:0">Nothing yet — run the steps above.</p>'}
      </div>`;
    box.innerHTML =
      table(`Final videos · with audio — out/${c.id}/with-audio/`, r.mixed, 'with-audio/') +
      table(`Silent masters — out/${c.id}/`, r.silent, '');
  } catch (e) {
    box.innerHTML = `<p class="sub" style="margin:0">Could not list outputs: ${esc(e.message)}</p>`;
  }
}

function renderJobs() {
  const box = $('#jobList');
  if (!box) return;
  if (!S.jobs.length) {
    box.innerHTML = '<p class="sub" style="margin:0">No runs yet — use the buttons above.</p>';
    return;
  }
  box.innerHTML = [...S.jobs].reverse().map((j) => {
    const active = j.state === 'queued' || j.state === 'running';
    const log = j.log ? (active || j.log.length < 4000 ? j.log : `…${j.log.slice(-4000)}`) : '';
    return `
      <div class="job">
        <div class="job-head">
          <span class="job-state ${j.state}">${j.state}${j.state === 'running' && j.step ? ' · step' : ''}</span>
          <strong>${actionLabel(j.action)}</strong>
          <span class="sub" style="margin:0">${esc(j.categoryId)}${j.nomineeId ? ` · ${esc(j.nomineeId)}` : ''}</span>
          <span class="grow"></span>
          ${j.step ? `<span class="sub" style="margin:0">${esc(j.step)}</span>` : ''}
          ${active ? `<button class="btn small danger" data-kill="${j.id}">Stop</button>` : ''}
        </div>
        ${j.labels?.length ? `<div class="job-head" style="padding-top:0"><span class="sub" style="margin:0">${j.labels.map(esc).join(' → ')}</span></div>` : ''}
        ${log ? `<pre class="job-log">${esc(log)}</pre>` : ''}
      </div>`;
  }).join('');
  box.querySelectorAll('[data-kill]').forEach((btn) => {
    btn.onclick = async () => {
      try {
        await postJson(`/api/jobs/${btn.dataset.kill}/kill`, {});
        toast('Stopping…');
      } catch (e) { toast(e.message, true); }
    };
  });
  box.querySelectorAll('.job-log').forEach((pre) => { pre.scrollTop = pre.scrollHeight; });
}

async function startJob(action, extra = {}) {
  if (!S.awards) return;
  if (isDirty()) return toast('Save your changes first — runs use the saved data', true);
  if (errors().length) return toast('Fix the data errors first (red list at the top)', true);
  if (!cat()) return toast('Select a category first', true);
  try {
    await postJson('/api/jobs', {action, categoryId: S.catId, ...extra});
    toast(`${actionLabel(action)} queued — watch the log below`);
    await pollJobs(true);
    if (S.tab === 'pipeline') renderJobs();
  } catch (e) {
    toast(e.message, true);
  }
}

// ── job polling & cache refresh ──────────────────────────
const finishedIds = new Set();
let jobsSig = '';

async function pollJobs(force = false) {
  try {
    const r = await api('/api/jobs');
    const newlyFinished = r.jobs.filter(
      (j) => ['done', 'error', 'killed'].includes(j.state) && !finishedIds.has(j.id),
    );
    for (const j of newlyFinished) finishedIds.add(j.id);
    S.jobs = r.jobs;
    const sig = JSON.stringify(r.jobs.map((j) => [j.id, j.state, j.step, j.log.length]));
    if (sig !== jobsSig || force) {
      jobsSig = sig;
      if (S.tab === 'pipeline') renderJobs();
    }
    for (const j of newlyFinished) onJobFinished(j);
  } catch {}
}

/** Re-read server-side caches (media/audio/status/jobs) without touching the working copy. */
async function refreshCaches() {
  try {
    const s = await api('/api/state');
    S.media = s.media;
    S.audio = s.audio;
    S.status = s.status;
    renderSidebar();
    if (['pipeline', 'audio', 'media'].includes(S.tab)) renderTab();
  } catch {}
}

async function onJobFinished(j) {
  const ok = j.state === 'done';
  toast(
    ok ? `${actionLabel(j.action)} finished ✓` : `${actionLabel(j.action)} ${j.state === 'error' ? 'failed — see the log' : 'stopped'}`,
    !ok,
  );
  await refreshCaches();
  if (ok && j.action === 'still') showStill(j);
}

function showStill(j) {
  const name = j.nomineeId ? `preview-${j.nomineeId}_f0110.png` : `preview-${j.categoryId}-intro_f0100.png`;
  const caption = j.nomineeId
    ? 'Frame 110 of the nominee scene (name + business fully visible).'
    : 'Frame 100 of the category intro (title reveal).';
  openModal(`
    <h3>Preview · ${esc(j.nomineeId ?? j.categoryId)}</h3>
    <img src="/api/still?name=${encodeURIComponent(name)}&v=${Date.now()}"
         style="width:100%;border-radius:8px;border:1px solid var(--line);display:block" alt="Preview frame">
    <p class="sub" style="margin-top:10px">${caption} Full-quality still rendered from the saved data.</p>
    <div class="modal-actions"><button class="btn" id="cancelModal">Close</button></div>`);
  $('#cancelModal').onclick = closeModal;
}

// ── global wiring ────────────────────────────────────────
function wireGlobals() {
  $('#btnSave').onclick = () => save();
  $('#btnAddCategory').onclick = addCategory;
  $('#categoryList').onclick = (e) => {
    const item = e.target.closest('.cat-item');
    if (item) selectCategory(item.dataset.id);
  };
  $('#tabs').onclick = (e) => {
    const t = e.target.closest('.tab');
    if (t) switchTab(t.dataset.tab);
  };
  $('#modalRoot').addEventListener('click', (e) => {
    if (e.target.id === 'modalRoot') closeModal();
  });
  $('#modalCard').addEventListener('submit', (e) => {
    e.preventDefault();
    S.modalSubmit?.();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modalRoot').classList.contains('hidden')) closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (isDirty()) save();
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
  });
}

async function boot() {
  try {
    const s = await api('/api/state');
    S.awards = s.awards;
    S.baseline = JSON.stringify(s.awards);
    S.issues = s.issues;
    S.timing = s.timing;
    S.media = s.media;
    S.audio = s.audio;
    S.status = s.status;
    S.jobs = s.jobs;
    S.catId = S.awards.categories[0]?.id ?? null;
    renderAll();
    setInterval(pollJobs, 1500);
  } catch (e) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<div class="issues">Cannot reach the editor server: ${esc(e.message)} — is <code>npm run editor</code> still running?</div>`,
    );
  }
}

wireGlobals();
boot();












import type {AwardsData, Nominee} from '../data/types';

export type Issue = {level: 'error' | 'warning'; where: string; message: string};

const MAX_NAME = 34; // beyond this the name wraps to three lines at the minimum size
const MAX_BUSINESS = 56;
const MAX_ACHIEVEMENT = 140;
const MAX_AWARD = 44; // beyond this the award title is truncated on the eyebrow

export function validateNominee(n: Nominee, where: string): Issue[] {
  const out: Issue[] = [];
  const err = (message: string) => out.push({level: 'error', where, message});
  const warn = (message: string) => out.push({level: 'warning', where, message});

  if (!n.id?.trim()) err('missing "id"');
  if (!n.name?.trim()) err('missing "name"');
  if (!n.business?.trim()) err('missing "business"');
  if (n.name && n.name.length > MAX_NAME) warn(`name is ${n.name.length} chars (> ${MAX_NAME}) — will wrap to 3 lines`);
  if (n.business && n.business.length > MAX_BUSINESS) warn(`business is ${n.business.length} chars (> ${MAX_BUSINESS})`);
  if (n.achievement && n.achievement.length > MAX_ACHIEVEMENT) warn(`achievement is ${n.achievement.length} chars (> ${MAX_ACHIEVEMENT}) — keep it to one short statement`);
  if (n.name && n.name !== n.name.trim()) warn('name has leading/trailing whitespace');
  return out;
}

export function validateAwards(data: AwardsData): Issue[] {
  const out: Issue[] = [];
  const catIds = new Set<string>();
  const nomIds = new Set<string>();
  for (const c of data.categories) {
    const cw = `category "${c.id}"`;
    if (catIds.has(c.id)) out.push({level: 'error', where: cw, message: 'duplicate category id'});
    catIds.add(c.id);
    if (!c.name?.trim()) out.push({level: 'error', where: cw, message: 'missing "name"'});
    if (!c.nominees?.length) out.push({level: 'error', where: cw, message: 'has no nominees'});
    if (c.nominees.length > 14) out.push({level: 'warning', where: cw, message: `${c.nominees.length} nominees (> 14 planned maximum)`});
    const vo: unknown = c.introVoiceOverSeconds;
    if (vo != null) {
      if (typeof vo !== 'number' || !Number.isFinite(vo) || vo < 0) {
        out.push({level: 'error', where: cw, message: '"introVoiceOverSeconds" must be a number of seconds ≥ 0 (or null)'});
      } else if (vo > 30) {
        out.push({level: 'warning', where: cw, message: `intro voice-over of ${vo} s makes the introduction very long — double-check the value`});
      }
    }
    for (const n of c.nominees) {
      if (nomIds.has(n.id)) out.push({level: 'error', where: `${cw} / ${n.id}`, message: 'duplicate nominee id'});
      nomIds.add(n.id);
      out.push(...validateNominee(n, `${cw} / ${n.id}`));
    }
    // Winner's screen (screen 1) — optional; nothing is shown (or invented) when it is absent.
    if (c.winner != null) {
      const ww = `${cw} / winner`;
      if (typeof c.winner !== 'object' || Array.isArray(c.winner)) {
        out.push({level: 'error', where: cw, message: '"winner" must be an object (or null)'});
      } else {
        const w = c.winner;
        const linked = w.nomineeId ? c.nominees.find((n) => n.id === w.nomineeId) : null;
        if (w.nomineeId && !linked) out.push({level: 'error', where: ww, message: `nomineeId "${w.nomineeId}" is not a nominee of this category`});
        if (!linked && !w.name?.trim()) out.push({level: 'error', where: ww, message: 'needs a "name" when it is not linked to a nominee'});
        if (w.name && w.name.length > MAX_NAME) out.push({level: 'warning', where: ww, message: `name is ${w.name.length} chars (> ${MAX_NAME}) — will wrap to 3 lines`});
        if (w.achievement && w.achievement.length > MAX_ACHIEVEMENT) out.push({level: 'warning', where: ww, message: `citation is ${w.achievement.length} chars (> ${MAX_ACHIEVEMENT})`});
        if (w.year != null && (typeof w.year !== 'number' || !Number.isFinite(w.year))) out.push({level: 'error', where: ww, message: '"year" must be a number (or null — uses the event year)'});
      }
    }
  }
  // Award presentations (screen 2) — optional so older data files stay valid.
  if (data.presentations != null && !Array.isArray(data.presentations)) {
    out.push({level: 'error', where: 'data', message: '"presentations" must be an array'});
  } else {
    const pIds = new Set<string>();
    for (const p of data.presentations ?? []) {
      const pw = `presentation "${p?.id ?? '?'}"`;
      if (!p.id?.trim()) out.push({level: 'error', where: pw, message: 'missing "id"'});
      else {
        if (pIds.has(p.id)) out.push({level: 'error', where: pw, message: 'duplicate presentation id'});
        pIds.add(p.id);
      }
      if (!p.award?.trim()) out.push({level: 'error', where: pw, message: 'missing "award" (the award title shown on the screen)'});
      else if (p.award.length > MAX_AWARD) out.push({level: 'warning', where: pw, message: `award title is ${p.award.length} chars (> ${MAX_AWARD}) — it will be truncated on the eyebrow`});
      if (!p.name?.trim()) out.push({level: 'error', where: pw, message: 'missing "name" (the recipient)'});
      else if (p.name.length > MAX_NAME) out.push({level: 'warning', where: pw, message: `name is ${p.name.length} chars (> ${MAX_NAME}) — will wrap to 3 lines`});
      if (p.business && p.business.length > MAX_BUSINESS) out.push({level: 'warning', where: pw, message: `business is ${p.business.length} chars (> ${MAX_BUSINESS})`});
      if (p.note && p.note.length > MAX_ACHIEVEMENT) out.push({level: 'warning', where: pw, message: `note is ${p.note.length} chars (> ${MAX_ACHIEVEMENT}) — keep it to one short statement`});
      if (p.recipientType != null && p.recipientType !== 'individual' && p.recipientType !== 'organisation') {
        out.push({level: 'warning', where: pw, message: '"recipientType" must be "individual", "organisation" or null'});
      }
      if (p.year != null && (typeof p.year !== 'number' || !Number.isFinite(p.year))) out.push({level: 'error', where: pw, message: '"year" must be a number (or null — uses the event year)'});
    }
  }
  return out;
}

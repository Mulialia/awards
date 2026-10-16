import type {AwardsData, Nominee} from '../data/types';

export type Issue = {level: 'error' | 'warning'; where: string; message: string};

const MAX_NAME = 34; // beyond this the name wraps to three lines at the minimum size
const MAX_BUSINESS = 56;
const MAX_ACHIEVEMENT = 140;

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
  }
  return out;
}

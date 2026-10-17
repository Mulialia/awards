import raw from './awards.json';
import type {AwardsData, Category, Nominee, Presentation, Winner} from './types';
import {validateAwards} from '../utils/validation';

export const awards = raw as unknown as AwardsData;

export const getCategory = (id: string): Category => {
  const c = awards.categories.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown categoryId "${id}". Known: ${awards.categories.map((x) => x.id).join(', ')}`);
  return c;
};

export const getNominee = (category: Category, id: string): {nominee: Nominee; index: number} => {
  const index = category.nominees.findIndex((n) => n.id === id);
  if (index < 0) throw new Error(`Unknown nomineeId "${id}" in "${category.id}". Known: ${category.nominees.map((n) => n.id).join(', ')}`);
  return {nominee: category.nominees[index], index};
};

/** The category's award presentation (screen 2), or null when the id is unknown. */
export const findPresentation = (id: string, override?: Partial<Presentation>): Presentation | null => {
  const base = (awards.presentations ?? []).find((x) => x.id === id) ?? null;
  if (base) return override ? {...base, ...override} : base;
  // QA-only path: a synthetic presentation (never from approved data).
  if (override && override.award && override.name) return override as Presentation;
  return null;
};

/** Everything the winner's screen needs, with the linked nominee merged in. null → no winner set. */
export type ResolvedWinner = {
  name: string;
  business: string;
  portrait: string | null;
  portraitFocus: string | null;
  companyLogo: string | null;
  achievement: string | null;
  year: number | null;
};

export const resolveWinner = (category: Category, override?: Partial<Winner>): ResolvedWinner | null => {
  const w: Winner = {...(category.winner ?? {}), ...(override ?? {})};
  const linked = w.nomineeId ? category.nominees.find((n) => n.id === w.nomineeId) : null;
  const name = (w.name ?? linked?.name ?? '').trim();
  if (!name) return null; // nothing set — the composition shows a friendly notice instead
  return {
    name,
    business: (w.business ?? linked?.business ?? '').trim(),
    portrait: w.portrait ?? linked?.portrait ?? null,
    portraitFocus: w.portraitFocus ?? linked?.portraitFocus ?? null,
    companyLogo: w.companyLogo ?? linked?.companyLogo ?? null,
    achievement: w.achievement ?? linked?.achievement ?? null,
    year: w.year ?? awards.event.year ?? null,
  };
};

/** Throws on hard data errors so a broken record can never be rendered silently. */
export const assertValid = () => {
  const errors = validateAwards(awards).filter((i) => i.level === 'error');
  if (errors.length) throw new Error('Awards data invalid:\n' + errors.map((e) => ` • ${e.where}: ${e.message}`).join('\n'));
};

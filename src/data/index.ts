import raw from './awards.json';
import type {AwardsData, Category, Nominee} from './types';
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

/** Throws on hard data errors so a broken record can never be rendered silently. */
export const assertValid = () => {
  const errors = validateAwards(awards).filter((i) => i.level === 'error');
  if (errors.length) throw new Error('Awards data invalid:\n' + errors.map((e) => ` • ${e.where}: ${e.message}`).join('\n'));
};

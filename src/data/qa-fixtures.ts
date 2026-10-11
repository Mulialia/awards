import type {Nominee} from './types';

/**
 * QA-ONLY fixtures — NEVER used by production renders. They exist so layout rules can be
 * stress-tested (optional fields present, very long names) without touching approved data.
 * Text is deliberately labelled as test content.
 */
export const QA_FULL_FIELDS: Partial<Nominee> = {
  title: 'Test Title Field',
  country: 'Test Country',
  achievement: 'QA test statement: this panel only renders when verified text is supplied.',
  portrait: 'portraits/_qa-test-image.jpg',
};

export const QA_LONG: Partial<Nominee> = {
  name: 'Oluwadamilola Nkechinyere Adeyemi-Wanjiku',
  business: 'Pan-African Renewable Agro-Processing & Logistics Cooperative Limited',
};

/** QA-only: a synthetic 14-nominee category to stress the two-column roster. */
export const QA_CATEGORY_14 = {
  id: 'qa-14',
  number: 99,
  name: 'QA Test Category Award',
  introTitle: {lines: ['QA Test Category'], suffix: 'Award'},
  nominees: Array.from({length: 14}, (_, i) => ({
    id: `qa-${i}`,
    name: i % 5 === 3 ? 'Oluwadamilola Adeyemi-Wanjiku' : `Test Nominee ${i + 1}`,
    business: i % 4 === 1 ? 'Pan-African Renewable Agro-Processing Cooperative' : `Test Business ${i + 1}`,
  })),
};

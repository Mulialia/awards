import type {Nominee, Presentation, Winner} from './types';

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

/** QA-only: a synthetic winner (screen 1) with every optional field present. */
export const QA_WINNER: Partial<Winner> = {
  name: 'Oluwadamilola Nkechinyere Adeyemi-Wanjiku',
  business: 'Pan-African Renewable Agro-Processing & Logistics Cooperative Limited',
  portrait: 'portraits/_qa-test-image.jpg',
  achievement: 'QA test statement: this citation only renders when verified text is supplied.',
  year: 2026,
};

/** QA-only: a synthetic award presentation (screen 2) with every optional field present. */
export const QA_PRESENTATION: Partial<Presentation> = {
  id: 'qa-presentation',
  award: 'QA Test Special Recognition Award',
  name: 'Oluwadamilola Nkechinyere Adeyemi-Wanjiku',
  recipientType: 'organisation',
  business: 'Pan-African Renewable Agro-Processing Cooperative Limited',
  year: 2026,
  note: 'QA test statement: this note only renders when verified text is supplied.',
};

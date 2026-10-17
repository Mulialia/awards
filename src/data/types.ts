/**
 * Data model for the YORA awards system.
 * Only `id`, `name` and `business` are required. Everything else is optional and is
 * rendered ONLY when supplied (and approved) by the organisers — nothing is ever invented.
 */
export type Nominee = {
  id: string;
  name: string;
  business: string;
  /** Professional title, e.g. "Founder & CEO" — optional, never assumed. */
  title?: string | null;
  /** Country — optional, never inferred from a name. */
  country?: string | null;
  /** Path relative to /public, e.g. "portraits/youth-001.jpg". null → clearly-marked placeholder. */
  portrait?: string | null;
  /** CSS object-position for the portrait crop, e.g. "50% 20%". Default keeps faces high in frame. */
  portraitFocus?: string | null;
  /** Path relative to /public. Optional company logo (shown on a light chip). */
  companyLogo?: string | null;
  /** One short, VERIFIED achievement / impact statement. Omit rather than invent. */
  achievement?: string | null;
};

/**
 * Screen 1 — the winner's card for a category.
 * Linked to a nominee where possible so name / portrait / brand logo / citation are reused;
 * the explicit fields are only ever what the organiser entered (nothing is inferred).
 */
export type Winner = {
  /** Link to a nominee of this category — their name, portrait, brand logo and citation are reused. */
  nomineeId?: string | null;
  /** Explicit display fields — used for a winner outside the nominee list (leave null when linked). */
  name?: string | null;
  business?: string | null;
  portrait?: string | null;
  portraitFocus?: string | null;
  companyLogo?: string | null;
  achievement?: string | null;
  /** Shown on the winner's card; falls back to the event year when null. */
  year?: number | null;
};

/**
 * Screen 2 — an award presented to an organisation or an individual (including special awards).
 */
export type Presentation = {
  id: string;
  /** Award title, e.g. "Lifetime Achievement Award". */
  award: string;
  /** The individual or organisation being presented. */
  name: string;
  /** Controls the eyebrow label — never inferred from the name. */
  recipientType?: 'individual' | 'organisation' | null;
  /** Organisation / affiliation line — optional. */
  business?: string | null;
  /** Path relative to /public (e.g. "recipients/xyz.jpg"). null → clearly-marked placeholder. */
  image?: string | null;
  /** CSS object-position for the image crop, e.g. "50% 20%". */
  imageFocus?: string | null;
  /** Branding — path relative to /public, shown on a light chip. */
  logo?: string | null;
  /** Defaults to the event year when null. */
  year?: number | null;
  /** One short, VERIFIED note. Omit rather than invent. */
  note?: string | null;
};

export type Category = {
  id: string;
  number: number;
  name: string;
  /** Optional manual control of the big intro title. Falls back to auto-wrapping `name`. */
  introTitle?: {lines: string[]; suffix?: string | null} | null;
  /**
   * Optional voice-over length for the category introduction, in seconds (e.g. 12 = a ~12 s VO).
   * The intro holds on the revealed title until the VO has finished, then plays the standard exit,
   * so the spoken copy always fits. null/absent/0 → the default 5.0 s intro (no hold).
   */
  introVoiceOverSeconds?: number | null;
  /** Winner's screen (screen 1) for this category. null/absent → no winner set yet. */
  winner?: Winner | null;
  nominees: Nominee[];
};

export type AwardsData = {
  event: {name: string; brand: string; year: number | null};
  categories: Category[];
  /** Award presentations (screen 2). Optional so older data files stay valid. */
  presentations?: Presentation[];
};

/** Props accepted by the compositions (must stay JSON-serialisable for `--props`). */
export type CategoryProps = {categoryId: string};
export type NomineeProps = {
  categoryId: string;
  nomineeId: string;
  /** QA only: override fields of the selected nominee (used by the QA-* compositions). */
  override?: Partial<Nominee>;
};
export type WinnerProps = {
  categoryId: string;
  /** QA only: override fields of the resolved winner (used by the QA-* compositions). */
  override?: Partial<Winner>;
};
export type PresentationProps = {
  presentationId: string;
  /** QA only: supply a synthetic presentation (used by the QA-* compositions). */
  override?: Partial<Presentation>;
};

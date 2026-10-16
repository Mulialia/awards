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
  nominees: Nominee[];
};

export type AwardsData = {
  event: {name: string; brand: string; year: number | null};
  categories: Category[];
};

/** Props accepted by the compositions (must stay JSON-serialisable for `--props`). */
export type CategoryProps = {categoryId: string};
export type NomineeProps = {
  categoryId: string;
  nomineeId: string;
  /** QA only: override fields of the selected nominee (used by the QA-* compositions). */
  override?: Partial<Nominee>;
};

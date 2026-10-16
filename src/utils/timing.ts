import timing from "../data/timing.json";
import type {Category} from "../data/types";

/**
 * Single source of truth for all timing. Every number is a FRAME at `FPS`.
 * (scripts/make-placeholder-audio.py reads data/timing.json, so audio stays in sync.)
 */
export const FPS = timing.fps;
export const WIDTH = timing.width;
export const HEIGHT = timing.height;
export const INTRO_FRAMES = timing.introFrames; // 5.0 s, before any voice-over hold
export const NOMINEE_FRAMES = timing.nomineeFrames; // 5.0 s (incl. open + close transition)

export const ROSTER_FRAMES = timing.rosterFrames; // 8.0 s — closing list of all nominees

export const categoryFrames = (category: Category) =>
  introFrames(category) + category.nominees.length * NOMINEE_FRAMES + ROSTER_FRAMES;

/** Absolute frame at which the closing roster begins. */
export const rosterStart = (category: Category) =>
  introFrames(category) + category.nominees.length * NOMINEE_FRAMES;

/** Absolute frame at which nominee `index` begins inside a category sequence. */
export const nomineeStart = (category: Category, index: number) =>
  introFrames(category) + index * NOMINEE_FRAMES;

/** Category introduction — local frames (0 … INTRO_FRAMES). */
export const INTRO = {
  lineDraw: [0, 24],
  plateIn: [10, 36],
  plateOut: [58, 78],
  lineToRule: [58, 86], // hairline travels up and shortens into the title rule
  eyebrow: [74, 92],
  titleStart: 80,
  titleStagger: 10,
  titleDur: 34,
  suffix: [112, 132],
  exit: [timing.introExitStart, timing.introExitStart + 24], // title fades, hairline returns to full width = first frame of nominee 1
} as const;

/**
 * Voice-over hold — extra frames inserted before the intro exit so a spoken introduction fits.
 * The title is fully revealed by `INTRO.exit[0]`; a VO longer than that simply extends the hold,
 * and the standard exit plays afterwards (so the VO always ends on a held title).
 * A ~12 s VO → intro becomes ~12.8 s (12 s of title + the 0.8 s exit).
 */
export const introHoldFrames = (category: Pick<Category, 'introVoiceOverSeconds'>): number => {
  const vo = category.introVoiceOverSeconds;
  if (!vo || vo <= 0) return 0;
  return Math.max(0, Math.ceil(vo * FPS) - INTRO.exit[0]);
};

/** Total intro length in frames for a category (base intro + voice-over hold). */
export const introFrames = (category: Pick<Category, 'introVoiceOverSeconds'>): number =>
  INTRO_FRAMES + introHoldFrames(category);

/** Intro cue table with the exit shifted past the voice-over hold (use instead of raw INTRO). */
export const introCues = (category: Pick<Category, 'introVoiceOverSeconds'>) => {
  const h = introHoldFrames(category);
  return {...INTRO, exit: [INTRO.exit[0] + h, INTRO.exit[1] + h] as const};
};

/**
 * Nominee presentation — local frames (0 … NOMINEE_FRAMES).
 * Authored for `nomineeFrames` in src/data/timing.json — change BOTH together.
 * Stage E offsets are hardcoded in components (exitStart + 42 must be ≤ NOMINEE_FRAMES),
 * and scripts/make-placeholder-audio.py mirrors these cues (keep in sync).
 */
export const NOM = {
  gateCollapse: [0, 10], // inherited hairline collapses
  outlineDraw: [3, 22], // Stage A — geometric frame opens
  portraitWipe: [10, 40], // Stage A — portrait revealed
  lightSweep: [30, 52],
  eyebrow: [18, 32], // "NOMINEE 01 / 05"
  nameStart: 26, // Stage B — name
  nameStagger: 4,
  nameDur: 20,
  rule: [52, 68],
  identityStart: 56, // Stage C — title / business / country
  identityStagger: 5,
  identityDur: 15,
  achievement: [84, 100], // Stage D — optional
  exitStart: 108, // Stage E — closing transition
  exitEnd: 150,
  hairlineOut: [128, 150],
} as const;

/**
 * Closing roster — local frames (0 … ROSTER_FRAMES).
 * No exit stage: the scene holds on the complete list so the LAST FRAME shows every nominee.
 */
export const ROSTER = {
  gateCollapse: [0, 22],
  title: [8, 40],
  rowsStart: 34,
  rowStagger: 8,
  rowDur: 28,
} as const;

import timing from '../data/timing.json';

/**
 * Single source of truth for all timing. Every number is a FRAME at `FPS`.
 * (scripts/make-placeholder-audio.py reads data/timing.json, so audio stays in sync.)
 */
export const FPS = timing.fps;
export const WIDTH = timing.width;
export const HEIGHT = timing.height;
export const INTRO_FRAMES = timing.introFrames; // 5.0 s
export const NOMINEE_FRAMES = timing.nomineeFrames; // 14.0 s (incl. open + close transition)

export const ROSTER_FRAMES = timing.rosterFrames; // 8.0 s — closing list of all nominees

export const categoryFrames = (nomineeCount: number) =>
  INTRO_FRAMES + nomineeCount * NOMINEE_FRAMES + ROSTER_FRAMES;

/** Absolute frame at which the closing roster begins. */
export const rosterStart = (nomineeCount: number) => INTRO_FRAMES + nomineeCount * NOMINEE_FRAMES;

/** Absolute frame at which nominee `index` begins inside a category sequence. */
export const nomineeStart = (index: number) => INTRO_FRAMES + index * NOMINEE_FRAMES;

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
  exit: [126, 150], // title fades, hairline returns to full width = first frame of nominee 1
} as const;

/** Nominee presentation — local frames (0 … NOMINEE_FRAMES). */
export const NOM = {
  gateCollapse: [0, 22], // inherited hairline collapses
  outlineDraw: [6, 44], // Stage A — geometric frame opens
  portraitWipe: [22, 64], // Stage A — portrait revealed
  lightSweep: [50, 84],
  eyebrow: [34, 52], // "NOMINEE 01 / 05"
  nameStart: 46, // Stage B — name
  nameStagger: 8,
  nameDur: 34,
  rule: [86, 112],
  identityStart: 96, // Stage C — title / business / country
  identityStagger: 9,
  identityDur: 26,
  achievement: [140, 176], // Stage D — optional
  exitStart: 374, // Stage E — closing transition
  exitEnd: 420,
  hairlineOut: [392, 420],
} as const;

/** Closing roster — local frames (0 … ROSTER_FRAMES). */
export const ROSTER = {
  gateCollapse: [0, 22],
  title: [8, 40],
  rowsStart: 34,
  rowStagger: 8,
  rowDur: 28,
  exitStart: 196,
  hairlineOut: [212, 240],
} as const;

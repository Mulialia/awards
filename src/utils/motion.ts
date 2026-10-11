import {Easing, interpolate} from 'remotion';

const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const easeOut = Easing.bezier(0.22, 1, 0.36, 1); // soft, confident deceleration
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.5, 0, 0.9, 0.4);

/** 0→1 progress between two frames (clamped), eased. */
export const prog = (
  frame: number,
  start: number,
  end: number,
  easing: (t: number) => number = easeOut,
) => interpolate(frame, [start, end], [0, 1], {...CLAMP, easing});

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Deterministic PRNG so every render is identical. */
export const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

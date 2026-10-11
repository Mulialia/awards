import {measureText} from '@remotion/layout-utils';

/**
 * Responsive text composition (never "shrink everything until it fits"):
 * 1. try the largest size and wrap on word boundaries,
 * 2. accept the first size whose line count ≤ maxLines and every line fits,
 * 3. balance two-line results so the lines are visually even,
 * 4. only at `minSize` allow the result to flag `overflow` (validation also warns upstream).
 */
export type FitOptions = {
  text: string;
  fontFamily: string;
  fontWeight: number;
  maxWidth: number;
  maxSize: number;
  minSize: number;
  maxLines: number;
  step?: number;
  letterSpacing?: string;
};
export type Fit = {lines: string[]; fontSize: number; overflow: boolean};

const cache = new Map<string, Fit>();

export function fitLines(o: FitOptions): Fit {
  const key = JSON.stringify(o);
  const hit = cache.get(key);
  if (hit) return hit;

  const width = (text: string, size: number) =>
    measureText({text, fontFamily: o.fontFamily, fontWeight: String(o.fontWeight), fontSize: size, letterSpacing: o.letterSpacing}).width;

  const words = o.text.trim().split(/\s+/);
  const step = o.step ?? 2;

  const greedy = (size: number): string[] => {
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const trial = cur ? `${cur} ${w}` : w;
      if (!cur || width(trial, size) <= o.maxWidth) cur = trial;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const balance = (lines: string[], size: number): string[] => {
    if (lines.length !== 2 || words.length < 3) return lines;
    let best = lines;
    let bestMax = Math.max(...lines.map((l) => width(l, size)));
    for (let i = 1; i < words.length; i++) {
      const cand = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
      const m = Math.max(...cand.map((l) => width(l, size)));
      if (m <= o.maxWidth && m < bestMax - 1) {
        best = cand;
        bestMax = m;
      }
    }
    return best;
  };

  let result: Fit | null = null;
  for (let size = o.maxSize; size >= o.minSize; size -= step) {
    const lines = greedy(size);
    const fits = lines.length <= o.maxLines && lines.every((l) => width(l, size) <= o.maxWidth);
    if (fits) {
      result = {lines: balance(lines, size), fontSize: size, overflow: false};
      break;
    }
  }
  if (!result) {
    const lines = greedy(o.minSize);
    result = {lines, fontSize: o.minSize, overflow: true};
  }
  cache.set(key, result);
  return result;
}

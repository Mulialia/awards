import React from 'react';
import {theme} from '../styles/theme';
import type {Category} from '../data/types';
import {INTRO} from '../utils/timing';
import {easeOut, lerp, prog} from '../utils/motion';
import {fitLines} from '../utils/textLayout';
import {AfricanSignature} from './AfricanSignature';

export const TITLE_LEFT = theme.layout.portrait.x;
const EYEBROW_H = 34;
const GAP1 = 40;
const GAP2 = 34;
const SUFFIX_H = 64;

export const layoutIntroTitle = (category: Category) => {
  let lines: string[];
  let suffix: string | null;
  if (category.introTitle?.lines?.length) {
    lines = category.introTitle.lines;
    suffix = category.introTitle.suffix ?? null;
  } else {
    const m = category.name.match(/^(.*?)(?:\s+(Award))?$/i);
    suffix = m?.[2] ?? null;
    lines = [m?.[1] ?? category.name];
  }
  // Largest single size at which every line fits the title column
  let size = 156;
  const fits = (s: number) =>
    lines.every((l) => fitLines({text: l, fontFamily: theme.fonts.displayName, fontWeight: 620, maxWidth: 1440, maxSize: s, minSize: s, maxLines: 1}).overflow === false);
  while (size > 96 && !fits(size)) size -= 4;
  const totalH = EYEBROW_H + GAP1 + lines.length * size * 1.04 + (suffix ? GAP2 + SUFFIX_H : 0);
  const top = 540 - totalH / 2;
  return {lines, suffix, size, totalH, top, ruleY: top - 44};
};

/** The category introduction typography: eyebrow → masked line reveals → suffix. */
export const CategoryTitle: React.FC<{category: Category; frame: number}> = ({category, frame}) => {
  const L = layoutIntroTitle(category);
  const c = theme.colors;
  const eyebrow = prog(frame, INTRO.eyebrow[0], INTRO.eyebrow[1], easeOut);
  const suffix = prog(frame, INTRO.suffix[0], INTRO.suffix[1], easeOut);
  const exit = prog(frame, INTRO.exit[0], INTRO.exit[1] - 4, easeOut);

  return (
    <div style={{position: 'absolute', left: TITLE_LEFT, top: L.top, opacity: 1 - exit, transform: `translateY(${-22 * exit}px)`}}>
      <div style={{height: EYEBROW_H, display: 'flex', alignItems: 'center', gap: 22, opacity: eyebrow, transform: `translateX(${(1 - eyebrow) * -28}px)`}}>
        <div style={{fontFamily: theme.fonts.sans, fontWeight: 800, fontSize: 30, letterSpacing: '0.34em', color: c.gold}}>
          CATEGORY&nbsp;&nbsp;{String(category.number).padStart(2, '0')}
        </div>
      </div>

      <div style={{marginTop: GAP1, fontFamily: theme.fonts.display, fontWeight: 620, fontSize: L.size, lineHeight: 1.04, color: c.ivory, letterSpacing: '-0.008em'}}>
        {L.lines.map((line, i) => {
          const p = prog(frame, INTRO.titleStart + i * INTRO.titleStagger, INTRO.titleStart + i * INTRO.titleStagger + INTRO.titleDur, easeOut);
          return (
            <div key={i} style={{overflow: 'hidden', padding: '0.07em 0 0.17em', margin: '-0.07em 0 -0.17em'}}>
              <div style={{transform: `translateY(${lerp(108, 0, p)}%)`, opacity: Math.min(1, p * 2), filter: `blur(${((1 - p) * 10).toFixed(2)}px)`, whiteSpace: 'nowrap'}}>{line}</div>
            </div>
          );
        })}
      </div>

      {L.suffix && (
        <div style={{marginTop: GAP2, height: SUFFIX_H, display: 'flex', alignItems: 'center', gap: 30, opacity: suffix, transform: `translateX(${(1 - suffix) * -30}px)`}}>
          <div style={{fontFamily: theme.fonts.sans, fontWeight: 800, fontSize: 52, letterSpacing: '0.5em', color: c.gold, textTransform: 'uppercase'}}>{L.suffix}</div>
          <AfricanSignature width={84} height={5} opacity={suffix} />
        </div>
      )}
    </div>
  );
};

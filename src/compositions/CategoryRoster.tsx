import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BackgroundAtmosphere} from '../components/BackgroundAtmosphere';
import {Chrome} from '../components/Chrome';
import {GateLine} from '../components/AwardsTransition';
import {layoutIntroTitle} from '../components/CategoryTitle';
import {getCategory} from '../data';
import type {Category, CategoryProps} from '../data/types';
import {goldGradient, theme} from '../styles/theme';
import {easeInOut, easeOut, lerp, prog} from '../utils/motion';
import {fitLines} from '../utils/textLayout';
import {HEIGHT, ROSTER, WIDTH, rosterStart} from '../utils/timing';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Closing screen: every nominee in the category, in the same order as presented.
 * No exit stage — the scene holds on the full list, so the LAST FRAME still shows every nominee.
 * ≤ 6 nominees → one generous column; 7+ → two columns (up to 14 fit), with type sized by measurement.
 */
export const RosterScene: React.FC<{category: Category}> = ({category}) => {
  const frame = useCurrentFrame();
  const c = theme.colors;
  const n = category.nominees.length;
  const two = n > 6;
  const perCol = two ? Math.ceil(n / 2) : n;
  const colW = two ? 470 : theme.layout.textW;
  const gap = two ? 40 : 0;
  const x0 = theme.layout.textX;
  const areaTop = 190;
  const areaH = 740;
  const rowH = Math.min(132, areaH / perCol);
  const nameMax = two ? 44 : 64;
  const bizMax = two ? 24 : 32;

  const L = layoutIntroTitle(category);
  // largest size at which every title line fits the left rail (keeps the same line breaks as the intro)
  const titleSize = Math.min(
    ...L.lines.map((l) => fitLines({text: l, fontFamily: theme.fonts.displayName, fontWeight: 620, maxWidth: 640, maxSize: 84, minSize: 36, maxLines: 1}).fontSize),
  );

  // hairline: inherited full width → collapses to centre and stays there (roster is the final scene)
  const collapse = prog(frame, ROSTER.gateCollapse[0], ROSTER.gateCollapse[1], easeInOut);
  const mid = WIDTH / 2;
  const left = lerp(0, mid, collapse);
  const right = lerp(WIDTH, mid, collapse);

  const titleIn = prog(frame, ROSTER.title[0], ROSTER.title[1], easeOut);

  return (
    <AbsoluteFill>
      <GateLine left={left} right={right} y={HEIGHT / 2} />

      {/* left rail: heading */}
      <div style={{position: 'absolute', left: theme.layout.portrait.x, top: areaTop, width: 660, height: areaH, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
        <div style={{opacity: titleIn, transform: `translateX(${(1 - titleIn) * -24}px)`, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30}}>
          <div style={{width: 56 * titleIn, height: 3, background: c.gold}} />
          <div style={{fontFamily: theme.fonts.sans, fontWeight: 800, fontSize: 28, letterSpacing: '0.3em', color: c.gold}}>THE NOMINEES</div>
        </div>
        <div style={{fontFamily: theme.fonts.display, fontWeight: 620, fontSize: titleSize, lineHeight: 1.06, color: c.ivory}}>
          {L.lines.map((line, i) => {
            const p = prog(frame, ROSTER.title[0] + 6 + i * 8, ROSTER.title[0] + 6 + i * 8 + 30, easeOut);
            return (
              <div key={i} style={{overflow: 'hidden', padding: '0.07em 0 0.17em', margin: '-0.07em 0 -0.17em'}}>
                <div style={{transform: `translateY(${lerp(108, 0, p)}%)`, opacity: Math.min(1, p * 2), filter: `blur(${((1 - p) * 8).toFixed(2)}px)`}}>{line}</div>
              </div>
            );
          })}
        </div>
        {L.suffix && (
          <div style={{marginTop: 22, fontFamily: theme.fonts.sans, fontWeight: 800, fontSize: 34, letterSpacing: '0.5em', color: c.gold, textTransform: 'uppercase', opacity: titleIn}}>{L.suffix}</div>
        )}
      </div>

      {/* right: the list */}
      {category.nominees.map((nom, i) => {
        const col = two ? Math.floor(i / perCol) : 0;
        const row = two ? i % perCol : i;
        const start = ROSTER.rowsStart + i * ROSTER.rowStagger;
        const p = prog(frame, start, start + ROSTER.rowDur, easeOut);
        const name = fitLines({text: nom.name, fontFamily: theme.fonts.displayName, fontWeight: 620, maxWidth: colW - 70, maxSize: nameMax, minSize: 24, maxLines: 1});
        const biz = fitLines({text: nom.business, fontFamily: theme.fonts.sansName, fontWeight: 600, maxWidth: colW - 70, maxSize: bizMax, minSize: 16, maxLines: 1});
        const top = areaTop + (areaH - rowH * perCol) / 2 + row * rowH;
        return (
          <div key={nom.id} style={{position: 'absolute', left: x0 + col * (colW + gap), top, width: colW, height: rowH, opacity: p, transform: `translateX(${(1 - p) * 40}px)`}}>
            <div style={{position: 'absolute', left: 0, top: 0, height: 2, width: `${p * 100}%`, background: goldGradient, opacity: 0.55}} />
            <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: 26}}>
              <div style={{fontFamily: theme.fonts.sans, fontWeight: 800, fontSize: two ? 22 : 26, letterSpacing: '0.18em', color: c.gold, width: two ? 40 : 52}}>{pad(i + 1)}</div>
              <div>
                <div style={{fontFamily: theme.fonts.display, fontWeight: 620, fontSize: name.fontSize, lineHeight: 1.08, color: c.ivory, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: colW - 70}}>{nom.name}</div>
                <div style={{fontFamily: theme.fonts.sans, fontWeight: 600, fontSize: biz.fontSize, lineHeight: 1.25, color: c.ivoryDim, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: colW - 70}}>{nom.business}</div>
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Standalone roster video. */
export const CategoryRoster: React.FC<CategoryProps> = ({categoryId}) => {
  const frame = useCurrentFrame();
  const category = getCategory(categoryId);
  const chrome = prog(frame, 0, 16, easeOut); // fades in and stays through the final frame
  return (
    <AbsoluteFill>
      <BackgroundAtmosphere frame={rosterStart(category.nominees.length) + frame} />
      <Chrome categoryName={category.name} opacity={chrome} />
      <RosterScene category={category} />
    </AbsoluteFill>
  );
};

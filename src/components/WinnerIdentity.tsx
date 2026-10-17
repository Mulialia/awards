import React, {useMemo} from 'react';
import {Img, staticFile} from 'remotion';
import {goldGradient, theme} from '../styles/theme';
import type {Category} from '../data/types';
import type {ResolvedWinner} from '../data';
import {WIN} from '../utils/timing';
import {easeOut, prog} from '../utils/motion';
import {fitLines} from '../utils/textLayout';
import {AchievementPanel} from './AchievementPanel';

/**
 * Screen 1 — the winner's card. Same composition grid as the nominee scene (text column right of
 * the portrait), staged with the WIN cue table and holding on the final state: eyebrow "WINNER",
 * the category, the winner's name, the brand/logo, the year and the optional verified citation.
 */
export const WinnerIdentity: React.FC<{category: Category; winner: ResolvedWinner; frame: number}> = ({category, winner, frame}) => {
  const {textX, textW} = theme.layout;
  const portrait = theme.layout.portrait;
  const c = theme.colors;

  const layout = useMemo(() => {
    let name = fitLines({text: winner.name, fontFamily: theme.fonts.displayName, fontWeight: 620, maxWidth: textW, maxSize: 136, minSize: 92, maxLines: 2, step: 2});
    if (name.overflow) name = fitLines({text: winner.name, fontFamily: theme.fonts.displayName, fontWeight: 620, maxWidth: textW, maxSize: 92, minSize: 70, maxLines: 3, step: 2});
    const cat = fitLines({text: category.name, fontFamily: theme.fonts.displayName, fontWeight: 400, maxWidth: textW, maxSize: 40, minSize: 26, maxLines: 1, step: 2});
    const chipW = winner.companyLogo && winner.business ? 128 : winner.companyLogo ? 96 : 0;
    const business = winner.business
      ? fitLines({text: winner.business, fontFamily: theme.fonts.sansName, fontWeight: 700, maxWidth: textW - chipW, maxSize: 56, minSize: 42, maxLines: 2, step: 2})
      : null;
    return {name, cat, business, chipW};
  }, [winner.name, winner.business, winner.companyLogo, category.name, textW]);

  const inOf = (start: number, dur: number) => prog(frame, start, start + dur, easeOut);
  const eyebrowIn = prog(frame, WIN.eyebrow[0], WIN.eyebrow[1], easeOut);
  const ruleIn = prog(frame, WIN.rule[0], WIN.rule[1], easeOut);
  const catIn = inOf(WIN.categoryStart, WIN.categoryDur);
  const yearIn = inOf(WIN.identityStart + WIN.identityStagger, WIN.identityDur);

  return (
    <div
      style={{
        position: 'absolute',
        left: textX,
        top: portrait.y,
        width: textW,
        height: portrait.h,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {/* eyebrow — WINNER */}
      <div style={{opacity: eyebrowIn, transform: `translateX(${(1 - eyebrowIn) * -24}px)`, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30}}>
        <div style={{width: 56 * eyebrowIn, height: 3, background: c.gold}} />
        <div style={{fontFamily: theme.fonts.sans, fontWeight: 800, fontSize: 28, letterSpacing: '0.3em', color: c.gold}}>WINNER</div>
      </div>

      {/* the category this award belongs to */}
      <div style={{fontFamily: theme.fonts.display, fontWeight: 400, fontStyle: 'italic', fontSize: layout.cat.fontSize, lineHeight: 1.15, color: c.ivoryDim, opacity: catIn, transform: `translateY(${(1 - catIn) * 14}px)`}}>{category.name}</div>

      {/* name — masked line reveal */}
      <div style={{marginTop: 20, fontFamily: theme.fonts.display, fontWeight: 620, fontSize: layout.name.fontSize, lineHeight: 1.04, color: c.ivory, letterSpacing: '-0.005em'}}>
        {layout.name.lines.map((line, i) => {
          const p = inOf(WIN.nameStart + i * WIN.nameStagger, WIN.nameDur);
          return (
            <div key={i} style={{overflow: 'hidden', padding: '0.07em 0 0.17em', margin: '-0.07em 0 -0.17em'}}>
              <div style={{transform: `translateY(${108 - p * 108}%)`, opacity: Math.min(1, p * 2), filter: `blur(${((1 - p) * 9).toFixed(2)}px)`, whiteSpace: 'nowrap'}}>{line}</div>
            </div>
          );
        })}
      </div>

      {/* rule */}
      <div style={{marginTop: 40, marginBottom: 38, height: 4, width: 190 * ruleIn, background: goldGradient, opacity: 1, boxShadow: '0 0 14px rgba(238,185,43,0.5)'}} />

      {/* brand row — logo chip + brand name */}
      {(winner.companyLogo || layout.business) && (
        <div style={{opacity: inOf(WIN.identityStart, WIN.identityDur), transform: `translateY(${(1 - inOf(WIN.identityStart, WIN.identityDur)) * 26}px)`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
            {winner.companyLogo && (
              <div style={{width: layout.chipW - 28, height: 100, borderRadius: 6, background: c.ivory, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, flex: 'none'}}>
                <Img src={staticFile(winner.companyLogo)} style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}} />
              </div>
            )}
            {layout.business && (
              <div style={{fontFamily: theme.fonts.sans, fontWeight: 700, fontSize: layout.business.fontSize, lineHeight: 1.12, color: c.ivory}}>
                {layout.business.lines.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* year */}
      {winner.year != null && (
        <div style={{marginTop: 22, opacity: yearIn, transform: `translateY(${(1 - yearIn) * 20}px)`, fontFamily: theme.fonts.sans, fontWeight: 800, fontSize: 32, letterSpacing: '0.3em', color: c.gold}}>{winner.year}</div>
      )}

      {/* optional verified citation */}
      <AchievementPanel text={winner.achievement} frame={frame} window={WIN.achievement} exitRange={null} />
    </div>
  );
};
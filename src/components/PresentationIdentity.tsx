import React, {useMemo} from 'react';
import {Img, staticFile} from 'remotion';
import {goldGradient, theme} from '../styles/theme';
import type {Presentation} from '../data/types';
import {PRES} from '../utils/timing';
import {easeOut, prog} from '../utils/motion';
import {fitLines} from '../utils/textLayout';
import {AchievementPanel} from './AchievementPanel';

/**
 * Screen 2 — the award presentation card (organisations and individuals, incl. special awards).
 * Same composition grid as the nominee scene, staged with the PRES cue table and holding on the
 * final state: award title, the recipient's name, their branding, the type and the year.
 */
export const PresentationIdentity: React.FC<{presentation: Presentation; frame: number}> = ({presentation, frame}) => {
  const {textX, textW} = theme.layout;
  const portrait = theme.layout.portrait;
  const c = theme.colors;

  const layout = useMemo(() => {
    let name = fitLines({text: presentation.name, fontFamily: theme.fonts.displayName, fontWeight: 620, maxWidth: textW, maxSize: 136, minSize: 92, maxLines: 2, step: 2});
    if (name.overflow) name = fitLines({text: presentation.name, fontFamily: theme.fonts.displayName, fontWeight: 620, maxWidth: textW, maxSize: 92, minSize: 70, maxLines: 3, step: 2});
    const award = fitLines({text: presentation.award, fontFamily: theme.fonts.sansName, fontWeight: 800, maxWidth: textW, maxSize: 28, minSize: 19, maxLines: 1, step: 1, letterSpacing: '0.28em'});
    const chipW = presentation.logo && presentation.business ? 128 : presentation.logo ? 96 : 0;
    const business = presentation.business
      ? fitLines({text: presentation.business, fontFamily: theme.fonts.sansName, fontWeight: 700, maxWidth: textW - chipW, maxSize: 56, minSize: 42, maxLines: 2, step: 2})
      : null;
    return {name, award, business, chipW};
  }, [presentation.name, presentation.award, presentation.business, presentation.logo, textW]);

  const inOf = (start: number, dur: number) => prog(frame, start, start + dur, easeOut);
  const eyebrowIn = prog(frame, PRES.eyebrow[0], PRES.eyebrow[1], easeOut);
  const ruleIn = prog(frame, PRES.rule[0], PRES.rule[1], easeOut);
  const metaIn = inOf(PRES.identityStart + PRES.identityStagger, PRES.identityDur);

  const typeLabel = presentation.recipientType === 'individual' ? 'INDIVIDUAL' : presentation.recipientType === 'organisation' ? 'ORGANISATION' : null;
  const yearLabel = presentation.year != null ? String(presentation.year) : null;

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
      {/* eyebrow — award title */}
      <div style={{opacity: eyebrowIn, transform: `translateX(${(1 - eyebrowIn) * -24}px)`, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 34}}>
        <div style={{width: 56 * eyebrowIn, height: 3, background: c.gold, flex: 'none'}} />
        <div style={{fontFamily: theme.fonts.sans, fontWeight: 800, fontSize: layout.award.fontSize, lineHeight: 1.25, letterSpacing: '0.28em', textTransform: 'uppercase', color: c.gold, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{presentation.award}</div>
      </div>

      {/* recipient name — masked line reveal */}
      <div style={{fontFamily: theme.fonts.display, fontWeight: 620, fontSize: layout.name.fontSize, lineHeight: 1.04, color: c.ivory, letterSpacing: '-0.005em'}}>
        {layout.name.lines.map((line, i) => {
          const p = inOf(PRES.nameStart + i * PRES.nameStagger, PRES.nameDur);
          return (
            <div key={i} style={{overflow: 'hidden', padding: '0.07em 0 0.17em', margin: '-0.07em 0 -0.17em'}}>
              <div style={{transform: `translateY(${108 - p * 108}%)`, opacity: Math.min(1, p * 2), filter: `blur(${((1 - p) * 9).toFixed(2)}px)`, whiteSpace: 'nowrap'}}>{line}</div>
            </div>
          );
        })}
      </div>

      {/* rule */}
      <div style={{marginTop: 40, marginBottom: 38, height: 4, width: 190 * ruleIn, background: goldGradient, opacity: 1, boxShadow: '0 0 14px rgba(238,185,43,0.5)'}} />

      {/* branding row — logo chip + organisation line */}
      {(presentation.logo || layout.business) && (
        <div style={{opacity: inOf(PRES.identityStart, PRES.identityDur), transform: `translateY(${(1 - inOf(PRES.identityStart, PRES.identityDur)) * 26}px)`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
            {presentation.logo && (
              <div style={{width: layout.chipW - 28, height: 100, borderRadius: 6, background: c.ivory, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, flex: 'none'}}>
                <Img src={staticFile(presentation.logo)} style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}} />
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

      {/* type · year */}
      {(typeLabel || yearLabel) && (
        <div style={{marginTop: 22, opacity: metaIn, transform: `translateY(${(1 - metaIn) * 20}px)`, display: 'flex', alignItems: 'center', gap: 18}}>
          {typeLabel && <span style={{fontFamily: theme.fonts.sans, fontWeight: 600, fontSize: 30, letterSpacing: '0.22em', color: c.ivoryDim}}>{typeLabel}</span>}
          {typeLabel && yearLabel && <span style={{width: 7, height: 7, background: c.gold, borderRadius: '50%', flex: 'none'}} />}
          {yearLabel && <span style={{fontFamily: theme.fonts.sans, fontWeight: 800, fontSize: 32, letterSpacing: '0.3em', color: c.gold}}>{yearLabel}</span>}
        </div>
      )}

      {/* optional verified note */}
      <AchievementPanel text={presentation.note} frame={frame} window={PRES.note} exitRange={null} />
    </div>
  );
};

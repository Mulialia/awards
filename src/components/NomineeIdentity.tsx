import React, {useMemo} from 'react';
import {Img, staticFile} from 'remotion';
import {goldGradient, theme} from '../styles/theme';
import type {Nominee} from '../data/types';
import {NOM} from '../utils/timing';
import {easeIn, easeOut, lerp, prog} from '../utils/motion';
import {fitLines} from '../utils/textLayout';
import {AchievementPanel} from './AchievementPanel';

const pad = (n: number) => String(n).padStart(2, '0');

/** Stage B (name) + Stage C (title · business · country) + optional Stage D (achievement). */
export const NomineeIdentity: React.FC<{nominee: Nominee; index: number; total: number; frame: number}> = ({nominee, index, total, frame}) => {
  const {textX, textW} = theme.layout;
  const portrait = theme.layout.portrait;
  const c = theme.colors;

  const layout = useMemo(() => {
    let name = fitLines({text: nominee.name, fontFamily: theme.fonts.displayName, fontWeight: 620, maxWidth: textW, maxSize: 136, minSize: 92, maxLines: 2, step: 2});
    if (name.overflow) name = fitLines({text: nominee.name, fontFamily: theme.fonts.displayName, fontWeight: 620, maxWidth: textW, maxSize: 92, minSize: 70, maxLines: 3, step: 2});
    const chipW = nominee.companyLogo ? 128 : 0;
    const business = fitLines({text: nominee.business, fontFamily: theme.fonts.sansName, fontWeight: 700, maxWidth: textW - chipW, maxSize: 56, minSize: 42, maxLines: 2, step: 2});
    return {name, business, chipW};
  }, [nominee.name, nominee.business, nominee.companyLogo, textW]);

  // helpers --------------------------------------------------------------------------------------
  const exitOf = (order: number) => prog(frame, NOM.exitStart + order * 5, NOM.exitStart + order * 5 + 22, easeIn);
  const inOf = (start: number, dur: number) => prog(frame, start, start + dur, easeOut);
  const exitStyle = (order: number): React.CSSProperties => {
    const e = exitOf(order);
    return {opacity: 1 - e, transform: `translateX(${-44 * e}px)`};
  };

  const eyebrowIn = prog(frame, NOM.eyebrow[0], NOM.eyebrow[1], easeOut);
  const ruleIn = prog(frame, NOM.rule[0], NOM.rule[1], easeOut);

  const rows: React.ReactNode[] = [];
  let k = 0;
  const identityRow = (key: string, node: React.ReactNode, mt: number) => {
    const p = inOf(NOM.identityStart + k * NOM.identityStagger, NOM.identityDur);
    const order = k; // stagger exit in the same order
    k++;
    rows.push(
      <div key={key} style={{marginTop: mt, opacity: p, transform: `translateY(${(1 - p) * 26}px)`, ...{}}}>
        <div style={exitStyle(order)}>{node}</div>
      </div>,
    );
  };

  if (nominee.title) {
    identityRow(
      'title',
      <div style={{fontFamily: theme.fonts.sans, fontWeight: 700, fontSize: 30, letterSpacing: '0.22em', textTransform: 'uppercase', color: c.gold}}>{nominee.title}</div>,
      0,
    );
  }
  identityRow(
    'business',
    <div style={{display: 'flex', alignItems: 'center', gap: 28}}>
      {nominee.companyLogo && (
        <div style={{width: layout.chipW - 28, height: 100, borderRadius: 6, background: c.ivory, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, flex: 'none'}}>
          <Img src={staticFile(nominee.companyLogo)} style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}} />
        </div>
      )}
      <div style={{fontFamily: theme.fonts.sans, fontWeight: 700, fontSize: layout.business.fontSize, lineHeight: 1.12, color: c.ivory}}>
        {layout.business.lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>,
    nominee.title ? 14 : 0,
  );
  if (nominee.country) {
    identityRow(
      'country',
      <div style={{fontFamily: theme.fonts.sans, fontWeight: 600, fontSize: 30, letterSpacing: '0.2em', textTransform: 'uppercase', color: c.ivoryDim}}>{nominee.country}</div>,
      18,
    );
  }

  const nameLines = layout.name.lines;
  const nameEx = (order: number) => exitOf(order);

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
      {/* eyebrow */}
      <div style={{opacity: eyebrowIn * (1 - exitOf(3)), transform: `translateX(${(1 - eyebrowIn) * -24 - 44 * exitOf(3)}px)`, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 34}}>
        <div style={{width: 56 * eyebrowIn, height: 3, background: c.gold}} />
        <div style={{fontFamily: theme.fonts.sans, fontWeight: 800, fontSize: 28, letterSpacing: '0.3em', color: c.gold}}>
          NOMINEE&nbsp;&nbsp;{pad(index + 1)}&nbsp;/&nbsp;{pad(total)}
        </div>
      </div>

      {/* name — masked line reveal */}
      <div style={{fontFamily: theme.fonts.display, fontWeight: 620, fontSize: layout.name.fontSize, lineHeight: 1.04, color: c.ivory, letterSpacing: '-0.005em'}}>
        {nameLines.map((line, i) => {
          const p = inOf(NOM.nameStart + i * NOM.nameStagger, NOM.nameDur);
          const e = nameEx(1 + i);
          return (
            <div key={i} style={{overflow: 'hidden', padding: '0.07em 0 0.17em', margin: '-0.07em 0 -0.17em'}}>
              <div style={{transform: `translateY(${lerp(108, 0, p)}%) translateX(${-44 * e}px)`, opacity: Math.min(1, p * 2) * (1 - e), filter: `blur(${((1 - p) * 9).toFixed(2)}px)`, whiteSpace: 'nowrap'}}>{line}</div>
            </div>
          );
        })}
      </div>

      {/* rule */}
      <div style={{marginTop: 40, marginBottom: 38, height: 4, width: 190 * ruleIn, background: goldGradient, opacity: 1 - exitOf(2), boxShadow: '0 0 14px rgba(238,185,43,0.5)'}} />

      {rows}

      <AchievementPanel text={nominee.achievement} frame={frame} />
    </div>
  );
};

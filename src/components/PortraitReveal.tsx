import React from 'react';
import {Img, staticFile} from 'remotion';
import {goldGradient, theme} from '../styles/theme';
import type {Nominee} from '../data/types';
import {NOM, NOMINEE_FRAMES} from '../utils/timing';
import {easeIn, easeInOut, lerp, prog} from '../utils/motion';

const initialsOf = (name: string) => {
  const w = name.trim().split(/\s+/);
  return ((w[0]?.[0] ?? '') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
};

/**
 * Stage A. A geometric (chamfered) frame draws itself, then the portrait is revealed bottom-to-top
 * behind a gold leading edge, with a restrained push-in and one light sweep. Works for any portrait
 * aspect ratio (object-fit: cover + configurable focus) and for a missing portrait (clearly-marked
 * placeholder — never a fake photo).
 */
export const PortraitReveal: React.FC<{nominee: Nominee; frame: number}> = ({nominee, frame}) => {
  const {x, y, w, h, chamfer} = theme.layout.portrait;
  const c = theme.colors;

  const draw = prog(frame, NOM.outlineDraw[0], NOM.outlineDraw[1], easeInOut);
  const wipe = prog(frame, NOM.portraitWipe[0], NOM.portraitWipe[1], easeInOut);
  const exit = prog(frame, NOM.exitStart + 6, NOM.exitStart + 34, easeIn);
  const sweep = prog(frame, NOM.lightSweep[0], NOM.lightSweep[1], easeInOut);
  const drift = prog(frame, NOM.portraitWipe[1], NOMINEE_FRAMES - 30, (t) => t);

  const path = `M0 0 L${w - chamfer} 0 L${w} ${chamfer} L${w} ${h} L0 ${h} Z`;
  const poly = `polygon(0px 0px, ${w - chamfer}px 0px, ${w}px ${chamfer}px, ${w}px ${h}px, 0px ${h}px)`;
  const topInset = Math.min(100, (1 - wipe) * 100 + exit * 100);
  const scale = 1 + (1 - wipe) * 0.14 + drift * 0.035;
  const edgeY = (1 - wipe) * h;
  const edgeOpacity = wipe > 0 && wipe < 1 ? 1 : 0;

  const offset = 30;
  const dash = (extra = 0) => ({strokeDasharray: '1 1', strokeDashoffset: 1 - draw - exit * 1 + extra});

  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h}}>
      {/* offset echo frame */}
      <svg width={w + offset + 4} height={h + offset + 4} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `translate(${offset}px, ${offset}px)`}}>
        <path d={path} pathLength={1} fill="none" stroke={c.gold} strokeOpacity={0.55} strokeWidth={2} {...dash(0)} />
      </svg>

      {/* portrait window */}
      <div style={{position: 'absolute', inset: 0, clipPath: poly}}>
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(${topInset}% 0 0 0)`, backgroundColor: c.panel}}>
          <div style={{position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: '50% 38%'}}>
            {nominee.portrait ? (
              <Img src={staticFile(nominee.portrait)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: nominee.portraitFocus ?? '50% 22%'}} />
            ) : (
              <Placeholder name={nominee.name} />
            )}
          </div>
          {/* depth: top-light, bottom shade */}
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(248,218,122,0.07) 0%, rgba(0,0,0,0) 30%, rgba(7,7,10,0.0) 62%, rgba(7,7,10,0.55) 100%)'}} />
          {/* one controlled light sweep */}
          <div
            style={{
              position: 'absolute',
              top: -40,
              bottom: -40,
              width: 220,
              left: lerp(-320, w + 120, sweep),
              transform: 'skewX(-16deg)',
              background: 'linear-gradient(90deg, rgba(255,240,190,0), rgba(255,240,190,0.28), rgba(255,240,190,0))',
              opacity: sweep > 0 && sweep < 1 ? 1 : 0,
              mixBlendMode: 'screen',
            }}
          />
        </div>
        {/* gold leading edge of the wipe */}
        <div style={{position: 'absolute', left: 0, right: 0, top: edgeY - 2, height: 4, opacity: edgeOpacity, background: goldGradient, boxShadow: '0 0 24px rgba(238,185,43,0.9)'}} />
      </div>

      {/* primary frame */}
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d={path} pathLength={1} fill="none" stroke={c.gold} strokeWidth={3} strokeLinejoin="miter" {...dash(0)} />
      </svg>
    </div>
  );
};

const Placeholder: React.FC<{name: string}> = ({name}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(165deg, #1E1C22 0%, #121217 55%, #0B0B0F 100%)',
      overflow: 'hidden',
    }}
  >
    <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, opacity: 0.5}}>
      <defs>
        <pattern id="ph-dots" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.6" fill={theme.colors.gold} fillOpacity="0.28" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ph-dots)" />
    </svg>
    <div style={{position: 'absolute', left: 0, right: 0, top: '30%', textAlign: 'center', fontFamily: theme.fonts.display, fontStyle: 'italic', fontWeight: 300, fontSize: 260, lineHeight: 1, color: theme.colors.gold, opacity: 0.2}}>
      {initialsOf(name)}
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 44, textAlign: 'center', fontFamily: theme.fonts.sans}}>
      <div style={{fontWeight: 800, fontSize: 21, letterSpacing: '0.3em', color: theme.colors.gold, opacity: 0.85}}>PORTRAIT PLACEHOLDER</div>
      <div style={{fontWeight: 500, fontSize: 19, letterSpacing: '0.06em', color: theme.colors.ivoryFaint, marginTop: 10}}>Approved photograph to be supplied</div>
    </div>
  </div>
);

import React from 'react';
import {theme} from '../styles/theme';
import {NOM} from '../utils/timing';
import {easeIn, easeOut, prog} from '../utils/motion';

/** Stage D — optional. Renders nothing at all (and takes no space) when no verified text is supplied. */
export const AchievementPanel: React.FC<{
  text?: string | null;
  frame: number;
  /** Reveal window; default = the nominee scene's cue. */
  window?: readonly [number, number];
  /** Closing exit window; null → no exit (the scene holds). Default = the nominee scene's exit. */
  exitRange?: readonly [number, number] | null;
}> = ({text, frame, window, exitRange}) => {
  if (!text?.trim()) return null;
  const win = window ?? NOM.achievement;
  const p = prog(frame, win[0], win[1], easeOut);
  const exitWin = exitRange === undefined ? ([NOM.exitStart + 20, NOM.exitStart + 42] as const) : exitRange;
  const e = exitWin ? prog(frame, exitWin[0], exitWin[1], easeIn) : 0;
  return (
    <div style={{marginTop: 46, opacity: p * (1 - e), transform: `translateY(${(1 - p) * 22}px) translateX(${-44 * e}px)`}}>
      <div
        style={{
          position: 'relative',
          maxWidth: 880,
          padding: '26px 36px 28px 40px',
          background: 'linear-gradient(90deg, rgba(246,240,226,0.09), rgba(246,240,226,0.03))',
          borderRadius: 4,
        }}
      >
        <div style={{position: 'absolute', left: 0, top: 0, width: 5, height: `${p * 100}%`, background: theme.colors.gold, boxShadow: '0 0 14px rgba(238,185,43,0.6)'}} />
        <div style={{fontFamily: theme.fonts.sans, fontWeight: 500, fontSize: 36, lineHeight: 1.3, color: theme.colors.ivory, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{text}</div>
      </div>
    </div>
  );
};

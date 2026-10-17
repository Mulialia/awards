import React from 'react';
import {awards} from '../data';
import {theme} from '../styles/theme';
import {HEIGHT} from '../utils/timing';

/**
 * Discreet event branding: the event lock-up, bottom-left inside the safe area.
 * The persistent Chrome (category/award label + emblem) stays at the top; this anchors the
 * presentation screens with the event name and year without competing with the honouree.
 */
export const EventFooter: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const ev = awards.event;
  const label = [ev.name, ev.year != null ? String(ev.year) : null].filter(Boolean).join('  ·  ');
  if (!label || opacity <= 0) return null;
  return (
    <div style={{position: 'absolute', left: theme.safe.x, top: HEIGHT - theme.safe.y - 22, display: 'flex', alignItems: 'center', gap: 16, opacity: opacity * 0.9}}>
      <div style={{width: 34, height: 2, background: theme.colors.gold, opacity: 0.85}} />
      <div style={{fontFamily: theme.fonts.sans, fontWeight: 700, fontSize: 17, letterSpacing: '0.32em', textTransform: 'uppercase', color: theme.colors.ivoryFaint, whiteSpace: 'nowrap'}}>{label}</div>
    </div>
  );
};
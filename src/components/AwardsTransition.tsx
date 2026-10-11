import React from 'react';
import {theme} from '../styles/theme';
import {WIDTH, HEIGHT} from '../utils/timing';

/**
 * The "gate line": a single gold hairline that is the signature of the YORA motion language.
 * It is the LAST thing on screen at the end of every scene and the FIRST thing on screen at the start
 * of the next, which is what makes category → nominee → nominee feel continuous.
 */
export const GateLine: React.FC<{left?: number; right?: number; y?: number; opacity?: number; thickness?: number}> = ({
  left = 0,
  right = WIDTH,
  y = HEIGHT / 2,
  opacity = 1,
  thickness = 3,
}) => {
  const w = Math.max(0, right - left);
  if (w < 1 || opacity <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: y - thickness / 2,
        width: w,
        height: thickness,
        opacity,
        background: `linear-gradient(90deg, rgba(238,185,43,0) 0%, ${theme.colors.gold} 10%, ${theme.colors.goldLight} 50%, ${theme.colors.gold} 90%, rgba(238,185,43,0) 100%)`,
        boxShadow: '0 0 18px rgba(238,185,43,0.55), 0 0 60px rgba(238,185,43,0.25)',
      }}
    />
  );
};

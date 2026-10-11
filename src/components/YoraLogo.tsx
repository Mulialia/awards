import React from 'react';
import {Img, staticFile} from 'remotion';
import {theme} from '../styles/theme';

/**
 * Brand marks are the ORIGINAL pixels from the supplied letterhead (colour-to-alpha
 * cut-outs, 3× Lanczos upscaled) — never redrawn, recoloured or re-proportioned.
 * Replace the PNGs in /public/logos with official vector/transparent artwork when available.
 */
export const YoraEmblem: React.FC<{height: number; opacity?: number}> = ({height, opacity = 1}) => (
  <Img src={staticFile('logos/yora-emblem.png')} style={{height, width: 'auto', opacity, display: 'block'}} />
);

/**
 * Full "YORA Awards" lock-up. Its black / navy lettering needs a light ground, so it is shown on
 * an ivory plate rather than altered. (Recommendation: ask YORA for a reversed/light version.)
 */
export const YoraLockupPlate: React.FC<{scale?: number; opacity?: number}> = ({scale = 1, opacity = 1}) => (
  <div
    style={{
      width: 360,
      height: 470,
      borderRadius: 4,
      background: `radial-gradient(circle at 50% 38%, #FBF7EC 0%, ${theme.colors.ivory} 70%, #EDE5D0 100%)`,
      boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(238,185,43,0.6), 0 0 0 10px rgba(7,7,10,0.9), 0 0 0 11px rgba(238,185,43,0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `scale(${scale})`,
      opacity,
    }}
  >
    <Img src={staticFile('logos/yora-lockup.png')} style={{height: 372, width: 'auto', display: 'block'}} />
  </div>
);

import React from 'react';
import {Img, staticFile} from 'remotion';

/**
 * Brand marks are the ORIGINAL pixels from the supplied artwork — never redrawn,
 * recoloured or re-proportioned.
 *
 *  - yora-emblem.png      → transparent gold unicorn head only.
 *  - yora-lockup-bk.png   → transparent full "YORA Awards" lock-up (genuine alpha cut-out).
 *
 * NOTE: yora-lockup.png is NOT usable on a dark ground — it is fully opaque with a
 * baked-in light checkerboard, so it reads as a solid plate. yora-lockup-bk.png is the
 * real transparent version and is what we render here. Replace both in /public/logos
 * with official vector artwork when YORA supplies it.
 */
export const YoraEmblem: React.FC<{height: number; opacity?: number}> = ({height, opacity = 1}) => (
  <Img src={staticFile('logos/yora-emblem.png')} style={{height, width: 'auto', opacity, display: 'block'}} />
);

/**
 * Full "YORA Awards" lock-up floating directly on the dark scene (transparent cut-out).
 *
 * The lettering is black / navy, so a hard-edged light plate would normally be required to
 * keep it legible. Instead we sit the mark on a soft, feathered radial glow plus a deep
 * drop-shadow: there is no rectangle, the background stays open, and the logo still pops
 * cleanly off the obsidian. (Recommendation: ask YORA for a reversed/light version to drop
 * the glow entirely.)
 */
export const YoraLockup: React.FC<{scale?: number; opacity?: number}> = ({scale = 1, opacity = 1}) => (
  <div
    style={{
      width: 520,
      height: 620,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `scale(${scale})`,
      opacity,
    }}
  >
    {/* Soft feathered halo — light ground for the dark lettering WITHOUT a hard plate.
        Inset negatively so it falls off well beyond the mark. */}
    <div
      style={{
        position: 'absolute',
        inset: -110,
        background:
          'radial-gradient(ellipse 46% 44% at 50% 50%, rgba(246,240,226,0.38) 0%, rgba(246,240,226,0.22) 30%, rgba(248,218,122,0.10) 52%, rgba(238,185,43,0.04) 66%, rgba(7,7,10,0) 80%)',
        pointerEvents: 'none',
      }}
    />
    <Img
      src={staticFile('logos/yora-lockup-bk.png')}
      style={{
        height: 560,
        width: 'auto',
        display: 'block',
        position: 'relative',
        filter: 'drop-shadow(0 26px 60px rgba(0,0,0,0.85)) drop-shadow(0 0 34px rgba(7,7,10,0.55))',
      }}
    />
  </div>
);

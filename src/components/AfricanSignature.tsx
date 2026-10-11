import React from 'react';
import {theme} from '../styles/theme';

/**
 * The only place red and green appear on screen: a tiny three-segment tick lifted straight from
 * the YORA wordmark's palette (red · gold · green). Selective by design — a signature, not a flag.
 */
export const AfricanSignature: React.FC<{width?: number; height?: number; opacity?: number}> = ({width = 66, height = 4, opacity = 1}) => {
  const seg = (width - 8) / 3;
  return (
    <div style={{display: 'flex', gap: 4, opacity}}>
      {[theme.colors.red, theme.colors.gold, theme.colors.green].map((c) => (
        <div key={c} style={{width: seg, height, background: c, borderRadius: 1}} />
      ))}
    </div>
  );
};

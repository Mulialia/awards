import React from 'react';
import {theme} from '../styles/theme';
import {AfricanSignature} from './AfricanSignature';
import {YoraEmblem} from './YoraLogo';
import {fitLines} from '../utils/textLayout';

/** Persistent frame furniture: category label (top-left) and YORA emblem (top-right). */
export const Chrome: React.FC<{categoryName: string; opacity: number}> = ({categoryName, opacity}) => {
  if (opacity <= 0) return null;
  const label = categoryName.toUpperCase();
  const fit = fitLines({
    text: label,
    fontFamily: theme.fonts.sansName,
    fontWeight: 700,
    letterSpacing: '0.2em',
    maxWidth: 1180,
    maxSize: 28,
    minSize: 20,
    maxLines: 1,
  });
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      <div style={{position: 'absolute', left: theme.layout.portrait.x, top: 78, display: 'flex', alignItems: 'center', gap: 22}}>
        <AfricanSignature />
        <div style={{fontFamily: theme.fonts.sans, fontWeight: 700, fontSize: fit.fontSize, letterSpacing: '0.2em', color: theme.colors.ivoryDim, whiteSpace: 'nowrap'}}>
          {label}
        </div>
      </div>
      <div style={{position: 'absolute', right: theme.safe.x, top: 58}}>
        <YoraEmblem height={104} />
      </div>
    </div>
  );
};

import React from 'react';
import {AbsoluteFill} from 'remotion';
import {goldGradient, theme} from '../styles/theme';

/**
 * On-brand placeholder shown when a presentation screen has no data yet.
 * It explains what to do in the editor and never invents honouree content.
 */
export const ScreenNotice: React.FC<{title: string; hint: string}> = ({title, hint}) => (
  <AbsoluteFill style={{backgroundColor: theme.colors.obsidian, alignItems: 'center', justifyContent: 'center'}}>
    <div style={{maxWidth: 980, textAlign: 'center', padding: '0 80px'}}>
      <div style={{width: 120, height: 3, background: goldGradient, margin: '0 auto 38px', boxShadow: '0 0 14px rgba(238,185,43,0.5)'}} />
      <div style={{fontFamily: theme.fonts.display, fontWeight: 620, fontSize: 60, lineHeight: 1.08, color: theme.colors.ivory}}>{title}</div>
      <div style={{fontFamily: theme.fonts.sans, fontWeight: 600, fontSize: 26, lineHeight: 1.4, letterSpacing: '0.04em', color: theme.colors.ivoryDim, marginTop: 26}}>{hint}</div>
    </div>
  </AbsoluteFill>
);
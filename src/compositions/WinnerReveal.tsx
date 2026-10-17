import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BackgroundAtmosphere} from '../components/BackgroundAtmosphere';
import {Chrome} from '../components/Chrome';
import {EventFooter} from '../components/EventFooter';
import {GateLine} from '../components/AwardsTransition';
import {PortraitReveal} from '../components/PortraitReveal';
import {ScreenNotice} from '../components/ScreenNotice';
import {WinnerIdentity} from '../components/WinnerIdentity';
import {getCategory, resolveWinner} from '../data';
import type {ResolvedWinner} from '../data';
import type {Category, Nominee, WinnerProps} from '../data/types';
import {easeInOut, easeOut, lerp, prog} from '../utils/motion';
import {HEIGHT, WIDTH, WIN, WINNER_FRAMES} from '../utils/timing';

/**
 * Background offset for the standalone screens: the atmosphere is already settled (frame 150+)
 * so the backdrop reads exactly like a nominee scene mid-sequence — calm, slowly-evolving graphics.
 */
const BG_OFFSET = 160;

/** Screen 1 scene — transparent foreground; the caller supplies background + chrome. */
export const WinnerScene: React.FC<{category: Category; winner: ResolvedWinner}> = ({category, winner}) => {
  const frame = useCurrentFrame();

  // Opens from the full-width hairline, which collapses to the centre and disappears (no exit).
  const collapse = prog(frame, WIN.gateCollapse[0], WIN.gateCollapse[1], easeInOut);
  const mid = WIDTH / 2;
  const left = lerp(0, mid, collapse);
  const right = lerp(WIDTH, mid, collapse);

  // PortraitReveal only reads the portrait fields from a nominee record.
  const forPortrait: Nominee = {id: 'winner', name: winner.name, business: winner.business, portrait: winner.portrait, portraitFocus: winner.portraitFocus, companyLogo: winner.companyLogo};

  return (
    <AbsoluteFill>
      <GateLine left={left} right={right} y={HEIGHT / 2} />
      <PortraitReveal nominee={forPortrait} frame={frame} exitRange={null} driftEnd={WINNER_FRAMES - 30} />
      <WinnerIdentity category={category} winner={winner} frame={frame} />
    </AbsoluteFill>
  );
};

/** Standalone winner's screen (screen 1). Holds on the complete card through the last frame. */
export const WinnerReveal: React.FC<WinnerProps> = ({categoryId, override}) => {
  const frame = useCurrentFrame();
  const category = getCategory(categoryId);
  const winner = resolveWinner(category, override);
  if (!winner) {
    return (
      <ScreenNotice
        title="No winner set yet"
        hint={`Open the editor → Winner tab, choose the winner of “${category.name}”, Save, then render this screen.`}
      />
    );
  }
  const chrome = prog(frame, 0, 16, easeOut); // fades in and stays through the final frame
  return (
    <AbsoluteFill>
      <BackgroundAtmosphere frame={BG_OFFSET + frame} />
      <Chrome categoryName={category.name} opacity={chrome} />
      <WinnerScene category={category} winner={winner} />
      <EventFooter opacity={chrome} />
    </AbsoluteFill>
  );
};
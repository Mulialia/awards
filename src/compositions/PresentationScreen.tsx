import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BackgroundAtmosphere} from '../components/BackgroundAtmosphere';
import {Chrome} from '../components/Chrome';
import {EventFooter} from '../components/EventFooter';
import {GateLine} from '../components/AwardsTransition';
import {PortraitReveal} from '../components/PortraitReveal';
import {PresentationIdentity} from '../components/PresentationIdentity';
import {ScreenNotice} from '../components/ScreenNotice';
import {findPresentation} from '../data';
import type {Nominee, Presentation, PresentationProps} from '../data/types';
import {easeInOut, easeOut, lerp, prog} from '../utils/motion';
import {HEIGHT, PRES, PRESENTATION_FRAMES, WIDTH} from '../utils/timing';

/** Same settled backdrop as the winner's screen (see WinnerReveal). */
const BG_OFFSET = 160;

/** Screen 2 scene — transparent foreground; the caller supplies background + chrome. */
export const PresentationScene: React.FC<{presentation: Presentation}> = ({presentation}) => {
  const frame = useCurrentFrame();

  const collapse = prog(frame, PRES.gateCollapse[0], PRES.gateCollapse[1], easeInOut);
  const mid = WIDTH / 2;
  const left = lerp(0, mid, collapse);
  const right = lerp(WIDTH, mid, collapse);

  // PortraitReveal only reads the portrait fields from a nominee record.
  const forPortrait: Nominee = {id: presentation.id, name: presentation.name, business: presentation.business ?? '', portrait: presentation.image, portraitFocus: presentation.imageFocus, companyLogo: presentation.logo};

  return (
    <AbsoluteFill>
      <GateLine left={left} right={right} y={HEIGHT / 2} />
      <PortraitReveal nominee={forPortrait} frame={frame} exitRange={null} driftEnd={PRESENTATION_FRAMES - 30} />
      <PresentationIdentity presentation={presentation} frame={frame} />
    </AbsoluteFill>
  );
};

/** Standalone award presentation screen (screen 2). Holds on the complete card through the last frame. */
export const PresentationScreen: React.FC<PresentationProps> = ({presentationId, override}) => {
  const frame = useCurrentFrame();
  const presentation = findPresentation(presentationId, override);
  if (!presentation) {
    return (
      <ScreenNotice
        title="No award presentation found"
        hint="Open the editor → Awards tab, add the award presentation (organisation or individual), Save, then render this screen."
      />
    );
  }
  const chrome = prog(frame, 0, 16, easeOut); // fades in and stays through the final frame
  return (
    <AbsoluteFill>
      <BackgroundAtmosphere frame={BG_OFFSET + frame} />
      <Chrome categoryName={presentation.award} opacity={chrome} />
      <PresentationScene presentation={presentation} />
      <EventFooter opacity={chrome} />
    </AbsoluteFill>
  );
};
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BackgroundAtmosphere} from '../components/BackgroundAtmosphere';
import {Chrome} from '../components/Chrome';
import {GateLine} from '../components/AwardsTransition';
import {NomineeIdentity} from '../components/NomineeIdentity';
import {PortraitReveal} from '../components/PortraitReveal';
import {getCategory, getNominee} from '../data';
import type {Nominee, NomineeProps} from '../data/types';
import {easeInOut, easeOut, lerp, prog} from '../utils/motion';
import {NOM, NOMINEE_FRAMES, WIDTH, HEIGHT, nomineeStart} from '../utils/timing';

/**
 * One nominee, A→E. Transparent foreground; the caller supplies background + chrome so that scenes
 * can sit back-to-back in a category sequence without the world ever restarting.
 */
export const NomineeScene: React.FC<{nominee: Nominee; index: number; total: number}> = ({nominee, index, total}) => {
  const frame = useCurrentFrame();

  // Opens from the previous scene's full-width hairline… closes by redrawing it for the next one.
  const collapse = prog(frame, NOM.gateCollapse[0], NOM.gateCollapse[1], easeInOut);
  const out = prog(frame, NOM.hairlineOut[0], NOM.hairlineOut[1], easeInOut);
  const mid = WIDTH / 2;
  const left = frame < NOM.hairlineOut[0] ? lerp(0, mid, collapse) : lerp(mid, 0, out);
  const right = frame < NOM.hairlineOut[0] ? lerp(WIDTH, mid, collapse) : lerp(mid, WIDTH, out);

  return (
    <AbsoluteFill>
      <GateLine left={left} right={right} y={HEIGHT / 2} />
      <PortraitReveal nominee={nominee} frame={frame} />
      <NomineeIdentity nominee={nominee} index={index} total={total} frame={frame} />
    </AbsoluteFill>
  );
};

/** Standalone nominee video (deliverable 5). Fades its own chrome in/out so the file is self-contained. */
export const NomineeReveal: React.FC<NomineeProps> = ({categoryId, nomineeId, override}) => {
  const frame = useCurrentFrame();
  const category = getCategory(categoryId);
  const {nominee, index} = getNominee(category, nomineeId);
  const merged: Nominee = {...nominee, ...override};
  const chrome = prog(frame, 0, 16, easeOut) * (1 - prog(frame, NOMINEE_FRAMES - 16, NOMINEE_FRAMES, easeOut));
  return (
    <AbsoluteFill>
      <BackgroundAtmosphere frame={nomineeStart(index) + frame} />
      <Chrome categoryName={category.name} opacity={chrome} />
      <NomineeScene nominee={merged} index={index} total={category.nominees.length} />
    </AbsoluteFill>
  );
};

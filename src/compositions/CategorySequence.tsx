import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {BackgroundAtmosphere} from '../components/BackgroundAtmosphere';
import {Chrome} from '../components/Chrome';
import {getCategory} from '../data';
import type {CategoryProps} from '../data/types';
import {easeOut, prog} from '../utils/motion';
import {INTRO_FRAMES, NOMINEE_FRAMES, ROSTER_FRAMES, nomineeStart, rosterStart} from '../utils/timing';
import {RosterScene} from './CategoryRoster';
import {IntroContent} from './CategoryIntro';
import {NomineeScene} from './NomineeReveal';

/**
 * Continuous category video: intro + N nominees + closing roster (N comes from the data — never hard-coded).
 * Background and chrome live OUTSIDE the <Sequence>s, so they flow uninterrupted across scenes.
 */
export const CategorySequence: React.FC<CategoryProps> = ({categoryId}) => {
  const frame = useCurrentFrame();
  const category = getCategory(categoryId);
  const total = category.nominees.length;
  return (
    <AbsoluteFill>
      <BackgroundAtmosphere frame={frame} />
      <Chrome categoryName={category.name} opacity={prog(frame, INTRO_FRAMES - 22, INTRO_FRAMES - 2, easeOut)} />
      <Sequence from={0} durationInFrames={INTRO_FRAMES} name="Category intro">
        <IntroContent category={category} />
      </Sequence>
      {category.nominees.map((n, i) => (
        <Sequence key={n.id} from={nomineeStart(i)} durationInFrames={NOMINEE_FRAMES} name={`${String(i + 1).padStart(2, '0')} ${n.name}`}>
          <NomineeScene nominee={n} index={i} total={total} />
        </Sequence>
      ))}
      <Sequence from={rosterStart(total)} durationInFrames={ROSTER_FRAMES} name="Nominee roster">
        <RosterScene category={category} />
      </Sequence>
    </AbsoluteFill>
  );
};

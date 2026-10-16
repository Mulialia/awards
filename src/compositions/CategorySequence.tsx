import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {BackgroundAtmosphere} from '../components/BackgroundAtmosphere';
import {Chrome} from '../components/Chrome';
import {getCategory} from '../data';
import type {CategoryProps} from '../data/types';
import {easeOut, prog} from '../utils/motion';
import {NOMINEE_FRAMES, ROSTER_FRAMES, introFrames, nomineeStart, rosterStart} from '../utils/timing';
import {RosterScene} from './CategoryRoster';
import {IntroContent} from './CategoryIntro';
import {NomineeScene} from './NomineeReveal';

/**
 * Continuous category video: intro + N nominees + closing roster (N comes from the data — never hard-coded).
 * Background and chrome live OUTSIDE the <Sequence>s, so they flow uninterrupted across scenes.
 * The intro length is per-category: it stretches when the category defines a voice-over.
 */
export const CategorySequence: React.FC<CategoryProps> = ({categoryId}) => {
  const frame = useCurrentFrame();
  const category = getCategory(categoryId);
  const total = category.nominees.length;
  const introLen = introFrames(category);
  return (
    <AbsoluteFill>
      <BackgroundAtmosphere frame={frame} />
      <Chrome categoryName={category.name} opacity={prog(frame, introLen - 22, introLen - 2, easeOut)} />
      <Sequence from={0} durationInFrames={introLen} name="Category intro">
        <IntroContent category={category} />
      </Sequence>
      {category.nominees.map((n, i) => (
        <Sequence key={n.id} from={nomineeStart(category, i)} durationInFrames={NOMINEE_FRAMES} name={`${String(i + 1).padStart(2, '0')} ${n.name}`}>
          <NomineeScene nominee={n} index={i} total={total} />
        </Sequence>
      ))}
      <Sequence from={rosterStart(category)} durationInFrames={ROSTER_FRAMES} name="Nominee roster">
        <RosterScene category={category} />
      </Sequence>
    </AbsoluteFill>
  );
};

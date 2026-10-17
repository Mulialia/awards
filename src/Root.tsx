import React from 'react';
import {Composition, Folder} from 'remotion';
import {CategoryIntro} from './compositions/CategoryIntro';
import {NomineeReveal} from './compositions/NomineeReveal';
import {CategoryRoster, RosterScene} from './compositions/CategoryRoster';
import {CategorySequence} from './compositions/CategorySequence';
import {WinnerReveal} from './compositions/WinnerReveal';
import {PresentationScreen} from './compositions/PresentationScreen';
import {assertValid, awards, getCategory} from './data';
import type {CategoryProps, NomineeProps, PresentationProps, WinnerProps} from './data/types';
import {QA_CATEGORY_14, QA_FULL_FIELDS, QA_LONG, QA_PRESENTATION, QA_WINNER} from './data/qa-fixtures';
import {FPS, HEIGHT, NOMINEE_FRAMES, PRESENTATION_FRAMES, ROSTER_FRAMES, WIDTH, WINNER_FRAMES, categoryFrames, introFrames} from './utils/timing';
import {loadBrandFonts} from './utils/fonts';

loadBrandFonts();

const QARoster14: React.FC = () => <RosterScene category={QA_CATEGORY_14} />;

const first = awards.categories[0];
const catDefault: CategoryProps = {categoryId: first.id};
const nomDefault: NomineeProps = {categoryId: first.id, nomineeId: first.nominees[0].id};
const firstPresentation: PresentationProps = {presentationId: awards.presentations?.[0]?.id ?? ''};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CategorySequence"
        component={CategorySequence}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={categoryFrames(first)}
        defaultProps={catDefault}
        calculateMetadata={({props}) => {
          assertValid();
          return {durationInFrames: categoryFrames(getCategory(props.categoryId))};
        }}
      />
      <Composition
        id="CategoryIntro"
        component={CategoryIntro}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={introFrames(first)}
        defaultProps={catDefault}
        calculateMetadata={({props}) => {
          assertValid();
          return {durationInFrames: introFrames(getCategory(props.categoryId))};
        }}
      />
      <Composition id="CategoryRoster" component={CategoryRoster} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={ROSTER_FRAMES} defaultProps={catDefault} calculateMetadata={() => {assertValid(); return {};}} />
      <Composition id="NomineeReveal" component={NomineeReveal} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={NOMINEE_FRAMES} defaultProps={nomDefault} calculateMetadata={() => {assertValid(); return {};}} />
      <Composition id="WinnerReveal" component={WinnerReveal} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={WINNER_FRAMES} defaultProps={catDefault as WinnerProps} calculateMetadata={() => {assertValid(); return {};}} />
      <Composition id="AwardPresentation" component={PresentationScreen} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={PRESENTATION_FRAMES} defaultProps={firstPresentation} calculateMetadata={() => {assertValid(); return {};}} />

      <Folder name="QA-stress-tests">
        <Composition id="QA-OptionalFieldsPresent" component={NomineeReveal} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={NOMINEE_FRAMES} defaultProps={{...nomDefault, override: QA_FULL_FIELDS}} />
        <Composition id="QA-Roster-14" component={QARoster14} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={ROSTER_FRAMES} />
        <Composition id="QA-LongNames" component={NomineeReveal} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={NOMINEE_FRAMES} defaultProps={{...nomDefault, override: QA_LONG}} />
        <Composition id="QA-LongNames-AllFields" component={NomineeReveal} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={NOMINEE_FRAMES} defaultProps={{...nomDefault, override: {...QA_FULL_FIELDS, ...QA_LONG}}} />
        <Composition id="QA-Winner" component={WinnerReveal} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={WINNER_FRAMES} defaultProps={{categoryId: first.id, override: QA_WINNER}} />
        <Composition id="QA-Presentation" component={PresentationScreen} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={PRESENTATION_FRAMES} defaultProps={{presentationId: '', override: QA_PRESENTATION}} />
      </Folder>
    </>
  );
};

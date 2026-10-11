import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BackgroundAtmosphere} from '../components/BackgroundAtmosphere';
import {CategoryTitle, layoutIntroTitle, TITLE_LEFT} from '../components/CategoryTitle';
import {Chrome} from '../components/Chrome';
import {GateLine} from '../components/AwardsTransition';
import {YoraLockupPlate} from '../components/YoraLogo';
import {getCategory} from '../data';
import type {Category, CategoryProps} from '../data/types';
import {easeInOut, easeOut, lerp, prog} from '../utils/motion';
import {HEIGHT, INTRO, INTRO_FRAMES, WIDTH} from '../utils/timing';

/** Foreground of the category introduction (transparent — sits on BackgroundAtmosphere). */
export const IntroContent: React.FC<{category: Category}> = ({category}) => {
  const frame = useCurrentFrame();
  const L = layoutIntroTitle(category);

  // Hairline choreography: draws out → rises & shortens into the title rule → returns full width
  const draw = prog(frame, INTRO.lineDraw[0], INTRO.lineDraw[1], easeOut);
  const toRule = prog(frame, INTRO.lineToRule[0], INTRO.lineToRule[1], easeInOut);
  const back = prog(frame, INTRO.exit[0], INTRO.exit[1], easeInOut);

  const mid = WIDTH / 2;
  let left = lerp(mid, 0, draw);
  let right = lerp(mid, WIDTH, draw);
  let y = HEIGHT / 2;
  left = lerp(left, TITLE_LEFT, toRule);
  right = lerp(right, TITLE_LEFT + 300, toRule);
  y = lerp(y, L.ruleY, toRule);
  left = lerp(left, 0, back);
  right = lerp(right, WIDTH, back);
  y = lerp(y, HEIGHT / 2, back);

  const plateIn = prog(frame, INTRO.plateIn[0], INTRO.plateIn[1], easeOut);
  const plateOut = prog(frame, INTRO.plateOut[0], INTRO.plateOut[1], easeInOut);
  const plateOpacity = plateIn * (1 - plateOut);

  return (
    <AbsoluteFill>
      <GateLine left={left} right={right} y={y} />
      {plateOpacity > 0 && (
        <div style={{position: 'absolute', left: WIDTH / 2 - 180, top: HEIGHT / 2 - 235}}>
          <YoraLockupPlate scale={lerp(0.93, 1, plateIn) * lerp(1, 1.04, plateOut)} opacity={plateOpacity} />
        </div>
      )}
      <CategoryTitle category={category} frame={frame} />
    </AbsoluteFill>
  );
};

/** Standalone category introduction (deliverable 4). */
export const CategoryIntro: React.FC<CategoryProps> = ({categoryId}) => {
  const frame = useCurrentFrame();
  const category = getCategory(categoryId);
  return (
    <AbsoluteFill>
      <BackgroundAtmosphere frame={frame} />
      <Chrome categoryName={category.name} opacity={prog(frame, INTRO_FRAMES - 22, INTRO_FRAMES - 2, easeOut)} />
      <IntroContent category={category} />
    </AbsoluteFill>
  );
};

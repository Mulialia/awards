import {continueRender, delayRender, staticFile} from 'remotion';

const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

const FACES = [
  {family: 'Fraunces YORA', file: 'fonts/fraunces-latin-wght-normal.woff2', style: 'normal', range: LATIN},
  {family: 'Fraunces YORA', file: 'fonts/fraunces-latin-ext-wght-normal.woff2', style: 'normal', range: LATIN_EXT},
  {family: 'Fraunces YORA', file: 'fonts/fraunces-latin-wght-italic.woff2', style: 'italic', range: LATIN},
  {family: 'Manrope YORA', file: 'fonts/manrope-latin-wght-normal.woff2', style: 'normal', range: LATIN},
  {family: 'Manrope YORA', file: 'fonts/manrope-latin-ext-wght-normal.woff2', style: 'normal', range: LATIN_EXT},
] as const;

/** Loads the (self-hosted, OFL) brand fonts and blocks rendering until they are ready. */
export const loadBrandFonts = () => {
  if (typeof document === 'undefined') return;
  const handle = delayRender('Loading YORA brand fonts');
  Promise.all(
    FACES.map(async (f) => {
      const face = new FontFace(f.family, `url(${staticFile(f.file)}) format('woff2')`, {
        weight: '100 900',
        style: f.style,
        unicodeRange: f.range,
      });
      document.fonts.add(await face.load());
    }),
  )
    .then(() => document.fonts.ready)
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error('Font loading failed', e);
      continueRender(handle);
    });
};

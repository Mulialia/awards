// Review-stage helper: render a contact sheet of specific frames from any composition.
// Usage: node scripts/stills.mjs <CompositionId> '<propsJSON>' <frame,frame,...> [outDir] [prefix]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [id, propsJson = '{}', frameList = '0', outDir = 'out/stills', prefix = id] = process.argv.slice(2);
const inputProps = JSON.parse(propsJson);
const frames = frameList.split(',').map(Number);
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;
const composition = await selectComposition({serveUrl, id, inputProps, browserExecutable});
for (const frame of frames) {
  const output = path.join(outDir, `${prefix}_f${String(frame).padStart(4, '0')}.png`);
  await renderStill({serveUrl, composition, frame, output, inputProps, browserExecutable});
  console.log('wrote', output);
}

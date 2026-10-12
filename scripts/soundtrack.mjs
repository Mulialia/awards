// Shared soundtrack lookup — used by mux-audio.mjs, list-categories.mjs, category-steps.mjs and
// the editor server (scripts/editor-server.mjs) so they all agree on "the" track for a category.
// Priority: per-category master written/uploaded as out/audio/<id>-soundtrack.*  (.wav preferred)
//           → legacy explicit WAV at out/audio/<id>.wav  (old README recipe).
import fs from 'node:fs';
import path from 'node:path';

export const AUDIO_DIR = 'out/audio';

/** Absolute path of the current soundtrack for a category, or null when none exists. */
export function findSoundtrack(categoryId, root = '.') {
  return listSoundtracks(categoryId, root)[0] ?? null;
}

/** Every soundtrack file that currently stands in for the category, best candidate first. */
export function listSoundtracks(categoryId, root = '.') {
  const dir = path.join(root, AUDIO_DIR);
  if (!fs.existsSync(dir)) return [];
  const base = `${categoryId}-soundtrack.`;
  const perCategory = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(base))
    .sort((a, b) => Number(b.endsWith('.wav')) - Number(a.endsWith('.wav'))); // .wav first
  const legacy = path.join(dir, `${categoryId}.wav`);
  const out = perCategory.map((f) => path.join(dir, f));
  if (fs.existsSync(legacy)) out.push(legacy);
  return out;
}

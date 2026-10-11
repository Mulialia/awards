# YORA Entrepreneurial Awards — Nominee Presentation System

Data-driven motion graphics built with **React + Remotion 4**. The first category
(**Youth Creative Business Concept Award**, 5 nominees) is the prototype; the system is the product.

```
Category intro (5 s)  →  Nominee 01 (14 s)  →  Nominee 02 (14 s)  → … →  Nominee N (14 s)
1920×1080 · 30 fps · H.264 MP4 · 16:9 · SDR           (83 s for 5 nominees)
```

---

## 1. Install & preview

Requirements: Node ≥ 22, npm, ffmpeg (only for the audio step), Python 3 + numpy/scipy (only for the placeholder audio).

```bash
npm install
npm run dev            # opens Remotion Studio — pick CategorySequence, CategoryIntro or NomineeReveal
npm run validate       # checks src/data/awards.json (required fields, duplicate ids, over-long text)
npm run typecheck
```

In Studio, the **Props** panel on `NomineeReveal` lets you switch `categoryId` / `nomineeId` live.

**If Remotion cannot download its own browser** (locked-down machine), point it at any installed
Chrome / Chromium / headless-shell:

```bash
export REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-or-headless_shell
```

## 2. Editing nominee information  (no code changes, ever)

Everything on screen comes from **`src/data/awards.json`**.

```jsonc
{
  "id": "youth-001",                       // required, unique
  "name": "Zinzia Adhiambo",               // required — exactly as approved
  "business": "Travelvia Friends & Explorers", // required — exactly as approved
  "title": null,                           // optional — e.g. "Founder & CEO"
  "country": null,                         // optional — never inferred from a name
  "portrait": null,                        // optional — "portraits/youth-001.jpg"  (file in /public)
  "portraitFocus": null,                   // optional — CSS object-position, e.g. "50% 18%"
  "companyLogo": null,                     // optional — "logos/company/travelvia.png"
  "achievement": null                      // optional — ONE short VERIFIED statement; omit rather than invent
}
```

* A `null`/missing optional field simply **doesn't render and takes no space**; the block re-centres itself.
* Names wrap onto 2 lines (3 only for very long names) by measuring real glyph widths — type is never shrunk below ~92 px unless it must go to 3 lines (≥ 70 px).
* Adding a 6th (or 14th) nominee = adding one object to the `nominees` array. Durations are computed from the array length.

### Replacing placeholder portraits
1. Put the approved photo in `public/portraits/` (JPG/PNG, any aspect ratio; ≥ 1100 px tall recommended).
2. Set `"portrait": "portraits/youth-001.jpg"` on that nominee.
3. If the face is cropped badly, set `"portraitFocus": "50% 15%"` (x% y%).
Until a portrait is supplied, a clearly labelled **PORTRAIT PLACEHOLDER** is shown (never a fake photo).

### Adding a category (scales to 14 categories / 116 nominees)
Append an object to `categories` with a unique `id`, `number`, `name` and `nominees`.
Optional `introTitle: {"lines": ["Line one","Line two"], "suffix": "Award"}` controls the big intro title;
otherwise the name is auto-fitted. No component changes are required.

## 3. Rendering

```bash
# One category, everything (intro + one file per nominee + continuous sequence) — silent masters
node scripts/render-category.mjs youth-creative-business-concept
#   → out/youth-creative-business-concept/00-category-intro.mp4
#   → out/youth-creative-business-concept/01-youth-001.mp4 … 05-youth-005.mp4
#   → out/youth-creative-business-concept/99-category-roster.mp4   (closing list of all nominees)
#   → out/youth-creative-business-concept/category-sequence-silent.mp4

# Only some pieces
node scripts/render-category.mjs youth-creative-business-concept --only=sequence
node scripts/render-category.mjs youth-creative-business-concept --only=nominees --nominee=youth-003

# Equivalent raw Remotion CLI
npx remotion render src/index.ts NomineeReveal out/zinzia.mp4 \
  --props='{"categoryId":"youth-creative-business-concept","nomineeId":"youth-001"}'

# Review stills at specific frames (contact-sheet workflow)
node scripts/stills.mjs NomineeReveal '{"categoryId":"youth-creative-business-concept","nomineeId":"youth-001"}' 0,60,120,200,419
```

### Soundtrack (optional — the silent masters are the primary deliverable)
```bash
python3 scripts/make-placeholder-audio.py 5                 # synthesised PLACEHOLDER, no licensing issues
node scripts/mux-audio.mjs youth-creative-business-concept  # → out/<category>/with-audio/*.mp4
```
To use real audio: export a stereo 48 kHz WAV of the **whole category sequence** (same length) and pass it as the 2nd argument to `mux-audio.mjs`. Every clip is cut from that track at its sequence position, so all files stay in sync.
Cue frames (for composers): see `INTRO` and `NOM` in `src/utils/timing.ts` — e.g. name lands at nominee-frame 46, exit begins at 374.

### Changing output specs
* **Resolution / frame rate**: edit `src/data/timing.json` (`width`, `height`, `fps`). Layout constants in `src/styles/theme.ts` are in 1920×1080 px; for another 16:9 size just change the numbers, for another aspect ratio re-check `theme.layout` and `theme.safe`.
  If you change `fps`, also scale the frame counts in `src/utils/timing.ts` (they are authored at 30 fps).
* **Codec / quality**: `remotion.config.ts` (`setCodec`, `setCrf` — lower CRF = higher quality) and `scripts/render-category.mjs`.
* **Duration per nominee**: `nomineeFrames` in `timing.json` and the `NOM` stage table. The hold is the long middle section.

## 4. Architecture

```
src/
  index.ts / Root.tsx            registers compositions (durations computed from data)
  compositions/
    CategoryIntro.tsx            5 s category opener (+ IntroContent used by the sequence)
    NomineeReveal.tsx            NomineeScene (A→E, transparent) + standalone composition
    CategoryRoster.tsx           closing screen listing all nominees (1 or 2 columns, up to 14)
    CategorySequence.tsx         intro + N scenes + roster on one continuous background
  components/
    BackgroundAtmosphere.tsx     dot-matrix continent, network, inbound arcs, light, vignette
    PortraitReveal.tsx           chamfered frame, bottom-up wipe, light sweep, placeholder
    NomineeIdentity.tsx          name · rule · title · business · country
    AchievementPanel.tsx         optional Stage D
    CategoryTitle.tsx            intro typography
    Chrome.tsx                   category label + emblem (persistent furniture)
    AwardsTransition.tsx         the gold "gate line" (shared entry/exit device)
    YoraLogo.tsx / AfricanSignature.tsx
  data/   awards.json · types.ts · index.ts · timing.json · qa-fixtures.ts
  styles/ theme.ts
  utils/  timing.ts · textLayout.ts · validation.ts · fonts.ts · motion.ts · africa.ts
```

* **Deterministic**: every value is a pure function of the frame number; the only randomness is a seeded PRNG. No CSS animations, no timers.
* **Continuity**: the background lives *outside* the per-nominee `<Sequence>`s and is driven by the absolute frame; every scene ends and starts on the same state (full-width gold hairline on the calm backdrop).
* **Future winner reveal**: add `compositions/WinnerReveal.tsx` composed from the same components (BackgroundAtmosphere, Chrome, PortraitReveal, GateLine, theme) and register it in `Root.tsx`; nothing in the nominee system needs to change.

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| `Could not find a browser` / download blocked | `export REMOTION_BROWSER_EXECUTABLE=…` (see §1) |
| Text appears in the wrong font | Fonts are self-hosted in `public/fonts`; confirm those files exist. `delayRender` blocks until they load. |
| Render is slow / runs out of memory | Lower parallelism: `npx remotion render … --concurrency=1`. Rendering is CPU-bound (≈ 0.2 s/frame on 1 core). |
| "Unknown categoryId / nomineeId" | The id in `--props` doesn't match `awards.json` (`npm run validate` lists issues). |
| Portrait doesn't show | Path is relative to `/public` (no leading slash) and the file name is case-sensitive. |
| Long name looks tight | Check `npm run validate` warnings; names > 34 chars wrap to 3 lines. Use the QA compositions in Studio to preview. |
| Black flash / mismatch between clips | Always play the **category-sequence** file for continuous playback; individual files fade chrome in/out by design. |
| `node scripts/validate-data.mjs` fails to import `.ts` | Use Node ≥ 22.18, or run `node --experimental-strip-types scripts/validate-data.mjs`. |

## 6. Licences
Fonts: Fraunces and Manrope (SIL Open Font License 1.1, copies in `public/fonts`). Logo artwork: © YORA, extracted unaltered from the supplied letterhead. Placeholder audio: synthesised in-house, no third-party material. Remotion has its own licence terms for companies — review https://www.remotion.dev/license before commercial use.

# YORA Entrepreneurial Awards — Nominee Presentation System

Data-driven motion graphics built with **React + Remotion 4**. The first category
(**Youth Creative Business Concept Award**, 5 nominees) is the prototype; the system is the product.

```
Category intro (5 s)  →  Nominee 01 (5 s)  →  Nominee 02 (5 s)  → … →  Nominee N (5 s)
1920×1080 · 30 fps · H.264 MP4 · 16:9 · SDR           (38 s for 5 nominees)
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

## 2. Editing nominee information (no code changes, ever)

Everything on screen comes from **`src/data/awards.json`**.

```jsonc
{
  "id": "youth-001", // required, unique
  "name": "Zinzia Adhiambo", // required — exactly as approved
  "business": "Travelvia Friends & Explorers", // required — exactly as approved
  "title": null, // optional — e.g. "Founder & CEO"
  "country": null, // optional — never inferred from a name
  "portrait": null, // optional — "portraits/youth-001.jpg"  (file in /public)
  "portraitFocus": null, // optional — CSS object-position, e.g. "50% 18%"
  "companyLogo": null, // optional — "logos/company/travelvia.png"
  "achievement": null, // optional — ONE short VERIFIED statement; omit rather than invent
}
```

- A `null`/missing optional field simply **doesn't render and takes no space**; the block re-centres itself.
- Names wrap onto 2 lines (3 only for very long names) by measuring real glyph widths — type is never shrunk below ~92 px unless it must go to 3 lines (≥ 70 px).
- Adding a 6th (or 14th) nominee = adding one object to the `nominees` array. Durations are computed from the array length.

### The winner's screen (screen 1)

Set `winner` on a category and it renders a **winner's moment** — the category, the winner's
portrait (same reveal as the nominee scenes), brand/logo, name and year on the live background:

```jsonc
{
  "id": "youth-creative-business-concept",
  // ...
  "winner": {
    "nomineeId": "youth-001", // link to a nominee → their name/photo/logo/citation are reused
    "year": null,             // optional — falls back to the event year
    // For a winner OUTSIDE the nominee list, leave nomineeId null and fill in instead:
    "name": null, "business": null, "portrait": null, "portraitFocus": null,
    "companyLogo": null, "achievement": null
  }
}
```

No winner set → the screen is simply not renderable (it shows an on-brand notice in Studio; the
editor disables the render button). Nothing is ever invented.

### Award presentations (screen 2 — organisations & individuals, incl. special awards)

Each entry of the top-level `presentations` array renders its own **award presentation screen**
with the award title, the recipient's image, branding/logo, name, individual/organisation label
and year. Files land in `out/presentations/<id>.mp4`.

```jsonc
{
  "presentations": [
    {
      "id": "lifetime-achievement",              // required, unique, used in file names
      "award": "Lifetime Achievement Award",     // required — the award title
      "name": "…",                               // required — the individual or organisation
      "recipientType": "organisation",           // optional: "individual" | "organisation" | null
      "business": null,                          // optional — organisation / affiliation line
      "image": "recipients/lifetime-001.jpg",    // optional — file in /public/recipients
      "imageFocus": null,                        // optional — CSS object-position
      "logo": null,                              // optional — branding, "logos/company/…"
      "year": null,                              // optional — falls back to the event year
      "note": null                               // optional — ONE short VERIFIED statement
    }
  ]
}
```

### Replacing placeholder portraits

1. Put the approved photo in `public/portraits/` (JPG/PNG, any aspect ratio; ≥ 1100 px tall recommended).
2. Set `"portrait": "portraits/youth-001.jpg"` on that nominee.
3. If the face is cropped badly, set `"portraitFocus": "50% 15%"` (x% y%).
   Until a portrait is supplied, a clearly labelled **PORTRAIT PLACEHOLDER** is shown (never a fake photo).

### Adding a category (scales to 14 categories / 116 nominees)

Append an object to `categories` with a unique `id`, `number`, `name` and `nominees`.
Optional `introTitle: {"lines": ["Line one","Line two"], "suffix": "Award"}` controls the big intro title;
otherwise the name is auto-fitted. No component changes are required.

### Category intro voice-over (`introVoiceOverSeconds`)

Set `"introVoiceOverSeconds": 12` on a category when the introduction is spoken (e.g. *"…The Nominees
for the 'Youth Creative Business Concept Award' are:"* reads in ≈ 12 s). The intro then **stretches
automatically**: the revealed title holds until the VO has finished and the standard 0.8 s exit plays
afterwards, so the spoken copy always fits and the last intro frame is still the first frame of
Nominee 01. `null`/absent/`0` keeps the default 5.0 s intro. The fastest way to set it: **Category tab
→ "Voice Over — intro length (seconds)"** in the editor — it even has a *Measure from audio file…*
button that fills the field from your VO file's actual length.

**Existing soundtracks** (made before the stretch) fall behind the video: their nominee cues and
roster chimes arrive too early and the track ends early. Fix without re-cutting anything:

```bash
npm run stretch:audio -- <categoryId>     # splices the missing seconds into the master
node scripts/mux-audio.mjs <categoryId>   # then re-mix the clips from the extended track
```

No manual steps needed if you use the editor's **Full pipeline**: it now runs the extension
automatically between rendering and mixing (only when the category has a voice-over set), and
`mux-audio` refuses to mix a soundtrack that is shorter than the video (`--allow-short` overrides)
instead of silently letting the audio run out. The field is **per category** — a category with no
`introVoiceOverSeconds` keeps the standard 5.0 s intro and its original audio timing.

The splice happens at **exactly the same point the video was stretched** (the frame the title
starts leaving), so everything before it is untouched and every cue after it realigns. The gap is
filled with the track's **own ambience** — a punctuation-free window (the hum/pad, no bells/sweeps
sub hits) is detected and crossfade-looped to fill it, so the bed keeps breathing under the spoken
intro (`--fill=silence` splices a clean silent pocket instead; `--window=start:end` picks the
ambience window by hand). If the voice-over grows again later, just re-run the command — only the
shortfall is inserted. The original is copied to `out/audio/backup/` first. In the editor the same
operation is one click: **Audio tab → "Extend for voice-over"** (the tab also warns you when the
track length no longer matches the video).
For a placeholder with a *continuous* music bed through the hold, just regenerate it instead —
`make-placeholder-audio.py` bakes the stretch in.

## 3. Rendering

### The web editor (recommended for non-technical operators)

```bash
npm run editor          # → http://127.0.0.1:4173   (stop with Ctrl+C)
```

A local, zero-dependency web UI that covers the whole process end to end:

- **Nominees tab** — view every nominee as a card with their photo, add/edit/reorder/delete them
  (name, business, title, country, achievement, portrait + crop focus, company logo), pick media
  from the library or upload new files inline, and render a **preview still** of any nominee or intro.
- **Category tab** — event details plus the category name/number/id, the intro title lines, and the
  **Voice Over** length (seconds): the intro holds on the title so a spoken introduction fits, then
  plays its standard exit — see "Category intro voice-over" above. A *Measure from audio file…*
  button fills the value from your VO recording's duration.
- **Winner tab** — the screen-1 setup for the selected category: pick the winner from the nominee
  list (portrait, brand logo and citation are reused automatically) or enter a custom recipient
  with photo/logo uploads, set the year, preview a still and render `out/<id>/winner.mp4`.
- **Awards tab** — manage the screen-2 **award presentations** (organisations and individuals,
  including special awards): add/edit/reorder/delete entries with image + logo pickers and
  uploads, preview a still, render one presentation or all of them to `out/presentations/`, and
  browse the finished MP4s.
- **Media tab** — drag-and-drop upload of portraits, presentation images and company logos into
  `public/`, with usage info and safe deletion (files still referenced by a nominee, winner or
  presentation are protected; template artwork in `public/logos/` is view-only).
- **Audio tab** — upload the polished per-category soundtrack (music **+ voice-over**, stereo
  48 kHz, whole sequence — WAV/MP3/M4A/AAC/FLAC/OGG), preview it, remove it, or generate the
  placeholder. The track's length is checked against the video (including any voice-over stretch),
  and **Extend for voice-over** splices missing time in at the same point the video was stretched
  — see "Category intro voice-over" above.
- **Pipeline tab** — run the three steps (render silent clips → soundtrack → mix) with **live
  logs**, stop/queue control, and browse/open/download the finished MP4s.

The editor edits `src/data/awards.json` through the same validator as `npm run validate` (saving is
blocked while errors exist; a live issue list is shown at the top), and jobs run the very same
scripts documented below — so the CLI workflow stays fully supported.

### Scripts

```bash
# What can I render?  List the categories, then print the three filled-in steps for one of them
node scripts/list-categories.mjs                 # category ids + which artefacts already exist under out/
node scripts/category-steps.mjs <categoryId>     # 1) silent clips  2) soundtrack  3) mix audio in

# One category, everything (intro + one file per nominee + continuous sequence) — silent masters
node scripts/render-category.mjs youth-creative-business-concept
#   → out/youth-creative-business-concept/00-category-intro.mp4
#   → out/youth-creative-business-concept/01-youth-001.mp4 … 05-youth-005.mp4
#   → out/youth-creative-business-concept/99-category-roster.mp4   (closing list of all nominees)
#   → out/youth-creative-business-concept/category-sequence-silent.mp4

# Only some pieces
node scripts/render-category.mjs youth-creative-business-concept --only=sequence
node scripts/render-category.mjs youth-creative-business-concept --only=nominees --nominee=youth-003

# Screen 1 — the winner's screen (needs a winner set in the editor's Winner tab)
node scripts/render-category.mjs youth-creative-business-concept --only=winner
#   → out/youth-creative-business-concept/winner.mp4

# Screen 2 — award presentations (organisations & individuals, incl. special awards)
node scripts/render-presentation.mjs lifetime-achievement   # one → out/presentations/<id>.mp4
node scripts/render-presentation.mjs --all                 # every presentation

# Equivalent raw Remotion CLI
npx remotion render src/index.ts NomineeReveal out/zinzia.mp4 \
  --props='{"categoryId":"youth-creative-business-concept","nomineeId":"youth-001"}'

# Review stills at specific frames (contact-sheet workflow)
node scripts/stills.mjs NomineeReveal '{"categoryId":"youth-creative-business-concept","nomineeId":"youth-001"}' 0,30,60,110,149
```

### Soundtrack (optional — the silent masters are the primary deliverable)

```bash
# One master per category, sized to that category's nominee count (recommended):
python3 scripts/make-placeholder-audio.py youth-creative-business-concept  # → out/audio/youth-creative-business-concept-soundtrack.wav
node scripts/mux-audio.mjs youth-creative-business-concept  # → out/<category>/with-audio/*.mp4 (uses the per-category WAV automatically)

# Legacy: a bare nominee count still works → out/audio/placeholder-soundtrack.wav
python3 scripts/make-placeholder-audio.py 5

# Existing master behind a stretched (voice-over) intro? Splice the missing seconds in place,
# then re-mix (see "Category intro voice-over" in section 2):
npm run stretch:audio -- youth-creative-business-concept
```

`make-placeholder-audio.py` reads `src/data/timing.json`, so regenerating after any timing change keeps the audio in sync. To use real audio: export a stereo 48 kHz WAV of the **whole category sequence** (same length) and pass it as the 2nd argument to `mux-audio.mjs`. Every clip is cut from that track at its sequence position, so all files stay in sync.
Cue frames (for composers): see `INTRO` and `NOM` in `src/utils/timing.ts` — e.g. name lands at nominee-frame 26, exit begins at 108.

### Changing output specs

- **Resolution / frame rate**: edit `src/data/timing.json` (`width`, `height`, `fps`). Layout constants in `src/styles/theme.ts` are in 1920×1080 px; for another 16:9 size just change the numbers, for another aspect ratio re-check `theme.layout` and `theme.safe`.
  If you change `fps`, also scale the frame counts in `src/utils/timing.ts` (they are authored at 30 fps).
- **Codec / quality**: `remotion.config.ts` (`setCodec`, `setCrf` — lower CRF = higher quality) and `scripts/render-category.mjs`.
- **Duration per nominee**: `nomineeFrames` in `timing.json` **and** the `NOM` stage table in `src/utils/timing.ts` (the JSON sets the scene length; the table must fit inside it — `exitStart + 42 ≤ nomineeFrames`). The hold is the middle section. After changing either, regenerate the soundtrack (`make-placeholder-audio.py` mirrors both).
- **Duration per intro (voice-over)**: set `introVoiceOverSeconds` on the category (or the Voice Over field in the editor). The hold is inserted at `introExitStart` in `timing.json` (the frame the exit begins — the title must be fully revealed by then); the audio placeholder generator and `mux-audio.mjs` read the same field, so all cut points stay in sync.

# Render Summary

node scripts/render-category.mjs climate-resilient-business-strategy
python scripts/make-placeholder-audio.py 7 out/audio/climate-resilient-business-strategy.wav
node scripts/mux-audio.mjs climate-resilient-business-strategy out/audio/climate-resilient-business-strategy.wav

## 4. Architecture

```
src/
  index.ts / Root.tsx            registers compositions (durations computed from data)
  compositions/
    CategoryIntro.tsx            5 s category opener (+ IntroContent used by the sequence)
    NomineeReveal.tsx            NomineeScene (A→E, transparent) + standalone composition
    CategoryRoster.tsx           closing screen listing all nominees (1 or 2 columns, up to 14)
    CategorySequence.tsx         intro + N scenes + roster on one continuous background
    WinnerReveal.tsx             screen 1 — the winner's moment (holds on the full card)
    PresentationScreen.tsx       screen 2 — award presentations for organisations & individuals
  components/
    BackgroundAtmosphere.tsx     dot-matrix continent, network, inbound arcs, light, vignette
    PortraitReveal.tsx           chamfered frame, bottom-up wipe, light sweep, placeholder
    NomineeIdentity.tsx          name · rule · title · business · country
    WinnerIdentity.tsx           WINNER · category · name · brand/logo · year · citation
    PresentationIdentity.tsx     award title · recipient · branding · type · year · note
    AchievementPanel.tsx         optional Stage D
    CategoryTitle.tsx            intro typography
    Chrome.tsx                   category/award label + emblem (persistent furniture)
    EventFooter.tsx              discreet event name + year, bottom-left (presentation screens)
    ScreenNotice.tsx             on-brand "nothing set yet" notice (never invents content)
    AwardsTransition.tsx         the gold "gate line" (shared entry/exit device)
    YoraLogo.tsx / AfricanSignature.tsx
  data/   awards.json · types.ts · index.ts · timing.json · qa-fixtures.ts
  styles/ theme.ts
  utils/  timing.ts · textLayout.ts · validation.ts · fonts.ts · motion.ts · africa.ts
```

- **Deterministic**: every value is a pure function of the frame number; the only randomness is a seeded PRNG. No CSS animations, no timers.
- **Continuity**: the background lives _outside_ the per-nominee `<Sequence>`s and is driven by the absolute frame; every scene ends and starts on the same state (full-width gold hairline on the calm backdrop).
- **Winner reveal & award presentations**: `WinnerReveal` (screen 1) and `AwardPresentation` (screen 2) are built from the same components (BackgroundAtmosphere, Chrome, PortraitReveal, GateLine, theme) and hold on their final state so the last frame still shows the full card. Register more via the editor's Winner/Awards tabs — nothing in the nominee system needs to change.

## 5. Troubleshooting

| Symptom                                                | Fix                                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `Could not find a browser` / download blocked          | `export REMOTION_BROWSER_EXECUTABLE=…` (see §1)                                                                    |
| Text appears in the wrong font                         | Fonts are self-hosted in `public/fonts`; confirm those files exist. `delayRender` blocks until they load.          |
| Render is slow / runs out of memory                    | Lower parallelism: `npx remotion render … --concurrency=1`. Rendering is CPU-bound (≈ 0.2 s/frame on 1 core).      |
| "Unknown categoryId / nomineeId"                       | The id in `--props` doesn't match `awards.json` (`npm run validate` lists issues).                                 |
| Portrait doesn't show                                  | Path is relative to `/public` (no leading slash) and the file name is case-sensitive.                              |
| Long name looks tight                                  | Check `npm run validate` warnings; names > 34 chars wrap to 3 lines. Use the QA compositions in Studio to preview. |
| Black flash / mismatch between clips                   | Always play the **category-sequence** file for continuous playback; individual files fade chrome in/out by design. |
| `node scripts/validate-data.mjs` fails to import `.ts` | Use Node ≥ 22.18, or run `node --experimental-strip-types scripts/validate-data.mjs`.                              |

## 6. Licences

Fonts: Fraunces and Manrope (SIL Open Font License 1.1, copies in `public/fonts`). Logo artwork: © YORA, extracted unaltered from the supplied letterhead. Placeholder audio: synthesised in-house, no third-party material. Remotion has its own licence terms for companies — review https://www.remotion.dev/license before commercial use.

## Scripts

`node scripts/list-categories.mjs` lists the available categories (ids, nominee counts, artefacts
already in `out/`); `node scripts/category-steps.mjs <id>` prints the three steps below for any one
category, filled in with its own values. The hand-listed recipes:

1. Youth Creative Business Concept
   node scripts/render-category.mjs youth-creative-business-concept
   python scripts/make-placeholder-audio.py 5 out/audio/youth-creative-business-concept.wav
   node scripts/mux-audio.mjs youth-creative-business-concept out/audio/youth-creative-business-concept.wav

2. Climate-Resilient Business Strategy Award
   node scripts/render-category.mjs climate-resilient-business-strategy
   python scripts/make-placeholder-audio.py 7 out/audio/climate-resilient-business-strategy.wav
   node scripts/mux-audio.mjs climate-resilient-business-strategy out/audio/climate-resilient-business-strategy.wav

3. Promising Women Entrepreneurs Award
   node scripts/render-category.mjs promising-women-entrepreneurs
   python scripts/make-placeholder-audio.py 7 out/audio/promising-women-entrepreneurs.wav
   node scripts/mux-audio.mjs promising-women-entrepreneurs out/audio/promising-women-entrepreneurs.wav

4. Most Innovative Business Concept Award
   node scripts/render-category.mjs most-innovative-business-concept
   python scripts/make-placeholder-audio.py 7 out/audio/most-innovative-business-concept.wav
   node scripts/mux-audio.mjs most-innovative-business-concept out/audio/most-innovative-business-concept.wav

5. Business Impact in Africa Award
   node scripts/render-category.mjs business-impact-in-africa
   python scripts/make-placeholder-audio.py 7 out/audio/business-impact-in-africa.wav
   node scripts/mux-audio.mjs business-impact-in-africa out/audio/business-impact-in-africa.wav

6. Social Entrepreneurship Excellence Award
   node scripts/render-category.mjs social-entrepreneurship-excellence
   python scripts/make-placeholder-audio.py 8 out/audio/social-entrepreneurship-excellence.wav
   node scripts/mux-audio.mjs social-entrepreneurship-excellence out/audio/social-entrepreneurship-excellence.wav

7. Community Leadership Award
   node scripts/render-category.mjs community-leadership
   python scripts/make-placeholder-audio.py 7 out/audio/community-leadership.wav
   node scripts/mux-audio.mjs community-leadership out/audio/community-leadership.wav

8. Technology Innovation Award
   node scripts/render-category.mjs technology-innovation
   python scripts/make-placeholder-audio.py 6 out/audio/technology-innovation.wav
   node scripts/mux-audio.mjs technology-innovation out/audio/technology-innovation.wav

9. Sustainable Development Excellence Award
   node scripts/render-category.mjs sustainable-development-excellence
   python scripts/make-placeholder-audio.py 7 out/audio/sustainable-development-excellence.wav
   node scripts/mux-audio.mjs sustainable-development-excellence out/audio/sustainable-development-excellence.wav

10. Diaspora Media Excellence Award
    node scripts/render-category.mjs diaspora-media-excellence
    python scripts/make-placeholder-audio.py 8 out/audio/diaspora-media-excellence.wav
    node scripts/mux-audio.mjs diaspora-media-excellence out/audio/diaspora-media-excellence.wav

11. Startup of the Year Award
    node scripts/render-category.mjs startup-of-the-year
    python scripts/make-placeholder-audio.py 13 out/audio/startup-of-the-year.wav
    node scripts/mux-audio.mjs startup-of-the-year out/audio/startup-of-the-year.wav

12. Film and Performing Arts Excellence Award
    node scripts/render-category.mjs film-and-performing-arts-excellence
    python scripts/make-placeholder-audio.py 13 out/audio/film-and-performing-arts-excellence.wav
    node scripts/mux-audio.mjs film-and-performing-arts-excellence out/audio/film-and-performing-arts-excellence.wav

13. Entrepreneur of the Year
    node scripts/render-category.mjs entrepreneur-of-the-year
    python scripts/make-placeholder-audio.py 14 out/audio/entrepreneur-of-the-year.wav
    node scripts/mux-audio.mjs entrepreneur-of-the-year out/audio/entrepreneur-of-the-year.wav

14. Lifetime Achievement Award
    node scripts/render-category.mjs lifetime-achievement
    python scripts/make-placeholder-audio.py 7 out/audio/lifetime-achievement.wav
    node scripts/mux-audio.mjs lifetime-achievement out/audio/lifetime-achievement.wav

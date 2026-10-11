# Quality Assurance Report — Prototype (Youth Creative Business Concept Award)

Run on the rendered files with `scripts/qa-check.py` plus manual visual review.

## Results
| Check | Method | Result |
|---|---|---|
| Container/stream | ffprobe: H.264 High, 1920×1080, 30 fps, **yuv420p, limited range, BT.709 tagged**, 2490 frames = 83.000 s (intro 150 + 5×420 + roster 240) | PASS |
| Individual clips | intro 150 f/5.0 s; each nominee 420 f/14.0 s | PASS |
| Black / blank frames | per-frame mean luma over all 2250 frames (min 10.9) | PASS — none |
| Hard cuts at scene boundaries | frame-to-frame Δ at intro→N1…N4→N5: 0.29, 0.27, 0.11, 0.04, 0.04, 0.11 incl. nominee 5→roster (overall median 0.08; largest anywhere 4.3, inside intentional motion) | PASS — seamless |
| Data accuracy | OCR of a full-resolution mid-hold frame of every nominee vs `awards.json` (names + businesses) | PASS 5/5 |
| Audio sync | Audio cut from one master at each clip's sequence position; durations match video exactly (83.000 s) | PASS (placeholder audio) |
| Roster screen | OCR of roster frame lists all 5 nominees; QA stress composition with 14 nominees incl. very long names fits in two columns | PASS |
| Data-driven | Names/business only from `awards.json`; `npm run validate` clean; nominee count derived from array | PASS |
| Optional fields | Stress compositions: title+country+achievement+real image path; 3-line long name (41 chars) + 2-line long business | PASS — layout stayed within the portrait height; missing fields leave no gap |
| Safe margins | Content ≥ 112 px horizontally, ≥ 58 px vertically (emblem), text ≥ 78 px | PASS by construction (not LED-tested) |
| Typesetting | Names 92–136 px, business 42–56 px, labels ≥ 28 px, ivory on obsidian ≈ 16:1 | PASS by measurement |

## Defects found and fixed during QA
1. **Portrait panel visible before reveal / after exit** (broke the "last frame = next first frame" rule) — background moved inside the wipe clip. Verified frames 0 and 419 are now identical base states.
2. **Continent too dim/cropped to read as Africa** at the settled state — raised dot/line opacity, reduced text scrim.
3. **Video tagged `yuvj420p` (full range)** — risk of crushed/washed blacks on media servers/LED processors. Switched to `--color-space=bt709` → `yuv420p` TV range; everything re-rendered.
4. Early background render was killed by the sandbox; re-run to completion (no output affected).

## Outstanding limitations (honest list)
* **Not tested on the venue LED wall or playback system.** Native resolution, aspect ratio, processor cropping, and codec/container acceptance are unconfirmed.
* **No real portraits supplied** — clearly labelled placeholders are shown (a real-image code path was verified with an abstract QA image only; real faces/crops untested). Portrait crops for real photos may need `portraitFocus` tuning.
* **Logo:** derived from a ~190 px-wide raster in the letterhead (3× upscaled). Fine at the sizes used (emblem ≈ 70 px wide; lock-up plate ≈ 290 px) but not suitable for larger use. Official vector artwork + reversed lock-up recommended.
* **Audio is a synthesised placeholder** (loudness normalised to −18 LUFS, true peak ≤ −1.5 dBFS). It has not been critically mixed or reviewed against room acoustics.
* **Country, title, achievement, company logos** unsupplied → not shown (by design).
* Only one category exists; 14-category/116-nominee scale is supported architecturally (data-driven, computed durations) but not render-tested at that volume. Render cost is ≈ 0.2 s/frame on one CPU core (~19 min for this category's full set of files).
* Fonts are OFL; Remotion itself has company-licensing terms to review before commercial use.
* Creative approval is still pending: a clean render is not creative sign-off (Rule 10).

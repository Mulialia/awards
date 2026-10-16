# Storyboard (frames taken from the final MP4 — see `storyboard.png`)

30 fps. Frame numbers are local to each piece. Cue frames are authoritative in `src/utils/timing.ts`.

## Category introduction — 5.0 s (150 f)
| Time | Frames | Movement |
|---|---|---|
| 0.0–0.8 s | 0–24 | Obsidian + warm lamp glow. A gold hairline draws outward from centre to full width. |
| 0.3–1.2 s | 10–36 | YORA lock-up fades/scales up on an ivory plate, hairline passing behind it. Scattered gold points begin to fly in. |
| 1.9–2.6 s | 58–78 | Plate dissolves. Points complete converging into the dot-matrix continent; hubs and links draw themselves. |
| 1.9–2.9 s | 58–86 | Hairline rises and shortens into a title rule. |
| 2.5–3.1 s | 74–92 | Eyebrow "CATEGORY 01" slides in. |
| 2.7–3.9 s | 80–116 | "Youth Creative" then "Business Concept" rise from masks with a short de-blur (10-frame stagger). |
| 3.7–4.4 s | 112–132 | "AWARD" + red·gold·green signature tick slide in. |
| 4.2–5.0 s | 126–150 | Title lifts and fades; the hairline returns to full width at mid-screen; category label + emblem fade in. **Last frame = first frame of Nominee 01.** |

Optional voice-over hold: when the category sets `introVoiceOverSeconds` (Category tab → "Voice Over"
in the editor), the fully-revealed title holds from frame 126 until the VO has finished, then the
standard 24-frame exit plays — intro length = 150 f + max(0, ceil(voSeconds × fps) − 126).

## Nominee presentation — 5.0 s (150 f), identical timing for every nominee
| Time | Frames | Stage | Movement |
|---|---|---|---|
| 0.0–0.3 s | 0–10 | open | Inherited hairline collapses to centre. |
| 0.1–0.7 s | 3–22 | **A** | Chamfered gold frame (and offset echo frame) draws itself. |
| 0.3–1.3 s | 10–40 | **A** | Portrait revealed bottom-to-top behind a gold leading edge; push-in settles. |
| 0.6–1.1 s | 18–32 | | Eyebrow "NOMINEE 01 / 05" draws in. |
| 0.9–1.7 s | 26–52 | **B** | Name rises line-by-line from masks with de-blur. Single light sweep crosses the portrait (1.0–1.7 s). |
| 1.7–2.3 s | 52–68 | | Gold rule draws under the name. |
| 1.9–2.7 s | 56–71 | **C** | Title (if any) · business · country (if any), staggered. |
| 2.8–3.3 s | 84–100 | **D** | *Optional* achievement panel. Absent → nothing renders, no gap. |
| 2.4–3.6 s | 71–108 | hold | Fully readable name/business; slow 3.5 % portrait push-in and live network pulses behind. |
| 3.6–5.0 s | 108–150 | **E** | Business → name → rule/eyebrow exit left with fade (5-frame stagger); portrait closes top-down; frame retracts; hairline redraws to full width. **Last frame = first frame of the next nominee.** |

## Closing roster — 8.0 s (240 f)
| Time | Frames | Movement |
|---|---|---|
| 0.0–0.7 s | 0–22 | Inherited hairline collapses to centre. |
| 0.3–1.3 s | 8–40 | "THE NOMINEES" eyebrow and the category title (same line breaks as the intro) rise into the left rail. |
| 1.1–3.7 s | 34–100 | Nominee rows rise in presentation order (8-frame stagger): number · name · business, each over a gold hairline that draws across. |
| 3.7–8.0 s | 100–240 | Hold with every row (and the heading) fully visible through the end — **last frame = the complete nominee list** (no exit, hairline stays collapsed). |
Layout adapts to the data: ≤ 6 nominees → one large column; 7–14 → two columns with measured type sizes (long text ellipsised only as a last resort).

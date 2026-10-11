# YORA Entrepreneurial Awards — Creative Direction (v1.0, prototype category)

## 1. The idea in one sentence
**A continent assembles itself from scattered ideas — then each entrepreneur steps forward as a node in that network.**

The motion identity answers the brief's central question — *does the animation make an entrepreneur feel like a
significant contributor to Africa's future, or merely make their name look attractive on a screen?* — by never
showing a nominee in isolation. Behind every portrait a dot-matrix Africa is already connected, pulsing and
receiving knowledge and capital from beyond its edges. The person is the hero in the foreground; the continent is
the context that gives their work meaning.

## 2. How it expresses African Renaissance (without clichés)
| Brief principle | On-screen expression |
|---|---|
| Ideas becoming enterprises | Opening: hundreds of scattered gold points converge from beyond the frame and *form* the continent. |
| Lines connecting points across a stylised map | A 16-hub network draws itself across the dot-matrix continent; light pulses travel the links. |
| Diaspora returning knowledge, skills, networks | Seven gold arcs enter from beyond the continent's edges and land on hubs, pulsing continuously. |
| Individual ambition → collective advancement | Individuals are framed as the hero of each scene, but the network persists and keeps moving *between* nominees — one continuous world. |
| Architecture / geometric forms | Chamfered portrait frame with an offset echo frame; a faint 12-column architectural grid; single-axis gold "gate line". |
| Contemporary, not decorative | Almost no ornament. Red and green appear **only** as a 3-segment tick (the wordmark's palette), never as fills or patterns. |

**Deliberately absent:** safari, animals, masks, fabric prints, flags, tribal patterns, generic gold-dust particles.
The dots are *information* (a continent made of points), not glitter.

## 3. YORA brand use
* The unicorn and wordmark are the **original pixels** from the supplied letterhead — colour-to-alpha cut-outs (3× Lanczos), never redrawn, recoloured or re-proportioned. The red divider and white page were removed as layout artefacts.
* **Opening:** the full *YORA Awards* lock-up appears once, on an ivory plate (its black/navy lettering needs a light ground, and altering it is not permitted).
* **Throughout:** the gold unicorn emblem sits quietly top-right (≈ 104 px high) and never competes with the nominee.
* The *YORA Summit | EXPO | Awards* wordmark is prepared (`public/logos/yora-summit-wordmark.png`) for the future winner/closing sequences.
* **Recommendation:** request the official vector logo and a light-on-dark ("reversed") lock-up so the opening can drop the plate.

## 4. Colour
| Role | Value | Notes |
|---|---|---|
| Obsidian (ground) | `#07070A` | Cinematic depth; vignette + warm lamp glow behind portrait |
| Gold (signature) | `#EEB92B` (+ `#F8DA7A` highlight, `#B8860B` shadow) | Sampled from the unicorn; the dominant accent |
| Ivory (type) | `#F6F0E2` | Warm white; ≥ 15:1 contrast on obsidian |
| Red / Green | `#AA0909` / `#04743C` | Sampled from the "O" and "A"; used only in the signature tick |

## 5. Typography
* **Names — Fraunces (SemiBold, 620):** a warm, high-contrast serif with sturdy strokes — dignified, editorial, and thick enough to survive an LED wall (no hairlines). 92–136 px.
* **Everything else — Manrope (600–800):** a geometric sans for labels, business, category. Business 42–56 px; labels ≥ 28 px.
* Both are SIL OFL, self-hosted. Text is composed by measuring real glyph widths and wrapping on word boundaries — never "shrink until it fits".

## 6. Motion language
* **One device — the gate line.** A single gold hairline is the *last* thing on screen at the end of every scene and the *first* in the next. It travels, shortens into a title rule, redraws full-width. This is the brand's transition; it is never replaced per nominee.
* **Reveals are masks, not fades:** names rise from behind a mask with a short de-blur; portraits are revealed bottom-to-top behind a gold leading edge, with a restrained push-in and **one** light sweep.
* **Easing:** a single soft-deceleration curve (cubic-bezier 0.22, 1, 0.36, 1) for entrances; symmetric ease for travelling lines; accelerating ease for exits.
* **Pacing for a live room:** name readable from ~2.7 s and held to 12.5 s (≈ 10 s). No bounces, spins or letter-scrambles.

## 7. Visual hierarchy (reading order)
1. **Portrait** (left, 560 × 740, chamfered gold frame) — the person.
2. **Name** (Fraunces 92–136 px, ivory) — the largest type on screen.
3. **Business** (Manrope 42–56 px, ivory) beneath a short gold rule.
4. Optional title / country / achievement — only when supplied, smaller and dimmer.
5. Context: category label and emblem (small, top), continent (dim, behind).
The layout is asymmetric — image left, type right, generous negative space — and the right-hand block is
vertically centred on the portrait so absent optional fields never leave a hole.

## 8. Category-specific accent ("ideas taking shape")
The Youth Creative Business Concept intro foregrounds the **convergence** — scattered points flying in from
every direction and snapping into the continent — which reads as ideas becoming structure. Other categories reuse the
same intro component; a future per-category accent can be added through `introTitle` and a themed variant of the
convergence (e.g. hubs lighting in sector-specific order) without redesign.

## 9. Open creative decisions (recommendations)
1. **Official logo files** (vector + reversed) — recommended; removes the ivory plate.
2. **Portrait photography spec** — recommend a consistent 4:5 or 3:4 head-and-shoulders crop, ≥ 1100 px tall, neutral background. The frame accepts any ratio via `object-fit: cover`.
3. **Country / title / achievement** — leave off until verified; the layout is designed to look complete without them.
4. **Soundtrack** — the supplied audio is a synthesised placeholder; commission a short original sting + bed using the cue table in README §3.
5. **LED wall** — confirm native resolution, aspect ratio and processor cropping before finalising safe areas (current safe margins: 112 px horizontal / 70 px vertical).

# JumpBeam: Prism Quest — Visual System

## Research boundary

The supplied Danny Go table is treated as a creative brief, not verified
analytics. Direct YouTube searches on July 22, 2026 returned unavailable items
for several exact titles, while public results still confirmed the broader
lava/quicksand, flamingo/adventure, and dance-along format families.

JumpBeam therefore learns from interaction patterns, not protected characters,
costumes, logos, thumbnails, music, or scene compositions.

## Reusable format grammar

| Format signal | Why it reads quickly | Original JumpBeam translation |
| --- | --- | --- |
| Lava / danger floor | One dominant hazard color makes the rule visible without text | Coral lava cracks, violet safe stones, large triangle cue |
| Drum-along | Circular targets and repeated pulses communicate rhythm | Toy-like beat orbs with sunny-yellow rings |
| Freeze / balance | A single pose silhouette is easier to copy than a paragraph | Full-body AR mirror with one compact phase cue |
| Fantasy adventure | A destination and threat give movement a reason | Friendly volcano, prism quest, energy tower |
| Magnet STEM | Opposed colors and arcs visualize an invisible force | Cyan attraction arcs and violet polarity energy |
| Mystery reveal | Closed boxes create anticipation before the reward | Floating original mystery crates and prism collectibles |

## Brand direction

- **World:** a toy-like fantasy science island, exciting but never frightening.
- **Core motif:** collectible prism energy.
- **Shape language:** rounded, chunky, large silhouettes; no thin details needed
  for comprehension.
- **Camera priority:** central 55% of the frame remains low-detail so the child
  stays readable.
- **HUD priority:** score/time are read-only at the top; instructional cue is
  centered and never competes with the body.

## Palette

| Token | Hex | Role |
| --- | --- | --- |
| Deep Space | `#12142F` | Contrast field and camera vignette |
| Prism Violet | `#7157FF` | Brand, magic, mystery |
| Lava Coral | `#FF5D73` | Hazard and urgent movement |
| Energy Aqua | `#59F0D0` | Safe state, STEM energy |
| Beat Yellow | `#FFD166` | Rhythm and rewards |

## 60-second visual pacing

1. **0–15s — Prism Pop:** reach wide; violet and aqua collectibles.
2. **15–30s — Beat Smash:** circular drum targets; yellow accent.
3. **30–45s — Magnet Move:** cyan energy and push/pull cue.
4. **45–60s — Lava Leap:** coral danger accent and faster visual urgency.

Each transition is under 0.6 seconds and does not stop play. The child spends
the entire round moving; there are no blocking tutorials.

## AR layering

1. Mirrored phone camera.
2. Dark edge tint to improve contrast.
3. Original illustrated world frame.
4. Body-following JumpBeam energy hero.
5. Interactive orbs.
6. HUD and phase cue.

Video remains a peer-to-peer WebRTC stream. Pose detection stays on the phone,
and only the normalized control landmarks travel over the data channel.

## Performance budget

- Main world frame: WebP, 1600×900, approximately 125 KB.
- No frame-by-frame sprite animation in the MVP.
- Motion uses transform/opacity where practical.
- `prefers-reduced-motion` disables nonessential cue and hero animation.
- The camera remains the dominant visual; decorative art is a single composited
  layer.

## Next art pack

- Four transparent foreground prop sheets: lava, drums, magnets, mystery crates.
- Two original mascot silhouettes with pose-following accessories.
- Hit burst sprites and a six-frame prism reward animation.
- Audio kit mapped to the same four phases.

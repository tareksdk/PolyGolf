# PolyGolf camera · v1.4

The default camera keeps the player's chosen bearing while following an interpolated ball. A critically damped spring follows a velocity-filtered, slightly predictive target; separate springs control orbit, distance, elevation and field of view. Speed and clearance above the ground widen the view gradually. Portrait screens get extra framing room.

Cinematic Mode is optional and off by default. Enable it in Settings → Camera or with the camera button during play. It selects chase, airborne, wide and brief finish views. A shot must hold for at least 1.25 seconds before changing perspective; small landing bounces do not repeatedly change the view. Reduced Motion keeps the default camera.

- Right-drag / Control-drag, Q/E and scrolling retain manual control. Automatic directing yields for 2.6 seconds after the last input.
- F or Recenter returns to the default view for the current shot.
- Escape or Skip camera exits an active cinematic sequence. Escape otherwise keeps its existing pause/resume behavior.
- Preferences use the existing save system, including isolated localhost saves.

`dist/src/camera-rig.js` owns framing and transitions. `dist/src/camera-clearance.js` samples the rendered terrain and uses a cached spatial index of solid prop bounds. It lifts over low walls, shortens the camera distance around tall solids, and eases back after an obstruction clears. Existing tree occlusion remains responsible for revealing the ball through foliage. Conservative bounds ignore props enclosing the subject, preserving open arches and gazebos; this is not a triangle-perfect collision engine.

`World` exposes shot/manual/reset/skip hooks. `GameManager` invokes them without changing physics, scoring or shot timing. New holes may cut to the tee; respawns preserve the current camera anchor and recover smoothly. Presentation holds (swing, water and pirate effects) retain priority until the player takes control.

Run `npm test` for behavioral/regression checks and `npm run check` for module syntax, imports and shipped-page validation. The project serves `dist/` directly and has no separate build command. Camera tests cover frame-rate independence, moving-target framing, cinematic dwell, manual takeover, reset rotation, finish skipping, settings persistence and solid/terrain clearance.

## Local verification (October 22, 2026)

- Full suite: 262 passed, one pre-existing skipped test, zero failures. `npm run check`: 158 modules and seven pages passed. `git diff --check`: clean.
- Real browser keyboard drive in default mode: ball stayed in frame in 242 sampled moving frames. Cinematic full-power drive exercised chase, airborne/wide selection and landing. Scripted launches used the unchanged physics API; finish and water cases began from explicitly positioned QA fixtures.
- After correcting close-wall framing and excluding the ramp's enclosing box from solids: actual ball stayed in frame for all 257 jump-course frames, 188 rapid-bounce frames and 286 full-drive frames sampled. These are individual local runs, not a guarantee for every possible custom course.
- Exercised Afterglow City hole 6 (boost, two jumps, bounce, stop), hole 2 (13 rapid bounces, jump, stop), right-drag, scroll, Q/E, F recenter, Escape skip/pause/resume, reset, water return, hole finish and immediate finish skip. Scoring and stroke counts remained consistent.
- Inspected desktop, 390×844 phone, 907×510 embedded and 844×390 landscape layouts. Settings survive reload. The new toolbar remains reachable while the moving-ball HUD fades; the existing narrow Club & shot selector still clips in some narrow layouts.
- Browser screenshots and local QA helpers are in `output/playwright/` (ignored, outside shipped game files). Browser instrumentation was injected by request interception only; no debug globals were added to shipped modules. No push or deployment.

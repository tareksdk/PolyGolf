# PolyGolf v1.4 — local volcanic update

Open [the running local preview](http://127.0.0.1:5184/). Choose **Play → Blitz Courses → Cinder Crown**.

This is on the local branch `codex/volcanic-map-local`, in a separate working folder based on GitHub main `59ebcfb`. Nothing was pushed or deployed. The original Desktop checkout and its pre-existing untracked files were left alone.

## What changed

**Cinder Crown** is the new Map of the Day: three original holes, par 12, inspired by the four supplied volcanic golf drafts. The fifth reference informed only the broad lava-fort atmosphere. No Minecraft textures or models were copied.

| Hole | Par | Length | Character |
| --- | --- | --- | --- |
| The Cinder Cut | 4 | 332 m | Rolling ash fairway, a lava crossing and a raised approach |
| Furnace Island | 3 | 168 m | Elevated tee and a broad molten moat around the green |
| The Crown Foundry | 5 | 496 m | Long dogleg, two lava crossings and an uphill furnace-side finish |

Grey striped fairways, gold bunkers, basalt shelves and sulphur crystals follow the draft palette. Eruptions throw cinders beneath low-poly smoke; lava flows and crystal glints animate. A small clubhouse, bench and oversized kettle add comic details. A ruined furnace and lavafall sit beside the last green. Normal, night and rainy weather work with the new course.

Lava has a real one-stroke hazard penalty, an animated molten impact and a short raised camera view. The rendered channels and the physics use the same outlines. Rocks, crystals and particle effects share bounded instance batches; the lava shader is limited to river geometry instead of the entire hidden course plane. Reduced-motion and particle settings are respected.

The scrolling course browser now has numbered, coloured dividers:

1. **Full Courses:** the three nine-hole courses.
2. **Blitz Courses:** the three classic three-hole courses and Cinder Crown.
3. **Other Maps:** monthly and seasonal maps, followed by **Maps of the Week**.

The former daily map, Tomorrow Gardens Sprint on 21 October, now sits in Maps of the Week. Existing map IDs and old score records are retained; the weekly sprint uses a new weekly record key. There were no leaderboard database writes.

The gold **Community Maps** button opens a separate page. The local preview reads real published public maps and plays them locally. Likes, publishing and other account writes remain unavailable in local preview.

## Checked

- **Automated:** 237 tests passed, zero failed; one existing gift-code test was skipped because its optional test secret was not supplied. The final rendering-only adjustment also passed all seven focused volcanic tests.
- **Static:** 153 JavaScript modules passed syntax/import checks; all seven pages link to existing local files. `git diff --check` passed.
- **Complete physics replay:** all three holes reached the cup and verified with the existing replay verifier. The solver used 2, 1 and 3 shots respectively. These are assisted test shots, not a claim about normal player scores.
- **Browser playthrough:** ran those shots through the real browser game and used the normal Next hole and View scorecard buttons; verified the three-hole par-12 scorecard and Play again transition.
- **Normal controls:** took unassisted keyboard shots; the phone-width shot cleared the first lava cut and finished on the fairway, 129.8 m from the flag. Club switching, pause/resume and reset with one penalty worked.
- **Hazards and visuals:** inspected the molten impact, penalty and return to the tee, all three layouts, plus normal/night/rain views. A test-only pause held one real impact frame for inspection.
- **Responsive review:** inspected the browser at 1280×720, phone portrait at 390×844 and gameplay landscape at 844×390. The map browser and community page had no horizontal overflow. The club picker uses its full panel width and no longer overlaps the shot meter in portrait.
- **Community:** eight real public golf maps loaded; opened Pinecliff Hole 2 as a local practice round and returned to the list. No public content or accounts were changed.
- **Runtime:** no warnings or errors were recorded in the tested browser flows.
- **Performance:** the final ordinary browser sample at 1280×720 measured 16.7 ms median / 17.7 ms p95 with 92 draw calls at the tee. A 390×844 sample after a shot measured the same timing with 68 draw calls. Earlier separate QA-tab samples were much more variable while the Mac was heavily loaded, so these observations do not establish performance on other devices. The wider overview used roughly 143,000 triangles before the final small perimeter detail.

## Limits and evidence

This release is local only. Online scoring for the new course has not been deployed or tested against production; a future live release needs the matching backend/catalogue review. Phone checks used resized desktop-browser viewports, not a physical phone.

Screenshots, replay solutions and test logs are in the local `artifacts/` folder, which is ignored by Git. The temporary QA server was stopped; only the normal preview on port 5184 is left running.

## Files changed

- [dist/src/volcanic-layouts.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/volcanic-layouts.js) — New Cinder Crown definition, three original layouts, shared lava boundaries and terrain cuts.
- [dist/src/volcanic-render.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/volcanic-render.js) — New procedural basalt, crystals, volcanoes, animated lava, smoke, cinders, clubhouse, kettle and furnace. Bounded instance batches and river-only lava geometry.
- [dist/src/golf-courses.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/golf-courses.js) — Registers course 18 and connects its terrain and lava penalties; retains existing course IDs and rules version.
- [dist/src/landscape.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/landscape.js) — Builds the volcanic scenery and uses a wider camera field of view on this course.
- [dist/src/world.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/world.js) — Updates and clears volcanic effects; lifts the camera above the cliff during a lava impact.
- [dist/src/turf.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/turf.js) — Uses the course-specific gold bunker colours and subtle ash variation.
- [dist/src/weather-config.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/weather-config.js) — Adds the warm normal-weather volcanic palette; existing night and rain modes remain available.
- [dist/src/water-effects.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/water-effects.js) — Adds contrasting molten splash colours, reuses the particle pool and refreshes materials when returning to ordinary water.
- [dist/src/game.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/game.js) — Sets a slightly wider tee camera for the new course.
- [dist/src/main.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/main.js) — Labels molten-water penalties as Lava hazard.
- [dist/src/rotating-courses.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/rotating-courses.js) — Makes Cinder Crown the daily feature and moves the former daily sprint into the weekly selection with a separate record key.
- [dist/src/course-menu.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/course-menu.js) — Orders Full Courses, Blitz Courses and Other Maps; adds Maps of the Week and the prominent Community Maps link.
- [dist/course-browser.css](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/course-browser.css) — New shelf dividers, daily-card treatment, community button and responsive scrolling layout.
- [dist/index.html](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/index.html) — Loads the new course-browser stylesheet.
- [dist/src/course-previews.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/course-previews.js) — Refreshes the preview cache so the new scenery is shown.
- [dist/src/community.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/community.js) — Adds the Official courses return button and explains local community play; disables account-only reactions locally.
- [dist/src/cloud.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/cloud.js) — Allows only public community-map reads in local preview.
- [server.mjs](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/server.mjs) — Adds a fixed, read-only public-map route for the local server; no account tokens or write actions are forwarded.
- [dist/opening.css](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/opening.css) — Fixes the cramped club selector and panel overlap on narrow screens.
- [dist/src/version.js](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/src/version.js) — Displays v1.4.
- [package.json](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/package.json) — Updates package version to 1.4.0.
- [dist/release.json](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/dist/release.json) — Records v1.4, the new daily map and the shelf names.
- [tests/volcanic-course.test.mjs](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/tests/volcanic-course.test.mjs) — New coverage for lava physics, safe endpoints, rotations, menu ordering, bounded animation, cleanup and read-only community access.
- [tests/adventures-restored.test.mjs](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/tests/adventures-restored.test.mjs) — Updates catalogue and menu expectations for the added course.
- [tests/golf-playthrough.mjs](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/tests/golf-playthrough.mjs) — Allows the existing full-round verifier to target an explicitly selected course, including course 18.
- [LOCAL-VOLCANO-1.4-REPORT.md](/Users/jacobaleo/.codex/projects/polygolf-volcanic-1-4/LOCAL-VOLCANO-1.4-REPORT.md) — This report and file inventory.

No tracked files were deleted or renamed. Temporary QA scripts, screenshots and logs are grouped under `artifacts/` and are not shipped in `dist/`.

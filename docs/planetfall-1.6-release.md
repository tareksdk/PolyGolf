# Planetfall release 1.6

Planetfall is the Hole of the Day (course 19). Cinder Crown remains intact with three holes and is now the Hole of the Week (course 18). All existing course IDs stay unchanged.

Planetfall is one continuous, par-free iron challenge from Neptune through all eight planets to the final cup on the Sun. Gaps grow and safe landing caps tighten. Three missed landings or asteroid impacts end a run; safe landings are checkpoints. The moving asteroid belt is between Jupiter and Mars. The farthest-planet board stores the best 50 launches on the current device/browser; it is explicitly labeled local and awards no cloud coins or ranked results.

This release builds on current production main 78d8454, preserving v1.5 lava courses, menus, auctions, item stacks, trade-ups and Darby. Unfinished Desktop camera work and source-asset/sync files are excluded.

## Verification

- `npm run check`: 156 modules pass syntax/import checks; all seven pages link to existing files.
- `npm test`: 255 tests, 254 pass, zero failures, one optional gift-code test skipped because its environment secret is absent.
- Real browser: keyboard power/direction input and a missed landing; all eight landings and a final putt through the real game/physics loop; Sun result and device board; pause/resume, restart and three-chance loss.
- Visual captures: 1440×960 desktop, 390×844 phone and 907×510 embedded viewport; course selection and Cinder Crown regression.
- Backend: 44 relative source dependencies packaged; deployed baseline compared with repository main before updating; little-links function active version 39, CrazyGames function left at version 7. No database migration required.
- Production files are static `dist/`; both existing Netlify sites receive this same tested snapshot. Final deployment IDs and HTTP/hash checks are recorded separately after publishing.

## Changed files

- [backend/index.ts](../backend/index.ts) — Keep Planetfall out of conventional par/reward rounds; sync shared weekly rotation.
- [dist/index.html](../dist/index.html) — Load Planetfall styling.
- [dist/release.json](../dist/release.json) — Publish synchronized v1.6 release and feature metadata.
- [dist/src/club-distances.js](../dist/src/club-distances.js) — Recommend irons for planet landings and putter on the Sun.
- [dist/src/course-menu.js](../dist/src/course-menu.js) — Feature Planetfall first and move Cinder Crown to the weekly shelf.
- [dist/src/course-weather.js](../dist/src/course-weather.js) — Keep space clear of terrestrial weather.
- [dist/src/expansion.js](../dist/src/expansion.js) — Use Planetfall’s own board rather than par-based rankings and multiplayer.
- [dist/src/full-shot-guide.js](../dist/src/full-shot-guide.js) — Make space shot guides visible and account for the moving belt.
- [dist/src/game.js](../dist/src/game.js) — Handle planet targets, unlimited strokes, three chances and iron controls.
- [dist/src/golf-courses.js](../dist/src/golf-courses.js) — Add stable course 19 without renumbering courses 0–18.
- [dist/src/golf-physics.js](../dist/src/golf-physics.js) — Use real cap landings, void misses and moving asteroid collisions.
- [dist/src/main.js](../dist/src/main.js) — Install Planetfall integration.
- [dist/src/rotating-courses.js](../dist/src/rotating-courses.js) — Planetfall daily identity; separate Cinder Crown weekly records.
- [dist/src/shot-preview.js](../dist/src/shot-preview.js) — Include current belt time and secured planet in predictions.
- [dist/src/version.js](../dist/src/version.js) — Display v1.6.
- [dist/src/world.js](../dist/src/world.js) — Load the space world and camera without importing the unfinished camera overhaul.
- [package.json](../package.json) — Set matching package version 1.6.0.
- [tests/adventures-restored.test.mjs](../tests/adventures-restored.test.mjs) — Update regression coverage for the live daily and weekly courses while retaining existing gameplay checks.
- [tests/atmosphere-sand.test.mjs](../tests/atmosphere-sand.test.mjs) — Update regression coverage for the live daily and weekly courses while retaining existing gameplay checks.
- [tests/backend.test.mjs](../tests/backend.test.mjs) — Update regression coverage for the live daily and weekly courses while retaining existing gameplay checks.
- [tests/expansion.test.mjs](../tests/expansion.test.mjs) — Update regression coverage for the live daily and weekly courses while retaining existing gameplay checks.
- [tests/volcanic-course.test.mjs](../tests/volcanic-course.test.mjs) — Update regression coverage for the live daily and weekly courses while retaining existing gameplay checks.
- [dist/assets/planetfall-card.svg](../dist/assets/planetfall-card.svg) — New local course artwork.
- [dist/planetfall.css](../dist/planetfall.css) — Responsive space HUD, route, board and course card styling.
- [dist/src/planetfall.js](../dist/src/planetfall.js) — Eight planets, expanding gaps, belt collisions and device records.
- [dist/src/planetfall-render.js](../dist/src/planetfall-render.js) — Faceted planets, rings, Sun, stars, comets, belt and space camera.
- [dist/src/planetfall-ui.js](../dist/src/planetfall-ui.js) — Public launch, rules, progress, pause, result and device board.
- [tests/planetfall.test.mjs](../tests/planetfall.test.mjs) — Update regression coverage for the live daily and weekly courses while retaining existing gameplay checks.
- `docs/planetfall-1.6-release.md` — This release scope, inventory and verification record.

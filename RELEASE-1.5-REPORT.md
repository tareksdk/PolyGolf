# PolyGolf v1.5 — Cinder Crown publication and shot-meter checks

Release date: October 22, 2026. The user authorized GitHub main and both production domains after checking the shot meters.

## Visible changes

Includes the locally reviewed v1.4 Cinder Crown map and scrolling course browser. Cinder Crown is a three-hole, par-12 Map of the Day with volcanic terrain, flowing lava, eruptions, sulphur crystals and comic scenery. The full implementation inventory and playthrough evidence are in LOCAL-VOLCANO-1.4-REPORT.md.

Full Courses contains the three nine-hole maps; Blitz Courses contains the original three-hole maps plus Cinder Crown; Other Maps contains monthly, seasonal and weekly maps. The former daily sprint now appears in Maps of the Week. Community Maps has a prominent button and its own page.

Fixed an input cancellation error: moving focus into a button, input, selector, text area or editable field now discards the armed shot and releases its input capture. Previously a later key release could leave Classic in direction selection or queue a Flow shot after focus had moved elsewhere. Both new regression tests failed on the prior code and pass with the fix. This addresses a concrete reproduced case; it does not establish that every possible reported meter issue had the same cause.

## Production compatibility

The live backend (version 37) contained auction, trade-up, stacked-trade and Darby changes missing from repository backend files. Recovered those exact live features before packaging the new course. Other shared live modules matched the repository after line-ending normalization, apart from the intended golf catalogue and weekly rotation changes. No live features were replaced by older backend code.

Applied backend/cinder-crown.sql, which expands only the golf-round course constraint from 17 to 18. Validated the constraint afterward. No leaderboard, inventory or account migrations were performed. Existing course IDs and replay rules polygolf-v11 remain intact. The new daily map and former daily sprint use separate day/week score keys; old records are retained.

Both live frontends were still reporting 0.8.2. Compared all 213 published files against GitHub main: differences were confined to the known clubhouse/menu overhaul and version metadata. The reviewed v1.4 work was based on main v1.3 and retains the live game modules.

## Checked before publication

- Full automated suite: 240 passed, zero failed, one optional gift-code test skipped because its test secret was not supplied.
- Static checks: 153 modules passed syntax/import checks; seven pages link to existing files.
- 24 focused meter/input tests cover Classic and Flow, mouse/keyboard, visible direction locking, mixed inputs, lost capture, interruption, reset, pause/resume, held keys the new focus cases, rapid second clicks and Classic locks at five visible marker positions using both input methods.
- Normal browser play: Classic mouse hold/release/second click produced one shot and returned to ready on the fairway. Switching to Flow, holding Space and releasing produced one further shot and returned to the idle direction sweep. No runtime warnings/errors were recorded.
- v1.4 evidence covers all three new holes from tee to cup, replay verification, scorecard/restart, lava penalties, normal/night/rain visuals and desktop/phone-size layouts.
- Database security advisors: no error-level issues found.

The exact production results and deployment IDs are recorded below after publication. Browser checks use desktop-browser viewports; physical-phone behavior remains unverified.

## Files changed for v1.5

- dist/src/game.js: clear all active shot input when keyboard focus enters controls.
- dist/src/version.js, dist/release.json, package.json: synchronized v1.5 / package 1.5.0.
- backend/index.ts: retain live auction routes, trade-up routes and Darby handling.
- backend/auctions.ts: recover the existing live auction handler.
- backend/trading.ts: retain live stacked-quantity review checks.
- backend/cinder-crown.sql: admit course 18 without modifying records.
- backend/schema.sql: align fresh-install course limits with the released catalogue.
- tests/swing-controls.test.mjs: reproduce and verify focus-cancellation cases.
- tests/backend.test.mjs: load the recovered auction handler and verify the new course's online round shape and account gates.
- DEPLOY.md: matching backend, constraint and frontend deployment order.
- RELEASE-1.5-REPORT.md: this release evidence.

The 26-file v1.4 change inventory remains in LOCAL-VOLCANO-1.4-REPORT.md. Local artifacts and credentials are excluded from Git and the public frontend.

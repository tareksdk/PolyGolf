# PolyGolf v1.7 — minimap publication

Release date: October 23, 2026. The user authorized GitHub main and both existing live sites, and explicitly authorized coordination with the Planetfall release chat.

## Combined source

The release layers the reviewed v1.6/v1.7 minimap on the checked Planetfall publication, remote main dda534527b996b07b3b788a7877943f21f90f06d. Planetfall remains Hole of the Day at course 19; Cinder Crown remains Hole of the Week at course 18. The unfinished Desktop camera overhaul and unrelated files are excluded.

The minimap uses course elevation and geometry for shaded terrain, miniature forests, angular water, sand and placed landmarks. Dragging, keyboard movement, collapse/reopen, viewport insets and live markers are retained. Static SVG artwork is cached per hole with shared tree shapes and no extra WebGL context.

Integration adds a dedicated space illustration from Planetfall's actual planet centers, radii and landing-cap sizes, with a No par header. It does not draw a continuous fairway between planets. Both startup hooks and both stylesheets are retained. The added space test verifies every planet footprint and landing cap, valid artwork, marker bounds and unchanged source geometry.

No additional backend, SQL, physics, inventory, leaderboard-key or replay-rule changes are part of this minimap release. Those files match the coordinated Planetfall release byte for byte. Visible app version 1.7 and package version 1.7.0 stay synchronized; publication alone does not increment the version again.

## Changed files relative to Planetfall main

- dist/src/minimap-scene.js — low-poly terrain/feature renderer, reused tree geometry and true-position space layout.
- dist/src/minimap.js — draggable widget, projection, markers and No par handling.
- dist/minimap.css — rounded dark-green frame, responsive sizing and map annotations.
- dist/src/course-assets.js — render-only metadata for buildings actually placed on the course.
- dist/src/main.js, dist/index.html — install and style the minimap alongside Planetfall.
- dist/src/version.js, dist/release.json, package.json — v1.7 metadata while retaining all Planetfall release flags.
- tests/minimap.test.mjs — authored and generated layouts, controls, height sampling, bounded forests and Planetfall geometry.
- LOCAL-MINIMAP-1.6-REPORT.md, LOCAL-MINIMAP-1.7-REPORT.md — earlier local-review records, retained as historical reports.
- RELEASE-1.7-REPORT.md — this combined-release record.

## Checks before publication

- Combined suite: 262 tests, 261 passed, zero failed, one optional secret-dependent test skipped.
- Focused minimap and Classic/Flow input suite: 31 passed.
- Static check: 158 modules passed syntax/local imports; seven pages link to existing files.
- Source comparison against Planetfall main: no differences in backend files, course rotation, Planetfall modules, course geometry or physics.
- Prior v1.7 browser review covered nine layouts, drag/collapse/reopen, Classic and Flow shots, hole transitions and desktop/phone-sized views. Details and screenshots are in the local-review report.

## Publication targets

Publish one frozen, committed dist snapshot to the two existing projects, after the Planetfall chat finishes its publication and hands off the release slot:

- https://littlelinks.study — 77525857-32a7-4df0-bc93-0eafcee4e3cb.
- https://polygolf.lol — dff21fd6-021e-4cf1-a501-16dd349980ba.

GitHub main uses a fast-forward update with an expected-head check. If main changes, fetch and reconcile it before retrying. Deployment results and live checks are recorded under ignored artifacts/ and summarized in the release handoff. Physical touch hardware and sustained mobile frame rates are not covered by the desktop-browser checks.

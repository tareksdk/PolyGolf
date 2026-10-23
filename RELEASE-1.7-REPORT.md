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

## Published verification

- Main release commit: c034f69416e1e17d5be2e9499da483675fafb07b, parented directly to Planetfall's final main commit. Its tree 6ffed26b361adec0efd1b9cd99df54310100ac83 exactly matches the tested local source.
- littlelinks.study: deployment 6adbb3be0a2c0610a607f34c, state ready.
- polygolf.lol: deployment 6adbb3ec920743eea1a1a21c, state ready.
- All 224 public files on each domain match the frozen committed release: binary/text files match by SHA-256, and HTML is equivalent after Netlify's existing pretty-URL, attribute-order and RUM transformations. The Netlify configuration is consumed by the host and is not a public file.
- Both domains display v1.7. Live course browsers retain Planetfall as Hole of the Day, Cinder Crown in Maps of the Week, the three classic and three long courses, Halloween, monthly and community navigation.
- On littlelinks.study, Planetfall's nine-planet map rendered correctly; dragging moved it without taking a shot, minimize/reopen worked, and Home reset restored its inset. Classic power locked at 54.5%; the second Space press fired once, landed on Uranus, returned to ready and updated the map distance from 942 to 884 metres. Pause and return to course selection worked.
- On polygolf.lol, an online Willow Park round launched with the forest map. At 390 by 844 the widget was 204 pixels wide, retained its 12-pixel right inset, rendered 112 tree instances and caused no horizontal overflow. The 1280 by 720 view was also inspected. Temporary viewport overrides were reset.
- No console errors or warnings appeared in these checked flows.

Evidence stays outside the public frontend: artifacts/minimap-publication-check-1.7.json, minimap-release-tests.log, minimap-release-check.log, the two deployment/ready records, live-minimap-planetfall-1.7.png, live-minimap-willow-1.7.png and live-minimap-phone-1.7.png. This documentation follow-up does not change the deployed dist tree.

## Subsequent coordinated v1.8 menu publication

The user requested a further menu correction in the Planetfall chat while this report was being saved. That chat published main 8661cd4a9147ee8d1e9d7d91c320e9158dce7e35: Planetfall becomes a regular card in Other Maps, below Full Courses and Blitz Courses. All minimap, startup, terrain and backend files remain identical to the verified v1.7 release. The expected-head check rejected the earlier documentation update when main advanced, so no newer work was overwritten.

The current combined game is v1.8, with ready deployments 6adbb5e4a56831c182e27660 on littlelinks.study and 6adbb5f57807e4d9cda19fee on polygolf.lol. The v1.7 snapshot was not redeployed. This report is appended as documentation only on the newer main; the v1.7 checks above describe that historical publication. The coordinating chat verified the corrected desktop/phone menu and public launch; the minimap chat separately checked both domains' current v1.8 metadata and source preservation.

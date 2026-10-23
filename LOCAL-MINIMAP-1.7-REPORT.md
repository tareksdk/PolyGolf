# PolyGolf v1.7 — low-poly course atlas

- Local game: http://127.0.0.1:5184/
- Branch: codex/low-poly-minimap, based on the existing local v1.6 minimap.
- Date: October 23, 2026.
- Local only: no push, deployment, backend changes or leaderboard migration.

## Visual changes

The map's artwork has been replaced with a procedural low-poly illustration. It is not a texture or decorative overlay on the former diagram.

- Terrain uses an irregular mesh of 98 shaded facets sampled from actual course elevation. Lighting exaggerates relief by 3.2 times for legibility; ground coordinates remain unchanged. The map stays orthographic and north-up, with the existing uniform distance scale.
- Fairways have sampled polygonal boundaries and broad cut ribbons. Putting greens have bright faceted surfaces. Tee footprints remain at their real positions.
- Forests use miniature tiered pines and faceted broadleaf canopies, with trunks, consistent northwest highlights and southeast shadows. Actual source tree positions, species and size select the illustrations; screen-space thinning keeps them recognizable on long holes. Woodland patches are derived from those tree clusters. Autumn larches retain their gold palette.
- Trees reuse two shared SVG shapes and a shared shadow. At most 112 representative trees are shown. This avoids emitting a full set of canopy polygons separately for every tree.
- Water uses angular shore polygons from the actual oval boundary, internal blue facets and restrained highlights. Bunkers use the actual rotated/scalloped boundary, a darker recessed rim and warm sand facets. Lava uses variable-width angular ribbons from the shared channel coordinates. Sky islands and coastal land retain their geographic edges, with shallow illustrated side shading.
- Small buildings use coordinates recorded when real course assets pass their existing placement checks. No imagined building locations are inserted into the course.
- The frame retains the dark-green PolyGolf aesthetic, with a clearer grip, compact hierarchy, refined scale and compass, cream/cyan ball and tee markers and coral flags. Widths are 264 pixels on desktop, 204 on narrow screens and 184 in short landscape windows.

The supplied reference was inspected in the browser and used for artistic direction. The shipped illustration is original procedural geometry; the reference image is not included as a game asset.

## Behavior retained

Dragging, keyboard movement, Home reset, collapse/reopen, the outward right-edge tab, the 12-pixel expanded inset and session position memory remain intact. The map tracks the ball, retains the tee after moving away and refreshes on hole changes. It remains visible during shots and inactive under game dialogs.

Static artwork is generated only when the hole object changes. Marker/distance updates use the existing HUD tick; resize scales the SVG without rebuilding terrain. No additional WebGL context, frame loop, dependency or course-data request was added. Physics, replay rules polygolf-v11, course IDs and score keys are unchanged.

## Files changed in this update

- dist/src/minimap-scene.js — new terrain, fairway, hazard, forest and landmark renderer with reusable tree geometry.
- dist/src/minimap.js — delegate artwork to the new renderer, use placed-landmark metadata and refine the grip icon; preserve widget controls/projection.
- dist/minimap.css — frame, typography, map annotations, markers and responsive refinements.
- dist/src/course-assets.js — record render-only metadata for buildings actually placed by the existing asset pipeline.
- dist/src/version.js, dist/release.json, package.json — synchronized visible v1.7 / package 1.7.0 metadata.
- tests/minimap.test.mjs — verify actual elevation sampling, coordinate preservation, shared tree geometry, bounded selection and generated community layouts; retain authored-course and positioning checks.
- LOCAL-MINIMAP-1.7-REPORT.md — this inventory and verification record.

Earlier v1.4–1.6 work remains present. The original Desktop checkout and its pre-existing files were not modified.

## Verification

Automated checks on the final renderer:

- Full suite: 249 tests; 248 passed, zero failed, one optional gift-code test skipped because its test secret was not supplied.
- Focused map/input suite: all 30 passed, including all authored golf and mini-golf layouts, eight generated community layouts, equal axis scales, off-map markers, viewport insets, source-height sampling, safe colors, source-coordinate preservation and Classic/Flow controls.
- Static checks: 155 modules passed syntax/local-import checks; seven pages link to existing files.
- Diff/whitespace review passed.

Actual browser visual review:

- Compared old and new artwork at actual minimap size across nine layouts: Willow Boathouse, Heron Pond, a raised garden hole, a long Autumn hole, Saltwind coast, sky islands, two Cinder Crown holes and a winding mini-golf hole.
- Iterated after the first review: included visible outer forest trees, strengthened lighting from actual relief, fixed a too-thin segmented mini-golf presentation and instanced tree shapes without losing their faceted appearance.
- In-game Willow and Autumn Pines Long Course views showed recognizable miniature forests and placed buildings. The final phone view rendered all shared tree shapes with their intended colors.
- Desktop dragging moved the 264-pixel widget from its initial corner to (738,95), without taking a shot. Collapse exposed the right-edge tab and reopen restored the position.
- At 390 by 844, the expanded map stayed 12 pixels from the right edge. Dragging left stopped at x=12; reopening retained the dragged position. Home restored the upper-right layout. Also checked 907 by 510, 844 by 390 and 1280 by 720.
- A Classic shot returned to ready on Autumn Pines; the map distance changed from 346 to 243 metres. A Flow shot on Willow completed with one stroke, moved its ball marker and revealed the tee; distance changed from 338 to 227 metres.
- The collapsed state persisted through Pick Up Ball and Next Hole; Heron Pond (hole 2 of 3) loaded its new two-pond artwork when reopened.
- No console warnings or errors appeared in the checked game flows.

Performance evidence is in artifacts/minimap-generation-1.7.json. Six prebuilt layouts had median Node SVG-generation times of about 6.6–18.3 ms over five runs; this measures static artwork construction only, not browser FPS or physical-device performance. Rich woodland artwork uses roughly 55–60 KB of SVG with two reusable tree definitions. In-game inspection confirmed 112 tree instances, 224 tree/shadow uses, 98 relief faces and 615 total artwork nodes for Willow.

Screenshots and comparison material remain in ignored artifacts/: minimap-low-poly-desktop-1.7.png, minimap-low-poly-phone-1.7.png, minimap-low-poly-tab-1.7.png, minimap-low-poly-landscape-1.7.png and minimap-comparison-1.7.png. Tests are recorded in minimap-overhaul-full-tests.log, minimap-overhaul-tests.log and minimap-overhaul-check.log. These files are excluded from the game deployment directory.

Phone checks used desktop-browser viewports and pointer input. Physical touch hardware and sustained mobile frame-rate performance remain unverified.

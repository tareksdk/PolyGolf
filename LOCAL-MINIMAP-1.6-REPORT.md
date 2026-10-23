# PolyGolf v1.6 — local minimap

- Local preview: http://127.0.0.1:5184/
- Branch: codex/draggable-minimap
- Date: October 22, 2026
- Publication: local only. No GitHub push, production deploy or backend changes.

## What changed

- Added a colorful top-down map with a rounded green frame, slim contrasting rim, grip, hole/par label and distance to the flag. Fairways, cut stripes, greens, bunkers, ponds, coastal edges, sky-island gaps, lava cuts, trees and hill contours use the current hole's layout and palette.
- The white ball marker follows play. A turquoise tee marker remains behind after the ball leaves; the hole uses a coral flag. A legend distinguishes the markers. Balls outside the framed area get a directional edge marker.
- The map starts in the upper-right corner, below any controls already occupying that corner. Drag its header to move it. Expanded maps stay at least 12 pixels from the viewport edges.
- Minimize replaces the map with a small tab on the right edge. The tab opens the map at its previous position, inset from the border. Position and collapsed state survive HUD rerenders and hole changes during the session. Reloading starts a fresh layout.
- Focus the grip to move with arrow keys (Shift moves farther); Home restores the upper-right position. Escape returns keyboard control to the course.
- Map interaction disarms shot input and uses its own pointer capture. Moving it does not aim, orbit or take a shot. It stays visible during ball flight and becomes inactive under game dialogs.
- The artwork is built once per hole and reused while only markers and distance update with the existing HUD tick. There is no additional WebGL scene, renderer, frame loop, dependency, remote asset or course-data request for the minimap. Tree icons are capped at 180 and sampled across the visible woodland.

## Files changed in this update

- dist/src/minimap.js — new map projection, course artwork, live markers and widget interaction.
- dist/minimap.css — new rounded frame, grip, rim, markers, edge tab and compact layouts.
- dist/src/main.js — install the minimap after the existing HUD extensions.
- dist/index.html — load the minimap stylesheet.
- dist/src/version.js — visible version 1.6.
- dist/release.json — appVersion 1.6 and local minimap content identifier; replay rules remain polygolf-v11.
- package.json — package version 1.6.0.
- tests/minimap.test.mjs — projection/marker coverage across all authored golf and mini-golf holes, viewport clamping, hazard artwork, safe colors and bounded tree output.
- LOCAL-MINIMAP-1.6-REPORT.md — this change inventory and verification record.

Earlier Cinder Crown, catalogue and v1.5 meter/backend work was already present in the base checkout. The original Desktop checkout and its pre-existing untracked files were left intact.

## Checked

Automated:

- Complete suite: 247 tests, 246 passed, zero failed, one optional gift-code test skipped because its test secret was not provided.
- Focused minimap/input suite: all 28 passed, including the existing 24 Classic/Flow input tests.
- Static check: 154 modules passed syntax/local-import checks; seven pages link to existing files.
- Change review and whitespace checks passed.

Actual browser interaction and visual review:

- Willow Park: map loaded at the upper right with a 12-pixel horizontal gap. Dragging moved it from (1020,16) to (610,95) on a 1280 by 720 viewport without increasing strokes. Collapse exposed the right-edge tab; expand restored (610,95).
- Dragging beyond the screen stopped at x=12 and bottom=708, preserving the 12-pixel margin. Keyboard movement shifted it eight pixels; Home and Escape reset its placement and returned focus to the course.
- A Classic power/direction shot completed once, moved the white marker from the tee toward the middle of the hole and revealed the separate turquoise tee. The displayed distance changed from 338 to 190 metres. No input lock occurred in this sequence.
- Pausing, picking up the ball and advancing to Willow hole two retained the collapsed state. Expanding showed the new Heron Pond layout and Hole 2 / 3 label.
- Cinder Crown: visible lava crossings, bunkers and flag matched the current hole. Checked at 390 by 844, 907 by 510 and 844 by 390. Dragging, collapsing, expanding and resizing kept controls reachable and the expanded widget inside its inset. Temporary viewport overrides were reset.
- Mini-golf: Meadow Valley displayed the winding course and flag. A Flow hold/release shot completed once and updated the marker/distance from 17 to 13 metres.
- Menus hide the widget; pause and completion dialogs prevent interaction behind them.
- No browser console warnings or errors appeared in the checked flows.

Screenshots: artifacts/minimap-desktop-1.6.png, artifacts/minimap-phone-1.6.png and artifacts/minimap-tab-1.6.png. Test logs: artifacts/minimap-full-tests.log, artifacts/minimap-input-tests.log and artifacts/minimap-check.log. These local artifacts are ignored by Git and excluded from the public game files.

Phone checks used resized desktop-browser viewports and pointer input. Physical touch devices remain unverified.

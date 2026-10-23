# Planetfall menu correction · v1.8

Planetfall now appears once as a standard card in Other Maps. Full Courses and Blitz Courses return to the top of the library. The separate oversized Hole of the Day section is removed; Planetfall retains its daily badge and Cinder Crown retains its weekly slot.

The card uses the existing library image dimensions, heading sizes, spacing and colors. Play and the device distance board remain available. The v1.7 minimap is preserved.

## Files changed

- `dist/src/course-menu.js`: Move Planetfall into Other Maps and use regular Play/board actions.
- `dist/planetfall.css`: Remove full-width, oversized image/type overrides; keep compact card actions.
- `dist/src/version.js`: Display v1.8.
- `dist/release.json`: Sync release metadata and the three menu sections.
- `package.json`: Sync package version 1.8.0.
- `tests/planetfall.test.mjs`: Assert Planetfall is within Other Maps, present once, with board access.
- `tests/volcanic-course.test.mjs`: Assert restored Full/Blitz/Other ordering.
- `docs/planetfall-menu-1.8.md`: This change and verification record.

## Checked

- 158 modules pass syntax/import checks; seven pages link to existing files.
- Full suite: 262 tests, 261 pass, zero failures, one optional secret-dependent test skipped.
- Final focused Planetfall/Cinder suite: 19 pass.
- Browser captures inspected at 1440×960, 390×844 and 907×510; no horizontal overflow. The desktop card is one normal grid column instead of a full-width banner.
- Opened the distance board, launched Planetfall from its new location, paused and returned to selection, then switched Mini-golf/Full golf (5/12 cards). No JavaScript runtime errors.

Production deployment verification is recorded separately after publishing.

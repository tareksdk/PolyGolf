# PolyGolf v1.0 — Shop restoration

The Shop again uses the original featured panel, promotional card, section tabs, item grids, card proportions, filters and scrolling shelves.

## Issues fixed

- Shop pagination split the featured shelves into separate pages, hid most items and compressed the cards, artwork and text. Removed the Shop DOM pagination and its size overrides; retained Caddie pagination.
- Restoring the old mobile flow alone left lower shelves outside the game's clipped viewport. The Shop now scrolls inside the available area below its header.
- The original two-column bundle grid clipped a purchase button on narrow phones. Bundle cards use one column below 600px, and their action row can wrap.

The visible version is now v1.0. Existing v0.9 input, camera, shot-meter and full-path-guide fixes remain included, together with the current live rules, courses, inventory and account features. No backend or economy changes are part of this release.

## Verification

- All 207 existing automated tests passed; static checks passed for 127 modules and seven pages.
- Chrome: all nine Shop sections at 1280×800, 907×510, 375×667, 320×568 and 844×390; scrolling to the final row, section switching and shelf boundaries.
- Chrome: category filtering, price sorting, hiding owned items, item details, a local test purchase and coin deduction, locker contents, bundle details, and Shop–Caddie navigation.
- Chrome: mouse orbit without changing aim, consecutive Classic shots, pause/resume, ball reset, Flow shots, advancing a hole, full-path guide, and bounded Classic meters at desktop/phone/landscape sizes.
- Browser console checked for errors and warnings.

Purchases were tested only in an isolated localhost browser save. No live account or real-money transaction was performed. The archive includes local launch instructions in START-HERE.md.

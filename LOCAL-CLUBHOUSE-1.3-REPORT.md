# PolyGolf 1.3 — local clubhouse overhaul

Preview: [http://127.0.0.1:5175](http://127.0.0.1:5175)

Work is isolated on `codex/crate-shop-overhaul-local`. No commit, push, merge, or deployment was performed. The pre-existing `.DS_Store` was left alone. The preview server only listens on this computer.

## What changed

- Shop: a sidebar on desktop and compact section buttons on phones, with clearer shelf headings, locker cards, reward counts and prices.
- Crates: replaced the hidden-page layout with one scrolling reward catalog. Search and rarity filters work together, and the opening quantity, total and Open button stay visible. Changing quantity preserves the search, filter and scroll position. All published reward pools and opening odds remain unchanged.
- Courses: room for course art, descriptions, records and Play buttons, with a scrollable browser for classic, rotating and long rounds.
- Caddie: a dedicated equipment preview and a scrolling collection grid. Every matching item remains in the grid instead of being hidden behind small pages. Search, category controls, filters, favourites and equipment actions retain their existing behavior.
- Trading: an inbox with received, sent and history filters, clearer instructions, and a retryable connection-error state. Localhost explains that actual exchanges require the online game; it never simulates a live trade.
- Country Club: a next-tier progress bar and reward tiers arranged in responsive rows. All 30 tiers remain accessible through the existing section controls.
- Shared header: less empty space, visible version and balance, and the active navigation item scrolls into view on narrow screens. Both existing appearances are supported.

## Files changed

| File | Change |
| --- | --- |
| [dist/clubhouse-modern.css](/Users/jacobaleo/Desktop/polygolf/dist/clubhouse-modern.css) | New scoped clubhouse layouts, responsive cards and reliable crate scrolling. |
| [dist/index.html](/Users/jacobaleo/Desktop/polygolf/dist/index.html) | Loads the new stylesheet. |
| [dist/src/interface.js](/Users/jacobaleo/Desktop/polygolf/dist/src/interface.js) | Keeps the active menu item visible on narrow screens. |
| [dist/src/shop-view.js](/Users/jacobaleo/Desktop/polygolf/dist/src/shop-view.js) | Shop structure, locker cards, complete searchable reward catalog and opening bar. |
| [dist/src/dialog-pages.js](/Users/jacobaleo/Desktop/polygolf/dist/src/dialog-pages.js) | Replaces crate pagination with catalog filtering; preserves settings and controls pages. |
| [dist/src/pro-shop-ui.js](/Users/jacobaleo/Desktop/polygolf/dist/src/pro-shop-ui.js) | Preserves catalog state and keyboard focus when changing opening quantity. |
| [dist/src/views.js](/Users/jacobaleo/Desktop/polygolf/dist/src/views.js) | Adds the Caddie preview heading. |
| [dist/src/menu-pages.js](/Users/jacobaleo/Desktop/polygolf/dist/src/menu-pages.js) | Removes collection pagination and retains resize/filter dismissal behavior. |
| [dist/src/course-menu.js](/Users/jacobaleo/Desktop/polygolf/dist/src/course-menu.js) | New Courses title and introductory copy. |
| [dist/src/pass-view.js](/Users/jacobaleo/Desktop/polygolf/dist/src/pass-view.js) | Country Club progress and clearer tier labels. |
| [dist/src/trading-ui.js](/Users/jacobaleo/Desktop/polygolf/dist/src/trading-ui.js) | Offer filters, retryable errors, exchange guidance and local-preview state. |
| [dist/src/version.js](/Users/jacobaleo/Desktop/polygolf/dist/src/version.js) | Displayed version 1.3. |
| [package.json](/Users/jacobaleo/Desktop/polygolf/package.json) | Package version 1.3.0. |
| [tests/clubhouse-modern.test.mjs](/Users/jacobaleo/Desktop/polygolf/tests/clubhouse-modern.test.mjs) | Regression tests for complete reward pools, trade filters, failed refresh and local Trading. |
| [LOCAL-CLUBHOUSE-1.3-REPORT.md](/Users/jacobaleo/Desktop/polygolf/LOCAL-CLUBHOUSE-1.3-REPORT.md) | This change log and verification record. |

Generated browser scripts and screenshots are grouped under [output/playwright](/Users/jacobaleo/Desktop/polygolf/output/playwright), which is ignored by Git.

## Checked

Automated:

- `npm test`: 228 tests, 227 passed, zero failed, one existing skip.
- `npm run check`: 141 modules passed syntax/import checks and all seven static pages passed their link checks.
- `git diff --check`: passed.
- Added regression tests confirm that every eligible reward appears exactly once in every locker catalog, and cover trade filtering, refresh failure and the local-preview boundary.

Browser interaction and visual review:

- Desktop 1440 × 960, phone 390 × 844 and compact 907 × 510.
- All nine Shop sections at desktop and phone sizes, plus daily item category and price sorting controls.
- All 10 crates at all three sizes: wheel-scroll to the final reward, opening-bar visibility, horizontal overflow and Escape dismissal.
- Fairway Locker: all 101 rewards; search, rarity filtering, no-results state, clearing filters and keyboard PageDown scrolling.
- Caddie: scroll to the final collection card, search empty state, clearing filters and Escape dismissal of filters.
- Courses: full golf, both mini-golf collections, the long-round collection and actual course art dimensions.
- Country Club: all three tier sections, final-tier access, Your tier navigation and a successful tier claim.
- Temporary, isolated preview progress: one 10-locker earned opening and one single opening, skipping animations, scrolling to the last batch reward, closing results, exact earned-locker deduction and no coins spent on earned openings. Quantity changes preserve catalog state.
- Both light and dark appearances were exercised. Screenshots of the five updated areas and crate catalog were inspected.
- A local Willow Park round started, accepted a shot, showed one stroke, paused/resumed and returned to the clubhouse.
- Browser console check: no errors or warnings in the checked session. Temporary opening-test progress was restored afterward.

Online trading and account operations were not exercised against the live service. The existing localhost isolation remains in force.

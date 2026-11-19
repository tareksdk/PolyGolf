# Minimal clubhouse menus · local preview v1.11

Preview: http://127.0.0.1:5180/
Source: /Users/jacobaleo/.codex/projects/polygolf-home-1-10
Branch: codex/minimal-clubhouse-1-11
Base: current main v1.9, commit 0b0133a.

## Visible changes

- Play leads the home screen as one large gold action. Caddie and Shop are smaller, multiplayer and competitive are quiet links, and secondary tools sit in a keyboard-accessible More menu.
- Most of the home screen remains the live course view. Account controls, studio/version labels and legal links stay accessible.
- The course library, Caddie, shop, profile, multiplayer, competitive, Country Club, trading, auctions, friends, rankings, community browser and editor share the same forest/cream palette, compact navigation, typography and spacing.
- Galleries emphasize their art and item details. Separators replace many nested panels. Primary actions remain gold; secondary actions use quieter outlines or text.
- Navigation has a short fade/slide on page changes, without replaying on ordinary filter updates. Reduced-motion preferences are respected. Keyboard focus follows page headings and returns to More after closing its dialogs.
- Light appearance remains readable. The Caddie’s 3D preview backdrop follows the menu appearance and restores the course background when leaving.

The initial home request produced the local v1.10 checkpoint; the subsequent request to modernize the other pages increments the combined preview to v1.11. Nothing was pushed or deployed. The Desktop checkout’s pre-existing unfinished work is preserved.

## Files changed across both requests

- `dist/src/home-menu.js` — Home hierarchy, More disclosure/dismissal, page transition/focus behavior and Caddie preview backdrop.
- `dist/home.css` — Responsive home screen, readable scene overlay, compact account/footer and both appearances.
- `dist/src/views.js` — Shared Play/Caddie/Shop navigation with secondary pages in More.
- `dist/src/competitive-ui.js` — Use the shared header and preserve spacing when the heading wraps on phones.
- `dist/menu.css` — Shared menu styling, lighter galleries/forms, editor surfaces, responsive catalog navigation and dialog framing.
- `dist/src/main.js` — Install the menu behavior.
- `dist/index.html` — Load the two scoped menu stylesheets.
- `dist/src/version.js` — Display v1.11.
- `dist/release.json` — Synchronize local release/version and menu metadata.
- `package.json` — Synchronize package version 1.11.0.
- `docs/minimal-menus-1.11.md` — This inventory and verification record.

Generated browser screenshots are grouped under `output/playwright/` and are not application source. Menu design preferences and the isolated source location were also saved as requested in new memory update notes.

## Automated checks

- Syntax/import/page checks: 160 modules pass; seven HTML pages reference existing local files.
- Focused menu, interface and clubhouse suites: 35 pass, zero failures.
- Full suite: 277 tests; 275 pass; one optional secret-dependent test skipped; one pre-existing failure.
- Existing failure: `tests/clubhouse-v8.test.mjs` assumes every locker is available when sampling rewards. On November 2 the Halloween locker is unavailable, so the test’s expected pool differs. The same failure was reproduced against an unmodified v1.9 snapshot. Reward logic/tests were not changed as part of the menu work.
- Whitespace/diff review passed. Gameplay, physics, cloud/account and minimap sources remain unchanged.

## Browser checks

- Home inspected at 1440×960, 390×844, 320×568, 907×510 and 844×390, with no clipped controls or horizontal overflow after responsive fixes.
- Eleven main menu pages opened at desktop, phone and short embedded sizes. Their headings, selected navigation and page bounds were checked; no JavaScript runtime errors in those flows.
- More checked with pointer and keyboard, Escape, outside-click dismissal and focus return. Settings, Controls and account dialogs opened and closed.
- Actual appearance settings switched between light and dark. Reduced-motion behavior checked.
- Phone shop checks reached the last of nine current lockers. The largest locker catalog (101 rewards) reached its last reward above the fixed opening controls at desktop, phone and short embedded sizes; empty search and clearing filters worked. Dialogs rendered above the shared header.
- The last of 95 ball finishes and its action were reachable at all five home-test sizes. Short-window Caddie scrolling was adjusted after finding that its controls squeezed the item area. Collection search narrowed to the expected single Classic result.
- The editor was inspected with a temporary level-30 local QA fixture; the original preview data was restored. The community browser’s loading state was inspected.
- A real keyboard-powered golf shot completed with one stroke recorded. The menu header was absent during play. Pause/resume and the confirmed return to the clubhouse worked.

This is a localhost preview. Online account-only flows retain their existing preview/sign-in states; live matchmaking, trades, purchases and publishing were not performed.

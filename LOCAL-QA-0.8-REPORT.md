# PolyGolf 0.8 — local regression audit

Preview: **http://127.0.0.1:5176/**. This update stays on `codex/smooth-swing-pirate-local`. The GitHub handoff uses a separate branch and a `[skip netlify]` commit message. No merge, deployment, or production backend write is part of this update.

The audit compared the uncommitted 0.7 temporary update with the preceding Git version (`242905a`) and ran the existing release checks before changing it. The baseline passed 192 tests, despite reproducible browser input and meter defects. The fixes retain Classic and Flow, the directional guide, course art, pirate encounter, and existing physics.

## Issues and fixes

| Issue | Cause | Change |
| --- | --- | --- |
| Classic direction marker rendered in the wrong place and could escape its track | The new `left` positioning was combined with older CSS making the marker 100% of the track width; neither marker nor fill rendering validated incoming values | Restore a four-pixel marker, account for its width at both end stops, clamp finite power/direction values, and keep a single full-width, scaled power fill |
| Flow gauge extended outside its SVG | The hub reached below the 88-unit view box | Extend the view box to contain the hub and needle |
| Ctrl-drag charged a shot instead of orbiting | Mac-style secondary clicking followed the primary-shot path | Route Ctrl-primary and right-button dragging through camera orbit |
| Orbit could remain active after pause or a menu/state transition | Drag state and capture were not consistently cleared; lost capture had no handler | Share cleanup across pause, dialogs, blur, reset, leaving, completion, and loading another hole; explicitly release capture and track its pointer |
| Orbit also moved the shot aim | A pointer aim target from before the drag continued interpolating | Discard pending pointer aim when orbit starts and preserve the shot direction throughout the drag |
| Mouse and Space releases interfered with each other's shots | Every primary pointer release or Space release could lock the current charge | Give each hold an input owner and accept only that owner's release; handle multi-button mouse chords without accidental shots |
| Keyboard controls appeared dead after using menus or selectors | Focus stayed on a button/select, where game shortcuts are intentionally suppressed | Restore course focus after resuming or selecting a club/meter; return focus after pointer-driven shot sliders; clear held navigation keys when focus enters UI |
| Held Escape repeatedly paused and resumed | Escape repeats were treated as new presses | Toggle only on the initial press |
| Zoom sensitivity did nothing | Wheel zoom ignored the saved setting | Apply sensitivity and normalize pixel/line/page wheel units while retaining zoom limits |
| Pause/reset could disappear during a shot | The entire gameplay HUD was hidden during flight | Keep the small tool group available while the meter and shot panel remain hidden |
| Repeated resets could leave a hole unable to accept another shot | Reset penalties could reach the stroke cap without the completion path used after ordinary shots | Complete the hole at the cap instead of leaving it in an unshootable state |
| Shot controls could appear available during a cinematic | Their disabled state did not include water/pirate presentation state | Guard the UI and input handlers consistently during cinematics and outside active play |
| Settings/help controls were clipped on small/short windows | Long, fixed-spaced dialogs relied on scrolling | Use compact pages for controls and settings; keep all settings and help content reachable |
| Hole announcement overlapped the taller meter | Its bottom offset assumed the old meter height | Position and size the announcement above gameplay controls across portrait/landscape layouts |
| Very narrow course-selection rows overlapped | The clubhouse header consumed too much vertical space | Compact the header and provide a section selector in small/short windows |
| Item details and locker odds scrolled on short windows | Stacked artwork/details and an unbounded odds list exceeded dialog height | Fit item artwork/details responsively and page every locker rarity; re-page on window resize |
| Small result dialogs scrolled | Large celebration spacing and a wide scorecard exceeded a phone window | Compact the result spacing and fit scorecard columns to the dialog |
| Local reloads occasionally reported existing assets as missing | The development server treated canceled filesystem reads as missing files | Retry temporary read errors; reserve 404 for missing files and report persistent read failures accurately |
| Expanded Caddie filters crowded out cards on short windows | Inline filters consumed the bounded card area | Compact filters open above the cards and dismiss with Escape or an outside click |
| Caddie and Shop required scrolling | Unbounded collections/shelves and tall cards exceeded the available panel height | Add bounded pages, clamp page selection after filtering/resizing, keep existing card actions, and adapt card/navigation spacing to the window |

## Verification

- Full release suite: **205 passed, 0 failed**.
- Static checks: **116 modules**, local imports, and **7 linked pages** passed.
- Real browser input pass: **23 checks passed**. This includes right/Ctrl orbit, wheel zoom, preserving aim during orbit, mouse/Space ownership, consecutive Classic and Flow shots, keyboard club/aim controls, pausing a moving ball, resuming with correct focus, reset during flight, and next-hole input.
- Real-time meter sampling: **330 rendered samples** covered a complete Classic power cycle, Classic direction sweep, and Flow direction sweep, with **zero boundary escapes**. Separate endpoint tests exercise exact 0/1 and -1/1 values and malformed values.
- A controlled cup-approach fixture used real keyboard shot input and real physics to sink the ball, display the result, and advance to a playable second hole. Result dialogs fit desktop, a 320-pixel phone window, and landscape without scrolling.
- Responsive gameplay HUD, meter endpoints, SVG needle bounds, settings and controls: **84 checks passed** across 1280×800, 907×510, 390×844, 375×667, 320×568, 844×390, and 667×375. The checked gameplay pages and panels required no scrolling.
- Caddie/Shop: **75 checks passed** across 1280×800, 907×510, 375×667, 320×568, and 844×390. All nine shop sections, pagination, collection search, native menu/category/filter controls, expanded filter popups and dismissal, and item details were exercised.
- All six currently offered full-golf courses rendered in the browser. Saltwind Normal/Night/Rainy, overview, club selection, draw/fade, and spin controls worked. Actual consecutive Classic and Flow mini-golf shots also completed.
- A controlled final-hole fixture verified the nine-hole scorecard and clubhouse return. This is a UI/state-transition test, not a claim of manually playing a complete nine-hole round.

**All 10 locker types passed 176 individual contents-page checks** on portrait-phone and landscape windows, including resizing while a locker dialog was open. Item-detail dialogs also fit at 375×667, 320×568, and 844×390 without scrolling. Complete raw results are linked below.

Automated checks cover fixed-step physics, courses, cups, water/sand/pirate effects, presentation transitions, state changes, saves, local cloud isolation, collections, progression, and the new pointer/keyboard and pagination cases. Browser input uses real mouse/keyboard actions. Artificial meter endpoint values are used only to verify rendering boundaries; any explicit physics fixtures are identified separately.

No unresolved game defects were found in the exercised paths. The unverified areas and host limitation below remain.

## Local-only limits

Account sign-in, multiplayer, ranked play, trading, and live account rewards remain intentionally disconnected in the localhost preview. Their existing automated tests run, but this pass does not claim live service verification. Browser checks use desktop Chrome with emulated viewport sizes; physical phones, touch gestures, Safari, Firefox, and different GPUs are not verified.

The Mac briefly exhausted free disk space during testing, and some filesystem reads were canceled. No personal files or developer tools were deleted. The preview server retries temporary read failures; persistent filesystem failures can still prevent local assets loading.

The existing local-preview save namespace is retained so testing can continue from local 0.7 progress without altering production-account storage.

## Main files changed in this audit

- Input, state cleanup and camera interaction: `dist/src/game.js`.
- Meter rendering and bounds: `dist/src/ui.js`, `dist/src/shot-meter-ui.js`, `dist/interface.css`.
- Shot-option focus/locking, visible version and compact layouts: `dist/src/expansion.js`, `dist/src/interface.js`, `dist/launch.css`.
- Bounded settings, controls and locker dialogs: `dist/src/dialog-pages.js`.
- Caddie/Shop pagination and compact section navigation: `dist/src/menu-pages.js`.
- Local hosting reliability: `server.mjs`, `scripts/local-files.mjs`, `scripts/check.mjs`.
- Version and documentation: `dist/src/version.js`, `dist/release.json`, `README.md`, this report.
- Regression coverage: `tests/swing-controls.test.mjs`, `tests/menu-pages.test.mjs`, `tests/local-files.test.mjs` and repeatable browser scripts under `output/playwright/v08-*.js`.

## Evidence

- [Full release tests](artifacts/v08-release-final.log)
- [Static checks](artifacts/v08-static-final.log)
- [Browser input](artifacts/v08-browser-input-final.log)
- [Responsive HUD, meter endpoints, controls and settings](artifacts/v08-browser-layout-final.log)
- [Caddie and every shop section](artifacts/v08-browser-collections-final.log)
- [Real-time meters and natural completion](artifacts/v08-browser-meter-final.log)
- [Native navigation, item details, locker pages and scorecard](artifacts/v08-browser-ui-final.log)
- [All locker contents](artifacts/v08-browser-all-lockers.log)
- [Console check](artifacts/v08-console-final.log)

Screenshots include [Classic on desktop](output/playwright/v08-classic-1280x800.png), [Flow on phone](output/playwright/v08-flow-390x844.png), [Caddie on phone](output/playwright/v08-caddie-paged-375.png), [Shop on phone](output/playwright/v08-shop-paged-375.png), [natural hole result](output/playwright/v08-natural-hole-result.png), and [nine-hole scorecard](output/playwright/v08-nine-hole-scorecard-phone.png).

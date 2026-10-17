# PolyGolf 0.9 — production integration

This release combines the tested 0.8 controls/UI update with the **current production 0.7.2**, rather than publishing the older checkout over it. Production was captured on October 17, 2026 from both existing domains. Both contained the same 177 files, verified by SHA-1. Previous published deploys: `6ad2e623bc5043ab0eefcca2` (polygolf.lol) and `6ad2e63171b2c501a3523466` (littlelinks.study).

## Preserved production changes

All 177 production paths remain present. 150 files remain byte-identical; 27 existing files integrate the requested changes. Newly recovered production files include the honors and username systems, detailed trees and planting, pre-rendered course cards, and the locker milestone logic. Existing v11 course rules, three-hole classics plus separate nine-hole Long Willow, 635 catalogue items, unique gem seeds, account economy, trade limits, uncapped leaderboard retrieval, automatic graphics, saved weather selection, medals, accolades and compact profile presentation remain in place. The running backend and account data are not replaced.

The repository's previously stale v10 SQL guard literals and local fixtures are aligned with the already published v11 frontend. This frontend release does **not** execute SQL or deploy a backend function.

## Fixes

- Retain the full 0.8 camera/input, pause/reset, shot-meter and paged-menu fixes documented in `LOCAL-QA-0.8-REPORT.md`.
- Classic direction markers use their actual four-pixel width, bounded values and clipped tracks; the power fill scales only within its track. Full end stops and malformed numeric values are covered.
- Restore the full physics preview by default, including flight, descent, bounce/roll and the landing marker. Existing saves without a preference also default to the full path. Settings → Course → Shot path offers **Full path** and **Direction only**.
- Reuse full-preview geometry, matrices and buffers; cancel stale preview jobs when hiding the guide or loading a hole. Keep the golfer's facing synchronized in both guide modes.
- Integrate the production weather selector into a dedicated settings page; avoid positional page grouping that mislabels newer options. Course options use a compact grid on small/short windows and remain accessible without scrolling.
- Keep the visible version label clear of the nameplate on narrow screens. Keep home account/settings buttons above the centered menu so they receive clicks on small screens.

## Verification

- **207 automated tests passed**, zero failures/skips; static syntax/import checks passed for **127 modules** and seven linked pages.
- Browser meter checks: both meters, nine viewport sizes from 320×568 to 1280×800 (including 1024×320 and phone landscape), and 81 power/direction combinations per meter/size: **1,458 combinations**, zero boundary escapes.
- Real Classic animation: **235 power frames** and **199 direction frames**, reaching exact 0.01/1 power and -1/1 direction end stops with zero overflow.
- Full-preview flight/descent/landing, preference switching, pause/resume and four responsive settings layouts passed. The full preview uses the real physics engine; buffers are retained across updates and canceled jobs do not redraw after reset.
- All seven currently offered full-golf choices remained visible on five viewport sizes. Caddie/Shop pagination, medals/accolades UI, automatic graphics and all weather options were checked in Chrome.
- Browser mouse orbit, consecutive Classic/Flow shots, pause/resume, reset and next-hole input are exercised before publication.

Browser captures and raw logs are local evidence under `output/playwright/` and `artifacts/release-0.9/`; they are excluded from Git and the deployed directory. Diagnostic browser hooks are response-only test instrumentation and are absent from shipped source.

Physical phones, Safari/Firefox, and real account transactions/multiplayer are not exercised in this pass. The backend remains the current production deployment.

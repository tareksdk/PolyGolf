# PolyGolf 1.3 — clubhouse release

Release date: October 19, 2026.

This release publishes the locally reviewed Shop, Courses, Caddie, Trading and Country Club overhaul. The user authorized publication to GitHub main and both existing production sites on October 19, after the localhost review.

## Changes

- Shared responsive clubhouse layouts and compact navigation, with support for both appearances.
- Complete scrolling locker reward catalogs, search, rarity filtering and fixed opening controls.
- Collection grids keep every matching item available; opening quantity changes preserve catalog state.
- Course art and Play controls remain readable; Country Club tiers wrap into rows.
- Trading inbox filters, retryable loading errors and an explicit localhost-only state.
- Package and displayed version 1.3, with matching public release metadata. Replay rules remain `polygolf-v11`.

The original implementation file list and detailed local browser checks are in [LOCAL-CLUBHOUSE-1.3-REPORT.md](LOCAL-CLUBHOUSE-1.3-REPORT.md). That report records the local-review stage before publication was authorized.

## Validation before publication

- Release test runner: 231 passed, zero failed, zero skipped.
- Static validation: 151 modules and seven page/link checks passed.
- All 45 mini-golf holes completed from their actual tees using shipped physics.
- All nine classic full-golf holes reached the cup and passed replay verification.
- Browser checks on the integrated release covered the five updated screens at all three sizes, including all course cards, all 30 tiers, collection search and the final collection card.
- Prior local browser checks covered all ten crates at 1440 × 960, 390 × 844 and 907 × 510, the five updated areas, single and batch openings, tier claims, both appearances, keyboard scrolling and gameplay transitions.

The source on main was behind the deployed game. Before publication, the exact production frontend was recovered and reconciled with the overhaul. Existing stack quantities, trade-ups, auctions, water behavior, Sky Islands and Darby are retained; focused regression tests cover stack preservation, trade-up retries and discovery rewards. Older test expectations were updated to the already-live catalog and course rules.

No production database or backend deployment is required. The release preserves the current live item catalog, Sky Islands physics and Darby behavior. Production accounts and cloud services remain on their existing deployment.

## Production targets and rollback

Both sites receive the same frozen `dist/` snapshot, including the existing security-header configuration.

| Site | Site ID | Previous ready deployment |
| --- | --- | --- |
| [littlelinks.study](https://littlelinks.study) | `77525857-32a7-4df0-bc93-0eafcee4e3cb` | `6ad5a44f5ea321156b90154f` |
| [polygolf.lol](https://polygolf.lol) | `dff21fd6-021e-4cf1-a501-16dd349980ba` | `6ad5a438ac046e9183dd8f9b` |

Before publication, both live sites reported application version 0.8.2, replay rules `polygolf-v11` and 648 items. The release preserves the already-live Sky Islands, auction-house and Darby additions. New deployment records, the frozen artifact manifest and production browser captures are retained under the ignored `artifacts/` and `output/playwright/` directories.

## Files reconciled for production

- `dist/`: recovered the already-live modules and Sky/Darby asset; integrated the reviewed clubhouse styles and views without replacing the existing live features. `dist/isles.css` retains feature styles while obsolete Caddie rules yield to the new collection layout.
- `tests/`: updated six existing suites to the already-live catalog, courses and stack rules, and added `live-feature-preservation.test.mjs`.
- `RELEASE-1.3-REPORT.md`: release provenance, validation and rollback records.

Production account purchases, trades and auction writes are not exercised by the browser checks. Existing cloud services are retained without a backend deployment.

## Published verification

- Release source on GitHub main: `5e07222d2c4cef2609ef6ea2cd51be3ec8eb67e4`. Its complete tree matches the checked local release exactly.
- littlelinks.study ready deployment: `6ad66ada6c0f402fd3bf61a1`.
- polygolf.lol ready deployment: `6ad66ae86cad6f1c60910e78`.
- All 213 public files on each site match the committed publication snapshot by SHA-1; Netlify consumes the configuration file separately.
- Public version metadata reports 1.3 and 648 items. Security headers remain present.
- Browser interaction on both domains verified course and collection navigation, the existing guest sign-in gate for Trading, the final Country Club tier, and locker search plus the final reward at 1440 × 960 and 390 × 844. No page runtime errors were recorded.
- The local integrated build also passed every locker at 1440 × 960, 390 × 844 and 907 × 510.
- Deployment uses only committed files; unrelated untracked Desktop metadata and sync duplicates were excluded. Backend and database deployments were unchanged.

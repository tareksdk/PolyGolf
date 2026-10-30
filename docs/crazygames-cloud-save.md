# CrazyGames cloud save · v1.9

The same release runs on both regular sites and in CrazyGames. No backend or
database deployment is needed. The existing regular-site accounts are unchanged.

## Submission settings

- For a hosted iframe, use `https://littlelinks.study/?platform=crazygames`
  (or the same path on `polygolf.lol`). The flag is important when the iframe
  referrer is hidden or the portal uses an affiliated domain.
- Select **Yes, using the Data Module from the CrazyGames SDK**. CrazyGames
  disables the Data Module unless this option is selected.
- This integration supports solo progression. Leave online multiplayer unchecked
  for this build: CrazyGames user-to-backend linking and multiplayer invite flows
  have not been implemented. The normal websites retain online play.
- Verify the build inside CrazyGames Preview before final submission. A direct
  visit to the flagged URL outside CrazyGames is intentionally blocked when the
  SDK reports a disabled environment; the unflagged website remains playable.

## Save behavior

The official v3 SDK is loaded only for a CrazyGames context. Initialization and
reading the cloud save finish before the golfer is created. Existing valid local
progress can migrate once; existing cloud progress wins. Website sessions and
large generated course thumbnails are never copied into cloud storage.

Golfer progression, equipment, settings, tutorial completion, saved/draft maps,
and Planetfall records use the Data Module in portal mode. Course-thumbnail and
notification caches remain device-only. The SDK provides guest storage and
account synchronization. Account changes lock old writes before reloading the
new save, preventing autosave/pagehide from overwriting another account.

An initialization, disabled-module, or invalid-save error shows a retry screen
instead of starting a new default save. Runtime save failures show a warning;
there is no separate local-save fallback in CrazyGames mode. The SDK has a 1 MiB
limit, so large editor collections can reach that limit and need export/cleanup.

The regular sites continue to use their existing local saves, preferences and
PolyGolf backend accounts. SDK loading and gameplay-start/stop reporting are
isolated to the portal mode. No ads or purchases are enabled by this update.

## Required portal verification

Local SDK testing cannot prove remote account synchronization. In Preview:

1. Enable the Data Module and confirm a fresh guest can play and reload.
2. Earn coins/XP, change equipment/settings, and confirm they survive a reload.
3. Sign in to a CrazyGames account; test the SDK's guest-to-account transfer and
   that an existing cloud save takes priority.
4. Sign out/switch accounts, including during a round, and verify separate saves.
5. Open the same CrazyGames account on another device and verify its progress.

Sources: https://docs.crazygames.com/sdk/data/ and
https://docs.crazygames.com/sdk/intro/ .

## Changed files

All changes were made in an isolated checkout from current main. The unfinished
camera/course work in the Desktop checkout was not included or modified.

| File | Change |
| --- | --- |
| `dist/src/crazygames.js` | New SDK initialization, portal detection, safe migration, account-switch guard, loading/gameplay events. |
| `dist/src/progress-storage.js` | New storage routing for portal progress versus ordinary browser progress. |
| `dist/src/main.js` | Wait for portal saves before boot, select repository, warn on save failure, report gameplay state. |
| `dist/src/cloud.js` | Prevent website guest/account restoration from replacing portal saves. |
| `dist/src/expansion.js` | Explain CrazyGames saving instead of displaying external account credentials. |
| `dist/src/onboarding.js` | Store tutorial completion with portal progress; ignore unrelated website logins. |
| `dist/src/studio.js` | Route maps/drafts through portal storage; report failed saves without claiming success. |
| `dist/src/planetfall.js` | Route personal launch records through portal storage. |
| `dist/src/theme.js` | Use the selected progress storage for appearance. |
| `dist/src/planetfall-ui.js` | Correct saved-record and storage-error wording. |
| `dist/src/course-menu.js` | Describe portal versus device record storage accurately. |
| `dist/src/views.js` | Describe where the portal golfer name is saved. |
| `dist/src/version.js` | Display v1.9. |
| `dist/release.json` | v1.9 release metadata and Data Module capability. |
| `package.json` | Synchronize package version to 1.9.0. |
| `tests/crazygames.test.mjs` | New regression tests for save routing, migration, failures and account changes. |
| `docs/crazygames-cloud-save.md` | Submission instructions, implementation recap and remaining verification. |

## Checked before publication

- Automated: 276 tests passed; one existing optional secret-dependent test skipped.
  This includes 15 new portal/save regressions. Static checks passed all 160
  modules and seven pages; `git diff --check` passed.
- Real browser with the official SDK in its documented local mode: tutorial
  completion, 300-coin/50-XP daily reward, graphics and theme survived reloads.
  A shot, pause, three-hole practice completion, scorecard and exit worked.
- Browser failure simulation: blocking the SDK showed a retry screen, created no
  independent local fallback, and retry restored the existing 600-coin/50-XP save.
- Separate regular-site origin: no SDK loaded; local rewards persisted and the
  existing website sign-in form remained available.
- Desktop (1440 × 900) gameplay and phone (390 × 844) save-dialog screenshots
  were captured and inspected. These are browser sizes, not physical-device QA.
- Cloud account switches are regression-tested with SDK fixtures. Actual
  CrazyGames cloud/account and cross-device behavior remains to be checked in
  their Preview after enabling the Data Module; local mode does not prove that.

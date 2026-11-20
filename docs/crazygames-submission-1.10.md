# PolyGolf CrazyGames handoff · v1.10

Prepared on `codex/crazygames-submission-1.10` from current `origin/main`
(`0b0133ad3f1550aa014cceaa97a6742ad5403eb7`). This release is local and has
not been pushed or deployed. The separate Desktop checkout's unfinished work
was preserved. The previous publication authorization covered v1.9 cloud saves.

## Completed

- The CrazyGames home screen prioritizes Play. Unsupported multiplayer,
  competitive, friends, trading, auctions, shared rankings and community-map
  entrances are removed and their navigation actions are blocked.
- Custom fullscreen controls and actions are disabled in portal mode, including
  the settings dialog. The ordinary site retains them.
- The portal uses a secondary, unrewarded Discord link. Website social rewards,
  gift-code entry, account sign-in prompts, price previews and unsupported online
  promotions are absent from the portal interface.
- CrazyGames initial mute settings and settings-change callbacks control audio.
  Muting is immediate and cannot be overridden by the game's volume slider;
  unmuting restores the chosen volume.
- Shot options start collapsed in the portal. The phone shot meter fits the
  viewport, and Play occupies the first row of the phone home menu.
- Three matching covers and both silent gameplay preview formats are prepared.
  The short previews supply the requested video assets; a separate long cinematic
  trailer is unnecessary for these fields.

## What still needs you

1. **Publication:** approve the v1.10 release when you are happy with it. The live
   submission URL still needs this branch's changes. Local review is available at
   `http://127.0.0.1:5190/?platform=crazygames` while the preview server is running.
2. **Developer Portal:** after publication, use
   `https://littlelinks.study/?platform=crazygames` for the iframe. Select
   **Yes, using the Data Module from the CrazyGames SDK**. Leave online multiplayer
   unchecked for this solo portal build; the normal website still offers it.
3. **Real CrazyGames Preview:** test guest saving, guest-to-account transfer,
   restoring an existing account, signing out/switching accounts during a round,
   and restoring the same account on a second device. Check the portal's own
   mute/unmute control, player resizing, and loading time there too. Local SDK
   tests cannot establish server-side synchronization or real hosted performance.
4. **A physical phone/tablet:** play a few holes with touch controls, including
   camera movement, club selection, pause/resume, and returning to the menu.
   Leave the mobile-support checkbox unchecked until those checks pass.
5. **Submission media:** review and upload the five files in
   `assets/crazygames-1.10/`, complete the listing fields, and submit through your
   account. The delivery ZIP contains these assets and instructions.

Full Launch ads/monetization and CrazyGames-linked multiplayer remain separate
future work. They are not enabled by this build. See
[the existing save handoff](crazygames-cloud-save.md) for the v1.9 integration.

## Checked

- Automated: `npm run check` passed 161 modules and seven linked pages.
  `npm test` passed 281 tests, with one existing optional test skipped. The reward
  test now checks both Halloween-active and post-event dates instead of assuming
  seasonal lockers are always available. `git diff --check` passed.
- Real browser with the official SDK's local environment: a fresh tutorial,
  changing its step without exposing sign-in, skipping it, claiming the daily
  reward, changing graphics/volume, and reloading preserved 600 coins, 50 XP,
  low graphics, the selected volume and tutorial completion. Actual Web Audio
  gain stayed zero while muted and returned to the selected volume when unmuted.
- A separate ordinary-site origin retained its tutorial sign-in, account form,
  multiplayer/competitive buttons, fullscreen control and local reward saving.
  The CrazyGames SDK was absent there. No credentials were entered.
- Menu, dialog and gameplay checks covered 907 × 510, 800 × 450 and 390 × 844
  browser sizes. Shots, club-options expansion, pause/resume and returning to the
  clubhouse were exercised. These checks do not establish physical-device support.
- No page exceptions were observed in either fresh browser context. A fresh
  local browser reached the tutorial in 3.806 seconds without network/CPU
  throttling. This is a local development measurement, not a CrazyGames load test.
- `dist/` contains about 8.03 MB in 229 files; submission artwork/videos are kept
  outside it. This is the complete static directory size, not measured initial
  network transfer. Hosted iframe loading still needs Preview verification.
- The three PNG dimensions were inspected. Both MP4s decoded successfully, use
  H.264/yuv420p with no audio stream, last 17.0/16.9 seconds, and are under 50 MB.
  Representative gameplay frames, both first frames and all covers were reviewed.
- The live `littlelinks.study` version was still v1.9. Requests to `polygolf.lol`
  reset the connection from this environment, so that alias needs a separate
  availability check before any publication verification claims.

Browser screenshots, recordings and `browser-results.json` are in
`output/playwright/submission-1.10/` locally. The original raw footage is not
included in the upload pack.

## Files changed

| File | Purpose |
| --- | --- |
| `dist/src/crazygames-ui.js` (new) | Portal control cleanup, blocked actions and initially collapsed shot options. |
| `dist/crazygames.css` (new) | Portal home layout and phone shot-meter fit. |
| `dist/index.html` | Load the portal stylesheet. |
| `dist/src/main.js` | Install portal UI and bind audio settings. |
| `dist/src/crazygames.js` | Apply initial SDK mute settings and subscribe to changes. |
| `dist/src/audio.js` | Immediate platform muting and chosen-volume restoration. |
| `dist/src/home-menu.js` | Solo portal tiles, save status and secondary Discord entry. |
| `dist/src/views.js` | Omit unavailable portal header navigation. |
| `dist/src/shop-view.js` | Remove the portal purchase shelf and label its community tab Discord. |
| `dist/src/social-view.js` | Ordinary, unrewarded Discord link in portal mode. |
| `dist/src/onboarding.js` | Keep external account sign-in absent at every portal tutorial step. |
| `dist/src/online-activity.js` | Avoid website-only activity and promotion requests in portal mode. |
| `dist/src/version.js`, `dist/release.json`, `package.json` | Synchronize v1.10 / package 1.10.0 and release metadata. |
| `tests/crazygames-ui.test.mjs` (new) | Portal navigation, ordinary-site isolation and mute regressions. |
| `tests/clubhouse-v8.test.mjs` | Correct date-sensitive seasonal reward expectations. |
| `assets/crazygames-1.10/` (new) | Three final PNG covers, two MP4 previews, original artwork/reference, exact prompts, media manifest and README. |
| `docs/crazygames-submission-1.10.md` (new) | This recap, check evidence and remaining user tasks. |

Sources:
[Covers and videos](https://docs.crazygames.com/requirements/game-covers/),
[gameplay requirements](https://docs.crazygames.com/requirements/gameplay/),
[SDK game settings](https://docs.crazygames.com/sdk/game/),
[Data Module](https://docs.crazygames.com/sdk/data/).

# PolyGolf v1.12: Supabase usage reduction

Release published 2026-11-17 and checked again 2026-11-18. Includes the shared Room310 pages at the user's request.

## Release state

- **Live:** Supabase project `khbmuaitysznyxxefhou`, `little-links` Edge Function **v40 ACTIVE**. The deployed 44-file bundle was fetched again and every file matched the submitted bundle. Only `index.ts`, `rooms.ts`, and `social.ts` changed; all other live shared game modules were retained.
- **Live:** PolyGolf v1.12 on littlelinks.study (`6afcf5cc26e52626ba554c77`) and polygolf.lol (`6afcf5e8c274ea5e4aed6b89`), plus Room310 v0.19.0 on projectroom310.com. The owning Netlify account was successfully authorized. Current deploy IDs and complete file-digest checks are recorded in `artifacts/usage-publish-1.12/production-verification.json`.
- The PolyGolf v1.11 menu work was checkpointed at `53392cd` before this branch. It remains local. The traffic-only production candidate at `artifacts/usage-live-1.12/dist/` starts from production commit `0b0133a`, preserving the published menus.
- Original Desktop PolyGolf and Room310 working files were preserved. No database migration, account deletion, balance change, paid plan change, or spend-cap change was made.

## Confirmed problem

The user reported 12.5 GB egress against 5 GB and log ingestion slightly above a 1 GB allowance. The exact billing counters were not independently available through the connected tools.

The public API returned **HTTP 402, `exceed_egress_quota`**, so online service was already restricted. Reducing future traffic cannot erase already consumed usage or by itself lift that restriction. See [Supabase egress usage](https://supabase.com/docs/guides/platform/manage-your-usage/egress).

Read-only production inspection found:

- 458 golfer saves, average 4,109 bytes, p95 14,841 bytes, maximum 218,674 bytes.
- 56 published standalone games containing about 546 MB of source altogether; the largest is about 28 MB. There is also one published hosted ZIP game.
- In the inspected November 17 log window, 952 Auth token refresh attempts returned 402. Repeated catalog, collection, and golf settings reads also failed with 402.
- Existing Postgres settings already disable connection/disconnection and slow-query statement logging; normal request events were the relevant volume. Log protections were retained. [Supabase log ingestion](https://supabase.com/docs/guides/platform/manage-your-usage/logs-ingest) describes the automatically collected services.

The available logs did not contain per-request response-byte totals. No single feature is claimed to explain all 12.5 GB.

## Changes

The live backend selects only needed player fields on room, friend, and notification requests. It avoids rewriting unchanged rooms, persists room heartbeats at most every 30 seconds, returns a small unchanged-revision response to capable clients, and avoids profile-update response copies. Existing authentication, membership, rate limits, score verification, bot progress, and server deadlines remain enforced.

The prepared browser update shares identical in-flight reads, caches public leaderboard reads for a minute, reads home settings at most every ten minutes, and polls notification and honor summaries every five minutes. Room reconciliation changes from about 2.5 seconds to four seconds in lobbies and eight seconds while playing; hidden tabs use 30 seconds. Live motion still uses private Realtime broadcasts at the existing moving update rates. Idle broadcasts are less frequent and cosmetic coordinates are compacted without changing gameplay physics.

HTTP 402/429 starts a shared request cooldown instead of repeatedly contacting a restricted project. Saved sign-ins are retained. Failed Realtime connections back off and hidden games close their cosmetic channel until visible again.

Room310's [companion report](/Users/jacobaleo/.codex/projects/room310-usage-0-16/docs/supabase-usage-0.19.md) covers the shared site. Published catalogs have bounded public-only caches; reviewed game sources use the existing Netlify CDN; hosted ZIP requests share a bounded warm-worker download cache. Private editor files and account responses are excluded.

## Measured workloads, not billing forecasts

`scripts/measure-network-usage.mjs` executes the previous and new actual client polling and Edge handlers against a local HTTP fixture for one simulated hour. A 100 KB synthetic save history deliberately exercises the large-save case. No production requests are made. Results are stored in `output/playwright/network-usage-1.12.json`.

| One golfer, one hour | Previous | Candidate | Reduction |
| --- | ---: | ---: | ---: |
| Lobby room requests | 1,440 | 900 | 37.5% |
| Playing room requests | 1,440 | 450 | 68.8% |
| Playing upstream requests | 8,640 | 2,362 | 72.7% |
| Room-state writes | 1,440 | 112 | 92.2% |
| Scheduled idle menu requests | 200 | 30 | 85.0% |

Room-state writes exclude independent rate-limit bookkeeping. Synthetic large-save JSON transfer fell over 99%, but actual saves are generally smaller; this is **not** a predicted bill reduction. Real usage depends on concurrent players, sessions, cold caches, and which games people open. Room310 tests show 60 simultaneous asset requests sharing one ZIP download and one publication query in a warm worker.

## Validation

- `node scripts/check.mjs`: 161 modules and seven pages passed syntax/import/link checks.
- PolyGolf full suite: 294 tests, 292 passed, one optional skip, one existing seasonal assertion failure in `tests/clubhouse-v8.test.mjs:13`. That test expects the ended Halloween locker pool. It was reproduced on the unchanged earlier baseline; reward behavior was not changed here.
- Focused backend/network/cloud/live checks passed, including authorization, membership, response projection, account isolation, retry behavior, session retention, and stale-room protection.
- Real browser interaction at localhost: launched Willow Park, took a shot, paused, resumed, and returned to the clubhouse. Room310's actual quota error was inspected at desktop and mobile widths. Its current live player bundle also ran a controlled local reviewed-game fixture through the new CDN route, accepted input, and retained its opaque iframe sandbox.
- Official Netlify function packaging succeeded. Live multiplayer/accounts and successful game-source CDN hit rates remain unverified while the project's public API is quota-restricted. The deployed source handler rejected an invalid slug with HTTP 404. Supabase still returned HTTP 402 `exceed_egress_quota` after publication.
- Production verification matched every published file to the reviewed manifests: 228 files on each PolyGolf site and 183 on Room310. Protected PolyGolf previews passed onboarding, round start, a shot, pause/resume, and return-to-clubhouse checks. The live polygolf.lol page displayed v1.12 without application errors. Room310's public production page displayed v0.19.0, installed the network budget, and had no application errors or horizontal overflow at desktop/mobile widths.
- Five unchanged Room310 function archives were recovered from `/Users/jacobaleo/Desktop/allthat/room310/output/live-source-0.18.1/.netlify/functions/` and exactly matched the live SHA-256 digests. All seven functions were then deployed, including the new source handler and updated asset handler. Existing routes, rate limits, runtime, streaming mode, and memory were verified. Normal redeployment used the site's already configured default US East region; no paid plan or region setting was changed.

## Files changed in this prompt

- `backend/index.ts`, `backend/rooms.ts`, `backend/social.ts`: deployed backend traffic reductions.
- `dist/src/network-policy.js`: new shared timing and read policy.
- `dist/src/cloud.js`, `dist/src/online-activity.js`: request coalescing, smaller reads, bounded caches, quota cooldown, room reconciliation.
- `dist/src/notifications.js`, `dist/src/honors-ui.js`, `dist/src/competitive-ui.js`: less frequent, visibility-aware background checks.
- `dist/src/live-state.js`, `dist/src/live-round.js`, `dist/src/live-transport.js`: compact cosmetic packets, quieter idle/background channels, reconnect backoff.
- `dist/src/version.js`, `dist/release.json`, `package.json`: v1.12 metadata.
- `tests/backend-usage.test.mjs`, `tests/network-usage.test.mjs`, `tests/helpers/backend-usage-fixture.mjs`: actual-handler and client regression coverage with local fixtures.
- `scripts/measure-network-usage.mjs`: reproducible before/after workload measurement.
- This report; ignored release/QA files under `artifacts/`, `output/`, and `.sites-runtime/`.

Future releases must retain the local-only menu boundary and merge with current live manifests. Do not publish this checkout's local redesigned `dist/` as a traffic-only update. Room310's copied working source predates its live editor features; its genuine v0.18.1 source backup is in the original checkout's `output/live-source-0.18.1/`. Room310 is connected to Git: a future main-branch deployment can replace this manual release. No automatic-publishing or deployment-lock setting was changed.

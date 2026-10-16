# Supabase setup

The ZIP contains the static application and all backend source. The connected project is already configured; running `node server.mjs` from the project root uses it. Only its public URL and publishable key are in `dist/src/cloud.js`. No service key, user password or test session is included.

For a fresh Supabase project, apply these SQL files in order:

1. `schema.sql`
2. `community-schema.sql`
3. `social-schema.sql`
4. `community-modes.sql` (mode-filtered community browsing and its index)
5. `competitive-schema.sql` (ratings, queue, matches and service-only settlement functions)

For an existing original Little Links (now PolyGolf) database, apply only the files that are not already recorded in its migration history. The live Clubhouse update is recorded as `clubhouse_profiles_friends_three_holes`. The previous `migrations/20260917_fix_room_conflict_retry.sql` is retained for existing installations; fresh `schema.sql` includes that fix. Do not reapply the original table-creation scripts to an existing database.

The `golf_friends` and `golf_rate_limits` tables intentionally have RLS enabled without client policies. Only the server can access them. `golf_commit`, `golf_room_cas`, and `golf_friend_action` are service-only RPCs. Application revision conflicts use SQLSTATE `PT409`, avoiding PostgREST's transaction retry behavior for `40001`.

To deploy the `little-links` Edge Function, place `index.ts`, `social.ts` and `competitive.ts` in its function directory, with these current frontend modules copied into a `shared/` subdirectory:

```
catalog.js
cup-capture.js
course-features.js
ranks.js
community-rewards.js
competitive-rules.js
forest.js
courses.js
equipment.js
golf-courses.js
golf-maps.js
golf-physics.js
maps.js
physics.js
profile-data.js
pro-shop.js
replay.js
save.js
```

PolyGolf release note: this version changes `catalog.js` (13 appended items), `pro-shop.js` (five new lockers) and `equipment.js` (mini-golf effects for the new putters). Redeploy the function with these copies **before** the frontend; see `../DEPLOY.md`. For the Willow nine-hole update, reapply `ranked-bots.sql` as described below. The function keeps its `little-links` name so existing clients and sessions continue to work.

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function runtime. Disable gateway JWT verification for this function because signup/login use the same endpoint. The handler independently verifies every protected request through Supabase Auth; never remove that verification. Username-only accounts use synthetic addresses under `players.littlelinks.invalid`, so there is no email recovery.

When using another Supabase project or frontend origin, update the public URL/key in `dist/src/cloud.js` and the CORS origin allowlist in `index.ts`. The deployed allowlist includes `https://littlelinks.study`, `https://www.littlelinks.study`, `https://little-links-golf.netlify.app`, the original Sites address, and localhost. Keep secret keys out of the frontend. Deploy matching shared course/physics modules before deploying the static frontend. Old in-progress rounds are rejected with a reload message when their rules version differs.

Willow Park has nine full-golf holes; Saltwind Links and Autumn Pines retain three each. New rounds use `polygolf-v9`. Redeploy the matching shared modules and reapply `ranked-bots.sql` before publishing this frontend. Historical 18-hole rounds and records remain stored as `legacy-v1`; new records use `links-v4`; prior `clubhouse-v2` records remain stored separately. The public leaderboard filters on version and hole count.

Live QA scripts create temporary golfers and write credentials to ignored `.sites-runtime/`. They are deliberately separate from the offline unit tests. Remove only the generated test IDs after QA, including their room rows and rate-limit entries. Never run test cleanup against ordinary player accounts.

Normal and mini-golf map saving/publishing requires player level 10. Country Club also requires level 10 and 30,000 tokens. Locker openings use cryptographic randomness, persist receipts and commit inventory/currency atomically. Both community modes use the service-only `golf_community_v2` query; older mini-golf rows without a mode field remain visible as mini-golf. Existing accounts and balances are not reset.

Competitive ratings, queue and matches have RLS enabled and no client grants. The Edge Function derives the user from verified Auth and passes server-owned equipment to matchmaking. It replays sudden-death shots; browser-supplied distances, winners and Elo are ignored. The schema's service-only functions serialize queue pairing and use row locks for idempotent Elo settlement.

The rollback-only database test is `tests/competitive-db.sql`. To validate a fresh schema, concatenate it after `competitive-schema.sql` with that file’s final COMMIT removed. It creates temporary fixtures within a transaction and rolls them back, including the schema installation. Apply the schema separately after the checks pass. The connected project has passed this validation.

For current deployments, `node scripts/package-backend.mjs` resolves the complete shared dependency list automatically. The v6 release uses existing JSON player state; no new tables are needed. Both custom domains are allowed by CORS.

## October 2 trading update

Apply `trading.sql`, then redeploy the complete function bundle. `trading.ts` validates friend relationships, eligible inventory and exact pattern IDs. The service-only SQL functions exchange both inventories atomically and prevent stale/repeated transfers. Read-only activity configuration is in `golf_site_settings`; see ../DEPLOY.md. Country Club currently costs 50,000 coins; earlier prices above describe historical releases.

## October 2 follow-up

The exact code `100k` grants 100,000 coins once per account through `redeem_code`. Its SHA-256 digest lives in the reward map in index.ts.

`ranked_leaderboard` is a public read-only action exposing only username, public user ID, Elo, rank, wins, losses and matches. It returns the top 100 golfers with a completed ranked match, ordered by Elo then wins and ID. Rating tables remain service-only.

The final verified hole performs a 10% locker roll using a server-secret HMAC of the player and round IDs. It selects equally among all lockers on success. The locker and bonus receipt commit atomically with the completed round; retries return the same receipt without another award. No schema change is required for these follow-ups.

## October 4 launch

After the complete Edge Function bundle, apply `launch-2026.sql`. It adds the editable home splash columns and permanent first-100 OG eligibility. The live rollback verification is `tests/launch-db.sql`. Shared `season.js` ends new Halloween rewards at midnight New York time on November 1 while preserving owned inventory. Always use `scripts/package-backend.mjs` to include every relative dependency, rather than the historical manual list above. No player balances are reset.

## October 5 performance, trading and live opponents

Apply `trading-coins.sql` to existing installations and `live-opponents.sql`, then publish the complete function bundle before the frontend. Coin amounts are reviewed explicitly, checked against current balances, and transferred inside the existing ordered-lock transaction. Older clients cannot accept a coin trade without the version-2 review screen.

Multiplayer movement uses private Supabase Realtime Broadcast channels, not `golf_presence` writes. The channel is `polygolf:room:<room-id>:<player-id>` or `polygolf:ranked:<match-id>:<player-id>`. RLS allows current participants to read and only that player to send. Payloads are bounded and cosmetic; authoritative score replay is unchanged. Clients send 6 moving snapshots/second in small matches, 3/second in larger rooms, and 1/second at rest, with interpolation, heartbeats and capped reconnect backoff. Each opponent has one ribbon mesh and shares golfer geometry. Disabling Show opponents skips remote presentation while continuing to broadcast your own player.

This project had no `realtime.messages` partitions. `realtime-bootstrap.sql` repaired yesterday through three days ahead using Supabase's daily names and ownership. Supabase Realtime owns subsequent partition maintenance. If an installation reports `MissingPartition`, inspect its Realtime service before retrying joins; do not add rapid database polling. Rollback-only validation: `tests/live-opponents-db.sql` and `tests/trading-coins-db.sql`.
# Bot matchmaking

Apply `ranked-bots.sql` after `competitive-schema.sql` and `competitive-version.sql`, then deploy the Edge bundle including `rooms.ts` and shared `bots.js`. Run `tests/bots-db.sql` and `tests/competitive-db.sql`; both roll back their fixtures and defer if real players are queued. All ranked RPCs remain service-role only. The Edge Function verifies the caller before supplying their user ID.

Bot matches store their plan in `golf_ranked_matches.bot` with a null `b_id` and `b_round`. Only the human receives a replay-verified round and rating changes. Never insert fake Auth users for bots. Room bot plans live in room state and are changed only through the host-checked Edge handler and revision compare-and-swap. Bot clock and score updates are server-owned; client animation cannot submit bot scores.


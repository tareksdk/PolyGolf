## Cinder Crown and meter cancellation · v1.5

Apply `backend/cinder-crown.sql` to extend only the round-course constraint to 18. Existing scores, accounts and rule keys are retained. The backend source was reconciled against live function version 37, preserving auctions, stacked-item trades, trade-ups and Darby. Deploy the complete 43-file `little-links` bundle before publishing `dist/` to both existing sites. Keep gateway JWT verification at its existing disabled setting; protected actions validate their bearer token inside the handler. Replay rules remain `polygolf-v11`. Verify daily course 18, weekly sprint keys, both meters and both public domains.

## Long-course adventures · v1.1

Preserve the recovered live First Swing/Meadowcrest, item, profile and rematch features included in this source. Apply `backend/long-courses.sql` once to extend the round-course constraint to 16; it does not modify records. Replay version stays `polygolf-v11`, and existing record keys stay intact. Package/deploy the matching `little-links` function first, including the new shared encounter and layout modules, then publish the same `dist/` snapshot to both existing sites. Do not deploy QA files. Verify v1.1, Classics, Adventures and Long rounds on both domains. New long rounds inherit the original course unlock levels.

## Living adventures · v0.5

This release combines the recovered October 15 production adventure build with v0.4's scenery, weather and bunker improvements. Deploy the complete packaged `little-links` function (including `shared/rotating-courses.js`), apply `backend/ranked-bots.sql` for the `polygolf-v10` guard and nine-hole Willow matchmaking, then publish the identical `dist/` snapshot to both existing sites. Keep the existing production guest/rotation database columns and functions. Do not replace the live adventure update with an older branch snapshot. Verify Hollow Lanterns, weekly/daily cards, guest room entry, invite links, nine-hole Willow and all three weather controls before declaring release complete.

## Living skies and bunker feel · v0.4 (local review)

Do not publish this branch without a release request. Bunker physics now use `polygolf-v9`: deploy the complete packaged `little-links` Edge Function, then reapply `backend/ranked-bots.sql`, before publishing `dist/` to either existing site. The bot migration now safely preserves its already-installed opponent constraint when reapplied. Existing v8 rounds need a fresh start after a future release. Weather is local presentation only and resets to Normal on every hole; no weather columns, account changes or new database objects are needed.

## Willow Park nine-hole landscape update · v0.3

This branch is a local preview. Before a future release, deploy the packaged Edge Function with the matching shared course modules, then apply `backend/ranked-bots.sql` (updates the matchmaking version guard, per-course round sizes and saved bot plans), then publish `dist/`. Fresh installations use the updated `competitive-schema.sql`, followed by `ranked-bots.sql`. Willow Park is nine holes / par 36; the other full-golf courses stay three holes / par 12. Replay version is `polygolf-v8`; old in-progress rounds need a fresh start. Existing accounts, items and historical scores are preserved.

# Deploying PolyGolf

Run the checks in README.md before release. No frontend compilation is required: Netlify publishes `dist/`.

## Supabase

The existing project is `khbmuaitysznyxxefhou`, function `little-links`. Run `node scripts/package-backend.mjs` to assemble `artifacts/backend-deploy.json`, including all relative imports. Send that payload to Supabase's Edge Function deployment API/tool. Gateway JWT verification remains disabled because login and signup are public; protected operations independently validate the bearer token with Supabase Auth. Never put service-role credentials in the client or Git.

Apply `backend/competitive-version.sql` to existing installations to align ranked matchmaking with `polygolf-v8`. Fresh projects use the updated guard in `competitive-schema.sql`. When changing `RULES_VERSION`, update both SQL guards and the transactional competitive fixture; the regression test checks this agreement.

The October 2 interface/trading update requires `backend/trading.sql` before deploying the Edge Function. It adds service-only trade transactions and public read-only activity settings. It was applied to the connected project as `trading_and_activity_settings`. Replay version remains `polygolf-v6`; existing course scores are compatible. Preserve the previous Edge Function and Netlify deploy IDs before release.

The later `patterns-1` content update retains replay version `polygolf-v6`. Deploy its backend first to add the Forge/Workshop lockers, seed-aware equipment, community visit rewards and Levi code. Pattern inventories use the existing JSON state; no SQL migration is needed. The home page is unchanged. Do not include any `qa-*` preview files in `dist/`.

## Editing the activity estimate

In Supabase → Table Editor → `golf_site_settings`, edit `online_base` on the `activity` row. For example, 100 gives an integer display between 95 and 105. Use `enabled = false` to hide it. The game checks this configuration once per minute and updates the display every 15 seconds. It is clearly labelled **Online estimate** with a tooltip explaining that it is studio-set, not measured live presence. Anonymous clients can only read this row, never edit it.

## Trading and sessions

Offers are between accepted friends, contain 1–5 exact items on each side, and expire after 24 hours. Shop, bundle and locker items may be traded; starter, level, Country Club, code, rank and achievement rewards are excluded. The recipient reviews and accepts. `golf_trade_accept` locks both players in UUID order, checks both revisions, then changes both inventories and the offer in one transaction. Retries are idempotent. Only the service role can execute it. `tests/trading-db.sql` checks the live SQL inside a rollback-only transaction.

Authentication tokens persist in localStorage under `little-links.session`; legacy sessionStorage is migrated. Refreshes use a cross-tab Web Lock where supported. Offline errors keep the saved session; explicit logout clears both stores. Authentication remains specific to each domain/browser. Passwords are never saved by the game.

## Netlify sites

Deploy the same tested directory to the two existing sites:

- `netlify deploy --dir=dist --prod --no-build --site=77525857-32a7-4df0-bc93-0eafcee4e3cb` · littlelinks.study
- `netlify deploy --dir=dist --prod --no-build --site=dff21fd6-021e-4cf1-a501-16dd349980ba` · polygolf.lol

Verify /release.json, home, legal pages and Supabase preflight from both origins. Both domains share cloud accounts, but guest browser storage and sessions are origin-specific.

## Source and archive

New release repository: `tareksdk/PolyGolf` (private). Previous repository: `tareksdk/little-links`. Commit only game source, assets, tests and docs. Exclude authentication, .netlify, generated tooling, QA output, artifacts, and unrelated workspace folders. The source ZIP should exclude those same local files and include Blender source plus the complete dist and backend trees.

## October 4 launch update

Replay version is `polygolf-v7`; older active rounds need a fresh start after reloading. Deploy the Edge Function first, then apply `backend/launch-2026.sql`, then publish the frontend. The migration awards the first 100 accounts their OG plate and creates permanent reserved seats, including after an account is deleted. It is safe to reapply and preserves existing activity settings. Run `tests/launch-db.sql` as a rollback-only verification.

In Supabase → Table Editor → `golf_site_settings` → `activity`, edit `home_message`, `home_message_color` (six-digit hex, for example `#F1D982`), `home_message_size` (12–40), and `home_message_rotation` (-180 to 180 degrees). `0` is straight, negative angles tilt left, and positive angles tilt right. Blank text hides the message. Clients refresh within a minute. Apply `backend/home-message-rotation.sql` after `backend/launch-2026.sql` when setting up a new project.

Halloween availability is shared by browser and backend in `dist/src/season.js`. It ends at `2026-11-01T00:00:00-04:00`. Decorations, new locker purchases, new random Halloween drops and new pumpkin discoveries end automatically. Owned items remain equippable and tradable under the normal rules; already-owned Halloween lockers can still be opened. Do not delete seasonal catalogue entries.

Public support is room310support@gmail.com. Room310 Discord: https://discord.gg/VCEvxCfF6m.
# October 5 update

For existing Supabase installs, apply `backend/trading-coins.sql` and `backend/live-opponents.sql`, then deploy the function bundle from `node scripts/package-backend.mjs`. Publish `dist/` after the backend. The connected production project has both migrations and function version 19. `backend/realtime-bootstrap.sql` records the one-time repair of its missing Realtime message partitions; ongoing daily partitions are managed by Supabase.

The frontend uses authenticated private Broadcast channels for player visuals in both room and ranked matches. No extra position polling or per-frame database writes are needed. Keep Realtime enabled. The visibility preference is local and defaults to on. Physics/replay version remains `polygolf-v7` because networking changes only presentation.

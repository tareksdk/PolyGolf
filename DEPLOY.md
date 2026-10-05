# Deploying PolyGolf

Run the checks in README.md before release. No frontend compilation is required: Netlify publishes `dist/`.

## Supabase

The existing project is `khbmuaitysznyxxefhou`, function `little-links`. Run `node scripts/package-backend.mjs` to assemble `artifacts/backend-deploy.json`, including all relative imports. Send that payload to Supabase's Edge Function deployment API/tool. Gateway JWT verification remains disabled because login and signup are public; protected operations independently validate the bearer token with Supabase Auth. Never put service-role credentials in the client or Git.

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

In Supabase → Table Editor → `golf_site_settings` → `activity`, edit `home_message`, `home_message_color` (six-digit hex, for example `#F1D982`) and `home_message_size` (12–40). Blank text hides the message. Clients refresh within a minute.

Halloween availability is shared by browser and backend in `dist/src/season.js`. It ends at `2026-11-01T00:00:00-04:00`. Decorations, new locker purchases, new random Halloween drops and new pumpkin discoveries end automatically. Owned items remain equippable and tradable under the normal rules; already-owned Halloween lockers can still be opened. Do not delete seasonal catalogue entries.

Public support is room310support@gmail.com. Room310 Discord: https://discord.gg/VCEvxCfF6m.

# PolyGolf · October 5, 2026

Bot update: ranked matchmaking first checks for a human, then fills with a labelled bot after 60 seconds of continuous queue time for Rookie, Bronze and Silver (under 1300 Elo). Gold and higher remain human-only. Bot round totals are +1 (30%), par (40%), -1 (26%), -2 (3%) or -3 (1%). Plans are saved on the server; retries cannot reroll them. Bot wins, losses, forfeits and sudden death settle Elo once. Bots do not create fake accounts or leaderboard entries.

Private-room hosts can add or remove bots and fill remaining slots, up to eight golfers total. A joining human replaces a bot in a full waiting lobby. Bot golfers, balls, swings and trails use the existing opponent display setting. Their shots are animated along the course route from a server-owned score plan. Competitive and Editor have exchanged places on Home.

Bot validation: 140 tests pass, including room permissions, score timing, bot distributions and visual packets. Rollback-only live database checks cover the 60-second gate, Silver/Gold boundary, human priority, queue reset, saved scores, Elo, ties, retries, forfeit and backend-only permissions. Existing human-ranked regression checks also pass.

- Caddie category changes update only the collection. Item artwork loads asynchronously in a worker and is cached on disk. Added search, rarity filters, sorting, and a continuous equipped trail in the floating island preview.
- Direction timing is slower and updates every frame. A click locks the last displayed direction. Shot prediction runs off the main thread, with a chunked fallback for older browsers.
- Locker Skip cancels the opening, spinning reel and reveal delay. It always reveals the already awarded result and never purchases twice.
- Trading uses visual inventory panels and removable item slots, with coins on either side. The backend rechecks ownership, balances and revisions, then commits both players atomically.
- Private Realtime channels show opponents in casual and ranked games: golfers, ball positions, equipped clubs and ball patterns, ribbon trails, emotes and goal celebrations. Interpolation smooths network updates. The default-on setting can hide opponents; it does not hide you from other players. Other-hole markers avoid drawing opponents on the wrong ranked hole. Visual packets never determine scores or Elo.
- Country Club purchases now reveal a large animated membership seal, confetti and perk cards. Ranked results use readable colours in both themes. Buttons lift subtly on hover. The home camera moves 40% faster while keeping its small drift.

Validation: 135 automated tests passed. Live rollback-only database tests cover atomic coin transfers, private room/ranked authorization, matchmaking, Elo settlement, sudden death and disconnects. Broadcasts as another player and unauthenticated private joins are rejected. Browser checks use offline fixtures and do not spend player coins. No physical Chromebook or two-account live match was available for the final visual checks.

Measured on the desktop test browser: caddie category HTML updates take roughly 20–47 ms versus 5–8 seconds before this update. First-time artwork loads separately; warm artwork is cached. This is a UI timing measurement, not a Chromebook frame-rate guarantee.

## October 4 release

Social UI: corrected multiplayer player-count and sent-request badge contrast in both themes. Added padding around Friends avatars, consistent 48px icons, and stacked row actions on small screens. Desktop and 390px phone layouts verified.

Follow-up: compact Caddie setup and collection controls, larger gift-code entry, custom Developer/Staff/Halloween insignias, and three shiny code-only studio nameplates. Room310 uses a door badge, OneShotStudios a target, and the combined plate has the brightest prismatic finish. The same vector badges appear in item artwork and live nameplates.

The home message now has a Supabase-editable rotation in degrees. Remaining public Little Links branding has been replaced with PolyGolf. Ranked matchmaking's database version guard now accepts the current replay version; its previous guard rejected current clients.

Follow-up validation: 120 automated checks; deployed ranked SQL transaction checks for level gating, pairing, current replay rules, Elo, retries, sudden death, forfeits, disconnects and permissions. All database fixtures rolled back. Gift entry and Caddie were inspected at desktop and phone sizes in both themes.

- Sharper analytical grass stripes, clean fairway borders, repaired Saltwind cliff seams and a smaller stepped waterfall rock formation. Blender kit v8 includes seasonal pumpkins.
- Separate power and direction inputs, bouncing meters, hidden HUD during motion and cup celebrations, and a collapsible shot panel on every screen size.
- Consistent foreground/background colours in both themes, balanced page gutters, corrected top navigation and multiplayer icon, unframed Caddie island, direct Community rewards links and scrollable credits without the visible scrollbar.
- Halloween Locker with 13 finishes plus two Autumn Pines pumpkin discovery rewards. The 2026 event ends automatically on November 1 at midnight New York time. Earned inventory remains usable.
- OG plate for the first 100 accounts, plus code-only Developer and Staff plates. The broad collection code cannot bypass those unlocks.
- Editable home splash message, colour and size; very slow background drift; higher daily rewards.
- Updated support address, Discord, credits, cookies policy and community rules; signup age/terms acknowledgement.
- Smaller Low-quality terrain meshes, 30 FPS menu cap and suspended drawing while hidden. Physical Chromebook performance has not been benchmarked.

- Custom settings selections, muted sage home appearance, and three original music choices with smooth transitions. Closing dialogs no longer flash white.

Validation: 118 automated checks passed; all 9 golf and 45 mini-golf holes completed from their tees. Live database checks passed with fixtures rolled back. Desktop and phone UI checks verified the two-input swing, hidden moving-ball HUD, theme contrast, and modal exit colours. A local High-quality round measured 16.7 ms median / 16.8 ms p95; this is not a Chromebook benchmark.

# PolyGolf · October 2, 2026

## Interface, trading and scenery

- Light mode in Settings restores the cream-and-white palette and persists per browser.
- Course and community map cards launch from their image or background. Item, locker, bundle and friend cards open their main action without overriding secondary controls.
- Fixed dark/light contrast in mode switches, highlighted leaderboard rows, result scorecards and settings toggles.
- Restored the live floating-island Caddie preview; owned gear equips independently of shop rotation.
- Exact gift code `100k` grants 100,000 coins once per signed-in account.
- Completed standard rounds have a 10% chance to award one random locker. All nine lockers have equal selection odds after a successful drop; practice/custom/skipped rounds and sudden death do not qualify. Server rolls stay stable across retries and commit with the final hole.
- B opens the in-game emote wheel; 1–6 select owned emotes, with paging and touch controls. Normal-golf characters animate their gesture.
- Ranked Elo standings are available in Leaderboards. Shop achievements display directly in their tab.

- Shared green clubhouse styling for Caddie, shop, editors, multiplayer, competitive, profiles and Controls. Existing home layout retained, with a labelled activity estimate.
- Persistent sign-in, migration from tab storage, cross-tab refresh locking and recovery from temporary outages.
- Bouncing power and direction meters. A straight full-power shot is reachable each cycle; the guide previews the actual direction during charging.
- Friend trades with 1–5 eligible items per side, exact pattern preservation, recipient review, 24-hour expiry and atomic server settlement. Exclusive earned items cannot be traded.
- Fixed high-quality supersampling, higher-resolution item and course previews, sharper shadows, a smooth sky and animated ocean.
- Blender v7 mountain ridges, populated coastal islands and an 8,086-triangle pirate brig. Achievement hit volumes cover its upper sails and quarterdeck.
- Supabase-editable activity estimate within ±5%, clearly identified as a studio-set estimate. Default base 100.

Validation: 102 automated tests passed; transaction-only Supabase tests covered authorization, revision conflicts, acceptance, expiry and retries. Offline browser fixtures checked trade composition/acceptance without moving real inventory. Desktop and 390px mobile layouts inspected. Replay version remains polygolf-v6; apply trading.sql before the new Edge Function.

# PolyGolf · September 28, 2026

## Pattern collection update

- Courses and Room310 community use compact green panels matching the existing home menu. Home markup and styling are unchanged.
- 18 original patterned drivers, putters and balls: Field Camo, Tiger Grain, Frostline, Folded Steel, Oil Slick and Case Hardened. Catalogue total: 608.
- Forge Locker (6,500 coins, 8% Case Hardened) and Workshop Locker (2,800 coins, 2% Case Hardened), with full odds and contents shown before opening.
- Random server-minted seeds 000–999 persist in Supabase and local guest saves. Caddie pattern selection, locker reveals, equipment and public profile previews use the saved finish. Different seeds are collected separately; identical item/seed duplicates follow normal refund rules.
- Exact code `greatidealevi` grants 20 earned Forge Lockers once per account. Levi Morin is credited last in the team list as Great Idea.
- Community rewards are paid on link click. Following and joining remain optional; there is no separate claim button or third-party verification.
- Original object-space materials add no texture downloads or mesh layers. Model caches are bounded to avoid retaining hundreds of finish materials.

Validation: 76 automated tests passed, including atomic code redemption, seeded inventory persistence, unowned-pattern rejection, idempotent openings and community rewards. Desktop and 390px phone layouts visually checked. Blue/gold contact sheet, Caddie selection, live model appearance and earned locker reveal checked in WebGL. Replay rules remain `polygolf-v6`; no SQL migration.

## Earlier September update

- Smaller visible cups, with swept scoring detection that accepts firmer central putts in both modes.
- Proportional gameplay clubs, matte low-poly equipment, repaired driver faces, and continuous ball trails.
- Deeper bunker terrain, varied mountain ridges, Blender-authored sea stacks, and an offshore pirate ship at Saltwind Links. A verified hit unlocks the Jolly Roger ball and Captain of the Coast nameplate.
- More expensive items and lockers, balanced against increased hole, round and daily coin rewards.
- Item-shop collections, rarity borders, membership/coin-pack previews. All real-money buttons only display Coming Soon.
- A 50,000-coin Country Club membership and 30-tier pass with one free reward and one member item per tier. The other 48 member finishes are in a separate members-only collection; previously earned rewards are preserved.
- Shared profile layouts, equipped nameplates in profiles and matches, and permanent rank nameplates earned after a competitive match.
- Responsive home navigation, a simple flag logo, updated Oliver Sadler credit, and completed privacy, terms, copyright and contact pages.
- Room310 Instagram, X, YouTube and Discord links (reward flow superseded by the pattern collection update above).
- Spatial forest batches, low-detail trees on Low, reduced terrain/thumbnail pixel cost, less frequent shadow updates and adaptive rendering resolution.

Validation: 72 automated tests; all 45 mini-golf holes and nine full-golf holes completed from their tees with shipped physics; local visual checks of clubs, ship, reward art, profile, shop, membership, community links and payment placeholders. About 60 FPS measured in the local golf view on the development computer; no physical Chromebook benchmark.

No payment processor was enabled. Basic product policies are not a legal compliance certification. Guest rewards and progress remain local; account progress is authoritative in Supabase. This release changes replay rules to `polygolf-v6`, so older active rounds need a fresh start after reloading.

Latest refinements: PolyTrack-inspired compact home menu; dedicated competitive lobby and rank ladder; red-dot indicators for friends, tiers, new equipment and achievements; Blender headlands, sea arches, harbor stores, sailboats, lodge and mountain ranges; filtered, stable fairway edges.

High-quality Saltwind browser check at 1280 × 720 on the development machine: 118 draw calls, 16.7 ms median / 16.8 ms p95 frame time. Device performance varies. Automated playthroughs completed all 9 golf and 45 mini-golf holes.


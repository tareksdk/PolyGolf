# PolyGolf

A low-poly browser golf game by **Room310 × OneShotStudios**, playable at [polygolf.lol](https://polygolf.lol).

Play nine detailed holes at Willow Park and three each at Saltwind Links and Autumn Pines, or 45 mini-golf holes. Create and share courses, collect equipment, complete achievements, play friends and enter competitive matchmaking at level 15. Map editors unlock at level 10.

The item shop includes daily and weekly rotations, bundles, novelty clubs and ten lockers during Halloween (nine year-round) with disclosed odds. Forge and Workshop Lockers contain 18 original patterned drivers, putters and balls. Every drop saves a pattern numbered 000–999; different patterns of an item stay in the Caddie. Country Club costs 50,000 earned coins and contains 30 tiers with one free reward and one member item per tier, plus a separate members-only collection. Real-money prices are Coming Soon previews only. Opening each Room310 community link awards 1,000 coins once per account; no follow verification is required.

Redeem `greatidealevi` in Shop → Redeem code for 20 free Forge Lockers (once per signed-in account). Forge has an 8% Case Hardened drop rate, Workshop 2%. Of Case Hardened drops, 1% are full gold and 1% full blue; the rest mix gold, violet and blue. All 1,000 seeds are equally likely. Friends can trade eligible shop and locker items, including exact patterns. No real-money purchase or cash-out is enabled.

The October interface update carries the home screen’s styling through the clubhouse, adds profile trade offers, persistent sign-in and bouncing power/direction meters. High graphics uses fixed supersampling; Blender-authored mountain ridges, populated coastal islands and a detailed brig sit under a smooth sky. A labelled activity estimate can be edited in Supabase; see DEPLOY.md.

## Run

Use Node.js 22 or newer. No package install or frontend build is needed.

Run `node server.mjs` and open http://127.0.0.1:5173/. The game uses vendored Three.js and the connected Supabase project. Guest mode works without an account; online accounts need a username and password. Only a public Supabase URL and publishable key are shipped to the browser.

## Verify

- `node scripts/check.mjs`
- `node scripts/test-release.mjs`
- `node tests/playthrough.mjs --all`
- `node tests/golf-playthrough.mjs`

See [release notes](RELEASE-NOTES.md), [deployment instructions](DEPLOY.md), [backend setup](backend/README.md), [asset source](assets/README.md), and [policy notes](LEGAL-REVIEW.md). Contact: room310support@gmail.com.

Settings → Appearance switches between Dark and Light (muted sage), saved on this browser. Press B between shots for owned emotes; use 1–6 or click an emote, and page through additional choices. Completed standard rounds have a 10% chance of a free random locker. Ranked Elo standings are in Rankings; achievement rewards are directly in Shop → Achievements. The `100k` gift code grants 100,000 coins once per signed-in account.

The October 4 launch update separates power and direction into two inputs, sharpens grass boundaries, repairs coastal seams, adds optional shot-panel minimization and cleans up both themes. The Halloween event ends November 1, 2026 at midnight America/New_York. Earned items and unopened earned lockers stay usable. The first 100 accounts receive OG; exclusive Developer and Staff nameplates use separate gift codes. See DEPLOY.md for the editable home message.

Settings uses custom appearance/quality cards and sliders. Choose Majestic, Upbeat or Calm original synthesized music; switching fades between scores and the choice is saved locally. All three scores are generated in the browser without audio downloads. Closing dialogs retain their theme throughout the fade.

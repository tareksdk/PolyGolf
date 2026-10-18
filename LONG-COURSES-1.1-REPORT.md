# PolyGolf 1.1 — long-course adventures

Saltwind Links and Autumn Pines now each have a separate nine-hole, par-36 round in **Courses → More to play → Long rounds · 9 holes**. Their original three-hole rounds remain in Classic courses. Willow Long and the rotating adventures remain available.

## Course design

Each long round keeps its original opening three holes and adds six authored holes. The new holes range from 132 to 616 metres, mix par 3, 4 and 5, and use real elevation, ridges, narrow fairway sections, smaller greens, water and shaped bunkers.

| Round | Hole | Name | Par | Length | Feature |
|---|---:|---|---:|---:|---|
| Saltwind | 4 | Tideglass Needle | 3 | 172 m | Downhill approach, tight green and flanking water |
| Saltwind | 5 | Cannonball Cut | 5 | 558 m | Sparkling TNT target clears a physical rockfall |
| Saltwind | 6 | Smuggler’s Eye | 4 | 346 m | Play through the mountain’s actual opening |
| Saltwind | 7 | Pelican Plunge | 3 | 132 m | Steep downhill, small green and a giant comic bird |
| Saltwind | 8 | Stormbell Reach | 5 | 594 m | Long dogleg, multiple ridges and a bell-side cottage |
| Saltwind | 9 | Harbour Lights | 4 | 398 m | Coastal finish with colourful houses on stilts |
| Autumn | 4 | Whistling Granite | 4 | 328 m | Mountain passage with guiding sparkles and a stone face |
| Autumn | 5 | Acorn Overlook | 3 | 181 m | Uphill green and an oversized woodland character |
| Autumn | 6 | Lumberjack’s Fuse | 5 | 572 m | TNT rockfall, an alpine backdrop and a long turning fairway |
| Autumn | 7 | Foxglove Switchback | 4 | 368 m | Reversing dogleg with several changes in elevation |
| Autumn | 8 | Mirror Tarn | 3 | 146 m | Two ponds, a tiny green and a giant smiling teapot |
| Autumn | 9 | Crown of Pines | 5 | 616 m | Long alpine finish with a village and towers |

Mountains use the same faceted profile for rendering and collision. Low shots can cross the opening; rock faces stop shots that miss it. Lower spin helps. Hit a sparkling red TNT bundle to remove its rockfall. The burst combines fire, flying stones, a shock ring, rising smoke and a short camera pullback. Reduced motion disables the camera move; particle settings are respected. Cleared paths remain open after a ball reset and reset for a new hole.

## Emotes and Clear View

The emote wheel now handles each click once. Next/Previous, Close, focus and keyboard dismissal work. Generic groove/twirl/shimmy items use the dance animation.

- **B:** open/close the wheel; **Esc:** close it.
- **1–6:** quick emotes; when the wheel is open, use that page’s numbered slots.
- **V:** use the equipped emote.
- **[ / ]:** change wheel page.

Emotes are blocked during shots, dialogs and hazard/explosion moments. Opening the wheel clears held aiming/orbit input.

**Clear View** is a free equipable HUD style in Caddie or Settings → HUD. Its cards and controls are more transparent; panels fade when they cover the ball or nearby aiming line. Hover/focus restores controls, and the active shot meter remains readable while charging. Classic remains the default. The preference persists on the device. Course navigation uses fitted collection pages; phone and short landscape Play buttons remain reachable without scrolling.

## Existing content and records

The release was built from GitHub main `a2181c1`, then reconciled with the newer production frontend and Edge Function version 34. This preserves First Swing, Meadowcrest driving range and its asset, the mystery driver, ten newer hole effects, device preferences, multiplayer rematches, reward popups, account protections, trading eligibility and profile details. The older GitHub snapshot would otherwise have removed those live features.

Replay version stays **polygolf-v11**. Original course IDs, layouts and record keys stay unchanged. The two new collections append IDs **15 and 16** and use separate nine-hole record keys. No leaderboard rows are rewritten or deleted. The only database change extends the validated round-course constraint from ID 14 to ID 16. A before/after digest confirmed all **496 existing leaderboard records were identical** after that migration.

## Rendering and verification

Static scenery and repeated TNT parts are instanced. Sparkles, flames, smoke and debris use bounded reusable pools. Owned effect geometry/materials are released on hole changes. Long-course terrain has fewer render vertices, while physics continues to use the authored terrain. The existing quality scaling and deferred/cached course thumbnails remain in use.

At 1280×720 on this machine, a 180-frame steady test of the 616 m Crown of Pines hole measured:

| Quality | Median frame | 95th percentile | Peak rendered triangles |
|---|---:|---:|---:|
| Medium | 16.7 ms | 33.4 ms | 665,854 |
| Low | 16.7 ms | 18.6 ms | 439,086 |

Low quality reduced triangles by roughly 34%. These are local measurements, not a guarantee for every device.

Validation includes all 18 holes rendered and reviewed, real physics shots through both passages and into both TNT targets, emote wheel/shortcuts, Clear View equipment and settings, desktop 1280×720, phone 375×667, and landscape 844×390 course pages. Automated checks cover old-layout/record compatibility, nine-hole progression, server round sizes, collision, replay determinism, pooled effects and input behavior. The regression suite passed **216 tests**, with one optional database integration test skipped; live constraint/digest checks were performed separately. All 138 runtime modules passed syntax/import checks and all seven static pages passed link checks.

The release targets the existing **polygolf.lol** and **littlelinks.study** sites with the same frontend snapshot and matching backend. Local test controls, screenshots, credentials and deployment tooling are excluded from published files and Git.

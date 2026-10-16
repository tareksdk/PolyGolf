# PolyGolf 0.7 — local update report

This update is available locally at **[http://127.0.0.1:5175/](http://127.0.0.1:5175/)**. It improves aiming, adds a second shot meter, and rebuilds Saltwind Links’ opening pirate encounter. The visible game version is **0.7**. The Game Studio workflow was used for Three.js implementation, the meter UI, and browser playtesting; all visuals extend the existing procedural course style.

The work starts from the latest checked GitHub `main`, **`242905aefa99b51dd8f9b1676c45ccc114ddca86`**, which includes the newer locker, coin-reward, and rotating-scenery changes. Changes remain in the local branch **`codex/smooth-swing-pirate-local`**. **Nothing from this update has been pushed to GitHub or deployed to either public site.**

## 1. Smooth aiming and camera movement

The old full-golf guide waited at least **120 ms** between updates, rounded direction components to three decimal places, and waited for a physics prediction before replacing its geometry. That combination made small aim changes appear as a sequence of jumps.

The new guide updates every rendered frame using existing geometry and buffers. It no longer has the timer, rounded-angle cache, physics-worker round trip, or repeated tube-geometry replacement.

Pointer aiming also had an independent problem: near the sky horizon, the ground-plane intersection could disappear and return world origin. Aiming now continues along the same ray at a bounded distance through and above the horizon. It uses the canvas’ actual bounds and reuses its ray, plane, and vector objects.

Held arrow keys and **Q/E** now move continuously according to elapsed time instead of keyboard-repeat steps. **Shift + arrows** provides finer aiming. Right-drag camera orbit remains available.

## 2. A directional sky arrow with uncertainty

Full golf now shows a short, curved arrow suggesting the shot’s opening direction and loft. It rises into the sky and ends before the landing portion of the shot.

The guide deliberately does not simulate wind, landing, bounce, or the final destination. Shape and spin affect its opening gesture, while the actual shot still uses the golf physics. The landing marker has been removed. Putter guidance stays short and follows only nearby ground.

The guide uses **33 samples**, one reusable instanced segment mesh, and one reusable arrowhead. Small angle changes update immediately without rebuilding geometry.

## 3. A larger cartoon pirate target and a real explosion

On **Saltwind Links, hole one**, the pirate ship is **1.65× its previous size**. Its collision boxes scale and rotate with the visible model, so the larger sails and hull are easier to hit.

The ship has bright trim, an oversized skull on the sail, red dynamite, a fuse, and animated treasure glints. It moves within a small, safe area of the cove at the start of a new local or practice round: up to **11 metres along the water** and a **12-metre-wide sideways range**. Its position stays stable through ball resets during that round.

A successful hit triggers a bright TNT fireball, expanding blast ring, airborne wooden debris, rising smoke, an expanding water ring, explosion audio, and a listing ship that sinks below the water. The camera follows the encounter, then restores the previous zoom. A ship can explode only once per hole.

The effect uses fixed pools with a maximum of **72 particles** submitted through three instanced meshes. Low graphics, reduced motion, and disabled particles are respected. The ship is excluded from static scenery batching so sinking remains animated.

The existing pirate discovery and reward event is retained. In this local build, any progress belongs to the separate local preview save.

## 4. A shallower drop and a sloping cliff

Saltwind’s opening sea is raised **24 metres**, from **−42.6 m to −18.6 m**. The cliff descends through a stepped slope extending **22 metres outward**, rather than meeting the water as an almost vertical wall.

The rendered cliff bands and playable terrain share the same coast functions. Water impacts, ocean animation, foam, sea stacks, sailboats, and offshore landmarks use the updated level. Saltwind holes two and three keep their existing sea level and cliff silhouette.

## 5. A second shot meter: Flow

**Classic remains the default**, with its original power-first, direction-second sequence. The new **Shot meter** selector in **Club & shot** switches to **Flow** and saves the preference locally.

Flow uses a curved direction gauge with a sweeping needle and a green centre:

1. Aim, then wait for the direction needle to reach the position you want.
2. Press once to lock the visible direction.
3. Keep that same press held to build power.
4. Release to swing.

Mouse/touch and **Space** use the same sequence. Power eases smoothly at both ends of its cycle. While waiting, Flow shows an empty power meter; holding shows the actual charge. Switching meters does not change the underlying shot physics.

Cancellation, pausing, and pointer cancellation do not turn a later release into an accidental shot. Meter controls are locked during charging, the swing, and ball flight. The controls guide explains both options.

## 6. Rendering and resource optimizations

The update preserves the normal scene quality, shadow quality, and output resolution. The main reductions are unnecessary work and temporary allocations:

- Camera position and target vectors are reused. Menu/garage ball positioning and mini-golf arrow direction also reuse existing objects.
- A fullscreen locker view stops hidden course animation, flight updates, obstacle queries, particle transforms, and shadow bookkeeping before they run.
- Course thumbnails wait for browser idle time, defer during gameplay or while the tab is hidden, and skip cards abandoned through navigation.
- Thumbnail image encoding is asynchronous. Completed queues release their private geometry, textures, shadow resources, and WebGL context while preserving shared game primitives and materials.
- Repeated menu renders reuse placeholder previews. The updated preview-cache generation refreshes the ship/coast art and removes old preview generations without deleting saves.

An instrumented comparison ran **600 updates at a fixed 1/60-second step** against the checked GitHub base. It used actual Three.js objects and golf terrain with a counting renderer:

| Measured work | Before | After |
| --- | ---: | ---: |
| Playing: distinct camera target vectors | 600 | 1 reused |
| Playing: distinct camera position vectors | 600 | 1 reused |
| Locker covered: flight update calls | 600 | 0 |
| Locker covered: obstacle queries | 600 | 0 |
| Locker covered: flag-buffer rewrites | 600 | 0 |
| Locker covered: rendered frames | 0 | 0 |

This removes **120 short-lived camera vectors per second at 60 FPS**. These are CPU-work and allocation measurements; **they do not establish a browser FPS or GPU-time improvement**. Normal gameplay still renders every scheduled frame. A preview renderer may be recreated when a previously uncached map is visited.

Details: [rendering report](artifacts/v07-render-optimization-report.md) and [before/after counters](artifacts/v07-render-work-comparison.json).

## 7. Playtesting and fixes found during verification

Automated tests cover the new input sequence, Classic compatibility, continuous held-key movement at different update rates, sub-degree guide movement, preview resource ownership, randomized ship bounds, rotated/scaled hitboxes, coast continuity, explosion pools, and local-save isolation.

Two additional integration tests exercise the real golfer, pirate, and water presentation wrappers together. They verify that the ship camera survives the golfer’s camera override and a shorter water splash, then releases correctly. Pause and changing holes clear the appropriate effects and camera state.

Playtesting also uncovered and fixed an existing black-sky bug: basic-course Normal and Rainy weather profiles could send `NaN` to the shader’s night uniform. All course/weather combinations now receive finite **0 or 1** values, with regression coverage for themed night skies and Normal resets.

Completed verification:

| Check | Result |
| --- | --- |
| Final full automated release suite | **192 passed, 0 failed, 0 skipped** |
| Final input, local-preview and presentation integration checks | **16 passed** |
| Syntax, module imports, and page links | **114 modules and 7 pages passed** |
| Actual Flow press/hold/release in the browser | One stroke fired from one completed press |
| Camera orbit and aiming | Q/E orbit advanced continuously; arrow bearing changed with fine aim |
| Normal, Night, and Rainy | All three rendered correctly; no game console errors in the checked run |
| Pirate encounter | Actual tee shot with a 7 iron hit the ship at simulation tick 806; water followed at tick 826; explosion/sinking camera played |
| Desktop/phone layouts at 1280×720, 390×844, 375×667 and 844×390 | Document, shot options and meter fit their viewport; measured client dimensions match scroll dimensions |
| Six-course menu on phone and landscape | All six course buttons remained visible and unobstructed |
| Classic mouse input | Hold/release entered direction timing; the second press fired exactly one stroke |
| Flow keyboard input | A single 850 ms Space press/hold/release fired the next stroke |
| Mini-golf Flow input | One 680 ms pointer press/hold/release fired one stroke; distance decreased from 16.8 m to 8.7 m |
| Ship sink and recovery | At 5.0 s the ship was fully hidden below water; normal-speed replay cleared all particles and restored camera; reset restored intact ship |
| Console checks | No warnings or errors in the game and pirate review tabs |

Screenshots:

- [Saltwind Normal](artifacts/v07-saltwind-normal.png), [Night](artifacts/v07-saltwind-night.png), [Rainy](artifacts/v07-saltwind-rainy.png)
- [Flow meter on desktop](artifacts/v07-flow-desktop.png), [390×844](artifacts/v07-flow-390x844.png), [375×667](artifacts/v07-flow-375x667.png), and [844×390 landscape](artifacts/v07-flow-844x390.png)
- [Six-course phone menu](artifacts/v07-courses-390x844.png)
- [Pirate explosion](artifacts/v07-pirate-explosion.png), [sinking](artifacts/v07-pirate-sinking.png), and [fully sunk](artifacts/v07-pirate-sunk.png)
- [Mini-golf after a Flow shot](artifacts/v07-mini-flow.png)

**Final QA completion:** all checks above completed. The browser tests used the real game plus a separate, ignored review harness that fires a reproducible tee shot through the actual fixed-step physics. Exact responsive sizes were tested through same-origin browser frames. This was desktop-browser testing, not a physical-phone or GPU benchmark. The deterministic pirate review controls are outside the shipped game.

Evidence: [full test log](artifacts/v07-release-tests.log), [focused final checks](artifacts/v07-final-focused-tests.log), [static checks](artifacts/v07-static-checks.log), and [pirate replay result](artifacts/v07-pirate-browser-result.json).

## 8. Local-only delivery and project files

Localhost uses the separate browser save key **`polygolf.local-preview.0.7`**. It can copy an existing local golfer as a starting point, but subsequent saves write to the preview copy. Existing account/session storage is preserved.

The local cloud adapter starts no production polling and restores no live account. Guest connection, sign-in calls, online rankings, REST access, and refresh requests are blocked for this preview. Solo rounds and rewards use the device save. This protects the live game backend while testing the changed coast and randomized target. Google Fonts may still load as ordinary external assets; this is a local game build, not a claim that every resource is bundled for offline use.

The original six-map menu, seasonal content, locker/reward changes, and existing game styling are retained. UI work is limited to the meter choice, Flow gauge, help text, and responsive adjustments needed to keep the tested views free of scrolling.

### Changed files by purpose

| Purpose | Files |
| --- | --- |
| Aiming, shot sequence, and guide | `dist/src/game.js`, `golf-presentation.js`, `directional-guide.js`, `world.js` |
| Meter UI, settings, help, and responsive fit | `dist/src/shot-meter-ui.js`, `ui.js`, `expansion.js`, `save.js`, `interface.js`; `dist/interface.css`, `dist/launch.css` |
| Pirate target, blast, audio, and coast | `dist/src/pirate-effects.js`, `course-features.js`, `course-assets.js`, `golf-courses.js`, `golf-environment.js`, `landscape.js`, `ocean.js`, `scenic-layout.js`, `water-effects.js`, `audio.js` |
| Preview efficiency and sky fix | `dist/src/course-previews.js`, `course-weather.js` |
| Local isolation and version | `dist/src/local-preview.js`, `cloud.js`, `online-activity.js`, `main.js`, `course-menu.js`, `webmcp.js`, `version.js`; `dist/release.json` |
| Regression tests | `tests/swing-controls.test.mjs`, `pirate-coast.test.mjs`, `pirate-presentation-integration.test.mjs`, `render-efficiency.test.mjs`, `local-preview.test.mjs`, `atmosphere-sand.test.mjs`, `launch-2026.test.mjs` |

### Run the local build

From the project folder, with Node installed:

```sh
cd /Users/jacobaleo/Desktop/polygolf
PORT=5175 node server.mjs
```

Open **[http://127.0.0.1:5175/](http://127.0.0.1:5175/)**. If the preview is already running, just open the link. Stop a server you started with **Control-C**.

To run the automated checks:

```sh
node scripts/test-release.mjs
node scripts/check.mjs
```

Online multiplayer, account progress, and live rankings are intentionally unavailable in this experimental localhost build. Publishing these physics changes later will require matching backend replay rules and an appropriate rules-version release; no backend or live-site release was performed here.

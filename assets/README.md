# PolyGolf course assets

An original low-poly course kit authored for PolyGolf in Blender. No external models, texture downloads, paid generators or third-party asset licences were used.

- `source/build_course_kit.py` builds every asset procedurally and exports it. It is the source of truth.
- `source/polygolf-course-kit-v7.blend` is the saved scene from the current script, with the assets laid out on a labelled grid for inspection and editing.
- `source/little-links-course-kit-v4.blend` and `source/little-links-course-kit.blend` are the earlier scenes, kept for reference. The game no longer uses them.
- `../dist/assets/course-kit.json` is the browser export.

## Regenerating

From the project root, with Blender 4.2 or later (tested with Blender 5.2):

```sh
blender --background --factory-startup --python assets/source/build_course_kit.py
# or, with the bpy package installed for Python 3.11:
python3 assets/source/build_course_kit.py
```

The script overwrites only `dist/assets/course-kit.json` and `assets/source/polygolf-course-kit-v7.blend`. Then run `node --test tests/polygolf.test.mjs`: one test checks that every asset the browser places exists in the kit and that the file is well formed.

## Export format (version 7)

Coordinates are metres, Y up. Each asset is one merged mesh with flat shading and per-face colour, rendered with instancing. To keep the file small (about 4.35 MB), the JSON stores a shared `palette` of linear RGB colours; each asset has `p` (9 position values per triangle) and `c` (one palette index per triangle). Normals are rebuilt in the browser. `dist/src/course-assets.js` loads the kit and places it.

## Contents (58 assets)

- **Trees:** oak, willow, pine, juniper, golden larch, autumn oak and fruit tree, with low-detail distant variants (96–184 triangles) for dense forests.
- **Planting and nature:** bushes, flower and autumn-flower patches, reeds, lily pads, dune grass, mushrooms, boulders, tide rocks, fallen logs and log piles, a heron.
- **Course furniture:** tee markers, tee sign (with a painted hole card applied in the browser), ball washer, bin, bench, rake, planter, white and red distance posts, fence, stone wall, flagpole, golf cart (cart paths are drawn on the terrain).
- **Landmarks:** clubhouse, starter hut, lighthouse, boathouse and rowboat, gazebo, beach huts, stone arch, spring well.

## Placement rules

Each hole has a hand-authored dressing in `course-assets.js`: tee furniture beside the tee box, distance posts along the fairway edge, rakes at bunkers, reeds and lily pads at water, and landmarks that give each hole its own character (Willow Park's boathouse, gazebo with herons and orchard; Saltwind's lighthouse and beach huts; Autumn Pines' stone arch, spring well and log piles). Placement is deterministic. Props are pushed off tree trunks, fairways, greens, bunkers and water, and are grounded on the displayed terrain.

The pirate ship is an achievement target. Its placement and swept collision volumes are shared with server replay verification in course-features.js. Other props are visual; terrain and tree collisions use the shared course modules.

Trees between the camera and the ball fade out during play (`dist/src/occlusion.js`) so the golfer is never hidden behind a canopy. This is also visual only.

## References

Reference study: [Martis Camp's Tom Fazio course](https://www.martiscamp.com/about-martis-camp/) informed forest density and mountain framing; [the USGA Cypress Point course tour](https://championships.usga.org/walkercup/2025/galleries/course-tour-of-cypress-point-club.html) informed the coastal plateau and rocky sea edge. These photographs are references only and are not distributed with the game.

The v6 kit adds a two-masted pirate ship and stratified sea stack. Earlier Blender scenes remain available as reference.

## Numbered equipment finishes

`dist/src/finish-material.js` contains original procedural surface materials for the six pattern collections. No Counter-Strike models, textures or artwork are included. Case Hardened uses object-space mottling with brass gold, violet and heat-blue colours. Existing low-poly geometry is retained; no decal planes or extra mesh layers are added. Pattern seeds and collection metadata are in `dist/src/finishes.js`; seeds are minted by the locker reward transaction, never by the renderer. These materials are browser shaders, not new Blender meshes.

## October scenery update

The v7 kit adds ridged alpine ranges, wooded shoulders, inhabited coastal headlands, a harbor jetty, sea arches, boats, gulls, a lodge and waterfall crag. `source/pirate_ship.py` defines the brig’s shaped hull, quarterdeck, cannons, four billowed sails, jib and rigging. `source/scenic_landmarks.py` defines the surrounding landforms and settlements. `source/rebuild_ship.py` updates only the ship after editing it; `source/render_scenery_review.py` generates inspection images from the saved Blender scene. All source scenes use metres. Browser instancing shares geometry across repeated landmarks.

## October 4 scenery

`source/polygolf-course-kit-v8.blend` and the v8 browser kit contain 59 reusable models. The waterfall is a low, stepped rock formation instead of a tall monolith. A low-poly jack-o-lantern decorates tees and the hidden Autumn Pines target during the 2026 Halloween event. Grass surface edges use an antialiased shader in `dist/src/turf.js`; terrain and cliff rings share the same boundary vertices.


## Willow Park landscape update (v0.3)

Holes 4–9 reuse the v8 kit, with no new model or texture downloads. Each has a different authored elevation profile, side mounds, tree glades, prop clusters and backdrop. Mountain instances frame meadow, garden, alpine-pass, wetland and lookout settings; the last hole uses an inland lake, existing wooded headland meshes and sailboats. Tree variants and the number of background ranges vary by hole. New tee complexes use starter huts or gazebos; the last returns to the clubhouse.

`golf-courses.js` owns the playable heights, narrowing fairways and rotated scalloped bunker boundaries. `turf.js` uses the same boundary formula for sand and its lip; `forest.js` keeps trees off these shapes and out of the authored glades. Side props are grounded against the displayed terrain and kept beyond fairway edges. Bunker rakes follow the rotated rims. Scenery remains visual; ball flight, sand lies and slopes use the shared heightfield on the client and replay verifier.

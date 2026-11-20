# Build PolyGolf for CrazyGames

From the repository root, run `npm ci` and `npm run package:crazygames`.
For v1.17 this writes `output/polygolf-crazygames-game-1.17.zip`.
Upload the ZIP as Game Files and use its new game build ID when submitting
an update. Upload covers and preview videos separately.

The package flattens the shipped assets, bundles the game and its workers,
includes the Three.js license, and selects CrazyGames mode on startup.
The ordinary website continues to use its own save and multiplayer features.
Verify signed-in Data Module saves and SDK behavior in CrazyGames Preview
before submitting the build.

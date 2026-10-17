# PolyGolf 1.0 game files

This archive contains the complete checked-in project: the browser game in `dist/`, original asset sources, backend source, tests, and the local server.

## Play locally

1. Extract the ZIP.
2. Install Node.js 22 or newer if it is not already installed.
3. Open a terminal in this folder and run `node server.mjs`.
4. Open **http://127.0.0.1:5173/**.

No package installation or frontend build is required. Opening `index.html` directly from Finder will not run the JavaScript modules correctly; use the local server.

Localhost uses a separate browser save. Online account features connect to the existing production service on the live domains. To host the game, publish the contents of `dist/`; see `DEPLOY.md` for the existing project configuration and historical deployment notes.

## This release

The Shop has its original featured panel, item grids, card sizes and section tabs again. Scroll to browse the complete shelves. All v0.9 gameplay fixes, the default full shot path, medals/accolades, course rules and other live features remain included. Caddie pagination is retained.

The archive excludes credentials, browser profiles/saves, generated QA output, Netlify login state, and Git metadata.

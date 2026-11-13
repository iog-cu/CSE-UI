---
name: build-cse-ui-linux
description: Build the CSE-UI repo on Linux and run the game UI in a browser. Covers Node 10.19 via mise, the npm 6 nested file: dependency symlink breakage, node-sass bindings, staging a client manifest export, and getting past the loading screen with real WebAPI credentials. Use when `npm ci` in camelot/ fails with ENOENT on node_modules/@csegames/library/node_modules/@csegames/coherent/package.json, or when asked to build or run the CU UI out of context.
---

## When to use

- `npm ci` in `camelot/` fails with `ENOENT ... node_modules/@csegames/library/node_modules/@csegames/coherent/package.json`
- After any `cd library && npm ci` (it wipes the fix)
- Setting up a browser (out-of-context) session of the game UI

Not for: Windows/macOS builds (case-insensitive filesystems never hit the path-case pitfalls), or
when the goal is an in-game build on a machine that already builds fine.

## Procedure

1. **Pin Node 10.19.** The repo's `mise.toml` does this. Node >= 17 breaks webpack 4
   (`ERR_OSSL_EVP_UNSUPPORTED`) and cannot load node-sass 4.
2. `cd library && npm ci && npm pack` — this **wipes `library/node_modules`**, destroying the
   symlink fix below.
3. **Recreate the nested symlink:**
   `mkdir -p library/node_modules/@csegames && ln -sfn ../../../coherent library/node_modules/@csegames/coherent`
   The target must be **3 ups** from that directory (the repo-root `coherent/`), not 6.
4. `cd camelot && npm ci` — it **will** fail with ENOENT on the nested coherent `package.json`.
   That is expected: the extraction phase completes, then npm's post-extract bookkeeping
   (`_from` update, bin linking, lifecycle scripts) aborts.
5. **Repair the symlink npm overwrote:**
   `ln -sfn ../../../coherent camelot/node_modules/@csegames/library/node_modules/@csegames/coherent`
   (physically the same file as step 3 through camelot's `library` symlink).
6. `cd camelot && npm rebuild` — restores bin links (`rimraf`, `webpack`, `tsc`, …) and runs
   node-sass's install script (downloads the `linux-x64-64` binding).
7. `npm run build:dev` — then serve: `python3 -m http.server -d dist 8080` and open
   `mainScreen.html`.
8. **Restage the manifests** (every build, because `prebuild:dev` runs `rimraf dist`):
   `python3 ../.agents/skills/build-cse-ui-linux/stage-dev-manifests.py <export-dir>`
   Export files come from the game client — see `documentation/ExtractingManifests.md` (0.53+), or
   run the client with `manifestExportDirectory=<dir>`. The script derives each manifest's schema
   version from the processors themselves and writes `dev-manifests/index.json`.
9. **Configure the session** in devtools before reload — optional for HUD work. All keys are
   `cu.dev.*`, and the **default is credential-free**: no WebAPI traffic, worked from the locally
   staged manifests.
   - `cu.dev.live = '1'` — opt in to live WebAPI data (needed to work on character selection). Needs
     `cu.dev.accessToken` from `./get-jwt.sh` (which prints only the token); without a JWT-shaped
     token the session falls back to offline with a warning.
   - `cu.dev.webAPIHost` — which shard answers `shardCharacters` (the query takes no shard argument).
     Defaults to `https://hawkingapi.camelotunchained.com`, which is only reachable at weekends.
   - `cu.dev.autoConnect` — defaults to on in offline mode (no characters to select); `'0'` opts out.

Environment variables are not an option for these: webpack bakes `process.env` at build time, so
changing shard or credentials would require a rebuild.

## Pitfalls

- npm 6 resolves symlink targets against the **logical** path (through
  `camelot/node_modules/@csegames/library -> ../library`) while the kernel resolves them against the
  **physical** path. That mismatch is the root cause; a 6-up target is always dangling.
- Every library `npm ci` destroys the fix and every camelot `npm ci` rewrites it broken — steps 3
  and 5 are needed after every reinstall.
- `npm ci`'s failure silently skips bin linking and lifecycle scripts: `node_modules` looks
  installed, but `.bin` lacks `rimraf`/`webpack` and node-sass has no vendor binding. Run
  `npm rebuild`.
- Stale `library/dist` produces cascading `TS2305`/`TS2339` errors in camelot — rebuild the library
  before debugging camelot type errors.
- Exported manifests are **not uniformly schema version 1**: `stats`/`craftingjobs` are v2-only,
  `classes` needs v3, `gamesettings` needs v4, and several others are v2. Passing v1 for everything
  leaves class/race/stat/gear definitions empty and crashes widgets during the Play transition.
- `BrowserHUDFunctions.getWidgets()` returns `{}` and `updateWidgetState()` is a no-op, so widget
  layout and opacity are never loaded from or saved to storage in a browser session. Injecting
  `CUHUDWidgetStates` does nothing and edits are lost on reload — but HUD Editor sliders write
  through to Redux, so in-session editing works.
- Without a valid token the GraphQL websocket is closed with 4401 and never retried, so the
  `shardCharacters`/`zones` init topics never resolve and the loading screen stays up forever. That
  is why live mode requires a token and falls back to offline without one.
- `webAPIHost` decides which shard the `shardCharacters` query hits — the query itself takes no shard
  argument. Overriding it is therefore the only way to point a browser session at another server.
- Offline mode is never a real client: entity state, party, chat and the ability bars all stay empty.
  It exists to render and edit HUD widgets, not to exercise gameplay paths.
- Headless check:
  `flatpak run org.chromium.Chromium --headless=new --no-sandbox --enable-logging=stderr --virtual-time-budget=25000 --dump-dom http://localhost:PORT/mainScreen.html`
  Look for `Init N/5:` lines in stderr and `HUD-*` classes in the DOM (`grep -o … | wc -l`; the DOM
  dumps as a single line). Seed `localStorage` by injecting a `<script>` into the head of the built
  `dist/mainScreen.html` — build output, never the repo.

## Verification

1. `readlink -f camelot/node_modules/@csegames/library/node_modules/@csegames/coherent` resolves to
   `<repo>/coherent`.
2. `camelot/node_modules/.bin` contains `rimraf`, `webpack`, `tsc`.
3. `camelot/node_modules/node-sass/vendor/linux-x64-64/binding.node` exists.
4. `npm run build:dev` exits 0 and `camelot/dist/mainScreen.html` exists.
5. The browser console logs `Loaded N development manifests` and no `Invalid … manifest file`.

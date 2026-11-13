# CSE-UI — Agent Orientation

UI repository for Unchained Entertainment, LLC (formerly City State Entertainment). Contains the game
UI for **Camelot Unchained (CU)** and **Final Stand: Ragnarök** (FSR, discontinued), plus the
patcher/launcher UI. License: MPL-2.0.

## History caveat: squashed releases

The repository has a very long history, but the current iteration effectively restarted in
2023/2024. Upstream's recent commits are **squashed release snapshots** (`CU 0.29 and FSR 1.0`,
`CU 0.50 update`, `CU 0.52 update`, `CU 0.53 update`, …) produced elsewhere and pushed here as
whole-tree updates. Anything between two tags is invisible, and older tooling may or may not match
the current code — **don't try to bisect behaviour from git history**. Diff tags to see what changed.

The "new" CU UI is: `mainScreen` as the hub (a Redux Toolkit store fed by `dataSources/*Service`
classes extending `ExternalDataSource`), a component library of `Faction*`/HUD widgets, the ability
system (book/builder/bars), an item tooltip pipeline, manifest-driven game definitions, and the
in-world `projected` UI.

## Top-level layout

| Path | What it is |
| --- | --- |
| `camelot/` | CU game UI (React 16 + Redux Toolkit + webpack 4 + TS 4.8). Entry points `mainScreen`, `protectedScreen`, `projected` → `dist/{mainScreen,protectedScreen,projected}.html` |
| `colossus/` | FSR game UI, same stack; the game is discontinued — don't invest here |
| `library/` | `@csegames/library`, shared npm package consumed by both game UIs (`file:../library`, must be built first). Holds the Coherent↔UI layer (`src/_baseGame/`), per-game interfaces, generated API bindings |
| `launcher/` | `cu-patcher-ui`, the patcher/launcher UI |
| `samplechat/` | Standalone browser demo of the CU chat v3 service (the only project with a dev server) |
| `coherent/` | `@csegames/coherent`, the Coherent GT binding, plus a **browser mock layer** (`dist/coherent.mock.js`) |
| `documentation/` | Authoritative build/deploy/debug/API docs — read these first |
| `camelot/dynamic/` | Static game-definition assets copied into `dist/dynamic/` by webpack |

## Renderer & communication model (Coherent GT)

The UI renders inside the game client via **Coherent GT** (Chromium-based). Communication goes
through a global `engine` object (`engine.SendMessage` / `engine.TriggerEvent` plus handlers):

- `coherent/dist/coherent.js` sets up `window.engine`. Outside Coherent GT it still initialises,
  with `engine.isAttached === false` and mock Send/Trigger implementations.
- `library/src/_baseGame/index.ts` → `loadGame()`: when `!engine.isAttached` it logs
  "initializing base game out of context" and uses `initOutOfContextGame()`
  (`library/src/_baseGame/initGameInterface.ts`), a stub game model. When attached it waits for
  Coherent's `Ready` event to set `window.game` (60 s timeout).
- Functions prefixed `_cse_dev_` return `TaskHandle`s; the UI wraps them with `makeClientPromise`
  (`clientTasks.ts`), resolving on Coherent `taskComplete` events.
- Game UI code is `dataSources/*Service.ts` (listen to engine and web API events) feeding the Redux
  store, consumed by components and `HUDWidgetRegistration` entries.

## External API contact points (see `documentation/UpdatingAPIs.md`)

1. Coherent bindings / clientAPI — maintained **by hand**
2. GraphQL schema (WebAPI) — generated: `npm run gen:cu-gql`
3. REST API — generated: `npm run gen:cu-rest`
4. Protobuf — FSR chat service only; development halted, do not regenerate

## Building

Node 10.19 (see `mise.toml`), node-sass 4, webpack 4. There is **no test suite**; `prettier` is the
only hygiene script. `documentation/InstallingNode.md` assumes Windows.

```sh
cd library && npm ci && npm pack
cd ../camelot && npm ci && npm run build      # or build:dev
```

Linux notes (npm 6 mishandles the nested `file:` dependency chain
`camelot → file:../library → file:../coherent`):

- `cd library && npm ci` wipes `library/node_modules`, and `npm ci` in `camelot` fails with ENOENT on
  `node_modules/@csegames/library/node_modules/@csegames/coherent/package.json`. That failure is
  expected — extraction completes, then npm's bookkeeping aborts.
- Repair the nested link, from the repository root, after **every** reinstall:
  `mkdir -p library/node_modules/@csegames && ln -sfn ../../../coherent library/node_modules/@csegames/coherent`
  (three levels up, i.e. the repository's `coherent/`; npm writes a six-level target that dangles).
- Then `cd camelot && npm rebuild` — restores `node_modules/.bin` and the node-sass binding.
- After a tag update, rebuild `library/` too, or camelot fails with cascading `TS2307`/`TS2741`
  against a stale `library/dist`.

## Running the UI in a browser (out of context)

Supported by design: `mainScreen/preload.ts` → `loadCamelot()` → `loadGame()` → out-of-context stub →
React.

```sh
./scripts/dev-browser.sh <manifest-export-dir>     # or omit the path to run without game definitions
```

That builds `library/` and `camelot/`, stages the given manifest export, and serves `dist/` on
`http://localhost:8080` (`PORT=` to change, `SKIP_BUILD=1` to serve an existing build). It only reads
the directory you pass it — no filesystem searching. The manifest export is the one manual step: run
the game client once with `manifestExportDirectory=<dir>` (see
`documentation/ExtractingManifests.md`). Without it the UI starts but almost no HUD widget renders,
because widgets wait for game definitions.

A browser session normally gets neither credentials nor game definitions, because the client supplies
both. `camelot/src/mainScreen/dev/devBootstrap.ts` fills the gap using `localStorage` keys. **The
default is credential-free**: no WebAPI traffic at all, worked from a locally staged manifest export,
which is all that in-game HUD work needs. Live data is opt-in, because it additionally needs
credentials and a reachable shard.

| Key | Purpose |
| --- | --- |
| `cu.dev.live` | `'1'` talks to the WebAPI instead of running offline. Requires `cu.dev.accessToken`; without a JWT-shaped token the session falls back to offline with a warning |
| `cu.dev.accessToken` | JWT sent as `Authorization: Bearer`. Without one the GraphQL websocket is closed with 4401 and never retried, so the loading screen would never clear |
| `cu.dev.characterID` | Sent as the `characterID` request header |
| `cu.dev.webAPIHost` | WebAPI host, i.e. which shard answers `shardCharacters` (the query takes no shard argument). Defaults to `https://hawkingapi.camelotunchained.com` in live mode |
| `cu.dev.autoConnect` | Enters the connected state the way the Play button does. Defaults to on in offline mode, where there are no characters to select; `'0'` opts out |

In offline mode the two WebAPI-backed init topics (`shardCharacters`, `zones`) are marked complete
with a failed result — a failed result still clears the loading screen, only `undefined` holds it —
and web calls are short-circuited so nothing retries against an unreachable server.

Obtain a JWT with `POST https://api.camelotunchained.com/auth/token` and the JSON body
`{"email": …, "password": …}`; the response's `access_token` is the bearer token. Keep credentials
out of the repository and out of shell history (a git-ignored, `chmod 600` secrets file sourced into
the environment works well). `get-jwt.sh` next to this file does this and prints only the token.

Game definitions are loaded from `<dist>/dev-manifests/index.json`, staged from a client manifest
export — see `documentation/ExtractingManifests.md`. Exported manifests are **not uniformly schema
version 1** (`stats`/`craftingjobs` are v2-only, `classes` v3, `gamesettings` v4, several others v2),
so the staging tool derives each manifest's version from its processor's own key sets.

Known browser-mode limitation: `BrowserHUDFunctions.getWidgets()` returns `{}` and
`updateWidgetState()` is a no-op, so HUD widget layout and opacity are never loaded from or saved to
storage. The HUD Editor's sliders still update Redux, so in-session editing works but does not
survive a reload.

## Testing in-game & debugging

- In-game: launch through the patcher with `uiOverrideDirectory="<abs path to dist>" overrideUI=1`
  (hold Alt when clicking Play to edit the command line); `/reloadui` refreshes a build mid-match.
  See `documentation/TestingGameUI.md`.
- Debugging: the Coherent Debugger is a WebKit-style inspector (`documentation/Debugging.md`).
  The launcher UI debug port is `uiDebugPort=9000`.
- `coherent/dist/coherent.mock.js` adds an engine "Mocker" overlay in a browser, but it is not wired
  into any build — include it manually if you want to fire engine events.

## Deployment

Built UI is copied from `<game>/dist` into the main game repository
(`MMO/Client/CamelotUnchainedUI/interface` for CU, `.../ColossusUI/interface` for FSR) and committed
there. See `documentation/Deploying.md`.

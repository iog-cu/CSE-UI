#!/usr/bin/env bash
# Build the Camelot Unchained UI and serve it for browser (out-of-context) development.
#
#   ./scripts/dev-browser.sh [<manifest-export-dir>]
#
# <manifest-export-dir> is the folder the game client wrote its manifest files into (see
# documentation/ExtractingManifests.md). It may also be given as CU_MANIFEST_EXPORT.
# The script only ever reads the directory it is given — it does not search your filesystem.
#
# Environment:
#   CU_MANIFEST_EXPORT  default manifest export directory (overridden by the first argument)
#   PORT                port to serve on (default 8080)
#   SKIP_BUILD          set to 1 to serve the existing dist/ without rebuilding
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
MANIFEST_EXPORT=${1:-${CU_MANIFEST_EXPORT:-}}
PORT=${PORT:-8080}
DIST="$REPO_ROOT/camelot/dist"

info() { printf '\033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*" >&2; }
fail() { printf '\033[31merror: %s\033[0m\n' "$*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || fail "node not found in PATH"
command -v npm >/dev/null 2>&1 || fail "npm not found in PATH"
command -v python3 >/dev/null 2>&1 || fail "python3 not found in PATH (used to serve dist/)"

# The build chain needs Node 10.19 (mise.toml). Re-exec through mise rather than warning and then
# building with the wrong interpreter - `npm run build:dev` deletes dist/ before webpack fails, which
# leaves nothing to serve.
NODE_MAJOR=$(node --version | sed 's/^v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" != "10" ] && [ "${CU_DEV_BROWSER_REEXEC:-0}" != "1" ]; then
  if command -v mise >/dev/null 2>&1 && [ -f "$REPO_ROOT/mise.toml" ]; then
    info "Node $(node --version) is active; re-running under the pinned Node via mise"
    cd "$REPO_ROOT"
    CU_DEV_BROWSER_REEXEC=1 exec mise exec -- "$0" "$@"
  fi
  fail "Node 10.19 is required (active: $(node --version)). Install mise and run 'mise install', or activate Node 10.19 yourself."
fi

[ -d "$REPO_ROOT/camelot/node_modules" ] || fail "camelot/node_modules is missing - run: cd library && npm ci && npm pack, then cd camelot && npm ci (see the build notes in AGENTS.md)"
[ -d "$REPO_ROOT/library/node_modules" ] || fail "library/node_modules is missing - run: cd library && npm ci"
# The npm 6 nested file: dependency chain breaks on reinstall; without this link the camelot build
# cannot resolve @csegames/coherent.
if [ ! -e "$REPO_ROOT/library/node_modules/@csegames/coherent/package.json" ]; then
  warn "repairing the nested @csegames/coherent link (see AGENTS.md)"
  mkdir -p "$REPO_ROOT/library/node_modules/@csegames"
  ln -sfn ../../../coherent "$REPO_ROOT/library/node_modules/@csegames/coherent"
fi

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  info "Building library..."
  ( cd "$REPO_ROOT/library" && npm run build )
  info "Building camelot..."
  ( cd "$REPO_ROOT/camelot" && npm run build:dev )
else
  info "Skipping build (SKIP_BUILD=1)"
fi

[ -f "$DIST/mainScreen.html" ] || fail "build produced no $DIST/mainScreen.html"

if [ -n "$MANIFEST_EXPORT" ]; then
  [ -d "$MANIFEST_EXPORT" ] || fail "manifest export directory not found: $MANIFEST_EXPORT"
  info "Staging manifests from $MANIFEST_EXPORT"
  python3 "$REPO_ROOT/.agents/skills/build-cse-ui-linux/stage-dev-manifests.py" "$MANIFEST_EXPORT" "$DIST/dev-manifests"
else
  warn "No manifest export given, so game definitions will be unavailable."
  warn "The UI still starts, but almost no HUD widgets render: they wait for game definitions."
  warn ""
  warn "To extract them, launch the game client once with (hold Alt when clicking Play in the"
  warn "launcher, or use the Steam launch options):"
  warn ""
  warn "    manifestExportDirectory=<some folder>"
  warn ""
  warn "Then re-run this script with that folder:"
  warn ""
  warn "    ./scripts/dev-browser.sh <some folder>        # or CU_MANIFEST_EXPORT=<some folder>"
  warn ""
  warn "See documentation/ExtractingManifests.md for details."
fi

info "Serving $DIST on http://localhost:$PORT/mainScreen.html"
info "Session defaults to offline mode (no WebAPI traffic). Optional localStorage keys:"
info "  cu.dev.live = '1'          live WebAPI data (needs cu.dev.accessToken; hawking by default)"
info "  cu.dev.accessToken         JWT from .agents/skills/build-cse-ui-linux/get-jwt.sh"
info "  cu.dev.autoConnect = '0'   do not enter the connected state automatically"
info "Press Ctrl+C to stop."

cd "$DIST"
exec python3 -m http.server "$PORT"

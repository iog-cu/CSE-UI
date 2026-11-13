/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { game } from '@csegames/library/dist/_baseGame';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { processManifest } from '../dataSources/manifest/manifestDefService';
import { LoadingTopic, setGameDefsLoaded, setInitialized } from '../redux/loadingSlice';
import { updateStringTable } from '../redux/stringTableSlice';
import { store } from '../redux/store';

// Dev-only bootstrap for out-of-context (browser) sessions. In-game the client pushes credentials
// and game-definition manifests to the UI; in a browser neither exists, so without these steps the
// UI cannot authenticate against the WebAPI and every `requiresGameDefsLoaded` widget stays
// uninitialized. Nothing here runs when attached to a client.

const MANIFEST_DIR = 'dev-manifests';
const CREDENTIAL_KEY = 'cu.dev.accessToken';
const CHARACTER_ID_KEY = 'cu.dev.characterID';
const AUTO_CONNECT_KEY = 'cu.dev.autoConnect';
const WEB_API_HOST_KEY = 'cu.dev.webAPIHost';
const OFFLINE_KEY = 'cu.dev.offline';

// Widget display names that exist only in this client. In-game these come from the stringtable
// manifest (game data); until they are added there, the HUD Editor falls back to the raw string id.
// Out-of-context sessions get them here so the editor is legible while developing the widgets.
const DEV_STRING_TABLE_ENTRIES: Record<string, string> = {
  HUDEditorWidgetNameStatusEffectsSelf: 'Status Effects (Self)',
  HUDEditorWidgetNameStatusEffectsFriendly: 'Status Effects (Friendly Target)',
  HUDEditorWidgetNameStatusEffectsEnemy: 'Status Effects (Enemy Target)'
};

/**
 * Applies the browser session's configuration to the out-of-context stub game object: credentials,
 * which WebAPI host (shard) to talk to, and whether to run without any network access at all.
 *
 * Values come from localStorage rather than environment variables because webpack bakes
 * `process.env` in at build time — an env var would require a rebuild to change shard.
 */
export function applyDevOverrides(): void {
  if (game.isClientAttached) {
    return;
  }

  try {
    const accessToken = window.localStorage.getItem(CREDENTIAL_KEY);
    if (accessToken) {
      game.accessToken = accessToken;
    }
    const characterID = window.localStorage.getItem(CHARACTER_ID_KEY);
    if (characterID) {
      game.characterID = characterID;
    }
    const webAPIHost = window.localStorage.getItem(WEB_API_HOST_KEY);
    if (webAPIHost) {
      game.webAPIHost = webAPIHost;
    }
    if (window.localStorage.getItem(OFFLINE_KEY) === '1') {
      applyOfflineMode();
    }
  } catch (e) {
    console.error('Failed to read development configuration', e);
  }
}

/**
 * Works from locally staged manifests only. The two WebAPI-backed init topics are marked complete
 * with a failed result — `loadingSlice.setInitialized` counts `false` as complete (only
 * `undefined`/`null` hold the loading screen) — and web calls are short-circuited so they do not
 * retry against an unreachable server.
 */
function applyOfflineMode(): void {
  // BrowserNetworkFunctions hardcodes isOfflineMode() to false; overriding it here keeps the whole
  // harness in one place instead of patching library/.
  clientAPI.isOfflineMode = () => Promise.resolve(true);
  store.dispatch(setInitialized({ topic: LoadingTopic.ShardCharacters, result: false }));
  store.dispatch(setInitialized({ topic: LoadingTopic.Zones, result: false }));
  console.log('Offline development mode: WebAPI calls are disabled');
}

interface DevManifestEntry {
  /** File name inside MANIFEST_DIR. */
  file: string;
  /** Schema version the client would send for this manifest; processors validate per version. */
  version: number;
}

interface DevManifestIndex {
  /** Manifest id (must match a *ManifestID constant) to exported file. */
  manifests: Record<string, DevManifestEntry | string>;
}

/**
 * Adds the widget names for this client to the loaded string table, without overwriting anything the
 * manifest already provides (updateStringTable replaces the whole table, so merge first).
 */
function applyDevStringTableEntries(): void {
  if (game.isClientAttached) {
    return;
  }

  const current = store.getState().stringTable.stringTable ?? {};
  const merged = { ...current };
  let added = 0;
  for (const [id, text] of Object.entries(DEV_STRING_TABLE_ENTRIES)) {
    if (!merged[id]) {
      merged[id] = { id, text };
      added++;
    }
  }
  if (added > 0) {
    store.dispatch(updateStringTable(merged));
  }
}

/**
 * Optionally skips the character-selection screen by entering the connected state, the same way the
 * Play button does. Opt in with localStorage.setItem('cu.dev.autoConnect', '1').
 */
function applyDevAutoConnect(): void {
  if (game.isClientAttached) {
    return;
  }

  try {
    if (window.localStorage.getItem(AUTO_CONNECT_KEY) !== '1') {
      return;
    }
  } catch (e) {
    console.error('Failed to read development auto-connect flag', e);
    return;
  }

  // Give the services a chance to subscribe before the status change is broadcast.
  window.setTimeout(() => clientAPI.connect(), 1000);
}

/**
 * Loads exported game-definition manifests through the normal processing path and marks game defs
 * as loaded. Expects `<dist>/dev-manifests/index.json` describing the exported files; see
 * `installDevManifests()` in the repository tooling for how a manifest export is staged there.
 */
export async function loadDevManifests(): Promise<boolean> {
  if (game.isClientAttached) {
    return false;
  }

  let index: DevManifestIndex;
  try {
    const response = await fetch(`${MANIFEST_DIR}/index.json`);
    if (!response.ok) {
      console.warn(
        `No development manifest index at ${MANIFEST_DIR}/index.json (HTTP ${response.status}). ` +
          'Game definitions are unavailable; stage a manifest export to develop widgets that need them.'
      );
      return false;
    }
    index = await response.json();
  } catch (e) {
    console.error('Failed to load development manifest index', e);
    return false;
  }

  const entries = Object.entries(index?.manifests ?? {});
  if (entries.length === 0) {
    console.warn(`Development manifest index at ${MANIFEST_DIR}/index.json lists no manifests`);
    return false;
  }

  let loaded = 0;
  for (const [manifestID, entry] of entries) {
    // Entries may be a bare file name (schema version 1 assumed) or {file, version}.
    const fileName = typeof entry === 'string' ? entry : entry.file;
    const version = typeof entry === 'string' ? 1 : entry.version ?? 1;
    try {
      const response = await fetch(`${MANIFEST_DIR}/${encodeURIComponent(fileName)}`);
      if (!response.ok) {
        console.warn(`Failed to fetch manifest ${manifestID} (HTTP ${response.status})`);
        continue;
      }
      // The client hands the UI the manifest contents as a JSON string plus a schema version.
      processManifest(store.dispatch, manifestID, await response.text(), version);
      loaded++;
    } catch (e) {
      console.error(`Failed to load manifest ${manifestID}`, e);
    }
  }

  if (loaded === 0) {
    console.warn('No development manifests could be loaded');
    return false;
  }

  store.dispatch(setGameDefsLoaded());
  applyDevStringTableEntries();
  console.log(`Loaded ${loaded} development manifests from ${MANIFEST_DIR}`);
  applyDevAutoConnect();
  return true;
}

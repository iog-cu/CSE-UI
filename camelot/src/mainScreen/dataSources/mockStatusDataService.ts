/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { StatusState } from '@csegames/library/dist/camelotunchained/game/GameClientModels/StatusState';
import { game } from '@csegames/library/dist/_baseGame';
import { mockEvents } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { AnimationData } from '@csegames/library/dist/_baseGame/GameClientModels/AnimationData';
import { addOrUpdateEntityStatuses, addOrUpdateEntityStatusInstanceCounts } from '../redux/entitiesSlice';
import { store } from '../redux/store';
import { StatusDef } from './manifest/statusManifest';
import { isStatusBuff } from '../helpers/statusHelpers';

// Dev-only helpers for out-of-context (browser) sessions. The `statuses` manifest supplies the
// definitions (see devBootstrap.loadDevManifests), but no client ever sends entity status updates
// out of context, so nothing would render without the sample instances below. Nothing here runs
// in-game (isClientAttached).

// The mock entity the unit-frame components fall back to when no real entity exists.
export const MOCK_ENTITY_ID = 'MOCK';

// Amount-stat values at development scale (player MaxHP is in the thousands).
const MOCK_DAMAGES = [250, 1250, 4800, 15200];

// Static world time the mock drain animations are seeked against; instance startTimes derive from
// it so the duration rings sit at a sensible point instead of being empty.
const MOCK_WORLD_TIME = 600;

const MOCK_DURATIONS = [12, 8, 6, 30];

function pickStatusDefs(statusesByStringID: Record<string, StatusDef>): StatusDef[] {
  const defs = Object.values(statusesByStringID).filter((def) => def && def.showInHUD);
  const buffs = defs.filter((def) => isStatusBuff(def));
  const debuffs = defs.filter((def) => !isStatusBuff(def));
  // Two buffs, three debuffs: enough to fill both rows without covering the unit frame.
  return [...debuffs.slice(0, 3), ...buffs.slice(0, 2)];
}

const buildMockStatusStates = (defs: StatusDef[]): Record<number, StatusState> => {
  const statuses: Record<number, StatusState> = {};

  defs.forEach((def, index) => {
    statuses[index] = {
      id: def.numericID,
      duration: MOCK_DURATIONS[index % MOCK_DURATIONS.length],
      startTime: MOCK_WORLD_TIME - 2 * index,
      isDisabled: false,
      // Damage-sized Amount on the first few, so the badge shows values that are meaningful
      // relative to player health; the remaining ones exercise the badge-less path.
      stats: index < MOCK_DAMAGES.length ? { Amount: MOCK_DAMAGES[index] } : {}
    };
  });

  // A permanent status (no duration ring or countdown) on the first def, plus a stacked status:
  // two instances of the same id, which exercises the instance-count path of the Amount badge.
  if (defs.length > 0) {
    statuses[defs.length] = {
      id: defs[0].numericID,
      duration: Infinity,
      startTime: 0,
      isDisabled: false,
      stats: {}
    };
  }
  if (defs.length > 1) {
    statuses[defs.length + 1] = {
      id: defs[1].numericID,
      duration: MOCK_DURATIONS[1],
      startTime: MOCK_WORLD_TIME - 5,
      isDisabled: false,
      stats: {}
    };
  }

  return statuses;
};

// Static animation frame: StatusEffectsIcon seeks its drain animation against data.worldTime, and
// the browser animation source provides none.
const MOCK_ANIMATION_DATA: AnimationData = {
  cameraPitch: 0,
  cameraYaw: 0,
  enemyTargetDistance: 0,
  enemyTargetBearing: 0,
  friendlyTargetDistance: 0,
  friendlyTargetBearing: 0,
  playerX: 0,
  playerY: 0,
  playerZ: 0,
  playerYaw: 0,
  viewX: 0,
  viewY: 0,
  viewZ: 0,
  worldTime: MOCK_WORLD_TIME,
  timeOfDay: 12,
  fps: 60,
  mapData: {
    zoneId: [],
    destinationZoneId: [],
    id: [],
    faction: [],
    capturingFaction: [],
    itemDefID: [],
    type: [],
    xpos: [],
    ypos: [],
    yaw: [],
    tier: []
  }
};

/**
 * Attaches sample status instances to the mock entity, using definitions from the loaded
 * `statuses` manifest. Call after loadDevManifests() so definitions exist.
 */
export function installMockStatusData(): void {
  if (game.isClientAttached) {
    return;
  }

  const { statusesByStringID } = store.getState().gameDefs;
  const defs = pickStatusDefs(statusesByStringID);
  if (defs.length === 0) {
    console.warn('No status definitions available; skipping mock status instances');
    return;
  }

  const statuses = buildMockStatusStates(defs);
  const instanceCounts: Record<number, number> = {};
  Object.values(statuses).forEach((status) => {
    instanceCounts[status.id] = (instanceCounts[status.id] ?? 0) + 1;
  });

  // The mock entity id covers the component-level mock data ('MOCK'), and '' covers the default
  // self entity (entities.self starts as DefaultSelf with entityID ''), so the embedded copies in
  // the unit frames render mock statuses out of context as well.
  [MOCK_ENTITY_ID, ''].forEach((entityID) => {
    store.dispatch(addOrUpdateEntityStatuses([entityID, statuses]));
    store.dispatch(addOrUpdateEntityStatusInstanceCounts([entityID, instanceCounts]));
  });
  mockEvents.setMockAnimationData(MOCK_ANIMATION_DATA);
}

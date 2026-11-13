/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { StatusState } from '@csegames/library/dist/camelotunchained/game/GameClientModels/StatusState';
import { game } from '@csegames/library/dist/_baseGame';
import { mockEvents } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { AnimationData } from '@csegames/library/dist/_baseGame/GameClientModels/AnimationData';
import { addOrUpdateEntityStatuses, addOrUpdateEntityStatusInstanceCounts, addOrUpdateEntityResources } from '../redux/entitiesSlice';
import { store } from '../redux/store';
import { StatusDef } from './manifest/statusManifest';
import { isPeriodicStatus, isStatusBuff } from '../helpers/statusHelpers';
import { EntityResource } from '@csegames/library/dist/camelotunchained/game/GameClientModels/EntityState';
import { EntityResourceIDs } from '@csegames/library/dist/camelotunchained/game/types/EntityResourceIDs';

// Dev-only helpers for out-of-context (browser) sessions. The `statuses` manifest supplies the
// definitions (see devBootstrap.loadDevManifests), but no client ever sends entity status updates
// out of context, so nothing would render without the sample instances below. Nothing here runs
// in-game (isClientAttached).

// The mock entity the unit-frame components fall back to when no real entity exists.
export const MOCK_ENTITY_ID = 'MOCK';

// Amount-stat values at development scale (player MaxHP is in the thousands). Chosen against
// MOCK_HEALTH_CURRENT below to land in each of the amount column's HP-relative formatting tiers,
// on both sides: 80% (bold + shadow), 120% (largest), 40% (plain), then 80% and 110% again so the
// positive side's teal and green extremes are represented too.
const MOCK_AMOUNTS = [4000, 6000, 2000, 4000, 5500];

// Health of the mock entity under the effects. The amount column formats its numbers relative to
// the current HP of that entity, so out of context needs a plausible resource (a real entity's
// health arrives from the client and is not available in a browser session).
const MOCK_HEALTH_CURRENT = 5000;
const MOCK_HEALTH_MAX = 8000;

// Static world time the mock drain animations are seeked against; instance startTimes derive from
// it so the duration rings sit at a sensible point instead of being empty.
const MOCK_WORLD_TIME = 600;

const MOCK_DURATIONS = [12, 8, 6, 30];

function pickStatusDefs(statusesByStringID: Record<string, StatusDef>): StatusDef[] {
  const defs = Object.values(statusesByStringID).filter((def) => def && def.showInHUD);
  const buffs = defs.filter((def) => isStatusBuff(def));
  const debuffs = defs.filter((def) => !isStatusBuff(def));
  // Lead each side with periodic statuses (DoT and HoT), so the 1-second stepped drain is
  // represented in the sample set.
  const periodicFirst = (list: StatusDef[]) => [
    ...list.filter((def) => isPeriodicStatus(def)),
    ...list.filter((def) => !isPeriodicStatus(def))
  ];
  const orderedDebuffs = periodicFirst(debuffs);
  const orderedBuffs = periodicFirst(buffs);
  // The first five populate the two columns (three negative, two positive).
  const chosen = [...orderedDebuffs.slice(0, 3), ...orderedBuffs.slice(0, 2)];
  // The trailing two are sample extras that need status ids of their own: instances sharing an id
  // collapse into the newest one (see getNewestStatusInstances), so the permanent and the
  // about-to-expire sample cannot reuse a status that is already on screen. They also prefer
  // non-periodic statuses, so the smooth (non-stepped) drain is represented alongside the stepped
  // periodic one.
  const used = new Set(chosen.map((def) => def.numericID));
  const nonPeriodicFirst = (list: StatusDef[]) => [
    ...list.filter((def) => !isPeriodicStatus(def)),
    ...list.filter((def) => isPeriodicStatus(def))
  ];
  const extras = [
    ...nonPeriodicFirst(debuffs.filter((def) => !used.has(def.numericID))).slice(0, 1),
    ...nonPeriodicFirst(buffs.filter((def) => !used.has(def.numericID))).slice(0, 1)
  ];
  return [...chosen, ...extras];
}

// How many of the picked defs form the ordinary sample set (the rest are the extras below).
const MOCK_NORMAL_COUNT = 5;

const buildMockStatusStates = (defs: StatusDef[]): Record<number, StatusState> => {
  const statuses: Record<number, StatusState> = {};

  defs.forEach((def, index) => {
    if (index >= MOCK_NORMAL_COUNT) {
      return;
    }
    statuses[index] = {
      id: def.numericID,
      duration: MOCK_DURATIONS[index % MOCK_DURATIONS.length],
      startTime: MOCK_WORLD_TIME - 2 * index,
      isDisabled: false,
      // Amounts chosen to land in each HP-relative tier; the remaining ones exercise the
      // amount-less path.
      stats: index < MOCK_AMOUNTS.length ? { Amount: MOCK_AMOUNTS[index] } : {}
    };
  });

  // A permanent status (no duration, no drain) and a status that is about to expire (remaining
  // well under a second, so its icon blinks). Both use extra defs so their instances do not merge
  // with an on-screen status of the same id.
  if (defs.length > MOCK_NORMAL_COUNT) {
    statuses[MOCK_NORMAL_COUNT] = {
      id: defs[MOCK_NORMAL_COUNT].numericID,
      duration: Infinity,
      startTime: 0,
      isDisabled: false,
      stats: {}
    };
  }
  if (defs.length > MOCK_NORMAL_COUNT + 1) {
    statuses[MOCK_NORMAL_COUNT + 1] = {
      id: defs[MOCK_NORMAL_COUNT + 1].numericID,
      duration: 6,
      startTime: MOCK_WORLD_TIME - 5.2,
      isDisabled: false,
      stats: {}
    };
  }

  // A stacked status: two instances of the same id, which exercises the instance-count path of the
  // icon's stack badge.
  if (defs.length > 1) {
    statuses[MOCK_NORMAL_COUNT + 2] = {
      id: defs[1].numericID,
      duration: MOCK_DURATIONS[1],
      startTime: MOCK_WORLD_TIME - 5,
      isDisabled: false,
      stats: {}
    };
  }

  return statuses;
};

const MOCK_RESOURCES: Record<string, EntityResource> = {
  [EntityResourceIDs.Health]: {
    name: 'Health',
    id: EntityResourceIDs.Health,
    current: MOCK_HEALTH_CURRENT,
    max: MOCK_HEALTH_MAX,
    limit: MOCK_HEALTH_MAX,
    changeRate: 0
  }
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
    // Health, so the amount column's HP-relative formatting tiers are exercised out of context.
    store.dispatch(addOrUpdateEntityResources([entityID, MOCK_RESOURCES]));
  });
  mockEvents.setMockAnimationData(MOCK_ANIMATION_DATA);
}

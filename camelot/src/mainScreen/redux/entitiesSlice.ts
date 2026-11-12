/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AnyEntityStateModel,
  BaseEntityStateModel,
  EntityResource,
  EntityStat,
  isEntityPlayer,
  PlayerEntityStateModel,
  SnapshotFlags
} from '@csegames/library/dist/camelotunchained/game/GameClientModels/EntityState';
import { Faction } from '@csegames/library/dist/camelotunchained/webAPI/definitions';
import { EntityContext } from '@csegames/library/dist/_baseGame/types/EntityContext';
import { CharacterKind } from '@csegames/library/dist/camelotunchained/game/types/CharacterKind';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { SoundEvents } from '@csegames/library/dist/camelotunchained/game/types/SoundEvents';
import { StatusState } from '@csegames/library/dist/camelotunchained/game/GameClientModels/StatusState';

export interface ContextUpdate {
  context: EntityContext;
  entityID: string;
}

export const DefaultBaseEntityState: BaseEntityStateModel = {
  faction: Faction.Arthurian,
  entityID: '',
  name: '',
  isAlive: true,
  statuses: {},
  resources: {},
  type: '',
  objective: null,
  tags: {},
  flags: SnapshotFlags.None
};

export const DefaultSelf: PlayerEntityStateModel = {
  ...DefaultBaseEntityState,
  characterKind: CharacterKind.User,
  accountID: '',
  characterID: '',
  groupID: '',
  classID: 0,
  guildCrest: '',
  guildID: '',
  guildName: '',
  gender: 0,
  race: 0,
  stats: {},
  progression: {},
  characterLevel: 0,
  realmRank: 0,
  equipment: {},
  inventory: {},
  wallet: {},
  accountBank: {},
  isKeepAvailable: false,
  respawnTimestamp: 0,
  idleRespawnTimestamp: 0,
  logoutCompleteTime: 0
};

interface EntitiesState {
  entities: Record<string, AnyEntityStateModel>;
  self: PlayerEntityStateModel;
  selfID: string | null;
  enemyTarget: AnyEntityStateModel | null;
  enemyTargetID: string | null;
  friendlyTarget: AnyEntityStateModel | null;
  friendlyTargetID: string | null;
  // Maps entityID to a Record that maps statusID to count.
  // statusInstanceCounts is precomputed once in EntityStateService.handleEntityUpdated (same reshape-on-ingest
  // pattern used for `stats`/`resources`): duplicate status ids are legal (reapply glitches, and statuses like
  // Exertion that stack via repeated instances rather than an Amount stat), so consumers read the count for a
  // given status id directly instead of re-deriving it by scanning entity.statuses per render.
  entityStatusInstanceCounts: Record<string, Record<number, number>>;
  // Maps entityID to a Record that maps statID to stat data.
  entityStats: Record<string, Record<number, EntityStat>>;
  // Maps entityID to a Record that maps arrayIndex (why not just be an array?) to status data.
  entityStatuses: Record<string, Record<number, StatusState>>;
  // Maps entityID to a Record that maps resourceID to resource data.
  entityResources: Record<string, Record<string, EntityResource>>;
}

const DefaultEntitiesState: EntitiesState = {
  entities: {},
  self: DefaultSelf,
  selfID: null,
  enemyTarget: null,
  enemyTargetID: null,
  friendlyTarget: null,
  friendlyTargetID: null,
  entityStatusInstanceCounts: {},
  entityStats: {},
  entityStatuses: {},
  entityResources: {}
};

export const entitiesSlice = createSlice({
  name: 'entities',
  initialState: DefaultEntitiesState,
  reducers: {
    addOrUpdateEntity: (state: EntitiesState, action: PayloadAction<AnyEntityStateModel>) => {
      state.entities[action.payload.entityID] = action.payload;
      if (state.selfID === action.payload.entityID) {
        state.self = action.payload as PlayerEntityStateModel;
      }
      if (state.enemyTargetID === action.payload.entityID) {
        state.enemyTarget = action.payload;
      }
      if (state.friendlyTargetID === action.payload.entityID) {
        state.friendlyTarget = action.payload;
      }
    },
    addOrUpdateEntityStatusInstanceCounts: (
      state: EntitiesState,
      action: PayloadAction<[string, Record<number, number>]>
    ) => {
      state.entityStatusInstanceCounts[action.payload[0]] = action.payload[1];
    },
    addOrUpdateEntityStatuses: (state: EntitiesState, action: PayloadAction<[string, Record<number, StatusState>]>) => {
      state.entityStatuses[action.payload[0]] = action.payload[1];
    },
    addOrUpdateEntityStats: (state: EntitiesState, action: PayloadAction<[string, Record<number, EntityStat>]>) => {
      state.entityStats[action.payload[0]] = action.payload[1];
    },
    addOrUpdateEntityResources: (
      state: EntitiesState,
      action: PayloadAction<[string, Record<string, EntityResource>]>
    ) => {
      state.entityResources[action.payload[0]] = action.payload[1];
    },
    removeEntity: (state: EntitiesState, action: PayloadAction<string>) => {
      if (state.entities[action.payload]) {
        delete state.entities[action.payload];
      }
      if (state.entityResources[action.payload]) {
        delete state.entityResources[action.payload];
      }
      if (state.entityStats[action.payload]) {
        delete state.entityStats[action.payload];
      }
      if (state.entityStatusInstanceCounts[action.payload]) {
        delete state.entityStatusInstanceCounts[action.payload];
      }
      if (state.entityStatuses[action.payload]) {
        delete state.entityStatuses[action.payload];
      }

      if (state.selfID == action.payload) {
        // leave self intact between respawns
        state.selfID = null;
      }
      if (state.enemyTargetID === action.payload) {
        state.enemyTarget = null;
        state.enemyTargetID = null;
      }
      if (state.friendlyTargetID === action.payload) {
        state.friendlyTarget = null;
        state.friendlyTargetID = null;
      }
    },
    setEntityContext: (state: EntitiesState, action: PayloadAction<ContextUpdate>) => {
      const entityID = action.payload.entityID;
      switch (action.payload.context) {
        case 'player':
          state.selfID = entityID;
          const entity = state.entities[state.selfID];
          if (entity) {
            state.self = entity as PlayerEntityStateModel;
          }
          break;
        case 'target.enemy':
          state.enemyTargetID = entityID;
          state.enemyTarget = entityID ? state.entities[entityID] : null;
          if (isEntityPlayer(state.enemyTarget)) {
            clientAPI.playGameSound(SoundEvents.PLAY_UI_SFX_GAME_CHARACTER_SELECT);
          }
          break;
        case 'target.friendly':
          state.friendlyTargetID = entityID;
          state.friendlyTarget = entityID ? state.entities[entityID] : null;
          if (isEntityPlayer(state.friendlyTarget)) {
            clientAPI.playGameSound(SoundEvents.PLAY_UI_SFX_GAME_CHARACTER_SELECT);
          }
          break;
      }
    }
  }
});

export const {
  addOrUpdateEntity,
  addOrUpdateEntityResources,
  addOrUpdateEntityStats,
  addOrUpdateEntityStatuses,
  addOrUpdateEntityStatusInstanceCounts,
  removeEntity,
  setEntityContext
} = entitiesSlice.actions;

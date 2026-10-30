/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Dispatch } from '@reduxjs/toolkit';
import { isDataArray } from './manifestDefService';
import { updateProgressionTracks } from '../../redux/gameDefsSlice';

export const progressionTrackManifestID = 'progressiontracks';

export interface ProgressionPoolUnlockDef {
  unlockID: string; // Ability or status string ID
  isStatus: boolean;
  maxTier: number;
  costByTier: number[]; // Index 0 = tier 1
}

export interface ProgressionPoolDef {
  index: number;
  pointsRequiredInPreviousPool: number;
  unlocks: ProgressionPoolUnlockDef[];
}

export interface ProgressionTrackDef {
  id: string;
  nameKey: string;
  descriptionKey: string;
  iconURL: string;
  tags: string[];
  abilityUnlocks: Record<string, number>;
  statusUnlocks: Record<string, number>;
  poolsByCategory: Record<string, ProgressionPoolDef[]>;
}

export function processProgressionTracks(dispatch: Dispatch, json: any, version: number): void {
  if (!isDataArray(json.defs, version, isProgressionTrackData)) {
    console.error('Invalid ProgressionTrack manifest file');
    return;
  }

  var tracks: Record<string, ProgressionTrackDef> = {};

  for (const componentJson of json.defs) {
    switch (version) {
      case 1:
        tracks[componentJson.id] = {
          id: componentJson.id,
          nameKey: componentJson.nameKey,
          descriptionKey: componentJson.descriptionKey,
          iconURL: componentJson.iconURL,
          tags: componentJson.tags,
          abilityUnlocks: componentJson.abilityUnlocks,
          statusUnlocks: {},
          poolsByCategory: {}
        };
        break;
      case 2:
        tracks[componentJson.id] = {
          id: componentJson.id,
          nameKey: componentJson.nameKey,
          descriptionKey: componentJson.descriptionKey,
          iconURL: componentJson.iconURL,
          tags: componentJson.tags,
          abilityUnlocks: componentJson.abilityUnlocks,
          statusUnlocks: componentJson.statusUnlocks,
          poolsByCategory: componentJson.poolsByCategory
        };
        break;
    }
  }

  dispatch(updateProgressionTracks(tracks));
}

function isProgressionTrackData(obj: any, version: number): boolean {
  switch (version) {
    case 1: {
      const isCorrectType =
        Object.keys(obj).length === 6 &&
        'id' in obj &&
        'nameKey' in obj &&
        'descriptionKey' in obj &&
        'iconURL' in obj &&
        'tags' in obj &&
        'abilityUnlocks' in obj;
      if (!isCorrectType) {
        console.error(`Found invalid ProgressionTrack object`, obj);
        return false;
      }
      return isCorrectType;
    }
    case 2: {
      const isCorrectType =
        Object.keys(obj).length === 8 &&
        'id' in obj &&
        'nameKey' in obj &&
        'descriptionKey' in obj &&
        'iconURL' in obj &&
        'tags' in obj &&
        'abilityUnlocks' in obj &&
        'statusUnlocks' in obj &&
        'poolsByCategory' in obj;
      if (!isCorrectType) {
        console.error(`Found invalid ProgressionTrack object`, obj);
      }
      return isCorrectType;
    }
    default:
      console.error(`Found invalid ProgressionTrack version ${version}`);
      return false;
  }
}

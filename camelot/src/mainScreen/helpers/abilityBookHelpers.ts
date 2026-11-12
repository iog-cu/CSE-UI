/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ClassDef } from '../dataSources/manifest/classManifest';
import { ProgressionTrackDef } from '../dataSources/manifest/progressionTrackManifest';
import { GameDefsState } from '../redux/gameDefsSlice';
import { PlayerEntityStateModel } from '@csegames/library/dist/camelotunchained/game/GameClientModels/EntityState';
import { AbilityWithActivation } from '../redux/abilitiesSlice';
import { BorderType } from '../components/FactionBorder';
import { StringTableEntryDef } from '../dataSources/manifest/stringTableManifest';
import {
  getStringTableValue,
  getTokenizedStringTableValue,
  StringIDGeneralLevel,
  StringIDGeneralParenthesis
} from './stringTableHelpers';

export const TAG_PREFIX_ARCHETYPE_CLASS = 'Asset.Class.';
export const TAG_PREFIX_SPECIALIZATION = 'Asset.Specialization.';
export const TAG_PREFIX_PASSIVE = 'Asset.Passive.';
const TAG_PREFIX_TRADESKILL = 'Tradeskill.';

// Corners scale with the icon, since their 4vmin/2vmin defaults would cover most of a small one.
const LEARNED_ICON_CORNER_RATIO = 0.6;
const LOCKED_ICON_CORNER_RATIO = 0.4;

// String IDs
export const StringIDAbilityBookClassProgression = 'AbilityBookClassProgression';
export const StringIDAbilityBookTradeskillProgression = 'AbilityBookTradeskillProgression';

export function isTradeskillTrack(track: ProgressionTrackDef): boolean {
  return track.tags.some((tag) => tag.startsWith(TAG_PREFIX_TRADESKILL));
}

export function isSpecializationTrack(track: ProgressionTrackDef): boolean {
  return track.tags.some((tag) => tag.startsWith(TAG_PREFIX_SPECIALIZATION));
}

export function getTradeskillTitle(
  track: ProgressionTrackDef,
  level: number,
  stringTable: Record<string, StringTableEntryDef>
): string {
  const levelText = getTokenizedStringTableValue(StringIDGeneralLevel, stringTable, { LEVEL: level.toFixed(0) });
  const levelInParentheses = getTokenizedStringTableValue(StringIDGeneralParenthesis, stringTable, {
    CONTENTS: levelText
  });
  return `${getStringTableValue(track.nameKey, stringTable)} ${levelInParentheses}`;
}

export function getAbilityIconBorderProps(
  isLearned: boolean,
  iconSizeVmin: number
): { type: BorderType; cornerSize: string } {
  const ratio = isLearned ? LEARNED_ICON_CORNER_RATIO : LOCKED_ICON_CORNER_RATIO;
  return {
    type: isLearned ? BorderType.Primary : BorderType.Secondary,
    cornerSize: `${(iconSizeVmin * ratio).toFixed(2)}vmin`
  };
}

// Character level minus levels already spent on specialization tracks; mirrors the "Available
// Points" the Ability Book shows per-class.
export function getAvailableAbilityPoints(
  classDef: ClassDef,
  defs: GameDefsState,
  self: PlayerEntityStateModel
): number {
  if (!classDef || !self) {
    return 0;
  }

  const specializationTracks = classDef.progressionTracks.filter((ptID) => {
    const track = defs.progressionTracks[ptID];
    return !!track && isSpecializationTrack(track);
  });

  const characterLevel = self.characterLevel ?? 0;
  const spentPoints = specializationTracks.reduce<number>((pointsSoFar, ptID) => {
    return pointsSoFar + (self.progression[ptID]?.level ?? 0);
  }, 0);

  return characterLevel - spentPoints;
}

export function getAbilityByDisplayDefID(
  displayDefID: number,
  abilities: Record<number, AbilityWithActivation>,
  abilityIDsByDisplayDefID: Record<number, number>
): AbilityWithActivation | undefined {
  const abilityID = abilityIDsByDisplayDefID[displayDefID];
  return abilityID !== undefined ? abilities[abilityID] : undefined;
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { Dictionary } from '@csegames/library/dist/_baseGame/types/ObjectMap';
import {
  getStringTableValue,
  getTokenizedStringTableValue,
  replaceStringTokens,
  StringIDGeneralTimeInSeconds
} from '../../helpers/stringTableHelpers';
import { StringTableEntryDef } from '../../dataSources/manifest/stringTableManifest';
import { isStatusBuff, StatusData } from '../../helpers/statusHelpers';

// CSS classes (shared with the unit-frame icon's tooltip)
const TooltipContainer = 'HUD-StatusEffectsIcon-TooltipContainer';
const TooltipName = 'HUD-StatusEffectsIcon-TooltipName';
const TooltipText = 'HUD-StatusEffectsIcon-TooltipText';
const RemovableHint = 'HUD-StatusEffectsIcon-RemovableHint';
const Positive = 'Positive';
const Negative = 'Negative';

// String IDs
const StringIDUnitFrameStatusEffectsPositive = 'UnitFrameStatusEffectsPositive';
const StringIDUnitFrameStatusEffectsNegative = 'UnitFrameStatusEffectsNegative';
const StringIDUnitFrameStatusEffectsRemovable = 'UnitFrameStatusEffectsRemovable';

interface Props {
  status: StatusData;
  // Seconds elapsed since the status started, from the per-icon animation loop; drives the
  // remaining-duration text. Null until the first animation frame.
  elapsed: number | null;
  removable: boolean;
  stringTable: Dictionary<StringTableEntryDef>;
}

// Tooltip body shared by the unit-frame status icons and the standalone widget icons.
export function StatusEffectTooltipContent(props: Props): JSX.Element {
  const { status, elapsed } = props;
  const isBuff = isStatusBuff(status);
  const ttType = isBuff ? Positive : Negative;
  const ttText = isBuff
    ? getStringTableValue(StringIDUnitFrameStatusEffectsPositive, props.stringTable)
    : getStringTableValue(StringIDUnitFrameStatusEffectsNegative, props.stringTable);
  const description = replaceStringTokens(status.description, status.stats);
  return (
    <div className={TooltipContainer}>
      <div className={TooltipName}>{status.name}</div>
      <div className={`${TooltipText} ${ttType}`}>{ttText}</div>
      {status.duration < Infinity && (
        <div className={TooltipText}>
          {getTokenizedStringTableValue(StringIDGeneralTimeInSeconds, props.stringTable, {
            TIME: String(Math.floor(status.duration - elapsed))
          })}
        </div>
      )}
      <div className={TooltipText}>{description}</div>
      {props.removable && (
        <div className={`${TooltipText} ${RemovableHint}`}>
          {getStringTableValue(StringIDUnitFrameStatusEffectsRemovable, props.stringTable)}
        </div>
      )}
    </div>
  );
}

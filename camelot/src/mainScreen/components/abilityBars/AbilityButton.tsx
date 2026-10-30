/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { AbilityWithActivation } from '../../redux/abilitiesSlice';
import { RootState } from '../../redux/store';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { AbilityDisplayDef } from '../../dataSources/manifest/abilityDisplayManifest';
import { AbilityBarSlotDropTargetData } from './AbilityBarSlot';
import { SoundEvents } from '@csegames/library/dist/camelotunchained/game/types/SoundEvents';
import { AbilityTooltip } from './AbilityTooltip';
import {
  AbilityButtonFrame,
  AbilitySlotInjectedProps,
  Icon,
  getSlotKeybindText,
  mapSlotStateToProps,
  renderAbilityOverlays,
  swapSlotsOnDrop
} from './AbilityButtonShared';

// Styles
const ResourceRim = 'HUD-AbilityButton-ResourceRim';

// Keyed by the stat the client sends for an ability's resource cost ("Cost." + the resource's display name).
const ResourceRimClassByCostStat: Record<string, string> = {
  'Cost.Faith': `${ResourceRim} HUD-AbilityButton-FaithRim`,
  'Cost.Judgment': `${ResourceRim} HUD-AbilityButton-JudgmentRim`,
  'Cost.Courage': `${ResourceRim} HUD-AbilityButton-CourageRim`,
  'Cost.Mana': `${ResourceRim} HUD-AbilityButton-ManaRim`,
  'Cost.Focus': `${ResourceRim} HUD-AbilityButton-FocusRim`,
  'Cost.Determination': `${ResourceRim} HUD-AbilityButton-DeterminationRim`
};
const ResourceRimCostStats = Object.keys(ResourceRimClassByCostStat);

function getResourceRimClass(stats: Record<string, number> | undefined): string | null {
  const costStat = stats && ResourceRimCostStats.find((stat) => (stats[stat] ?? 0) > 0);
  return costStat ? ResourceRimClassByCostStat[costStat] : null;
}

interface ReactProps {
  layoutID: number;
  abilityID: number;
  slotIndex: number;
}

interface InjectedProps extends AbilitySlotInjectedProps {
  abilityStatus: AbilityWithActivation;
  displayData: AbilityDisplayDef;
}

type Props = ReactProps & InjectedProps;

class AAbilityButton extends React.Component<Props> {
  render(): React.ReactNode {
    // If no ability is assigned, then we dont' have to render anything.
    if (!this.props.abilityStatus) {
      return null;
    }

    return (
      <AbilityButtonFrame
        tooltipID={`TooltipL:${this.props.layoutID},S:${this.props.slotIndex}`}
        tooltipContent={() => <AbilityTooltip abilityID={this.props.abilityID} />}
        draggableID={`DraggableL:${this.props.layoutID},S:${this.props.slotIndex}`}
        group={this.props.group}
        slotIndex={this.props.slotIndex}
        inEditMode={this.props.inEditMode}
        onDropped={this.onAbilityDropped.bind(this)}
        renderContents={this.renderButtonContents.bind(this)}
      />
    );
  }

  private renderButtonContents(): React.ReactNode {
    const resourceRimClass = getResourceRimClass(this.props.abilityStatus.stats);

    return (
      <>
        <img className={Icon} src={this.props.displayData?.iconURL} />
        {resourceRimClass && <div className={resourceRimClass} />}
        {renderAbilityOverlays(
          this.props.abilityStatus,
          this.props.abilityID,
          getSlotKeybindText(this.props, this.props.slotIndex)
        )}
      </>
    );
  }

  private onAbilityDropped(dropData: AbilityBarSlotDropTargetData | null): void {
    if (!dropData) {
      // Abilities from system bars cannot be removed (as there's no way to add them back!).
      if (this.props.group.isSystem) {
        clientAPI.playGameSound(SoundEvents.PLAY_UI_ABILITY_BAD_DROP);
        return;
      }
      // The ability was dropped away from any ability bar, so we should remove it from this slot.
      clientAPI.clearAbility(this.props.group.id, this.props.slotIndex);
      clientAPI.playGameSound(SoundEvents.PLAY_UI_ABILITY_BAD_DROP);
    } else {
      const newGroup = this.props.groups[dropData.groupID];

      // Abilities in system bars can only be swapped inside that same bar.
      if (this.props.group.isSystem && dropData.groupID !== this.props.group.id) {
        clientAPI.playGameSound(SoundEvents.PLAY_UI_ABILITY_BAD_DROP);
        return;
      }
      // Abilities in non-system bars cannot be swapped into system bars.
      if (this.props.group.isSystem !== newGroup.isSystem) {
        clientAPI.playGameSound(SoundEvents.PLAY_UI_ABILITY_BAD_DROP);
        return;
      }

      swapSlotsOnDrop(this.props.group, this.props.slotIndex, newGroup, dropData);
    }
  }
}

function mapStateToProps(state: RootState, ownProps: ReactProps): Props {
  const abilityStatus = state.abilities.abilities[ownProps.abilityID];
  const displayData = state.gameDefs.abilityDisplayDefsByNumericID[abilityStatus?.displayDefID];

  return {
    ...ownProps,
    ...mapSlotStateToProps(state, ownProps.layoutID),
    displayData,
    abilityStatus
  };
}

export const AbilityButton = connect(mapStateToProps)(AAbilityButton);

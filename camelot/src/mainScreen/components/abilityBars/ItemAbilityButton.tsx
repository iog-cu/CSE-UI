/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../../redux/store';
import { AbilityWithActivation } from '../../redux/abilitiesSlice';
import { AbilityGroupItem, NoAbilityId } from '@csegames/library/dist/_baseGame/types/AbilityTypes';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { SoundEvents } from '@csegames/library/dist/camelotunchained/game/types/SoundEvents';
import { Item, ItemLocationType } from '@csegames/library/dist/camelotunchained/game/types/Items';
import { ItemDef } from '../../dataSources/manifest/itemManifest';
import { ItemCompareTooltip } from '../items/ItemCompareTooltip';
import { AbilityBarSlotDropTargetData } from './AbilityBarSlot';
import {
  AbilityButtonFrame,
  AbilitySlotInjectedProps,
  Icon,
  getSlotKeybindText,
  mapSlotStateToProps,
  renderAbilityOverlays,
  swapSlotsOnDrop
} from './AbilityButtonShared';

import FallbackItemIconURL from '../../../images/unknown-item.jpg';

// Styles
const ItemCount = 'HUD-AbilityButton-ItemCount';

function handleItemIconError(e: React.SyntheticEvent<HTMLImageElement>): void {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FallbackItemIconURL;
}

function isMatchingInventoryItem(item: Item, defID: number, stackHash: string): boolean {
  return item.defID === defID && item.stackHash === stackHash && item.location.type === ItemLocationType.Inventory;
}

interface TooltipReactProps {
  defID: number;
  stackHash: string;
  itemDefID?: string;
}

interface TooltipInjectedProps {
  inventoryItems: Item[];
}

// Connected so the tooltip follows inventory changes while it is open.
class AItemAbilityTooltip extends React.Component<TooltipReactProps & TooltipInjectedProps> {
  render(): React.ReactNode {
    const { defID, stackHash, itemDefID } = this.props;
    const items = this.props.inventoryItems.filter(
      (item) => item.unitCount > 0 && isMatchingInventoryItem(item, defID, stackHash)
    );
    return items.length > 0 ? <ItemCompareTooltip items={items} /> : <ItemCompareTooltip itemDefID={itemDefID} />;
  }
}

function mapStateToTooltipProps(
  state: RootState,
  ownProps: TooltipReactProps
): TooltipReactProps & TooltipInjectedProps {
  return {
    ...ownProps,
    inventoryItems: state.inventory.primary
  };
}

const ItemAbilityTooltip = connect(mapStateToTooltipProps)(AItemAbilityTooltip);

interface ReactProps {
  layoutID: number;
  slotIndex: number;
  item: AbilityGroupItem;
}

interface InjectedProps extends AbilitySlotInjectedProps {
  // Undefined until the client resolves the slot to a known ability.
  abilityStatus: AbilityWithActivation | undefined;
  inventoryItems: Item[];
  itemDef: ItemDef;
}

type Props = ReactProps & InjectedProps;

class AItemAbilityButton extends React.Component<Props> {
  // Unit count cache, so re-renders driven by ability status don't rescan the inventory.
  private countInventoryItems: Item[] | null = null;
  private countDefID: number = -1;
  private countStackHash: string = '';
  private count: number = 0;

  render(): React.ReactNode {
    return (
      <AbilityButtonFrame
        tooltipID={`TooltipItemL:${this.props.layoutID},S:${this.props.slotIndex}`}
        tooltipContent={() => (
          <ItemAbilityTooltip
            defID={this.props.item.defID}
            stackHash={this.props.item.stackHash}
            itemDefID={this.props.itemDef?.id}
          />
        )}
        tooltipActive={!!this.props.itemDef}
        noOuterBorder
        draggableID={`DraggableItemL:${this.props.layoutID},S:${this.props.slotIndex}`}
        group={this.props.group}
        slotIndex={this.props.slotIndex}
        inEditMode={this.props.inEditMode}
        onDropped={this.onItemDropped.bind(this)}
        renderContents={this.renderButtonContents.bind(this)}
      />
    );
  }

  private getCount(): number {
    const { inventoryItems, item } = this.props;
    if (
      this.countInventoryItems !== inventoryItems ||
      this.countDefID !== item.defID ||
      this.countStackHash !== item.stackHash
    ) {
      this.countInventoryItems = inventoryItems;
      this.countDefID = item.defID;
      this.countStackHash = item.stackHash;
      this.count = inventoryItems.reduce(
        (count, inventoryItem) =>
          isMatchingInventoryItem(inventoryItem, item.defID, item.stackHash) ? count + inventoryItem.unitCount : count,
        0
      );
    }
    return this.count;
  }

  private renderButtonContents(): React.ReactNode {
    const count = this.getCount();
    // At zero the ability can stay known through another item, but its status doesn't apply to this slot.
    const abilityStatus = count > 0 ? this.props.abilityStatus : undefined;

    return (
      <>
        <img
          className={count > 0 ? Icon : `${Icon} locked`}
          src={this.props.itemDef?.iconUrl || FallbackItemIconURL}
          onError={handleItemIconError}
        />
        {renderAbilityOverlays(
          abilityStatus,
          this.props.item.abilityID,
          getSlotKeybindText(this.props, this.props.slotIndex),
          this.props.itemDef?.isStackableItem && <span className={ItemCount}>{count}</span>
        )}
      </>
    );
  }

  private onItemDropped(dropData: AbilityBarSlotDropTargetData | null): void {
    if (!dropData) {
      // Dropped away from any ability bar, so remove it from this slot.
      clientAPI.clearAbility(this.props.group.id, this.props.slotIndex);
      clientAPI.playGameSound(SoundEvents.PLAY_UI_ABILITY_BAD_DROP);
      return;
    }

    const newGroup = this.props.groups[dropData.groupID];
    // Items cannot be swapped into system bars.
    if (!newGroup || newGroup.isSystem) {
      clientAPI.playGameSound(SoundEvents.PLAY_UI_ABILITY_BAD_DROP);
      return;
    }

    swapSlotsOnDrop(this.props.group, this.props.slotIndex, newGroup, dropData);
  }
}

function mapStateToProps(state: RootState, ownProps: ReactProps): Props {
  const itemDef = state.gameDefs.itemsByNumericID[ownProps.item.defID];
  const abilityStatus =
    ownProps.item.abilityID !== NoAbilityId ? state.abilities.abilities[ownProps.item.abilityID] : undefined;

  return {
    ...ownProps,
    ...mapSlotStateToProps(state, ownProps.layoutID),
    abilityStatus,
    inventoryItems: state.inventory.primary,
    itemDef
  };
}

export const ItemAbilityButton = connect(mapStateToProps)(AItemAbilityButton);

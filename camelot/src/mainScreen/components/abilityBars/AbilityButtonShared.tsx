/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { AbilityWithActivation } from '../../redux/abilitiesSlice';
import { RootState } from '../../redux/store';
import Draggable from '../Draggable';
import DraggableHandle from '../DraggableHandle';
import { TooltipSource } from '../TooltipSource';
import { AbilityGroup, AbilityStateFlags, ButtonLayout } from '@csegames/library/dist/_baseGame/types/AbilityTypes';
import { Dictionary } from '@csegames/library/dist/_baseGame/types/ObjectMap';
import { Keybind } from '@csegames/library/dist/_baseGame/types/Keybind';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { SoundEvents } from '@csegames/library/dist/camelotunchained/game/types/SoundEvents';
import { AbilityBarSlotDropTargetData } from './AbilityBarSlot';
import { CooldownOverlay } from './CooldownOverlay';

// Styles
const Root = 'HUD-AbilityButton-Root';
const Border = 'HUD-AbilityButton-Border';
const BorderQueued = 'HUD-AbilityButton-BorderQueued';
const DraggableContainer = 'HUD-AbilityButton-DraggableContainer';
const Handle = 'HUD-AbilityButton-DraggableHandle';
const DraggingContainer = 'HUD-AbilityButton-DraggingContainer';
export const Icon = 'HUD-AbilityButton-Icon';
const KeybindInfo = 'HUD-AbilityButton-KeybindInfo';
const OverlayUnusable = 'HUD-AbilityButton-OverlayUnusable';
const OverlayError = 'HUD-AbilityButton-OverlayError';
const OverlayActive = 'HUD-AbilityButton-OverlayActive';
const OverlayActiveVisible = 'HUD-AbilityButton-OverlayActiveVisible';

export const DropTypeAbilityButton = 'abilityButton';

export interface AbilitySlotInjectedProps {
  layout: ButtonLayout;
  groups: Dictionary<AbilityGroup>;
  group: AbilityGroup;
  inEditMode: boolean;
  keybinds: Dictionary<Keybind>;
}

export function mapSlotStateToProps(state: RootState, layoutID: number): AbilitySlotInjectedProps {
  const layout = state.abilities.layouts[layoutID];
  const { groups } = state.abilities;
  return {
    layout,
    groups,
    group: groups[layout.groupID],
    inEditMode: state.abilities.editStatus.canEdit,
    keybinds: state.keybinds
  };
}

export function getSlotKeybindText(props: AbilitySlotInjectedProps, slotIndex: number): string {
  return props.keybinds[props.layout.keybindBegin + slotIndex]?.binds[0]?.name;
}

export function renderAbilityOverlays(
  abilityStatus: AbilityWithActivation | undefined,
  abilityID: number,
  keybindText: string,
  badge?: React.ReactNode
): React.ReactNode {
  const state = abilityStatus?.state ?? 0;
  const queued = (state & AbilityStateFlags.Queued) !== 0;
  const unusable = (state & AbilityStateFlags.Unusable) !== 0;
  const running = (state & AbilityStateFlags.Running) !== 0;
  const recovery = (state & AbilityStateFlags.Recovery) !== 0;
  const cooldown = (state & AbilityStateFlags.Cooldown) !== 0;

  const hasActiveEffect = running && !recovery;

  return (
    <>
      {unusable && <div className={OverlayUnusable} />}
      {!unusable && !!abilityStatus?.errors && <div className={OverlayError} />}
      {keybindText && <div className={KeybindInfo}>{keybindText}</div>}
      {abilityStatus && <CooldownOverlay abilityID={abilityID} />}
      {badge}
      {!hasActiveEffect && !queued && !cooldown && <div className={Border} />}
      {abilityStatus && (
        <div className={hasActiveEffect ? `${OverlayActive} ${OverlayActiveVisible}` : OverlayActive} />
      )}
      {/* Render the "queued" border above the "active" overlay to make it clearer when queuing the same ability. */}
      {queued && <div className={`${Border} ${BorderQueued}`} />}
    </>
  );
}

export function swapSlotsOnDrop(
  group: AbilityGroup,
  slotIndex: number,
  newGroup: AbilityGroup | undefined,
  dropData: AbilityBarSlotDropTargetData
): void {
  if (!group.canReplace || !newGroup?.canReplace) {
    clientAPI.playGameSound(SoundEvents.PLAY_UI_ABILITY_BAD_DROP);
    return;
  }

  if (dropData.groupID !== group.id || dropData.slotIndex !== slotIndex) {
    clientAPI.swapAbilitySlots(group.id, slotIndex, dropData.groupID, dropData.slotIndex);
    clientAPI.playGameSound(SoundEvents.PLAY_UI_ABILITY_RELEASE);
  }
}

interface FrameProps {
  tooltipID: string;
  tooltipContent: () => React.ReactNode;
  tooltipActive?: boolean;
  noOuterBorder?: boolean;
  draggableID: string;
  group: AbilityGroup;
  slotIndex: number;
  inEditMode: boolean;
  onDropped: (dropData: AbilityBarSlotDropTargetData | null) => void;
  renderContents: () => React.ReactNode;
}

export class AbilityButtonFrame extends React.Component<FrameProps> {
  render(): React.ReactNode {
    return (
      <TooltipSource
        className={Root}
        tooltipID={this.props.tooltipID}
        content={this.props.tooltipContent}
        active={this.props.tooltipActive}
        positionType='mouse'
        noOuterBorder={this.props.noOuterBorder}
      >
        <Draggable
          className={DraggableContainer}
          draggableID={this.props.draggableID}
          onClick={this.onClick.bind(this)}
          draggingRender={() => <div className={DraggingContainer}>{this.props.renderContents()}</div>}
        >
          {this.props.renderContents()}
          {this.props.inEditMode && (
            <DraggableHandle
              draggableID={this.props.draggableID}
              className={Handle}
              dropHandler={this.props.onDropped}
              dropType={DropTypeAbilityButton}
            />
          )}
        </Draggable>
      </TooltipSource>
    );
  }

  private onClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button === 0) {
      // During edit mode, we only want to drag abilities around, not trigger them.
      if (this.props.inEditMode) {
        return;
      }

      clientAPI.executeAbility(this.props.group.id, this.props.slotIndex);
    }
  }
}

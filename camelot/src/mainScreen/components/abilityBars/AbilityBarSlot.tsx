/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Dispatch } from '@reduxjs/toolkit';
import * as React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../../redux/store';
import ContextMenuSource from '../ContextMenuSource';
import DropTarget from '../DropTarget';
import { AbilityButton } from './AbilityButton';
import { DropTypeAbilityButton } from './AbilityButtonShared';
import { ItemAbilityButton } from './ItemAbilityButton';
import { NoAbilityId, ButtonLayout, AbilityGroupItem } from '@csegames/library/dist/_baseGame/types/AbilityTypes';
import { Dictionary } from '@csegames/library/dist/_baseGame/types/ObjectMap';
import { Keybind } from '@csegames/library/dist/_baseGame/types/Keybind';
import { KeybindSequencer } from '../input/KeybindSequencer';
import { WIDGET_ID_ABILITY_BOOK } from '../abilityBook/AbilityBook';
import { toggleConditionalWidget } from '../../redux/hudSlice';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { getStringTableValue, StringIDGeneralPlus } from '../../helpers/stringTableHelpers';
import { StringTableEntryDef } from '../../dataSources/manifest/stringTableManifest';
import { BorderType, FactionBorder } from '../FactionBorder';
import { getFactionData } from '../../gameData/factionData';

// CSS classes
const Root = 'HUD-AbilityBarSlot-Root';
const Background = 'HUD-AbilityBarSlot-Background';
const Frame = 'HUD-AbilityBarSlot-Frame';
const EmptySlotHitArea = 'HUD-AbilityBarSlot-EmptySlotHitArea';
const GoToAbilityBookButton = 'HUD-AbilityBarSlot-GoToAbilityBookButton';
const AbilityButtonWrapper = 'HUD-AbilityBarSlot-AbilityButtonWrapper';
const PressFlash = 'HUD-AbilityBarSlot-PressFlash';

export const AbilitySlotFrameCornerSize = '1.5vmin';

// String IDs
const StringIDAbilityBarBindKey = 'AbilityBarBindKey';

export interface AbilityBarSlotDropTargetData {
  layoutID: number;
  groupID: number;
  slotIndex: number;
}

interface ReactProps {
  layoutId: number;
  abilityId: number;
  item: AbilityGroupItem | null;
  slotIndex: number;
  /** CSS length of the space before this slot. Unset for the first slot in the bar. */
  leadingGap?: string;
  /** Draws only the empty box, with no ability or drop target, to show an empty bar's size in the HUD Editor. */
  isPlaceholder?: boolean;
}

interface InjectedProps {
  layout: ButtonLayout;
  groupID: number;
  uiFactionID: string;
  inEditMode: boolean;
  keybinds: Dictionary<Keybind>;
  activeConditionalWidgetIDs: string[];
  stringTable: Dictionary<StringTableEntryDef>;
  pressTimestamp: number | undefined;
  dispatch?: Dispatch;
}

type Props = ReactProps & InjectedProps;

class AAbilityBarSlot extends React.Component<Props> {
  render(): React.ReactNode {
    const style = this.props.leadingGap ? { marginLeft: this.props.leadingGap } : undefined;
    const background = (
      <img className={Background} src={getFactionData(this.props.uiFactionID).squareBackgroundImage} />
    );
    const frame = (
      <FactionBorder className={Frame} type={BorderType.Secondary} cornerSize={AbilitySlotFrameCornerSize} />
    );

    if (this.props.isPlaceholder) {
      return (
        <div className={Root} style={style}>
          {background}
          {frame}
        </div>
      );
    }

    const isEmpty = this.props.abilityId === NoAbilityId && !this.props.item;
    const showEmptySlot = this.props.inEditMode && isEmpty;
    const dropID = `${this.props.groupID}:${this.props.slotIndex}`;
    const dropData: AbilityBarSlotDropTargetData = {
      layoutID: this.props.layoutId,
      groupID: this.props.groupID,
      slotIndex: this.props.slotIndex
    };

    return (
      <DropTarget
        // Have to explicitly add a key, or else this doesn't update when the user cycles groups.
        key={dropID}
        dropData={dropData}
        dropType={DropTypeAbilityButton}
        className={Root}
        style={style}
      >
        {background}
        {showEmptySlot ? (
          <div className={GoToAbilityBookButton} onMouseDown={this.navigateToAbilityBook.bind(this)}>
            {getStringTableValue(StringIDGeneralPlus, this.props.stringTable)}
          </div>
        ) : isEmpty ? (
          // Empty slots are clickable so clicking can trigger the "pressed" fx.
          <div className={EmptySlotHitArea} onClick={this.onEmptySlotClick.bind(this)} />
        ) : (
          <ContextMenuSource
            className={AbilityButtonWrapper}
            menuParams={{
              id: `L${this.props.layoutId}:${this.props.slotIndex}`,
              content: [
                {
                  title: getStringTableValue(StringIDAbilityBarBindKey, this.props.stringTable),
                  onClick: this.onChangeKeybindClick.bind(this)
                }
              ]
            }}
          >
            {this.props.item ? (
              <ItemAbilityButton
                key={`${this.props.item.defID}:${this.props.item.stackHash}`}
                layoutID={this.props.layoutId}
                slotIndex={this.props.slotIndex}
                item={this.props.item}
              />
            ) : (
              <AbilityButton
                layoutID={this.props.layoutId}
                slotIndex={this.props.slotIndex}
                abilityID={this.props.abilityId}
              />
            )}
          </ContextMenuSource>
        )}
        {this.isPressFlashFresh() && (
          // Keyed on timestamp so each press restarts the flash.
          <div className={PressFlash} key={`flash${this.props.pressTimestamp}`} />
        )}
        {frame}
      </DropTarget>
    );
  }

  private onEmptySlotClick(e: React.MouseEvent<HTMLDivElement>): void {
    if (e.button === 0) {
      clientAPI.executeAbility(this.props.groupID, this.props.slotIndex);
    }
  }

  private isPressFlashFresh(): boolean {
    return this.props.pressTimestamp !== undefined && Date.now() - this.props.pressTimestamp < 500;
  }

  private onChangeKeybindClick(dispatch: Dispatch): void {
    const keybindId = this.props.layout.keybindBegin + this.props.slotIndex;
    const keybind = this.props.keybinds[keybindId];

    const sequencer = new KeybindSequencer(this.props.stringTable);
    sequencer.beginKeybindSequence(this.props.keybinds, keybind, 0, dispatch);
  }

  private navigateToAbilityBook(): void {
    if (!this.props.activeConditionalWidgetIDs.includes(WIDGET_ID_ABILITY_BOOK)) {
      this.props.dispatch(toggleConditionalWidget(WIDGET_ID_ABILITY_BOOK));
    }
  }
}

function mapStateToProps(state: RootState, ownProps: ReactProps): Props {
  const { keybinds } = state;
  const layout = state.abilities.layouts[ownProps.layoutId];
  // Have to split this off from layout or else we don't re-render (and change the drop target data) when
  // the user cycles between groups.
  const groupID = layout.groupID;
  const { stringTable } = state.stringTable;

  return {
    ...ownProps,
    layout,
    groupID,
    uiFactionID: state.hud.uiFactionID,
    inEditMode: state.abilities.editStatus.canEdit,
    keybinds,
    activeConditionalWidgetIDs: state.hud.activeConditionalWidgetIDs,
    stringTable,
    pressTimestamp: state.abilities.slotPressTimestamps[layout.keybindBegin + ownProps.slotIndex]
  };
}

export const AbilityBarSlot = connect(mapStateToProps)(AAbilityBarSlot);

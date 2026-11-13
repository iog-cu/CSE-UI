/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../../redux/store';
import { AbilityGroup, ButtonLayout, NoAbilityId } from '@csegames/library/dist/_baseGame/types/AbilityTypes';
import { AbilityBarSlot, AbilitySlotFrameCornerSize } from './AbilityBarSlot';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { BorderBackground, BorderType, FactionBorder } from '../FactionBorder';
import { AbilityBarDecor } from '@csegames/library/dist/camelotunchained/game/types/HUDTypes';
import { DynamicAbilitiesLayoutID, isAbilityBarDecorShown } from '../../helpers/abilityBarHelpers';
import { getFactionData } from '../../gameData/factionData';

// Styles
const Root = 'HUD-AbilityBar-Root';
const SlotsArea = 'HUD-AbilityBar-SlotsArea';
const Slots = 'HUD-AbilityBar-Slots';
const SlotsOverlay = 'HUD-AbilityBar-SlotsOverlay';
const DecorTop = 'HUD-AbilityBar-DecorTop';
const DecorBottom = 'HUD-AbilityBar-DecorBottom';
const DecorLeft = 'HUD-AbilityBar-DecorLeft';
const DecorRight = 'HUD-AbilityBar-DecorRight';
const Pagination = 'HUD-AbilityBar-Pagination';
const PaginationLeft = 'HUD-AbilityBar-PaginationLeft';
const PaginationRight = 'HUD-AbilityBar-PaginationRight';
const PaginationUp = 'HUD-AbilityBar-PaginationUp';
const PaginationDown = 'HUD-AbilityBar-PaginationDown';
const PaginationNumber = 'HUD-AbilityBar-PaginationNumber';

// Matches $AbilitySlotSize in the stylesheet.
const AbilitySlotSizeVmin = 4.9;
const SlotsOverlayCornerSize = '3.5vmin';
const DynamicAbilitiesPlaceholderSlotCount = 1;
export const AbilitySlotSpacingDefault = 5;

interface ReactProps {
  isDragCopy: boolean;
  layoutId: number;
  widgetId: string;
}

interface InjectedProps {
  layout: ButtonLayout;
  group: AbilityGroup;
  selectedWidgetID: string;
  selectedGroupMemberIDs: string[];
  isShown: boolean;
  slotSpacing: number;
  uiFactionID: string;
  showDecorTop: boolean;
  showDecorBottom: boolean;
  showDecorLeft: boolean;
  showDecorRight: boolean;
}

type Props = ReactProps & InjectedProps;

class AAbilityBar extends React.Component<Props> {
  render(): React.ReactNode {
    // If this bar is being edited in the HUDEditor — selected directly, or as a member of the active
    // group (e.g. the Ability Bars group) — we render it even if it normally wouldn't show.
    const isEditedInEditor =
      this.props.selectedWidgetID === this.props.widgetId ||
      this.props.selectedGroupMemberIDs.includes(this.props.widgetId);

    if (!isEditedInEditor && !this.props.isShown) {
      return null;
    }
    const currentGroupNumber: number = this.props.layout.groupCycle.indexOf(this.props.layout.groupID) + 1;

    const paginationContents = (
      <>
        <svg
          className={PaginationUp}
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 320 512'
          onClick={this.cycleUp.bind(this)}
        >
          <path
            fill='white'
            d='M182.6 137.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-9.2 9.2-11.9 22.9-6.9 34.9s16.6 19.8 29.6 19.8H288c12.9 0 24.6-7.8 29.6-19.8s2.2-25.7-6.9-34.9l-128-128z'
          />
        </svg>
        <div className={PaginationNumber}>{currentGroupNumber}</div>
        <svg
          className={PaginationDown}
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 320 512'
          onClick={this.cycleDown.bind(this)}
        >
          <path
            fill='white'
            d='M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z'
          />
        </svg>
      </>
    );

    const slotGap = `${(AbilitySlotSizeVmin * this.props.slotSpacing) / 100}vmin`;
    const factionData = getFactionData(this.props.uiFactionID);

    return (
      <div className={Root}>
        {this.props.group && (
          <>
            <div className={SlotsArea}>
              {/* Ornaments come before the slots so the slot panel covers their tucked-in edges. */}
              {this.props.showDecorTop && <img className={DecorTop} src={factionData.abilityBarCenterDecorTopImage} />}
              {this.props.showDecorBottom && (
                <img className={DecorBottom} src={factionData.abilityBarCenterDecorBottomImage} />
              )}
              {this.props.showDecorLeft && <img className={DecorLeft} src={factionData.abilityBarLeftEndImage} />}
              {this.props.showDecorRight && <img className={DecorRight} src={factionData.abilityBarRightEndImage} />}
              <FactionBorder
                className={Slots}
                type={BorderType.Secondary}
                cornerSize={AbilitySlotFrameCornerSize}
                background={BorderBackground.Leather}
              >
                {isEditedInEditor && this.props.group.abilities.length === 0
                  ? this.renderPlaceholderSlots(slotGap)
                  : this.props.group.abilities.map((abilityId: number, slotIndex: number) => {
                      return (
                        <AbilityBarSlot
                          layoutId={this.props.layoutId}
                          abilityId={abilityId}
                          item={this.props.group.items?.[slotIndex] ?? null}
                          slotIndex={slotIndex}
                          leadingGap={slotIndex > 0 ? slotGap : undefined}
                          key={slotIndex}
                        />
                      );
                    })}
              </FactionBorder>
              {/* Corners only; the slot panel already draws the edge line. */}
              <FactionBorder
                className={SlotsOverlay}
                type={BorderType.Primary}
                cornerSize={SlotsOverlayCornerSize}
                borderSize='0px'
              />
            </div>
            {this.props.layout.groupCycle.length > 1 && (
              <>
                <div className={`${Pagination} ${PaginationLeft}`} onWheel={this.handleWheel.bind(this)}>
                  {paginationContents}
                </div>
                <div className={`${Pagination} ${PaginationRight}`} onWheel={this.handleWheel.bind(this)}>
                  {paginationContents}
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  private renderPlaceholderSlots(slotGap: string): React.ReactNode {
    // A layout has one keybind per slot, so its keybind range is how many slots the bar can hold.
    const slotCount =
      this.props.layoutId === DynamicAbilitiesLayoutID
        ? DynamicAbilitiesPlaceholderSlotCount
        : Math.max(this.props.layout.keybindEnd - this.props.layout.keybindBegin, 1);
    return Array.from({ length: slotCount }, (_, slotIndex) => (
      <AbilityBarSlot
        layoutId={this.props.layoutId}
        abilityId={NoAbilityId}
        item={null}
        slotIndex={slotIndex}
        leadingGap={slotIndex > 0 ? slotGap : undefined}
        isPlaceholder
        key={slotIndex}
      />
    ));
  }

  private cycleUp(): void {
    clientAPI.selectNextAbilityLayoutGroup(this.props.layoutId);
  }

  private cycleDown(): void {
    clientAPI.selectPrevAbilityLayoutGroup(this.props.layoutId);
  }

  private handleWheel(e: React.WheelEvent) {
    // The game client should respond to these requests by sending a new `ability.layoutUpdated` event,
    // which abilitiesDataSource will process and send to Redux.
    if (e.deltaY < 0) {
      clientAPI.selectPrevAbilityLayoutGroup(this.props.layoutId);
    } else {
      clientAPI.selectNextAbilityLayoutGroup(this.props.layoutId);
    }
  }
}

function mapStateToProps(state: RootState, ownProps: ReactProps): Props {
  const { selectedWidgetID, selectedGroupMemberIDs } = state.hud.editor;
  const layout = state.abilities ? state.abilities.layouts[ownProps.layoutId] : null;
  const group = state.abilities ? state.abilities.groups[layout.groupID] : null;
  const isShown = group ? group.abilities.length > 0 : false;
  const widgetState = state.hud.widgets[ownProps.widgetId]?.state;
  const layouts = state.abilities?.layouts;
  const groups = state.abilities?.groups;
  return {
    ...ownProps,
    layout,
    group,
    selectedWidgetID,
    selectedGroupMemberIDs,
    isShown,
    slotSpacing: widgetState?.abilitySlotSpacing ?? AbilitySlotSpacingDefault,
    uiFactionID: state.hud.uiFactionID,
    showDecorTop: isAbilityBarDecorShown(AbilityBarDecor.Top, widgetState, ownProps.layoutId, layouts, groups),
    showDecorBottom: isAbilityBarDecorShown(AbilityBarDecor.Bottom, widgetState, ownProps.layoutId, layouts, groups),
    showDecorLeft: isAbilityBarDecorShown(AbilityBarDecor.Left, widgetState, ownProps.layoutId, layouts, groups),
    showDecorRight: isAbilityBarDecorShown(AbilityBarDecor.Right, widgetState, ownProps.layoutId, layouts, groups)
  };
}

export const AbilityBar = connect(mapStateToProps)(AAbilityBar);

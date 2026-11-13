/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { AddDispatch, RootState } from '../../redux/store';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { SoundEvents } from '@csegames/library/dist/camelotunchained/game/types/SoundEvents';
import { ClassDef } from '../../dataSources/manifest/classManifest';
import { Dictionary } from '@csegames/library/dist/_baseGame/types/ObjectMap';
import { StringTableEntryDef } from '../../dataSources/manifest/stringTableManifest';
import {
  getStringTableValue,
  getTokenizedStringTableValue,
  replaceStringTokens
} from '../../helpers/stringTableHelpers';
import { AbilityWithActivation } from '../../redux/abilitiesSlice';
import { AbilityGroup } from '@csegames/library/dist/_baseGame/types/AbilityTypes';
import { TooltipSource } from '../TooltipSource';
import Draggable from '../Draggable';
import DraggableHandle, { DropHandlerDraggableData } from '../DraggableHandle';
import { DropTypeAbilityButton } from '../abilityBars/AbilityButtonShared';
import { AbilityBarSlotDropTargetData } from '../abilityBars/AbilityBarSlot';
import { getFactionData } from '../../gameData/factionData';
import { BorderBackground, BorderType, FactionBorder } from '../FactionBorder';
import { PlayerEntityStateModel } from '@csegames/library/dist/camelotunchained/game/GameClientModels/EntityState';
import { ProgressionTrackDef } from '../../dataSources/manifest/progressionTrackManifest';
import { AbilityTooltip } from '../abilityBars/AbilityTooltip';
import { GameDefsState } from '../../redux/gameDefsSlice';
import { AbilityBookAbilityDisplayData } from './AbilityBook';
import { AbilityBookHeader } from './AbilityBookHeader';
import { AbilityBookTrainingBar } from './AbilityBookTrainingBar';
import {
  getAbilityByDisplayDefID,
  getAbilityIconBorderProps,
  getTradeskillTitle,
  isTradeskillTrack,
  StringIDAbilityBookTradeskillProgression
} from '../../helpers/abilityBookHelpers';
import { FactionCheckbox } from '../FactionCheckbox';

// Matches .HUD-AbilityPageTradeskills-AbilityIconContainer.
const ABILITY_ICON_SIZE_VMIN = 1.8;
// Secondary corners default to 2vmin, which would overlap each other on the 1.35vmin bar.
const PROGRESS_BAR_CORNER_SIZE = '1.5vmin';

// CSS classes
const Root = 'HUD-AbilityPageTradeskills-Root';
const Panel = 'HUD-AbilityPageTradeskills-Panel';
const TrackColumns = 'HUD-AbilityPageTradeskills-TrackColumns';
const TrackColumn = 'HUD-AbilityPageTradeskills-TrackColumn';
const CellRoot = 'HUD-AbilityPageTradeskills-CellRoot';
const CellIconContainer = 'HUD-AbilityPageTradeskills-CellIconContainer';
const CellIcon = 'HUD-AbilityPageTradeskills-CellIcon';
const CellDetailsSection = 'HUD-AbilityPageTradeskills-CellDetailsSection';
const CellNameRow = 'HUD-AbilityPageTradeskills-CellNameRow';
const CellNameLabel = 'HUD-AbilityPageTradeskills-CellNameLabel';
const CellTrackCheckbox = 'HUD-AbilityPageTradeskills-CellTrackCheckbox';
const ProgressBarContainer = 'HUD-AbilityPageTradeskills-ProgressBarContainer';
const ProgressBarClipper = 'HUD-AbilityPageTradeskills-ProgressBarClipper';
const ProgressBarContent = 'HUD-AbilityPageTradeskills-ProgressBarContent';
const ProgressBar = 'HUD-AbilityPageTradeskills-ProgressBar';
const ProgressBarEnd = 'HUD-AbilityPageTradeskills-ProgressBarEnd';
const ProgressBarText = 'HUD-AbilityPageTradeskills-ProgressBarText';
const AbilitiesContainer = 'HUD-AbilityPageTradeskills-AbilitiesContainer';
const AbilitiesListEntry = 'HUD-AbilityPageTradeskills-AbilitiesListEntry';
const AbilityIconContainer = 'HUD-AbilityPageTradeskills-AbilityIconContainer';
const AbilitiesListEntryDraggable = 'HUD-AbilityPageTradeskills-AbilitiesListEntryDraggable';
const AbilitiesListEntryDraggableHandle = 'HUD-AbilityPageTradeskills-AbilitiesListEntryDraggableHandle';
const AbilitiesListEntryIcon = 'HUD-AbilityPageTradeskills-AbilitiesListEntryIcon';
const AbilitiesListEntryIconDraggable = 'HUD-AbilityPageTradeskills-AbilitiesListEntryIconDraggable';
const TooltipRoot = 'HUD-AbilityBook-TooltipRoot';
const TooltipHeader = 'HUD-AbilityBook-TooltipHeader';
const TooltipDescription = 'HUD-AbilityBook-TooltipDescription';

// String IDs
const StringIDAbilityBookUnlockLevel = 'AbilityBookUnlockLevel';
const StringIDAbilityBookUpgradesAvailable = 'AbilityBookUpgradesAvailable';

interface ReactProps {}

interface InjectedProps {
  uiFactionID: string;
  myClass: ClassDef;
  stringTable: Record<string, StringTableEntryDef>;
  defs: GameDefsState;
  groups: Dictionary<AbilityGroup>;
  abilities: Record<number, AbilityWithActivation>;
  abilityIDsByDisplayDefID: Record<number, number>;
  self: PlayerEntityStateModel;
  trackedProgressionTrackIDs: string[];
}

type Props = ReactProps & InjectedProps & AddDispatch;

class AAbilityPageTradeskills extends React.Component<Props> {
  render(): React.ReactNode {
    const tracks = this.getTradeskillTracks();
    // The left column takes the extra track when the count is odd.
    const leftColumnCount = Math.ceil(tracks.length / 2);

    return (
      <div className={Root}>
        <AbilityBookHeader
          title={getStringTableValue(StringIDAbilityBookTradeskillProgression, this.props.stringTable)}
        />
        <FactionBorder className={Panel} type={BorderType.Primary} background={BorderBackground.PatternLarge}>
          <div className={TrackColumns}>
            <div className={TrackColumn}>
              {tracks.slice(0, leftColumnCount).map(this.renderTradeskillCell.bind(this))}
            </div>
            <div className={TrackColumn}>{tracks.slice(leftColumnCount).map(this.renderTradeskillCell.bind(this))}</div>
          </div>
        </FactionBorder>
        <AbilityBookTrainingBar
          availableTemplate={getStringTableValue(StringIDAbilityBookUpgradesAvailable, this.props.stringTable)}
          availablePoints={0}
          stagedPoints={0}
          isDisabled
        />
      </div>
    );
  }

  private getTradeskillTracks(): ProgressionTrackDef[] {
    return this.props.myClass.progressionTracks
      .map((ptID) => this.props.defs.progressionTracks[ptID])
      .filter((track) => !!track && isTradeskillTrack(track))
      .sort((a, b) =>
        getStringTableValue(a.nameKey, this.props.stringTable).localeCompare(
          getStringTableValue(b.nameKey, this.props.stringTable)
        )
      );
  }

  private renderTradeskillCell(def: ProgressionTrackDef): React.ReactNode {
    const factionData = getFactionData(this.props.uiFactionID);

    const prog = this.props.self.progression[def.id];
    const current = prog?.progress ?? 0;
    const total = prog?.total ?? 1;

    const abilities = this.getFilteredAbilities([def.id]);

    return (
      <div key={def.id} className={CellRoot}>
        <FactionCheckbox
          className={CellTrackCheckbox}
          isChecked={this.props.trackedProgressionTrackIDs.includes(def.id)}
          soundEventClicked={SoundEvents.PLAY_UI_TRACK_SELECT}
          onCheckedChanged={this.onTrackCheckedChanged.bind(this, def.id)}
        />
        <FactionBorder
          className={CellIconContainer}
          type={BorderType.Secondary}
          background={BorderBackground.PatternSmall}
        >
          <img className={CellIcon} src={def.iconURL} />
        </FactionBorder>
        <div className={CellDetailsSection}>
          <div className={CellNameRow}>
            <div className={CellNameLabel}>{getTradeskillTitle(def, prog?.level ?? 0, this.props.stringTable)}</div>
            {abilities.length > 0 && (
              <div className={AbilitiesContainer}>{abilities.map(this.renderTradeskillAbilityCell.bind(this))}</div>
            )}
          </div>
          <FactionBorder
            className={ProgressBarContainer}
            type={BorderType.Secondary}
            background={BorderBackground.ProgressBar}
            cornerSize={PROGRESS_BAR_CORNER_SIZE}
          >
            <div className={ProgressBarClipper}>
              <div className={ProgressBarContent}>
                <img
                  className={ProgressBar}
                  src={factionData.progressBarImage}
                  style={{ width: `${Math.min(1, current / total) * 100}%` }}
                />
                <div className={ProgressBarEnd} />
              </div>
            </div>
            <div className={ProgressBarText}>{`${current} / ${total}`}</div>
          </FactionBorder>
        </div>
      </div>
    );
  }

  private renderTradeskillAbilityCell(data: AbilityBookAbilityDisplayData): React.ReactNode {
    const draggableId = `AbilityBook${data.ability?.id}`;

    const progress = this.props.self.progression[data.progressionTrackID];
    const trackLevel = progress?.level ?? 0;
    const isLocked = trackLevel < data.unlockedAtLevel;

    return (
      <TooltipSource
        className={`${AbilitiesListEntry}${isLocked ? ' locked' : ''}`}
        tooltipID={`abilityCell${data.displayDef.id}`}
        content={this.renderAbilityTooltip.bind(this, data)}
        positionType='mouse'
        key={data.displayDef.id}
      >
        <FactionBorder
          className={AbilityIconContainer}
          {...getAbilityIconBorderProps(!isLocked, ABILITY_ICON_SIZE_VMIN)}
        >
          <Draggable
            className={AbilitiesListEntryDraggable}
            draggableID={draggableId}
            draggingRender={() => <img className={AbilitiesListEntryIconDraggable} src={data.displayDef.iconURL} />}
          >
            <DraggableHandle
              className={`${AbilitiesListEntryDraggableHandle}${!data.ability ? ' disabled' : ''}`}
              draggableID={draggableId}
              dropHandler={this.onAbilityDropped.bind(this)}
              dragStartHandler={this.onAbilityDragStarted.bind(this)}
              dropType={DropTypeAbilityButton}
              isDisabled={!data.ability}
            >
              <img className={AbilitiesListEntryIcon} src={data.displayDef.iconURL} />
            </DraggableHandle>
          </Draggable>
        </FactionBorder>
      </TooltipSource>
    );
  }

  private renderAbilityTooltip(data: AbilityBookAbilityDisplayData): JSX.Element {
    const description = replaceStringTokens(data.displayDef.description, data.ability?.stats ?? {});

    const level = this.props.self.progression[data.progressionTrackID]?.level ?? 0;

    const isLocked = data.unlockedAtLevel > level;

    return !isLocked ? (
      <AbilityTooltip abilityID={data.ability?.id ?? 0} />
    ) : (
      <div className={TooltipRoot}>
        <div className={TooltipHeader}>{data.displayDef.name}</div>
        <div className={TooltipDescription}>
          {isLocked && (
            <>
              {getTokenizedStringTableValue(StringIDAbilityBookUnlockLevel, this.props.stringTable, {
                LEVEL: `${data.unlockedAtLevel}`
              })}
              <br />
            </>
          )}
          {description.split('\n').map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
              {lineIndex > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  private onAbilityDropped(data: AbilityBarSlotDropTargetData, { currentDraggableID }: DropHandlerDraggableData): void {
    // Do nothing if we didn't drop onto an ability slot.
    if (!data) {
      clientAPI.playGameSound(SoundEvents.PLAY_UI_ABILITY_BAD_DROP);
      return;
    }

    const group = this.props.groups[data.groupID];

    // Not allowed to muck up system bars, and possibly some others.
    if (group.isSystem || !group.canReplace) {
      clientAPI.playGameSound(SoundEvents.PLAY_UI_ABILITY_BAD_DROP);
      return;
    }

    // Nothing else is in the way, so let's set the ability!
    const abilityId = +currentDraggableID.slice(11);
    clientAPI.setAbility(data.groupID, data.slotIndex, abilityId);
    clientAPI.playGameSound(SoundEvents.PLAY_UI_ABILITY_RELEASE);
  }

  private onAbilityDragStarted(): void {
    clientAPI.playGameSound(SoundEvents.PLAY_UI_ABILITY_SELECT);
  }

  private onTrackCheckedChanged(trackID: string, isChecked: boolean): void {
    clientAPI.setProgressionTrackTracked(this.props.self.characterID, trackID, isChecked);
    if (isChecked) {
      clientAPI.setTradeskillTrackerMinimized(false);
    }
  }

  private getFilteredAbilities(progressionTrackIDs: string[]): AbilityBookAbilityDisplayData[] {
    const abilities: AbilityBookAbilityDisplayData[] = [];

    // Go through each included progressionTrack's abilities and construct data for any that should be displayed.
    progressionTrackIDs.forEach((ptID) => {
      const progressionTrackDef = this.props.defs.progressionTracks[ptID];
      if (!progressionTrackDef) {
        return;
      }

      Object.entries(progressionTrackDef.abilityUnlocks).forEach((entry) => {
        const [abilityStringID, unlockedAtLevel] = entry;

        // Must have a displayDef or you can't display it.
        const displayDef = this.props.defs.abilityDisplayDefsByStringID[abilityStringID];
        // If no network, then this is a system ability and should be excluded.
        const nw = this.props.defs.abilityNetworks[displayDef?.networkID];
        if (!nw) {
          return;
        }

        const ability = getAbilityByDisplayDefID(
          displayDef.numericID,
          this.props.abilities,
          this.props.abilityIDsByDisplayDefID
        );

        // If we make it out here, then we have all necessary data to display this ability.
        const data: AbilityBookAbilityDisplayData = {
          ability,
          displayDef,
          progressionTrackID: ptID,
          unlockedAtLevel
        };
        abilities.push(data);
      });
    });

    abilities.sort((a, b) => {
      // TODO: Should these be stringIDs?
      const aName = a.displayDef.name;
      const bName = b.displayDef.name;

      // Sort by unlock level first, then name.
      if (a.unlockedAtLevel !== b.unlockedAtLevel) {
        return a.unlockedAtLevel - b.unlockedAtLevel;
      }

      return aName.localeCompare(bName);
    });

    return abilities;
  }
}

const mapStateToProps = (state: RootState, ownProps: ReactProps): ReactProps & InjectedProps => {
  const { groups, abilities, abilityIDsByDisplayDefID } = state.abilities;

  return {
    ...ownProps,
    myClass: state.gameDefs.classesByNumericID[state.entities.self.classID],
    stringTable: state.stringTable.stringTable,
    defs: state.gameDefs,
    groups,
    abilities,
    abilityIDsByDisplayDefID,
    uiFactionID: state.hud.uiFactionID,
    self: state.entities.self,
    trackedProgressionTrackIDs: state.tradeskillTracker.trackedProgressionTrackIDs
  };
};

export const AbilityPageTradeskills = connect(mapStateToProps)(AAbilityPageTradeskills);

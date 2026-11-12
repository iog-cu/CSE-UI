/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { AnimationData } from '@csegames/library/dist/_baseGame/GameClientModels/AnimationData';
import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { RootState } from '../redux/store';
import { StringTableEntryDef } from '../dataSources/manifest/stringTableManifest';
import { getFactionData } from '../gameData/factionData';
import { getStringTableValue } from '../helpers/stringTableHelpers';
import { TooltipSource } from './TooltipSource';
import { MiniMapTimeOfDayTooltip } from './MiniMapTimeOfDayTooltip';
import TimeOfDayDawnURL from '../../images/map/time-of-day-dawn.png';
import TimeOfDayDayURL from '../../images/map/time-of-day-day.png';
import TimeOfDayDuskURL from '../../images/map/time-of-day-dusk.png';
import TimeOfDayNightURL from '../../images/map/time-of-day-night.png';

// CSS classes
const Root = 'HUD-MiniMapTimeOfDay-Root';

// String IDs
const StringIDMiniMapTimeOfDayDawn = 'MiniMapTimeOfDayDawn';
const StringIDMiniMapTimeOfDayDay = 'MiniMapTimeOfDayDay';
const StringIDMiniMapTimeOfDayDusk = 'MiniMapTimeOfDayDusk';
const StringIDMiniMapTimeOfDayNight = 'MiniMapTimeOfDayNight';

const TooltipIDPrefix = 'MiniMapTimeOfDay-';

interface TimeOfDayPhase {
  startHour: number;
  stringID: string;
  iconImage: string;
}

// Sorted by start hour. Night also covers the hours before dawn.
const TimeOfDayPhases: TimeOfDayPhase[] = [
  { startHour: 5, stringID: StringIDMiniMapTimeOfDayDawn, iconImage: TimeOfDayDawnURL },
  { startHour: 7, stringID: StringIDMiniMapTimeOfDayDay, iconImage: TimeOfDayDayURL },
  { startHour: 17, stringID: StringIDMiniMapTimeOfDayDusk, iconImage: TimeOfDayDuskURL },
  { startHour: 19, stringID: StringIDMiniMapTimeOfDayNight, iconImage: TimeOfDayNightURL }
];

function getTimeOfDayPhase(hours: number): TimeOfDayPhase {
  const nextPhaseIndex = TimeOfDayPhases.findIndex((phase) => hours < phase.startHour);
  return TimeOfDayPhases[nextPhaseIndex > 0 ? nextPhaseIndex - 1 : TimeOfDayPhases.length - 1];
}

interface InjectedProps {
  uiFactionID: string;
  stringTable: Record<string, StringTableEntryDef>;
}

interface State {
  phase: TimeOfDayPhase | null;
}

class AMiniMapTimeOfDay extends React.Component<InjectedProps, State> {
  private animationHandle: ListenerHandle | null = null;
  // Latest time of day, read when the tooltip opens.
  private hours: number = NaN;
  private lastWholeHour: number = NaN;

  constructor(props: InjectedProps) {
    super(props);
    this.state = { phase: null };
  }

  render(): JSX.Element {
    const factionData = getFactionData(this.props.uiFactionID);
    const { phase } = this.state;
    const backgroundImage = phase ? phase.iconImage : factionData.squareBackgroundImage;
    const style = { backgroundImage: `url(${backgroundImage})`, borderColor: factionData.borderColor };
    if (!phase) {
      return <div className={Root} style={style} />;
    }

    return (
      <TooltipSource
        className={Root}
        style={style}
        tooltipID={`${TooltipIDPrefix}${phase.stringID}`}
        content={() => (
          <MiniMapTimeOfDayTooltip
            phaseName={getStringTableValue(phase.stringID, this.props.stringTable)}
            initialHours={this.hours}
          />
        )}
        positionType='mouse'
      />
    );
  }

  componentDidMount(): void {
    this.animationHandle = clientAPI.startAnimation(this.animate.bind(this));
  }

  componentWillUnmount(): void {
    this.animationHandle?.close();
  }

  private animate(data: AnimationData, _: DOMHighResTimeStamp): void {
    this.hours = data.timeOfDay;
    // Phases start on whole hours, so only check when the hour changes.
    const wholeHour = Math.floor(data.timeOfDay);
    if (wholeHour === this.lastWholeHour) return;

    this.lastWholeHour = wholeHour;
    const phase = isNaN(wholeHour) ? null : getTimeOfDayPhase(wholeHour);
    if (phase !== this.state.phase) {
      this.setState({ phase });
    }
  }
}

const mapStateToProps = (state: RootState): InjectedProps => {
  return {
    uiFactionID: state.hud.uiFactionID,
    stringTable: state.stringTable.stringTable
  };
};

export const MiniMapTimeOfDay = connect(mapStateToProps)(AMiniMapTimeOfDay);

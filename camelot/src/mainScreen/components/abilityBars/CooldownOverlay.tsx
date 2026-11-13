/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { RootState } from '../../redux/store';
import { connect } from 'react-redux';
import { AbilityWithActivation } from '../../redux/abilitiesSlice';
import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { AnimationData } from '@csegames/library/dist/_baseGame/GameClientModels/AnimationData';
import { StringTableEntryDef } from '../../dataSources/manifest/stringTableManifest';
import { getTokenizedStringTableValue, StringIDGeneralMinutesShort } from '../../helpers/stringTableHelpers';

const OverlayCooldownProgress = 'HUD-AbilityButton-OverlayCooldownProgress';
const OverlayCooldownBorder = 'HUD-AbilityButton-OverlayCooldownBorder';
const OverlayCooldownValue = 'HUD-AbilityButton-OverlayCooldownValue';
const OverlayCooldownValueGold = `${OverlayCooldownValue} HUD-AbilityButton-OverlayCooldownValueGold`;
const ReadySheen = 'HUD-AbilityButton-ReadySheen';
const ReadyPulse = 'HUD-AbilityButton-ReadyPulse';

const SecondsPerMinute = 60;
// Below this many seconds remaining, the countdown shows tenths.
const DecimalCooldownThreshold = 5;
// Matches the longest "ready" flourish animation in the stylesheet.
const ReadyFlourishSeconds = 0.5;

interface ReactProps {
  abilityID: number;
}

interface InjectedProps {
  abilityStatus: AbilityWithActivation;
  stringTable: Record<string, StringTableEntryDef>;
}

type Props = ReactProps & InjectedProps;

type State = {
  // Identifies the active cooldown so we only (re)build the CSS animation when a new one starts.
  cooldownStart: number;
  cooldownDuration: number;
  // Negative offset that seeks the CSS animation to the current point in the cooldown.
  animationDelay: number;
  cooldownTime: string;
  cooldownTimeClass: string;
  // Start of the cooldown that just finished, so each one plays the "ready" flourish once. 0 when there is none to show.
  finishedCooldownStart: number;
};

class ACooldownOverlay extends React.Component<Props, State> {
  private animationHandle: ListenerHandle | null = null;
  // The minutes text is only rebuilt when the minute changes, since the string table lookup allocates every call.
  private shownMinutes: number = 0;
  private shownMinutesText: string = '';
  private readyFlourishEndTime: number = 0;

  constructor(props: Props) {
    super(props);
    this.state = {
      cooldownStart: 0,
      cooldownDuration: 0,
      animationDelay: 0,
      cooldownTime: '',
      cooldownTimeClass: OverlayCooldownValue,
      finishedCooldownStart: 0
    };
  }

  componentDidMount(): void {
    this.animationHandle = clientAPI.startAnimation(this.animate.bind(this));
  }

  render(): React.ReactNode {
    if (!this.state.cooldownTime) {
      return this.state.finishedCooldownStart ? this.renderReadyFlourish() : null;
    }

    const { cooldownStart, cooldownDuration, animationDelay } = this.state;
    const drain: React.CSSProperties = {
      animationDuration: `${cooldownDuration}s`,
      animationDelay: `${animationDelay}s`
    };

    return (
      <>
        {/* Keyed on the cooldown start to restart the drain animation. */}
        <div className={OverlayCooldownProgress} key={cooldownStart} style={drain} />
        <div className={OverlayCooldownBorder} />
        <div className={this.state.cooldownTimeClass}>{this.state.cooldownTime}</div>
      </>
    );
  }

  private renderReadyFlourish(): React.ReactNode {
    // Keyed on the finished cooldown so back-to-back cooldowns each replay the flourish.
    return (
      <React.Fragment key={this.state.finishedCooldownStart}>
        <div className={ReadySheen} />
        <div className={ReadyPulse} />
      </React.Fragment>
    );
  }

  componentWillUnmount(): void {
    this.animationHandle?.close();
  }

  private animate(data: AnimationData, _: DOMHighResTimeStamp): void {
    const cooldownTiming = this.props.abilityStatus?.cooldownTiming;

    if (!cooldownTiming || cooldownTiming.duration <= 0) {
      this.clearCooldown(data.worldTime);
      return;
    }

    const { start, duration } = cooldownTiming;
    const elapsed = data.worldTime - start;
    const ratio = elapsed / duration;

    if (ratio < 0 || ratio > 1) {
      this.clearCooldown(data.worldTime);
      return;
    }

    const remaining = Math.ceil(10 * (duration - elapsed)) / 10; // tick off tenths of a second, never display 0
    const cooldownTime = this.formatCooldownTime(remaining);
    const cooldownTimeClass = remaining > SecondsPerMinute ? OverlayCooldownValueGold : OverlayCooldownValue;

    if (start !== this.state.cooldownStart) {
      // New cooldown: hand the drain off to CSS, seeking to the current point with a negative delay.
      this.setState({
        cooldownStart: start,
        cooldownDuration: duration,
        animationDelay: -elapsed,
        cooldownTime,
        cooldownTimeClass,
        finishedCooldownStart: 0
      });
    } else if (cooldownTime !== this.state.cooldownTime) {
      // Same cooldown still running: only the displayed text needs updating.
      this.setState({ cooldownTime, cooldownTimeClass });
    }
  }

  private formatCooldownTime(remaining: number): string {
    if (remaining > SecondsPerMinute) {
      const minutes = Math.ceil(remaining / SecondsPerMinute);
      if (minutes !== this.shownMinutes) {
        this.shownMinutes = minutes;
        this.shownMinutesText = getTokenizedStringTableValue(StringIDGeneralMinutesShort, this.props.stringTable, {
          MINUTES: String(minutes)
        });
      }
      return this.shownMinutesText;
    }
    if (remaining >= DecimalCooldownThreshold) {
      return String(Math.ceil(remaining));
    }
    return remaining.toFixed(1);
  }

  private clearCooldown(worldTime: number): void {
    if (this.state.cooldownStart !== 0 || this.state.cooldownTime) {
      this.readyFlourishEndTime = worldTime + ReadyFlourishSeconds;
      this.setState({
        cooldownStart: 0,
        cooldownDuration: 0,
        animationDelay: 0,
        cooldownTime: '',
        cooldownTimeClass: OverlayCooldownValue,
        finishedCooldownStart: this.state.cooldownStart
      });
    } else if (this.state.finishedCooldownStart !== 0 && worldTime >= this.readyFlourishEndTime) {
      // The flourish has played, so unmount its elements instead of leaving them invisible.
      this.setState({ finishedCooldownStart: 0 });
    }
  }
}

function mapStateToProps(state: RootState, ownProps: ReactProps): Props {
  const abilityStatus = state.abilities.abilities[ownProps.abilityID];
  return {
    ...ownProps,
    abilityStatus,
    stringTable: state.stringTable.stringTable
  };
}

export const CooldownOverlay = connect(mapStateToProps)(ACooldownOverlay);

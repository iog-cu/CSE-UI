/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../../redux/store';
import { StatusState } from '@csegames/library/dist/camelotunchained/game/GameClientModels/StatusState';
import { EntityResource } from '@csegames/library/dist/camelotunchained/game/GameClientModels/EntityState';
import { EntityResourceIDs } from '@csegames/library/dist/camelotunchained/game/types/EntityResourceIDs';
import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { AnimationData } from '@csegames/library/dist/_baseGame/GameClientModels/AnimationData';
import { StatusDef } from '../../dataSources/manifest/statusManifest';
import { getDisplayableStatuses, getStatusInstanceKey, isStatusBuff, StatusData } from '../../helpers/statusHelpers';
import { StatusEffectAmountCell } from './StatusEffectAmountCell';
import { StatusEffectsWidgetIcon } from './StatusEffectsWidgetIcon';

// CSS classes
const Root = 'HUD-StatusEffectsColumns-Root';
const Column = 'HUD-StatusEffectsColumns-Column';
const Row = 'HUD-StatusEffectsColumns-Row';
const Positive = 'Positive';
const Negative = 'Negative';

// Seconds after application during which a status counts as freshly applied: the icon pops in and
// the definition's uiText is shown in the amount cell. Must cover the whole pop animation, which
// holds at double size first so the player has a moment to recognise the icon, then shrinks back.
// Keep in step with the PopIn keyframes and duration in MainScreen-Styles.scss.
const POP_HOLD_SECONDS = 0.2;
const POP_SHRINK_SECONDS = 0.5;
const FRESH_WINDOW_SECONDS = POP_HOLD_SECONDS + POP_SHRINK_SECONDS;

interface ColumnsProps {
  entityID: string;
}

interface ColumnsInjectedProps {
  statuses: Record<number, StatusState>;
  statusesByNumericID: Record<number, StatusDef>;
  statusInstanceCounts: Record<number, number>;
  health: EntityResource | undefined;
}

// Column layout of the standalone status-effects widget: positive effects on the left, negative
// on the right, populating top to bottom, each with an amount/uiText cell beside the icon
// (left of the icon for positive effects, right of it for negative ones).
class AStatusEffectsColumns extends React.Component<ColumnsProps & ColumnsInjectedProps> {
  render(): JSX.Element | null {
    const displayable = getDisplayableStatuses(
      this.props.statuses,
      this.props.statusInstanceCounts,
      this.props.statusesByNumericID
    );
    if (displayable.length === 0) {
      return null;
    }

    const buffs = displayable.filter((status) => isStatusBuff(status));
    const debuffs = displayable.filter((status) => !isStatusBuff(status));

    return (
      <div className={Root}>
        <div className={`${Column} ${Positive}`}>
          {buffs.map((status) => (
            <StatusEffectRow
              key={getStatusInstanceKey(status)}
              statusData={status}
              entityID={this.props.entityID}
              isPositive={true}
              health={this.props.health}
            />
          ))}
        </div>
        <div className={`${Column} ${Negative}`}>
          {debuffs.map((status) => (
            <StatusEffectRow
              key={getStatusInstanceKey(status)}
              statusData={status}
              entityID={this.props.entityID}
              isPositive={false}
              health={this.props.health}
            />
          ))}
        </div>
      </div>
    );
  }
}

interface RowProps {
  statusData: StatusData;
  entityID: string;
  isPositive: boolean;
  health: EntityResource | undefined;
}

interface RowState {
  // Seconds elapsed since the status started; null until the first animation frame and while
  // the status is not in progress.
  elapsed: number | null;
  // Identifies the active status instance so CSS animations (drain) are only (re)started when
  // a new one begins.
  animationStart: number;
  // Negative offset that seeks the CSS drain animation to the current point in the duration.
  animationDelay: number;
  // Remaining duration at or below 1 second: the icon blinks, accelerating until expiry.
  expiring: boolean;
  // Freshly applied (see FRESH_WINDOW_SECONDS), or mounted while already in progress (dev aid,
  // see devPop in componentDidMount).
  fresh: boolean;
}

// One status effect: icon plus its amount cell, and the per-instance timing state both render
// from. A single animation handle drives the drain seek, the tooltip's remaining-time text, the
// blink window and the fresh window, so no separate loops are needed per child.
class StatusEffectRow extends React.Component<RowProps, RowState> {
  private animationHandle: ListenerHandle;
  // TODO: remove. Dev aid for out-of-context (browser) sessions: pops statuses that were already
  // present when the row mounted (world time is only advanced by the mock data service there),
  // so the pop-in and uiText paths are easy to exercise with a plain page reload. In-game,
  // freshness is derived from world time alone.
  private devPopActive = false;
  private devPopTimeout: number | undefined;
  private seenFirstFrame = false;

  constructor(props: RowProps) {
    super(props);
    // animationStart starts at -1 so a status with startTime 0 (e.g. the permanent mock status)
    // still takes the new-instance branch on its first frame.
    this.state = { elapsed: null, animationStart: -1, animationDelay: 0, expiring: false, fresh: false };
  }

  componentDidMount(): void {
    this.animationHandle = clientAPI.startAnimation(this.animate.bind(this));
  }

  componentWillUnmount(): void {
    this.animationHandle.close();
    window.clearTimeout(this.devPopTimeout);
  }

  render(): JSX.Element {
    const { statusData, isPositive } = this.props;
    const cell = (
      <StatusEffectAmountCell
        statusData={statusData}
        isPositive={isPositive}
        health={this.props.health}
        elapsed={this.state.elapsed}
        animationStart={this.state.animationStart}
        animationDelay={this.state.animationDelay}
        fresh={this.state.fresh}
      />
    );
    const icon = (
      <StatusEffectsWidgetIcon
        statusData={statusData}
        entityID={this.props.entityID}
        elapsed={this.state.elapsed}
        expiring={this.state.expiring}
        popping={this.state.fresh}
      />
    );

    return (
      <div className={Row}>
        {isPositive ? cell : icon}
        {isPositive ? icon : cell}
      </div>
    );
  }

  private animate(data: AnimationData): void {
    const { startTime, duration } = this.props.statusData;
    const elapsed = data.worldTime - startTime;
    const remaining = duration === Infinity ? Infinity : duration - elapsed;

    if (elapsed < 0 || remaining < 0) {
      if (this.state.elapsed !== null) {
        this.setState({ elapsed: null, animationStart: -1, animationDelay: 0, expiring: false, fresh: false });
      }
      return;
    }

    if (startTime !== this.state.animationStart) {
      // New status instance: hand the drain off to CSS, seeking to the current point with a
      // negative delay.
      this.setState({
        animationStart: startTime,
        animationDelay: -elapsed,
        elapsed,
        expiring: remaining <= 1,
        fresh: elapsed <= FRESH_WINDOW_SECONDS
      });
      this.maybeStartDevPop(elapsed, remaining);
      return;
    }

    // Same status still active. Re-render only when something visible changes: the fresh and
    // blink windows (sub-second), or the tooltip's whole remaining seconds.
    const expiring = remaining <= 1;
    // The dev pop outlives the world-time test on purpose: in a browser session world time does
    // not advance, so the status is already older than FRESH_WINDOW_SECONDS and the test alone
    // would clear fresh on the very next frame.
    const fresh = this.devPopActive || elapsed <= FRESH_WINDOW_SECONDS;
    const floorChanged =
      this.state.elapsed === null || Math.floor(remaining) !== Math.floor(duration - this.state.elapsed);
    if (expiring !== this.state.expiring || fresh !== this.state.fresh || floorChanged) {
      this.setState({ elapsed, expiring, fresh });
    }
  }

  // TODO: remove together with devPopActive. Only fires when the row mounts while the status is
  // already in progress (page reloads and mock re-arms out of context).
  private maybeStartDevPop(elapsed: number, remaining: number): void {
    if (this.seenFirstFrame || elapsed < 0 || remaining <= 0) {
      return;
    }
    this.seenFirstFrame = true;
    this.devPopActive = true;
    this.setState({ fresh: true });
    this.devPopTimeout = window.setTimeout(() => {
      this.devPopActive = false;
      // Not elapsed-derived: a world-time-fresh status that mounted at application time expires
      // on the same clock, so unconditionally dropping fresh is equivalent.
      this.setState({ fresh: false });
    }, FRESH_WINDOW_SECONDS * 1000);
  }
}

function mapStateToProps(state: RootState, ownProps: ColumnsProps): ColumnsProps & ColumnsInjectedProps {
  const { statusesByNumericID } = state.gameDefs;
  const resources = state.entities.entityResources[ownProps.entityID];

  return {
    ...ownProps,
    statusesByNumericID,
    statuses: state.entities.entityStatuses[ownProps.entityID] ?? {},
    statusInstanceCounts: state.entities.entityStatusInstanceCounts[ownProps.entityID] ?? {},
    health: resources?.[EntityResourceIDs.Health]
  };
}

export const StatusEffectsColumns = connect(mapStateToProps)(AStatusEffectsColumns);

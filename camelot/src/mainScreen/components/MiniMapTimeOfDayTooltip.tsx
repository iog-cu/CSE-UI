/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { AnimationData } from '@csegames/library/dist/_baseGame/GameClientModels/AnimationData';
import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';

// CSS classes
const Root = 'HUD-MiniMapTimeOfDayTooltip-Root';
const Phase = 'HUD-MiniMapTimeOfDayTooltip-Phase';
const Clock = 'HUD-MiniMapTimeOfDayTooltip-Clock';

const MINUTES_PER_HOUR = 60;
const CLOCK_DIGITS = 2;

function getTotalMinutes(hours: number): number {
  return Math.floor(hours * MINUTES_PER_HOUR);
}

function formatClockTime(totalMinutes: number): string {
  const hour = String(Math.floor(totalMinutes / MINUTES_PER_HOUR)).padStart(CLOCK_DIGITS, '0');
  const minute = String(totalMinutes % MINUTES_PER_HOUR).padStart(CLOCK_DIGITS, '0');
  return `${hour}:${minute}`;
}

interface Props {
  phaseName: string;
  initialHours: number;
}

// Updates live, since a game minute passes every 2.5 real seconds.
export class MiniMapTimeOfDayTooltip extends React.Component<Props> {
  private clockRef = React.createRef<HTMLDivElement>();
  private animationHandle: ListenerHandle | null = null;
  private lastTotalMinutes: number = getTotalMinutes(this.props.initialHours);

  render(): JSX.Element {
    return (
      <div className={Root}>
        <div className={Phase}>{this.props.phaseName}</div>
        <div className={Clock} ref={this.clockRef}>
          {formatClockTime(getTotalMinutes(this.props.initialHours))}
        </div>
      </div>
    );
  }

  componentDidMount(): void {
    this.animationHandle = clientAPI.startAnimation(this.animate.bind(this));
  }

  componentWillUnmount(): void {
    this.animationHandle?.close();
  }

  private animate(data: AnimationData, _: DOMHighResTimeStamp): void {
    const clock = this.clockRef.current;
    if (!clock || isNaN(data.timeOfDay)) return;

    const totalMinutes = getTotalMinutes(data.timeOfDay);
    if (totalMinutes === this.lastTotalMinutes) return;

    this.lastTotalMinutes = totalMinutes;
    clock.textContent = formatClockTime(totalMinutes);
  }
}

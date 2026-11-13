/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../../redux/store';
import { TooltipSource } from '../TooltipSource';
import { Dictionary } from '@csegames/library/dist/_baseGame/types/ObjectMap';
import { StringTableEntryDef } from '../../dataSources/manifest/stringTableManifest';
import { isStatusBuff, isStatusRemovable, StatusData } from '../../helpers/statusHelpers';
import { TagState } from '@csegames/library/dist/camelotunchained/game/GameClientModels/EntityState';
import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { AnimationData } from '@csegames/library/dist/_baseGame/GameClientModels/AnimationData';
import { StatusEffectTooltipContent } from './StatusEffectTooltipContent';

// CSS classes
const Root = 'HUD-StatusEffectsIcon-Root';
const StatusImage = 'HUD-StatusEffectsIcon-StatusImage';
const DurationWhiteRing = 'HUD-StatusEffectsIcon-DurationWhiteRing';
const DurationOverlay = 'HUD-StatusEffectsIcon-DurationOverlay';
const Amount = 'HUD-StatusEffectsIcon-Amount';
const Positive = 'Positive';
const Negative = 'Negative';

interface ReactProps {
  statusData: StatusData;
  entityID: string;
}

interface InjectedProps {
  stringTable: Dictionary<StringTableEntryDef>;
  selfID: string | null;
  clientStatusRemovalRequiredTags: TagState[];
  clientStatusRemovalExcludedTags: TagState[];
  tagAffixIDByStringID: Record<string, number>;
}

type Props = ReactProps & InjectedProps;

interface State {
  // Drives the tooltip text; updated ~once per second. Null until the first animation frame.
  elapsed: number | null;
  // Identifies the active status so we only (re)build the CSS animation when a new one starts.
  animationStart: number;
  // Negative offset that seeks the CSS animation to the current point in the duration.
  animationDelay: number;
}

class AStatusEffectsIcon extends React.Component<Props, State> {
  private animationHandle: ListenerHandle;

  constructor(props: Props) {
    super(props);
    this.state = { elapsed: null, animationStart: 0, animationDelay: 0 };
  }

  componentDidMount(): void {
    this.animationHandle = clientAPI.startAnimation(this.animate.bind(this));
  }

  render(): JSX.Element {
    const amount = Math.max(this.props.statusData.stats.Amount ?? 1, this.props.statusData.instanceCount);
    const isBuff = isStatusBuff(this.props.statusData);
    const ringModifier = !isBuff ? Negative : this.hasRemovableTags() ? Positive : '';
    const ringClass = `${DurationWhiteRing} ${ringModifier}`;
    return (
      <TooltipSource
        className={Root}
        tooltipID={`Status-${this.props.statusData.id}`}
        content={this.renderTooltip.bind(this, this.props.statusData)}
        positionType='mouse'
        onMouseDown={this.isRemovable() ? this.onRemoveStatusMouseDown.bind(this) : undefined}
      >
        <div className={ringClass} />
        {this.props.statusData.duration < Infinity && this.renderDurationOverlay()}
        <img className={StatusImage} src={this.props.statusData.iconURL} />
        {amount > 1 && <div className={Amount}>{amount}</div>}
      </TooltipSource>
    );
  }

  private isRemovable(): boolean {
    return this.props.entityID === this.props.selfID && isStatusBuff(this.props.statusData) && this.hasRemovableTags();
  }

  // No entityID check here, so other units' frames also color by tag, not just self's.
  private hasRemovableTags(): boolean {
    return isStatusRemovable(
      this.props.statusData,
      this.props.tagAffixIDByStringID,
      this.props.clientStatusRemovalRequiredTags,
      this.props.clientStatusRemovalExcludedTags
    );
  }

  // Coherent does not reliably fire onContextMenu, so we detect the right mouse button here instead.
  private onRemoveStatusMouseDown(e: React.MouseEvent): void {
    if (e.button !== 2) return;
    e.preventDefault();
    clientAPI.removeStatus(this.props.statusData.id);
  }

  componentWillUnmount(): void {
    this.animationHandle.close();
  }

  private renderTooltip(status: StatusData): React.ReactNode {
    return (
      <StatusEffectTooltipContent
        status={status}
        elapsed={this.state.elapsed}
        removable={this.isRemovable()}
        stringTable={this.props.stringTable}
      />
    );
  }

  private renderDurationOverlay(): React.ReactNode {
    if (this.state.elapsed === null) return null;

    const drain: React.CSSProperties = {
      animationDuration: `${this.props.statusData.duration}s`,
      animationDelay: `${this.state.animationDelay}s`
    };

    return (
      // Keyed on the status start to restart the drain animation.
      <div className={DurationOverlay} key={this.state.animationStart} style={drain} />
    );
  }

  private animate(data: AnimationData, _: DOMHighResTimeStamp): void {
    const { startTime, duration } = this.props.statusData;
    const elapsed = data.worldTime - startTime;
    const percent = elapsed / duration;

    if (percent < 0 || percent > 1) {
      if (this.state.elapsed !== null) {
        this.setState({ elapsed: null, animationStart: 0, animationDelay: 0 });
      }
      return;
    }

    if (startTime !== this.state.animationStart) {
      // New status: hand the drain off to CSS, seeking to the current point with a negative delay.
      this.setState({ animationStart: startTime, animationDelay: -elapsed, elapsed });
      return;
    }

    // Same status still active: only the tooltip text needs refreshing, once per second.
    const newFloor = Math.floor(duration - elapsed);
    const oldFloor = this.state.elapsed !== null ? Math.floor(duration - this.state.elapsed) : null;
    if (newFloor !== oldFloor) {
      this.setState({ elapsed });
    }
  }
}

function mapStateToProps(state: RootState, ownProps: ReactProps): Props {
  const { stringTable } = state.stringTable;
  const { tagAffixIDByStringID, settings } = state.gameDefs;
  const { selfID } = state.entities;
  return {
    ...ownProps,
    stringTable,
    selfID,
    tagAffixIDByStringID,
    clientStatusRemovalRequiredTags: settings?.clientStatusRemovalRequiredTags ?? [],
    clientStatusRemovalExcludedTags: settings?.clientStatusRemovalExcludedTags ?? []
  };
}

export const StatusEffectsIcon = connect(mapStateToProps)(AStatusEffectsIcon);

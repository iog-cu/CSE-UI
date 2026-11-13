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
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { StatusEffectTooltipContent } from './StatusEffectTooltipContent';

// CSS classes
const Root = 'HUD-StatusEffectsWidgetIcon-Root';
const StatusImage = 'HUD-StatusEffectsWidgetIcon-StatusImage';
const StackCount = 'HUD-StatusEffectsWidgetIcon-StackCount';
const Expiring = 'Expiring';
const Popping = 'Popping';
const Compact = 'Compact';
const Remaining = 'HUD-StatusEffectsWidgetIcon-Remaining';
const Positive = 'Positive';
const Negative = 'Negative';

interface ReactProps {
  statusData: StatusData;
  entityID: string;
  // Timing state computed by the owning StatusEffectRow animation loop.
  elapsed: number | null;
  // Formatted remaining duration, drawn in the corner the pop shrinks towards; null when the
  // status has no duration.
  remainingLabel: string | null;
  expiring: boolean;
  // Freshly applied: the icon pops in at double size and shrinks to normal over 0.5s.
  popping: boolean;
  // Duration-less effects render at icon-only size, in the strip above the timed columns.
  compact?: boolean;
}

interface InjectedProps {
  stringTable: Dictionary<StringTableEntryDef>;
  selfID: string | null;
  tagAffixIDByStringID: Record<string, number>;
  clientStatusRemovalRequiredTags: TagState[];
  clientStatusRemovalExcludedTags: TagState[];
}

type Props = ReactProps & InjectedProps;

// The square status icon of the standalone widget. Unlike the unit-frame icon it carries no
// duration ring (the drain lives in the adjacent amount cell) and no amount badge (the Amount
// stat lives in the cell; only the stack count stays on the icon). Pops in from the side facing
// away from the widget centre when freshly applied, and pulses during its last second.
class AStatusEffectsWidgetIcon extends React.Component<Props> {
  render(): JSX.Element {
    const { statusData } = this.props;
    const classes = [Root];
    // Side drives the pop-in origin (see MainScreen-Styles.scss): hostile effects grow from their
    // top-left corner, friendly ones from their top-right.
    classes.push(isStatusBuff(statusData) ? Positive : Negative);
    if (this.props.expiring) {
      classes.push(Expiring);
    }
    if (this.props.popping) {
      classes.push(Popping);
    }
    if (this.props.compact) {
      classes.push(Compact);
    }

    return (
      <TooltipSource
        className={classes.join(' ')}
        tooltipID={`Status-${statusData.id}`}
        content={this.renderTooltip.bind(this, statusData)}
        positionType='mouse'
        onMouseDown={this.isRemovable() ? this.onRemoveStatusMouseDown.bind(this) : undefined}
      >
        <img className={StatusImage} src={statusData.iconURL} />
        {this.props.remainingLabel !== null && <div className={Remaining}>{this.props.remainingLabel}</div>}
        {statusData.instanceCount > 1 && <div className={StackCount}>{statusData.instanceCount}</div>}
      </TooltipSource>
    );
  }

  private isRemovable(): boolean {
    return (
      this.props.entityID === this.props.selfID &&
      isStatusBuff(this.props.statusData) &&
      isStatusRemovable(
        this.props.statusData,
        this.props.tagAffixIDByStringID,
        this.props.clientStatusRemovalRequiredTags,
        this.props.clientStatusRemovalExcludedTags
      )
    );
  }

  // Coherent does not reliably fire onContextMenu, so we detect the right mouse button here instead.
  private onRemoveStatusMouseDown(e: React.MouseEvent): void {
    if (e.button !== 2) return;
    e.preventDefault();
    clientAPI.removeStatus(this.props.statusData.id);
  }

  private renderTooltip(status: StatusData): React.ReactNode {
    return (
      <StatusEffectTooltipContent
        status={status}
        elapsed={this.props.elapsed}
        removable={this.isRemovable()}
        stringTable={this.props.stringTable}
      />
    );
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

export const StatusEffectsWidgetIcon = connect(mapStateToProps)(AStatusEffectsWidgetIcon);

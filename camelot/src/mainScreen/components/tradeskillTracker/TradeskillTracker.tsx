/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { HUDLayer, HUDWidgetRegistration } from '../../redux/hudSlice';
import { RootState } from '../../redux/store';
import { HUDHorizontalAnchor, HUDVerticalAnchor } from '@csegames/library/dist/camelotunchained/game/types/HUDTypes';
import { StringTableEntryDef } from '../../dataSources/manifest/stringTableManifest';
import { getStringTableValue } from '../../helpers/stringTableHelpers';
import { CollapsingDrawer } from '../CollapsingDrawer';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { SoundEvents } from '@csegames/library/dist/camelotunchained/game/types/SoundEvents';
import { TradeskillTrackerRow } from './TradeskillTrackerRow';

const Root = 'HUD-TradeskillTracker-Root';
const Header = 'HUD-TradeskillTracker-Header';
const HeaderTitle = 'HUD-TradeskillTracker-HeaderTitle';
const MinimizeButton = 'HUD-TradeskillTracker-MinimizeButton';
const RowsDrawer = 'HUD-TradeskillTracker-RowsDrawer';
const Rows = 'HUD-TradeskillTracker-Rows';

// Matches the row slide-out animation in the stylesheet.
const ROW_EXIT_DURATION_MILLIS = 350;

const StringIDTradeskillTabName = 'TradeskillTabName';
const StringIDHUDEditorWidgetNameTradeskillTracker = 'HUDEditorWidgetNameTradeskillTracker';

const MinimizeButtonExpandText = '+';
const MinimizeButtonMinimizeText = '-';

interface RowState {
  trackID: string;
  isExiting: boolean;
}

interface State {
  rows: RowState[];
}

interface InjectedProps {
  stringTable: Record<string, StringTableEntryDef>;
  trackedProgressionTrackIDs: string[];
  isMinimized: boolean;
}

class ATradeskillTracker extends React.Component<InjectedProps, State> {
  private rowExitTimeout: number | null = null;

  constructor(props: InjectedProps) {
    super(props);

    this.state = {
      rows: props.trackedProgressionTrackIDs.map((trackID) => ({ trackID, isExiting: false }))
    };
  }

  render(): React.ReactNode {
    const hasRows = this.state.rows.length > 0;
    return (
      <div className={`${Root}${hasRows ? ' filled' : ''}`}>
        {hasRows && this.renderHeader()}
        <CollapsingDrawer className={RowsDrawer} isOpen={!this.props.isMinimized}>
          <div className={Rows}>
            {this.state.rows.map((row) => (
              <TradeskillTrackerRow key={row.trackID} trackID={row.trackID} isExiting={row.isExiting} />
            ))}
          </div>
        </CollapsingDrawer>
      </div>
    );
  }

  private renderHeader(): React.ReactNode {
    const title = getStringTableValue(StringIDTradeskillTabName, this.props.stringTable);
    return (
      <div className={Header}>
        <div className={HeaderTitle}>{`${title} (${this.props.trackedProgressionTrackIDs.length})`}</div>
        <div className={MinimizeButton} onClick={this.toggleMinimized.bind(this)}>
          {this.props.isMinimized ? MinimizeButtonExpandText : MinimizeButtonMinimizeText}
        </div>
      </div>
    );
  }

  componentDidUpdate(prevProps: Readonly<InjectedProps>): void {
    const trackedIDs = this.props.trackedProgressionTrackIDs;
    if (trackedIDs === prevProps.trackedProgressionTrackIDs) {
      return;
    }

    const removedIDs = prevProps.trackedProgressionTrackIDs.filter((id) => !trackedIDs.includes(id));
    const addedIDs = trackedIDs.filter((id) => !prevProps.trackedProgressionTrackIDs.includes(id));
    if (removedIDs.length === 0 && addedIDs.length === 0) {
      return;
    }

    this.setState((state) => {
      // A row re-tracked mid slide-out is revived rather than duplicated.
      const rows = state.rows.map((row) => {
        if (removedIDs.includes(row.trackID)) {
          return { ...row, isExiting: true };
        }
        if (addedIDs.includes(row.trackID)) {
          return { ...row, isExiting: false };
        }
        return row;
      });
      addedIDs.forEach((trackID) => {
        if (!rows.some((row) => row.trackID === trackID)) {
          rows.push({ trackID, isExiting: false });
        }
      });
      return { rows };
    });

    if (removedIDs.length > 0) {
      if (this.rowExitTimeout !== null) {
        window.clearTimeout(this.rowExitTimeout);
      }
      this.rowExitTimeout = window.setTimeout(() => {
        this.rowExitTimeout = null;
        this.setState((state) => ({ rows: state.rows.filter((row) => !row.isExiting) }));
      }, ROW_EXIT_DURATION_MILLIS);
    }
  }

  componentWillUnmount(): void {
    if (this.rowExitTimeout !== null) {
      window.clearTimeout(this.rowExitTimeout);
    }
  }

  private toggleMinimized(): void {
    clientAPI.playGameSound(SoundEvents.PLAY_UI_QUEST_DROPDOWN_ARROW);
    clientAPI.setTradeskillTrackerMinimized(!this.props.isMinimized);
  }
}

const mapStateToProps = (state: RootState): InjectedProps => {
  return {
    stringTable: state.stringTable.stringTable,
    trackedProgressionTrackIDs: state.tradeskillTracker.trackedProgressionTrackIDs,
    isMinimized: state.tradeskillTracker.isMinimized
  };
};

const TradeskillTracker = connect(mapStateToProps)(ATradeskillTracker);

export const WIDGET_ID_TRADESKILL_TRACKER = 'Tradeskill Tracker';
export const tradeskillTrackerRegistry: HUDWidgetRegistration = {
  id: WIDGET_ID_TRADESKILL_TRACKER,
  nameStringID: StringIDHUDEditorWidgetNameTradeskillTracker,
  defaults: {
    xAnchor: HUDHorizontalAnchor.Right,
    yAnchor: HUDVerticalAnchor.Bottom,
    xOffset: 5,
    yOffset: 10
  },
  requiresGameDefsLoaded: true,
  layer: HUDLayer.HUD,
  render: () => {
    return <TradeskillTracker />;
  }
};

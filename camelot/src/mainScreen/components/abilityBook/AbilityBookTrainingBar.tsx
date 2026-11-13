/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../../redux/store';
import { StringTableEntryDef } from '../../dataSources/manifest/stringTableManifest';
import {
  getStringTableValue,
  getTokenizedStringTableValue,
  StringIDGeneralBar,
  StringIDGeneralReset
} from '../../helpers/stringTableHelpers';
import { getFactionData } from '../../gameData/factionData';
import { BorderBackground, BorderType, FactionBorder } from '../FactionBorder';
import { FactionButton } from '../FactionButton';

const BUTTON_WIDTH_VMIN = 8;
const BUTTON_FONT_SCALE = 1.1;
const AVAILABLE_POINTS_TOKEN = '{POINTS}';

// CSS classes
const Root = 'HUD-AbilityBookTrainingBar-Root';
const Label = 'HUD-AbilityBookTrainingBar-Label';
const Separator = 'HUD-AbilityBookTrainingBar-Separator';
const Button = 'HUD-AbilityBookTrainingBar-Button';

// String IDs
const StringIDAbilityBookNotEnoughPoints = 'AbilityBookNotEnoughPoints';
const StringIDAbilityBookTrain = 'AbilityBookTrain';
const StringIDAbilityBookStagedPoints = 'AbilityBookStagedPoints';

interface ReactProps {
  // The available count is drawn in the realm color where this text has {POINTS}.
  availableTemplate: string;
  availablePoints: number;
  stagedPoints: number;
  isDisabled?: boolean;
  onReset?: () => void;
  onTrain?: () => void;
}

interface InjectedProps {
  uiFactionID: string;
  stringTable: Record<string, StringTableEntryDef>;
}

type Props = ReactProps & InjectedProps;

class AAbilityBookTrainingBar extends React.Component<Props> {
  render(): React.ReactNode {
    const areButtonsDisabled = this.props.isDisabled || this.props.stagedPoints <= 0;

    return (
      <FactionBorder className={Root} type={BorderType.Primary} background={BorderBackground.PatternLarge}>
        <div className={`${Label}${this.props.isDisabled ? ' disabled' : ''}`}>
          {this.renderAvailablePoints()}
          <span className={Separator}>{getStringTableValue(StringIDGeneralBar, this.props.stringTable)}</span>
          {getTokenizedStringTableValue(StringIDAbilityBookStagedPoints, this.props.stringTable, {
            POINTS: this.props.stagedPoints.toFixed(0)
          })}
        </div>
        <FactionButton
          className={Button}
          size={'m'}
          widthOverrideVmin={BUTTON_WIDTH_VMIN}
          fontScale={BUTTON_FONT_SCALE}
          disabled={areButtonsDisabled}
          onClick={this.props.onReset}
        >
          {getStringTableValue(StringIDGeneralReset, this.props.stringTable)}
        </FactionButton>
        <FactionButton
          className={Button}
          size={'m'}
          widthOverrideVmin={BUTTON_WIDTH_VMIN}
          fontScale={BUTTON_FONT_SCALE}
          disabled={areButtonsDisabled}
          // Apart from isDisabled, Train is only disabled with nothing staged, so the available points are all unspent points.
          disabledTooltip={
            this.props.isDisabled || this.props.availablePoints > 0
              ? undefined
              : getStringTableValue(StringIDAbilityBookNotEnoughPoints, this.props.stringTable)
          }
          onClick={this.props.onTrain}
        >
          {getStringTableValue(StringIDAbilityBookTrain, this.props.stringTable)}
        </FactionButton>
      </FactionBorder>
    );
  }

  private renderAvailablePoints(): React.ReactNode {
    const [prefix, suffix] = this.props.availableTemplate.split(AVAILABLE_POINTS_TOKEN);

    return (
      <>
        {prefix}
        <span style={{ color: getFactionData(this.props.uiFactionID).mailSenderColor }}>
          {this.props.availablePoints.toFixed(0)}
        </span>
        {suffix}
      </>
    );
  }
}

const mapStateToProps = (state: RootState, ownProps: ReactProps): Props => {
  return {
    ...ownProps,
    uiFactionID: state.hud.uiFactionID,
    stringTable: state.stringTable.stringTable
  };
};

export const AbilityBookTrainingBar = connect(mapStateToProps)(AAbilityBookTrainingBar);

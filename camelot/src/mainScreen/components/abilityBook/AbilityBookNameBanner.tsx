/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../../redux/store';
import { getFactionData } from '../../gameData/factionData';
import { BorderBackground, BorderType, FactionBorder } from '../FactionBorder';

// CSS classes
const Banner = 'HUD-AbilityBookNameBanner-Banner';
const Label = 'HUD-AbilityBookNameBanner-Label';
const LevelBorder = 'HUD-AbilityBookNameBanner-LevelBorder';
const LevelLabel = 'HUD-AbilityBookNameBanner-LevelLabel';

interface ReactProps {
  name: string;
  details: React.ReactNode;
}

interface InjectedProps {
  uiFactionID: string;
}

type Props = ReactProps & InjectedProps;

class AAbilityBookNameBanner extends React.Component<Props> {
  render(): React.ReactNode {
    return (
      <>
        <div
          className={Banner}
          style={{ backgroundImage: `url(${getFactionData(this.props.uiFactionID).headerBorderSecondaryImage})` }}
        >
          <div className={Label}>{this.props.name}</div>
        </div>
        <FactionBorder
          className={LevelBorder}
          type={BorderType.Secondary}
          background={BorderBackground.PatternSmall}
          includeTop={false}
        >
          <div className={LevelLabel}>{this.props.details}</div>
        </FactionBorder>
      </>
    );
  }
}

const mapStateToProps = (state: RootState, ownProps: ReactProps): Props => {
  return {
    ...ownProps,
    uiFactionID: state.hud.uiFactionID
  };
};

export const AbilityBookNameBanner = connect(mapStateToProps)(AAbilityBookNameBanner);

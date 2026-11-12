/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../../redux/store';
import { getFactionData } from '../../gameData/factionData';

// CSS classes
const Root = 'HUD-AbilityBookHeader-Root';
const Divider = 'HUD-AbilityBookHeader-Divider';
const Banner = 'HUD-AbilityBookHeader-Banner';
const Label = 'HUD-AbilityBookHeader-Label';

interface ReactProps {
  title: string;
}

interface InjectedProps {
  uiFactionID: string;
}

type Props = ReactProps & InjectedProps;

class AAbilityBookHeader extends React.Component<Props> {
  render(): React.ReactNode {
    const factionData = getFactionData(this.props.uiFactionID);

    return (
      <div className={Root}>
        <img className={Divider} src={factionData.dividerVerticalHalfImage} />
        <img className={`${Divider} right`} src={factionData.dividerVerticalHalfImage} />
        <div className={Banner} style={{ backgroundImage: `url(${factionData.headerBorderSecondaryImage})` }}>
          <div className={Label}>{this.props.title}</div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState, ownProps: ReactProps): Props => {
  return {
    ...ownProps,
    uiFactionID: state.hud.uiFactionID
  };
};

export const AbilityBookHeader = connect(mapStateToProps)(AAbilityBookHeader);

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../redux/store';
import { getFactionData } from '../gameData/factionData';

// CSS classes
const Root = 'HUD-FactionTabBadge-Root';

interface ReactProps {
  count: number;
}

interface InjectedProps {
  uiFactionID: string;
}

type Props = ReactProps & InjectedProps;

class AFactionTabBadge extends React.Component<Props> {
  render(): React.ReactNode {
    if (this.props.count <= 0) {
      return null;
    }

    return (
      <div className={Root} style={{ color: getFactionData(this.props.uiFactionID).targetBorderColor }}>
        {this.props.count}
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

export const FactionTabBadge = connect(mapStateToProps)(AFactionTabBadge);

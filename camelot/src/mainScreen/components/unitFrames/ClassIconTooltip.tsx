/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { TooltipSource } from '../TooltipSource';
import { ClassDef } from '../../dataSources/manifest/classManifest';
import { StringTableEntryDef } from '../../dataSources/manifest/stringTableManifest';
import { getStringTableValue } from '../../helpers/stringTableHelpers';

const Name = 'HUD-ClassIconTooltip-Name';

interface Props {
  className: string;
  tooltipID: string;
  classDef: ClassDef;
  stringTable: Record<string, StringTableEntryDef>;
}

// Hover target only; the owning frame draws the icon. PureComponent so the frame's resource ticks skip this.
export class ClassIconTooltip extends React.PureComponent<Props> {
  render(): JSX.Element {
    return (
      <TooltipSource
        className={this.props.className}
        tooltipID={this.props.tooltipID}
        positionType='mouse'
        content={this.renderTooltip.bind(this)}
      />
    );
  }

  private renderTooltip(): React.ReactNode {
    return <div className={Name}>{getStringTableValue(this.props.classDef.name, this.props.stringTable)}</div>;
  }
}

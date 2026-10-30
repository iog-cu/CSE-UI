/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { Faction } from '@csegames/library/dist/camelotunchained/graphql/schema';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { SoundEvents } from '@csegames/library/dist/camelotunchained/game/types/SoundEvents';
import { RootState } from '../redux/store';
import { BorderBackground, BorderType, FactionBorder } from './FactionBorder';
import { FactionButton } from './FactionButton';
import Escapable from './Escapable';
import { getStringTableValue } from '../helpers/stringTableHelpers';
import { StringTableEntryDef } from '../dataSources/manifest/stringTableManifest';

const StringIDBuildMismatchClientNewer = 'BuildMismatchClientNewer';
const StringIDBuildMismatchServerNewer = 'BuildMismatchServerNewer';
const StringIDCharacterManagementExitGame = 'CharacterManagementExitGame';

const ESCAPE_ID = 'BuildMismatchModal';

const Root = 'HUD-BuildMismatchModal-Root';
const Veil = 'HUD-ModalPane-Veil';
const Wrapper = 'HUD-ModalPane-Wrapper';
const ModalContainer = 'HUD-ModalPane-DefaultModalContainer';
const ContentRoot = 'HUD-ModalPane-ContentRoot';
const MessageText = 'HUD-ModalPane-MessageText';
const ButtonsSection = 'HUD-ModalPane-ButtonsSection';

interface ReactProps {}

interface InjectedProps {
  clientBuildNumber: number;
  serverBuildNumber: number | null;
  stringTable: Record<string, StringTableEntryDef>;
}

type Props = ReactProps & InjectedProps;

class ABuildMismatchModal extends React.Component<Props> {
  render(): React.ReactNode {
    const { clientBuildNumber, serverBuildNumber, stringTable } = this.props;
    // Local builds report 0, and null means the server hasn't answered yet.
    if (!clientBuildNumber || !serverBuildNumber || clientBuildNumber === serverBuildNumber) {
      return null;
    }
    if (Object.keys(stringTable).length === 0) {
      return null;
    }

    const messageStringID =
      serverBuildNumber > clientBuildNumber ? StringIDBuildMismatchServerNewer : StringIDBuildMismatchClientNewer;
    return (
      <div className={Root}>
        {/* Claims Esc so the Game Menu can't open behind the modal. */}
        <Escapable escapeID={ESCAPE_ID} onEscape={() => {}} />
        <div className={Veil} />
        <div className={Wrapper}>
          <FactionBorder
            className={ModalContainer}
            factionIDOverride={Faction.Arthurian}
            type={BorderType.Secondary}
            background={BorderBackground.PatternLarge}
          >
            <div className={ContentRoot}>
              <div className={MessageText}>{getStringTableValue(messageStringID, stringTable)}</div>
              <div className={ButtonsSection}>
                <FactionButton factionIDOverride={Faction.Arthurian} onClick={this.onExitClick.bind(this)}>
                  {getStringTableValue(StringIDCharacterManagementExitGame, stringTable)}
                </FactionButton>
              </div>
            </div>
          </FactionBorder>
        </div>
      </div>
    );
  }

  private onExitClick(): void {
    clientAPI.playGameSound(SoundEvents.PLAY_UI_SFX_CC_GENERIC_SELECT);
    clientAPI.quit();
  }
}

function mapStateToProps(state: RootState, ownProps: ReactProps): Props {
  const { clientBuildNumber, serverBuildNumber } = state.buildVersion;
  return {
    ...ownProps,
    clientBuildNumber,
    serverBuildNumber,
    stringTable: state.stringTable.stringTable
  };
}

export const BuildMismatchModal = connect(mapStateToProps)(ABuildMismatchModal);

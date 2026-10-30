/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { ExternalDataSource } from '../redux/externalDataSource';
import { MailSnapshot } from '@csegames/library/dist/camelotunchained/game/GameClientModels/MailSnapshot';
import {
  updateMailSnapshot
} from '../redux/mailSlice';
import { getStringTableValue, StringIDGeneralError } from '../helpers/stringTableHelpers';
import { showModal } from '../redux/modalsSlice';

export class MailService extends ExternalDataSource {
  protected bind(): Promise<ListenerHandle[]> {
    return Promise.resolve([
      clientAPI.bindMailUpdatedListener(this.handleMailUpdated.bind(this)),
      clientAPI.bindMailErrorListener(this.handleMailError.bind(this))
    ]);
  }

  private handleMailError(errorKey: string) {
    this.dispatch?.(
      showModal({
        id: 'MailError',
        content: {
          title: getStringTableValue(StringIDGeneralError, this.reduxState.stringTable.stringTable),
          message: getStringTableValue(errorKey, this.reduxState.stringTable.stringTable),
        },
        escapable: true
      })
    );
  }

  private handleMailUpdated(newState: MailSnapshot) {
    this.dispatch?.(updateMailSnapshot(newState));
  }
}
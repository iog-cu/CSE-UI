/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ExternalDataSource } from '../redux/externalDataSource';
import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { updateBuildNumbers } from '../redux/buildVersionSlice';
import { buildVersionQuery, BuildVersionQueryResult } from './buildVersionGraphQLConstants';
import { WithWebInterface } from '../redux/withWebInterface';

export class BuildVersionService extends WithWebInterface(ExternalDataSource) {
  protected async bind(): Promise<ListenerHandle[]> {
    return [
      await this.query<BuildVersionQueryResult>({ query: buildVersionQuery }, this.handleBuildVersionQuery.bind(this))
    ];
  }

  private async handleBuildVersionQuery(result: BuildVersionQueryResult): Promise<void> {
    const clientBuildNumber = await clientAPI.getBuildNumber();
    this.dispatch(updateBuildNumbers({ clientBuildNumber, serverBuildNumber: result?.serverBuildNumber ?? 0 }));
  }
}

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ExternalDataSource } from '../redux/externalDataSource';
import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { WithWebInterface } from '../redux/withWebInterface';
import {
  friendsSubscription,
  FriendsSubscriptionResult,
  socialQuery,
  SocialQueryResult,
  socialSubscription,
  SocialSubscriptionResult
} from './socialGraphQLConstants';
import { updateFriends, updateSocialSettings, updateSocialState } from '../redux/socialSlice';
import { FriendInvite } from '@csegames/library/dist/camelotunchained/graphql/schema';

export function splitFriendInvites(invites: FriendInvite[], selfAccountID: string): [FriendInvite[], FriendInvite[]] {
  const invitesSent: FriendInvite[] = [];
  const invitesReceived: FriendInvite[] = [];

  invites.forEach((invite) => {
    if (invite!.from?.id === selfAccountID) {
      invitesSent.push(invite!);
    } else {
      invitesReceived.push(invite!);
    }
  });

  return [invitesSent, invitesReceived];
}

export class SocialService extends WithWebInterface(ExternalDataSource) {
  protected async bind(): Promise<ListenerHandle[]> {
    return Promise.resolve([
      await this.query<SocialQueryResult>(
        { operationName: 'socialQuery', query: socialQuery },
        this.handleSocialQuery.bind(this)
      ),
      await this.subscribe<SocialSubscriptionResult>(
        { operationName: 'social', query: socialSubscription },
        this.handleSocialUpdate.bind(this)
      ),
      await this.subscribe<FriendsSubscriptionResult>(
        { operationName: 'friends', query: friendsSubscription },
        this.handleFriendsUpdate.bind(this)
      )
    ]);
  }

  private handleSocialQuery(result: SocialQueryResult): void {
    this.dispatch(updateSocialState(result));
  }

  private handleSocialUpdate(result: SocialSubscriptionResult): void {
    this.dispatch(updateSocialSettings(result.social!));
  }

  private handleFriendsUpdate(result: FriendsSubscriptionResult): void {
    this.dispatch(updateFriends(result.friends!));
  }
}

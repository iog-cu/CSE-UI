/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CUQuery, CUSubscription } from '@csegames/library/dist/camelotunchained/graphql/schema';
import gql from 'graphql-tag';

// Specify the subset of keys from CUQuery that we are interested in.
export type SocialQueryResult = Pick<CUQuery, 'friends' | 'social'>;
export type SocialSubscriptionResult = Pick<CUSubscription, 'social'>;
export type FriendsSubscriptionResult = Pick<CUSubscription, 'friends'>;

export const socialQuery = gql`
  query Social {
    friends {
      account {
        displayName
        id
      }
      friendInvites {
        expires
        from {
          displayName
          id
        }
        id
        note
        sent
        to {
          displayName
          id
        }
      }
      friends {
        account {
          displayName
          id
        }
        character {
          bodyTypeID
          classID
          factionID
          id
          name
          raceID
        }
        established
        note
      }
      revision
    }
    social {
      account {
        displayName
        id
      }
      defaultAllowed
      defaultBlocked
      overrides {
        account {
          displayName
          id
        }
        allowed
        blocked
        note
      }
    }
  }
`;

export const socialSubscription = gql`
  subscription SocialSubscription {
    social {
      account {
        displayName
        id
      }
      defaultAllowed
      defaultBlocked
      overrides {
        account {
          displayName
          id
        }
        allowed
        blocked
        note
      }
    }
  }
`;

export const friendsSubscription = gql`
  subscription FriendsSubscription {
    friends {
      account {
        displayName
        id
      }
      friendInvites {
        expires
        from {
          displayName
          id
        }
        id
        note
        sent
        to {
          displayName
          id
        }
      }
      friends {
        account {
          displayName
          id
        }
        character {
          bodyTypeID
          classID
          factionID
          id
          name
          raceID
        }
        established
        note
      }
      revision
    }
  }
`;

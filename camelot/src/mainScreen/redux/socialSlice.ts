/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createSlice, Draft, PayloadAction } from '@reduxjs/toolkit';
import { buildCallTracking } from '../helpers/rest/thunkUtils';
import { CallState, clearErrors } from '../helpers/rest/callState';
import {
  callSocialSetPermissions,
  callSocialSetUserNote,
  callSocialSetUserPermissions
} from '../helpers/rest/socialRestCalls';
import { FriendsList, SocialSettings } from '@csegames/library/dist/camelotunchained/graphql/schema';
import {
  callAcceptFriendInvite,
  callCreateFriendInvite,
  callRejectAllFriendInvites,
  callRejectFriendInvite,
  callRemoveFriend
} from '../helpers/rest/friendsRestCalls';
import { SocialQueryResult } from '../dataSources/socialGraphQLConstants';

export interface SocialState extends CallState {
  friends: FriendsList;
  settings: SocialSettings;
}

function onSuccess(state: Draft<SocialState>) {
  state.calls = clearErrors(state.calls);
}

function getInitialState(): SocialState {
  return {
    friends: {
      account: null,
      friends: [],
      friendInvites: [],
      revision: 0
    },
    settings: {
      account: null,
      defaultAllowed: null,
      defaultBlocked: null,
      overrides: []
    },
    calls: {}
  };
}

export const socialSlice = createSlice({
  name: 'social',
  initialState: getInitialState(),
  reducers: {
    updateSocialState: (state, action: PayloadAction<SocialQueryResult>) => {
      state.friends = action.payload.friends!;
      state.settings = action.payload.social!;
    },
    updateSocialSettings: (state, action: PayloadAction<SocialSettings>) => {
      state.settings = action.payload;
    },
    updateFriends: (state, action: PayloadAction<FriendsList>) => {
      state.friends = action.payload;
    }
  },
  extraReducers: (builder) => {
    buildCallTracking(builder, callSocialSetPermissions, onSuccess);
    buildCallTracking(builder, callSocialSetUserNote, onSuccess);
    buildCallTracking(builder, callSocialSetUserPermissions, onSuccess);
    buildCallTracking(builder, callCreateFriendInvite, onSuccess);
    buildCallTracking(builder, callAcceptFriendInvite, onSuccess);
    buildCallTracking(builder, callRejectFriendInvite, onSuccess);
    buildCallTracking(builder, callRejectAllFriendInvites, onSuccess);
    buildCallTracking(builder, callRemoveFriend, onSuccess);
  }
});

export const { updateSocialState, updateSocialSettings, updateFriends } = socialSlice.actions;

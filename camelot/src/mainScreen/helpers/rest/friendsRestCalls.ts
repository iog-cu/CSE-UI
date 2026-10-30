/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { webConf } from '../../redux/networkConfiguration';
import { CallThunkConfig, handleCall } from './thunkUtils';
import { AccountID, FriendsAPI } from '@csegames/library/dist/camelotunchained/webAPI/definitions';

export type CreateFriendInviteParams = { targetID?: AccountID; name?: string };
export const callCreateFriendInvite = createAsyncThunk<any, CreateFriendInviteParams, CallThunkConfig>(
  'friendsAPI/createFriendInvite',
  async (params: CreateFriendInviteParams, thunkAPI) => {
    return await handleCall(thunkAPI, FriendsAPI.CreateFriendInviteV1(webConf, params.targetID, params.name));
  }
);

export type AcceptFriendInviteParams = { inviteID: string; inviterID: AccountID };
export const callAcceptFriendInvite = createAsyncThunk<any, AcceptFriendInviteParams, CallThunkConfig>(
  'friendsAPI/acceptFriendInvite',
  async (params: AcceptFriendInviteParams, thunkAPI) => {
    return await handleCall(thunkAPI, FriendsAPI.AcceptFriendInviteV1(webConf, params.inviteID, params.inviterID));
  }
);

export type RejectFriendInviteParams = { inviteID: string; inviterID: AccountID };
export const callRejectFriendInvite = createAsyncThunk<any, RejectFriendInviteParams, CallThunkConfig>(
  'friendsAPI/rejectFriendInvite',
  async (params: RejectFriendInviteParams, thunkAPI) => {
    return await handleCall(thunkAPI, FriendsAPI.RejectFriendInviteV1(webConf, params.inviteID, params.inviterID));
  }
);

export const callRejectAllFriendInvites = createAsyncThunk<any, void, CallThunkConfig>(
  'friendsAPI/rejectAllFriendInvites',
  async (params: void, thunkAPI) => {
    return await handleCall(thunkAPI, FriendsAPI.RejectAllFriendInvitesV1(webConf));
  }
);

export const callRemoveFriend = createAsyncThunk<any, AccountID, CallThunkConfig>(
  'friendsAPI/removeFriend',
  async (params: AccountID, thunkAPI) => {
    return await handleCall(thunkAPI, FriendsAPI.RemoveFriendV1(webConf, params));
  }
);

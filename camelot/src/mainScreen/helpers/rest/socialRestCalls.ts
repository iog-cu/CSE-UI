/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { webConf } from '../../redux/networkConfiguration';
import { CallThunkConfig, handleCall } from './thunkUtils';
import {
  AccountID,
  SocialSettingsAPI,
  UserInteractions
} from '@csegames/library/dist/camelotunchained/webAPI/definitions';

export type SocialSetPermissionsParams = { allowed: UserInteractions; blocked: UserInteractions };
export const callSocialSetPermissions = createAsyncThunk<any, SocialSetPermissionsParams, CallThunkConfig>(
  'socialSettingsAPI/setPermissions',
  async (params: SocialSetPermissionsParams, thunkAPI) => {
    return await handleCall(thunkAPI, SocialSettingsAPI.SetPermissionsV1(webConf, params.allowed, params.blocked));
  }
);

export type SocialSetUserPermissionsParams = {
  allowed: UserInteractions;
  blocked: UserInteractions;
  targetID?: AccountID | null;
  name?: string;
};
export const callSocialSetUserPermissions = createAsyncThunk<any, SocialSetUserPermissionsParams, CallThunkConfig>(
  'socialSettingsAPI/setUserPermissions',
  async (params: SocialSetUserPermissionsParams, thunkAPI) => {
    return await handleCall(
      thunkAPI,
      SocialSettingsAPI.SetUserPermissionsV1(webConf, params.allowed, params.blocked, params.targetID, params.name)
    );
  }
);

export type SocialSetUserNoteParams = {
  targetID?: AccountID;
  name?: string;
  note?: string;
};
export const callSocialSetUserNote = createAsyncThunk<any, SocialSetUserNoteParams, CallThunkConfig>(
  'socialSettingsAPI/setUserNote',
  async (params: SocialSetUserNoteParams, thunkAPI) => {
    return await handleCall(
      thunkAPI,
      SocialSettingsAPI.SetUserNoteV1(webConf, params.targetID, params.name, params.note)
    );
  }
);

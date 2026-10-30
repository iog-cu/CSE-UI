/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BuildVersionState {
  clientBuildNumber: number;
  serverBuildNumber: number | null;
}

function generateDefaultBuildVersionState(): BuildVersionState {
  const defaultBuildVersionState: BuildVersionState = {
    clientBuildNumber: 0,
    serverBuildNumber: null
  };
  return defaultBuildVersionState;
}

export const buildVersionSlice = createSlice({
  name: 'buildVersion',
  initialState: generateDefaultBuildVersionState(),
  reducers: {
    updateBuildNumbers: (state: BuildVersionState, action: PayloadAction<BuildVersionState>) => {
      state.clientBuildNumber = action.payload.clientBuildNumber;
      state.serverBuildNumber = action.payload.serverBuildNumber;
    }
  }
});

export const { updateBuildNumbers } = buildVersionSlice.actions;

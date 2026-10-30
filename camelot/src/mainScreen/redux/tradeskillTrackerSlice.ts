/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TradeskillTrackerState {
  trackedProgressionTrackIDs: string[];
  isMinimized: boolean;
}

function generateDefaultTradeskillTrackerState(): TradeskillTrackerState {
  const defaultTradeskillTrackerState: TradeskillTrackerState = {
    trackedProgressionTrackIDs: [],
    isMinimized: false
  };
  return defaultTradeskillTrackerState;
}

export const tradeskillTrackerSlice = createSlice({
  name: 'tradeskillTracker',
  initialState: generateDefaultTradeskillTrackerState(),
  reducers: {
    updateTrackedProgressionTrackIDs: (state: TradeskillTrackerState, action: PayloadAction<string[]>) => {
      state.trackedProgressionTrackIDs = action.payload;
    },
    updateTradeskillTrackerMinimized: (state: TradeskillTrackerState, action: PayloadAction<boolean>) => {
      state.isMinimized = action.payload;
    }
  }
});

export const { updateTrackedProgressionTrackIDs, updateTradeskillTrackerMinimized } = tradeskillTrackerSlice.actions;

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { game } from '@csegames/library/dist/_baseGame';
import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { ExternalDataSource } from '../redux/externalDataSource';
import { setKeybinds } from '../redux/keybindsSlice';

export class KeybindsService extends ExternalDataSource {
  protected bind(): Promise<ListenerHandle[]> {
    this.refetchKeybinds();

    // The client applies keybind changes asynchronously, so game.keybinds is only current once this fires.
    return Promise.resolve([game.onKeybindChanged(this.refetchKeybinds.bind(this))]);
  }

  private refetchKeybinds(): void {
    this.dispatch(setKeybinds(game.keybinds));
  }
}

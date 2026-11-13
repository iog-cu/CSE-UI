/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { binarySearch } from '@csegames/library/dist/_baseGame/utils/arrayUtils';
import { ChatLine } from './ChatLine';

const MAX_LINES = 1000; // Shared across all scopes

type ChatHistoryListener = () => void;

// Kept outside the Chat widget so history keeps collecting while the widget is hidden.
class ChatHistory {
  private lines: ChatLine[] = [];
  private listeners: ChatHistoryListener[] = [];
  public lastWhisperSenderName: string | undefined = undefined;

  // A new array on every change, so readers can detect updates by reference.
  public get chatLines(): ChatLine[] {
    return this.lines;
  }

  public addLine(line: ChatLine): void {
    const lines = this.lines.slice();

    const index = binarySearch(
      line,
      lines,
      (l?: ChatLine, r?: ChatLine) =>
        (l?.numConnections ?? 0) - (r?.numConnections ?? 0) ||
        (l?.timestamp ?? 0) - (r?.timestamp ?? 0) ||
        (l?.id ?? 0) - (r?.id ?? 0) ||
        0
    );
    if (index < 0) {
      lines.splice(-index - 1, 0, line);
    } else if (lines.length < index) {
      lines.push(line);
    } else {
      lines.splice(index, 0, line);
    }

    if (lines.length > MAX_LINES) {
      lines.shift();
    }

    this.lines = lines;
    this.listeners.forEach((listener) => listener());
  }

  public addListener(listener: ChatHistoryListener): ListenerHandle {
    this.listeners.push(listener);
    return {
      close: () => {
        this.listeners = this.listeners.filter((l) => l !== listener);
      }
    };
  }
}

export const chatHistory = new ChatHistory();

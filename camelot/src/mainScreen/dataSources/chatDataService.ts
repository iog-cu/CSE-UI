/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { game } from '@csegames/library/dist/_baseGame';
import { AnnouncementType } from '@csegames/library/dist/_baseGame/types/localDefinitions';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { ChatScopes, isChatScope } from '@csegames/library/dist/camelotunchained/game/types/ChatTypes';
import { ChatServiceListener } from '@csegames/library/dist/chat/ChatServiceListener';
import { ErroredResponse, ReceivedResponse, RoomRecord } from '@csegames/library/dist/chat/generated/uce-chat-v3';
import { ExternalDataSource } from '../redux/externalDataSource';
import { getStringTableValue } from '../helpers/stringTableHelpers';
import { convertError, isServiceError } from '../helpers/errorConversionHelpers';
import { Chat } from '../components/chat/Chat';
import { chatHistory } from '../components/chat/ChatHistory';
import { incrementChatConnections } from '../components/chat/ChatLine';
import { allChatScopeDisplayData } from '../components/chat/ChatScopes';
import { chatRenderer, chatService } from '../components/chat/ChatSetup';
import { ChatLineCombat } from '../components/chat/lines/ChatLineCombat';
import { ChatLineMessage } from '../components/chat/lines/ChatLineMessage';
import { ChatLineNotice } from '../components/chat/lines/ChatLineNotice';
import { ChatLineSimple } from '../components/chat/lines/ChatLineSimple';

// Keeps chat connected and fills chatHistory so chat keeps working while the Chat widget is hidden.
export class ChatDataService extends ExternalDataSource implements ChatServiceListener {
  private lastCharacterID: string = '';

  protected bind(): Promise<ListenerHandle[]> {
    chatService.addListener(this);
    return Promise.resolve([
      { close: () => chatService.removeListener(this) },
      clientAPI.bindCombatEventListener((combatEvents) =>
        combatEvents.forEach((ev) => chatHistory.addLine(new ChatLineCombat(ev)))
      ),
      clientAPI.bindAnnouncementListener((type, text) => {
        if (type == AnnouncementType.Text) chatHistory.addLine(new ChatLineSimple(ChatScopes.Global, text));
      }),
      game.onConsoleText((consoleText) => chatHistory.addLine(new ChatLineSimple(ChatScopes.Console, consoleText)))
    ]);
  }

  protected onReduxUpdate = (): void => {
    const characterID = this.reduxState.entities.self.characterID;
    if (characterID === this.lastCharacterID) {
      return;
    }
    this.lastCharacterID = characterID;
    this.getShouldConnect().then((shouldConnect) => {
      if (shouldConnect) {
        chatService.reset();
      } else if (chatService.connected) {
        chatService.close();
      }
    });
  };

  onJoined(room: RoomRecord): void {
    if (!isChatScope(room.scope)) return;
    const id = allChatScopeDisplayData[room.scope]?.joinedStringID;
    if (!id) return;
    chatHistory.addLine(new ChatLineNotice(getStringTableValue(id, this.reduxState.stringTable.stringTable)));
  }

  onLeft(room: RoomRecord): void {
    if (!isChatScope(room.scope)) return;
    const id = allChatScopeDisplayData[room.scope]?.leftStringID;
    if (!id) return;
    chatHistory.addLine(new ChatLineNotice(getStringTableValue(id, this.reduxState.stringTable.stringTable)));
  }

  onReceived(message: ReceivedResponse): void {
    const scope = isChatScope(message.room.scope) ? message.room.scope : ChatScopes.Local;
    if (scope === ChatScopes.Whisper && message.senderID != this.reduxState.entities.self.characterID) {
      chatHistory.lastWhisperSenderName = message.senderName;
    }
    chatHistory.addLine(new ChatLineMessage(scope, message, chatRenderer.render(message), this.startWhisper));
  }

  // Looked up on click, since the Chat widget rebinds requestWhisper each time it mounts.
  private startWhisper = (name: string): void => {
    Chat.requestWhisper(name);
  };

  onError(error: ErroredResponse): void {
    if (isServiceError(error)) {
      chatHistory.addLine(new ChatLineSimple(ChatScopes.Error, convertError(error, false).message));
    } else {
      chatHistory.addLine(new ChatLineSimple(ChatScopes.Error, error.error.type));
    }
  }

  onConnected(): void {
    incrementChatConnections();
  }

  onConnectionFailure(reconnecting: boolean): void {
    if (!reconnecting) this.openConnection();
    // TODO : message for failure
  }

  onDisconnected(reconnecting: boolean): void {
    if (!reconnecting) this.openConnection();
    // TODO : message for disconnection
  }

  private async getShouldConnect(): Promise<boolean> {
    if (!this.reduxState.entities.self.characterID) return false;
    return !(await clientAPI.isOfflineMode());
  }

  private openConnection(): void {
    this.getShouldConnect().then((shouldConnect) => {
      if (shouldConnect) chatService.open();
    });
  }
}

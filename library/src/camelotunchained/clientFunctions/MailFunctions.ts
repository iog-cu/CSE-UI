/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { engine } from '../../_baseGame/engine';
import { ListenerHandle } from '../../_baseGame/listenerHandle';
import { EventEmitter } from '../../_baseGame/types/EventEmitter';
import { MailSnapshot } from '../game/GameClientModels/MailSnapshot';

const mailUpdatedEvent = 'mail.updated';
const mailErrorEvent = 'mail.error';

const mailDeleteMessagesCallbackName = 'mail.DeleteMessages';
const mailMarkMessagesReadCallbackName = 'mail.MarkMessagesRead';
const mailCollectRewardsCallbackName = 'mail.CollectRewards';

export type MailListener = (mail: MailSnapshot) => void;
export type MailErrorListener = (errorKey: string) => void;

export interface MailMocks {
  triggerMailUpdated(mail: MailSnapshot): void;
  triggerMailError(errorKey: string): void;
}

export interface MailFunctions {
  bindMailUpdatedListener(listener: MailListener): ListenerHandle;
  bindMailErrorListener(listener: MailErrorListener): ListenerHandle;
  deleteMessages(messageIDs: number[]): void;
  markMessagesRead(messageIDs: number[]): void;
  collectRewards(messageIDs: number[]): void;
}

class MailFunctionsBase implements MailFunctions, MailMocks {
  private readonly events = new EventEmitter();

  bindMailUpdatedListener(listener: MailListener): ListenerHandle {
    return this.events.on(mailUpdatedEvent, listener);
  }
  bindMailErrorListener(listener: MailErrorListener): ListenerHandle {
    return this.events.on(mailErrorEvent, listener);
  }
  triggerMailUpdated(mail: MailSnapshot): void {
    this.events.trigger(mailUpdatedEvent, mail);
  }
  triggerMailError(errorKey: string): void {
    this.events.trigger(mailErrorEvent, errorKey);
  }

  deleteMessages(messageIDs: number[]): void {}
  markMessagesRead(messageIDs: number[]): void {}
  collectRewards(messageIDs: number[]): void {}
}

class CoherentMailFunctions extends MailFunctionsBase {
  bindMailUpdatedListener(listener: MailListener): ListenerHandle {
    const mockHandle = super.bindMailUpdatedListener(listener);
    const engineHandle = engine.on(mailUpdatedEvent, listener);
    return {
      close() {
        mockHandle.close();
        engineHandle.clear();
      }
    };
  }
  bindMailErrorListener(listener: MailErrorListener): ListenerHandle {
    const mockHandle = super.bindMailErrorListener(listener);
    const engineHandle = engine.on(mailErrorEvent, listener);
    return {
      close() {
        mockHandle.close();
        engineHandle.clear();
      }
    }
  }

  deleteMessages(messageIDs: number[]): void {
    engine.trigger(mailDeleteMessagesCallbackName, messageIDs);
  }
  markMessagesRead(messageIDs: number[]): void {
    engine.trigger(mailMarkMessagesReadCallbackName, messageIDs);
  }
  collectRewards(messageIDs: number[]): void {
    engine.trigger(mailCollectRewardsCallbackName, messageIDs);
  }
}

class BrowserMailFunctions extends MailFunctionsBase {}

export const impl: MailFunctions & MailMocks = engine.isAttached
  ? new CoherentMailFunctions()
  : new BrowserMailFunctions();

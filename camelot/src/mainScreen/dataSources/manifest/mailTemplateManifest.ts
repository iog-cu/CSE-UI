/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Dispatch } from '@reduxjs/toolkit';
import { isDataArray } from './manifestDefService';
import { updateMailTemplates } from '../../redux/gameDefsSlice';

// On the server side, this matches with MailTemplateDefManifest.cs.

export const mailTemplateManifestID = 'mailtemplates';

export interface MailTemplateDef {
  id: string;
  numericID: number;
  subject: string;
  body: string;
  tagNames: string[];
}

export function processMailTemplates(dispatch: Dispatch, json: any, version: number): void {
  const mailTemplatesByStringID: Record<string, MailTemplateDef> = {};
  const mailTemplatesByNumericID: Record<number, MailTemplateDef> = {};

  if (!isDataArray(json.defs, version, isMailTemplateDefData)) {
    console.error('Invalid mailTemplateDefs manifest file');
    return;
  }

  for (const mailTemplate of json.defs) {
    switch (version) {
      case 1:
        const def: MailTemplateDef = {
          id: mailTemplate.id,
          numericID: Number(mailTemplate.numericID),
          subject: mailTemplate.subject,
          body: mailTemplate.body,
          tagNames: mailTemplate.tagNames
        };
        mailTemplatesByStringID[def.id] = def;
        mailTemplatesByNumericID[def.numericID] = def;
        break;
    }
  }

  dispatch(updateMailTemplates([mailTemplatesByStringID, mailTemplatesByNumericID]));
}

function isMailTemplateDefData(obj: any, version: number): obj is MailTemplateDef {
  switch (version) {
    case 1:
      const isCorrectType =
        Object.keys(obj).length === 5 &&
        'id' in obj &&
        'numericID' in obj &&
        'subject' in obj &&
        'body' in obj &&
        'tagNames' in obj;

      if (!isCorrectType) {
        console.error(`Found invalid MailTemplateDef object`, obj);
        return false;
      }
      return isCorrectType;
    default:
      console.error(`Found invalid MailTemplateDef version ${version}`);
      return false;
  }
}

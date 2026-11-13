/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TagState } from '@csegames/library/dist/camelotunchained/game/GameClientModels/EntityState';
import { getTagFromString, tagsMatch } from './tagHelpers';

import IconFishingURL from '../../images/resource-unit-frames/Resource-unit-frame-icon-fishing.png';
import IconHerbalismURL from '../../images/resource-unit-frames/Resource-unit-frame-icon-herbalism.png';
import IconLoggingURL from '../../images/resource-unit-frames/Resource-unit-frame-icon-logging.png';
import IconMiningURL from '../../images/resource-unit-frames/Resource-unit-frame-icon-mining.png';
import IconProspectingURL from '../../images/resource-unit-frames/Resource-unit-frame-icon-prospecting.png';

const ResourceNodeIcons: { tag: string; iconURL: string }[] = [
  { tag: 'Asset.Gatherable.Fishing', iconURL: IconFishingURL },
  { tag: 'Asset.Gatherable.Herbalism', iconURL: IconHerbalismURL },
  { tag: 'Asset.Gatherable.Logging', iconURL: IconLoggingURL },
  { tag: 'Asset.Gatherable.Mining', iconURL: IconMiningURL },
  { tag: 'Asset.Gatherable.Prospecting', iconURL: IconProspectingURL }
];

export function getResourceNodeIconURL(
  tags: Record<number, TagState>,
  tagAffixIDByStringID: Record<string, number>
): string | null {
  const nodeIcon = ResourceNodeIcons.find(({ tag }) => tagsMatch(tags, [getTagFromString(tag, tagAffixIDByStringID)]));
  return nodeIcon?.iconURL ?? null;
}

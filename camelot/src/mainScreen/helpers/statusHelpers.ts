import { StatusState } from '@csegames/library/dist/camelotunchained/game/GameClientModels/StatusState';
import { StatusDef } from '../dataSources/manifest/statusManifest';
import { TagState } from '@csegames/library/dist/camelotunchained/game/GameClientModels/EntityState';
import { getTagFromString, MatchMode, tagsMatch } from './tagHelpers';

// Not sure why, but the StatusData type doesn't resolve correctly if
// I try to do this in one line.
type StatusDefMinus = Omit<StatusDef, 'id'>;
export type StatusData = StatusState & StatusDefMinus & { instanceCount: number };

export const DETERMINATION_BUFF_STRING_ID = 'determination_reset_handler';
// Determination buff stack count each unit frame pip fills at, left to right.
export const DETERMINATION_PIP_STACK_THRESHOLDS = [6, 5];

export const includesTagCaseInsensitive = (tags: string[], substring: string): boolean =>
  tags.some((tag) => tag.toLowerCase().includes(substring));

export const isStatusBuff = (def: StatusDef | StatusData): boolean => {
  return def?.statusTags ? includesTagCaseInsensitive(def.statusTags, 'friendly') : false;
};

// statusTags are dot-hierarchical tag strings (e.g. 'Asset.Timing.Periodic'). Predicates match by
// case-insensitive substring, mirroring isStatusBuff ('friendly' matches 'Asset.Action.Friendly').
// Periodic statuses tick (DoTs, HoTs) and drain their duration in 1-second steps in the widget.
export const STATUS_TAG_PERIODIC = 'asset.timing.periodic';

export const hasStatusTag = (def: StatusDef | StatusData, tagSubstring: string): boolean =>
  def?.statusTags ? includesTagCaseInsensitive(def.statusTags, tagSubstring) : false;

export const isPeriodicStatus = (def: StatusDef | StatusData): boolean => hasStatusTag(def, STATUS_TAG_PERIODIC);

// Tag-based answer to 'may the player remove this buff by right-clicking it?', extracted so the
// unit-frame icons and the widget icons share one implementation.
export function isStatusRemovable(
  statusData: StatusData,
  tagAffixIDByStringID: Record<string, number>,
  removalRequiredTags: TagState[],
  removalExcludedTags: TagState[]
): boolean {
  const statusTags: Record<string, TagState> = {};
  statusData.statusTags.forEach((tag, index) => {
    statusTags[index] = getTagFromString(tag, tagAffixIDByStringID);
  });
  return (
    tagsMatch(statusTags, removalRequiredTags, MatchMode.All) &&
    tagsMatch(statusTags, removalExcludedTags, MatchMode.None)
  );
}

// Conditional-formatting tiers for the widget's amount column. The ratio is the status' Amount
// against the current HP of the entity under the effect; HP arrives via Redux (event-based), so
// tiers are re-evaluated on every health update, not on a timer.
export enum StatusAmountTier {
  Plain,
  Bold, // > 50% of current HP
  High, // > 75%: bold + drop shadow, teal (positive) / orange (negative)
  Extreme // > 100%: bold + drop shadow + larger, green (positive) / red (negative)
}

export function getStatusAmountTier(amount: number, currentHP: number | undefined): StatusAmountTier {
  if (!currentHP || currentHP <= 0) {
    return StatusAmountTier.Plain;
  }
  const ratio = amount / currentHP;
  if (ratio > 1) return StatusAmountTier.Extreme;
  if (ratio > 0.75) return StatusAmountTier.High;
  if (ratio > 0.5) return StatusAmountTier.Bold;
  return StatusAmountTier.Plain;
}

// The same status can briefly appear twice while being reapplied, so React keys must identify
// the instance (id plus startTime), not just the status.
export const getStatusInstanceKey = (status: StatusState): string => `${status.id}-${status.startTime}`;

export type StatusInstanceGroup = StatusState & { instanceCount: number };

// Statuses hidden from the HUD by definition (tag set by designers).
export const HIDDEN_STATUS_TAG = 'UI.Hidden';

// Statuses that pass the HUD display filters (showInHUD & co., UI.Hidden, disabled), merged with
// their definitions and instance counts. Shared by the unit-frame rows and the widget columns.
export function getDisplayableStatuses(
  statuses: Record<number, StatusState>,
  statusInstanceCounts: Record<number, number>,
  statusesByNumericID: Record<number, StatusDef>
): StatusData[] {
  const displayable: StatusData[] = [];
  getNewestStatusInstances(Object.values(statuses), statusInstanceCounts).forEach((state) => {
    const def = statusesByNumericID[state.id];
    if (!def) {
      return;
    }
    if (!def.showInHUD && !def.showOnAdd && !def.showOnInactive && !def.showOnRemove) {
      return;
    }
    if (def.statusTags.includes(HIDDEN_STATUS_TAG)) {
      return;
    }
    const data: StatusData = { ...def, ...state };
    if (data.isDisabled) {
      return;
    }
    displayable.push(data);
  });
  return displayable;
}

// Some statuses (e.g. Exertion) stack by applying multiple separate instances rather than incrementing a
// single instance's Amount stat, and a reapply briefly sends old+new instances of the same status. Collapse
// to one representative instance (the newest) plus its count (from EntityStateService's precomputed
// statusInstanceCounts, so no re-scan of entity.statuses is needed here) so the UI can render one icon either way.
export function getNewestStatusInstances(
  statuses: StatusState[],
  statusInstanceCounts: Record<number, number>
): StatusInstanceGroup[] {
  const newestByID: Record<number, StatusState> = {};
  statuses.forEach((status) => {
    const existing = newestByID[status.id];
    if (!existing || status.startTime > existing.startTime) {
      newestByID[status.id] = status;
    }
  });
  return Object.values(newestByID).map((status) => ({
    ...status,
    instanceCount: statusInstanceCounts[status.id] ?? 1
  }));
}

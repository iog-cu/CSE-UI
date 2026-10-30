import { Dictionary } from '@csegames/library/dist/_baseGame/types/ObjectMap';
import { HUDWidget } from '../redux/hudSlice';
import { ButtonLayout, AbilityGroup } from '@csegames/library/dist/_baseGame/types/AbilityTypes';
import { AbilityBarDecor, HUDWidgetState } from '@csegames/library/dist/camelotunchained/game/types/HUDTypes';

const AbilityBarWidgetIDPrefix = 'Bar:';

export const DynamicAbilitiesLayoutID = -3;
export const SiegeEngineLayoutID = -2;
export const BuildModeLayoutID = -1;
const FirstAbilityBarLayoutID = 1;

const SystemAbilityBarWidgetIDs: Record<number, string> = {
  [DynamicAbilitiesLayoutID]: `${AbilityBarWidgetIDPrefix} Dynamic Abilities`,
  [SiegeEngineLayoutID]: `${AbilityBarWidgetIDPrefix} Siege Engine`,
  [BuildModeLayoutID]: `${AbilityBarWidgetIDPrefix} Build Mode`
};

const AllAbilityBarDecor: Partial<Record<AbilityBarDecor, boolean>> = {
  [AbilityBarDecor.Left]: true,
  [AbilityBarDecor.Right]: true,
  [AbilityBarDecor.Top]: true,
  [AbilityBarDecor.Bottom]: true
};

// Bars not listed (bar 2 and up) only show the top ornament, and only while they're the highest bar on screen.
const DefaultAbilityBarDecorByLayoutID: Record<number, Partial<Record<AbilityBarDecor, boolean>>> = {
  [FirstAbilityBarLayoutID]: {
    [AbilityBarDecor.Left]: true,
    [AbilityBarDecor.Right]: true,
    [AbilityBarDecor.Bottom]: true
  },
  [DynamicAbilitiesLayoutID]: { [AbilityBarDecor.Left]: true, [AbilityBarDecor.Right]: true },
  [SiegeEngineLayoutID]: AllAbilityBarDecor,
  [BuildModeLayoutID]: AllAbilityBarDecor
};

export const isAbilityBarWidgetID = (widgetID: string): boolean => widgetID.startsWith(AbilityBarWidgetIDPrefix);

export const getAbilityBarWidgetID = (layoutID: number): string =>
  SystemAbilityBarWidgetIDs[layoutID] ?? `${AbilityBarWidgetIDPrefix} Abilities ${layoutID}`;

export const isAbilityBarDecorShown = (
  decor: AbilityBarDecor,
  widgetState: HUDWidgetState | undefined,
  layoutID: number,
  layouts: Record<number, ButtonLayout>,
  groups: Record<number, AbilityGroup>
): boolean => {
  const setting = widgetState?.abilityBarDecor?.[decor];
  if (setting !== undefined) {
    return setting;
  }
  const defaults = DefaultAbilityBarDecorByLayoutID[layoutID];
  if (defaults) {
    return defaults[decor] ?? false;
  }
  return decor === AbilityBarDecor.Top && isHighestActiveAbilityBar(layoutID, layouts, groups);
};

export const getAbilityBarsCount = (widgets: Dictionary<HUDWidget>): number =>
  Object.keys(widgets).filter((widgetName) => {
    return widgets[widgetName].registration && isAbilityBarWidgetID(widgetName);
  }).length - 3; // The -3 is to account for Siege, BuildMode, and DynamicAbilities (system bars).

const isHighestActiveAbilityBar = (
  layoutID: number,
  layouts: Record<number, ButtonLayout>,
  groups: Record<number, AbilityGroup>
): boolean => {
  if (!(layouts && groups) || isNaN(layoutID)) {
    return false;
  }

  let highest = 0;
  Object.values(layouts).forEach((layout) => {
    const group = groups[layout.groupID];
    if (group) {
      const isGroupShown = group.abilities.length > 0;
      const isHighest = layout.id > highest;

      if (isGroupShown && isHighest) {
        highest = layout.id;
        if (highest > layoutID) {
          return false;
        }
      }
    }
  });

  return layoutID === highest;
};

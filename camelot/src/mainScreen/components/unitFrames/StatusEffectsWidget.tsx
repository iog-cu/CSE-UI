/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { HUDHorizontalAnchor, HUDVerticalAnchor } from '@csegames/library/dist/camelotunchained/game/types/HUDTypes';
import { HUDWidgetRegistration, HUDLayer, isWidgetHidden } from '../../redux/hudSlice';
import { RootState } from '../../redux/store';
import StatusEffects from './StatusEffects';

const Root = 'HUD-StatusEffectsWidget-Root';

// Entity id used by the mock entities (camelotMocks.createPlayerEntityState()), shown when the widget
// has no target to display, e.g. while it is being positioned in the HUD editor.
const MOCK_ENTITY_ID = 'MOCK';

interface ReactProps {
  source: 'self' | 'friendly' | 'enemy';
  isDragCopy: boolean;
}

interface InjectedProps {
  entityID: string;
}

type Props = ReactProps & InjectedProps;

// Standalone, independently placeable version of the status-effects rows embedded in the unit
// frames. Renders the same connected StatusEffects sub-component for the entity the parent unit
// frame displays.
class AStatusEffectsWidget extends React.Component<Props> {
  render(): JSX.Element | null {
    if (!this.props.entityID) {
      return null;
    }

    return (
      <div className={Root}>
        <StatusEffects entityID={this.props.entityID} />
      </div>
    );
  }
}

function mapStateToProps(state: RootState, ownProps: ReactProps): Props {
  // Same entity the parent unit frame displays, falling back to the mock entity so out-of-context
  // sessions (and edit mode with no target selected) render against the mock status data.
  const entityID =
    ownProps.source === 'self'
      ? state.entities.selfID ?? state.entities.self?.entityID
      : ownProps.source === 'friendly'
      ? state.entities.friendlyTargetID ?? state.entities.friendlyTarget?.entityID
      : state.entities.enemyTargetID ?? state.entities.enemyTarget?.entityID;

  return { ...ownProps, entityID: entityID || MOCK_ENTITY_ID };
}

const StatusEffectsWidget = connect(mapStateToProps)(AStatusEffectsWidget);

export const WIDGET_ID_STATUS_EFFECTS_SELF = 'Status Effects (Self)';
export const WIDGET_ID_STATUS_EFFECTS_FRIENDLY = 'Status Effects (Friendly Target)';
export const WIDGET_ID_STATUS_EFFECTS_ENEMY = 'Status Effects (Enemy Target)';

// Hidden by default (opacity 0): the embedded copies own the display until the user opts in by
// raising the standalone widget's opacity in the HUD Editor.
export const statusEffectsSelfRegistry: HUDWidgetRegistration = {
  id: WIDGET_ID_STATUS_EFFECTS_SELF,
  nameStringID: 'HUDEditorWidgetNameStatusEffectsSelf',
  defaults: {
    xAnchor: HUDHorizontalAnchor.Left,
    yAnchor: HUDVerticalAnchor.Top,
    xOffset: 24,
    yOffset: 12,
    opacity: 0
  },
  layer: HUDLayer.HUD,
  render: (isDragCopy: boolean) => {
    return <StatusEffectsWidget source="self" isDragCopy={isDragCopy} />;
  }
};

export const statusEffectsFriendlyRegistry: HUDWidgetRegistration = {
  id: WIDGET_ID_STATUS_EFFECTS_FRIENDLY,
  nameStringID: 'HUDEditorWidgetNameStatusEffectsFriendly',
  defaults: {
    xAnchor: HUDHorizontalAnchor.Left,
    yAnchor: HUDVerticalAnchor.Top,
    xOffset: 24,
    yOffset: 34,
    opacity: 0
  },
  layer: HUDLayer.HUD,
  render: (isDragCopy: boolean) => {
    return <StatusEffectsWidget source="friendly" isDragCopy={isDragCopy} />;
  }
};

export const statusEffectsEnemyRegistry: HUDWidgetRegistration = {
  id: WIDGET_ID_STATUS_EFFECTS_ENEMY,
  nameStringID: 'HUDEditorWidgetNameStatusEffectsEnemy',
  defaults: {
    xAnchor: HUDHorizontalAnchor.Center,
    yAnchor: HUDVerticalAnchor.Top,
    yOffset: 26,
    opacity: 0
  },
  layer: HUDLayer.HUD,
  render: (isDragCopy: boolean) => {
    return <StatusEffectsWidget source="enemy" isDragCopy={isDragCopy} />;
  }
};

// Embedded copies in the unit frames back off when the standalone widget owns the display: it
// renders whenever it is not hidden. Hidden (opacity 0) widgets are unmounted by
// BaseHUD.renderWidget, so the embedded copy must show through then — group editing included,
// where hidden widgets render nothing (no group-member render exception since 0.52).
export function shouldRenderEmbeddedStatusEffects(state: RootState, widgetID: string): boolean {
  const widget = state.hud.widgets[widgetID];
  if (!widget) {
    return true;
  }
  return isWidgetHidden(widget);
}

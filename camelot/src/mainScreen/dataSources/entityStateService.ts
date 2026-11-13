/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  AnyEntityStateModel,
  EntityResource,
  EntityStat,
  isEntityPlayer
} from '@csegames/library/dist/camelotunchained/game/GameClientModels/EntityState';
import {
  addOrUpdateEntity,
  addOrUpdateEntityResources,
  addOrUpdateEntityStats,
  addOrUpdateEntityStatuses,
  addOrUpdateEntityStatusInstanceCounts,
  removeEntity,
  setEntityContext
} from '../redux/entitiesSlice';
import { EntityContext } from '@csegames/library/dist/_baseGame/types/EntityContext';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { ExternalDataSource } from '../redux/externalDataSource';
import { ItemActionsMessage } from '@csegames/library/dist/camelotunchained/game/types/ItemActions';
import { showContextMenu } from '../redux/contextMenuSlice';
import { performItemAction } from '../helpers/itemHelpers';
import { isDeepDifferent } from '@csegames/library/dist/_baseGame/utils/objectUtils';

export class EntityStateService extends ExternalDataSource {
  protected bind(): Promise<ListenerHandle[]> {
    return Promise.resolve([
      clientAPI.bindEntityUpdatedListener(this.handleEntityUpdated.bind(this)),
      clientAPI.bindEntityRemovedListener(this.handleEntityRemoved.bind(this)),
      clientAPI.bindEntityContextListener(this.handleEntityContext.bind(this)),
      clientAPI.bindEntityShowItemActionsListener(this.handleEntityShowItemActions.bind(this))
    ]);
  }

  private handleEntityUpdated(newState: AnyEntityStateModel) {
    // Duplicate status ids are legal (a reapply briefly sends old+new instances of the same status, and some
    // statuses stack via repeated instances rather than an Amount stat), so count instances per status id once
    // here instead of leaving every consumer to re-scan entity.statuses on their own.

    // TODO: I would love a cheaper way of deciding this, but for now I just want to see if good data is enough
    //       to improve UI performance.  Optimally, the client would have already handled diffing so that we can
    //       just respond to events.  Also, the client would send separate events for the noisy bits so they don't
    //       trigger the base entity update at all.
    if (isDeepDifferent(newState.statuses, this.reduxState.entities.entityStatuses[newState.entityID])) {
      this.dispatch(addOrUpdateEntityStatuses([newState.entityID, newState.statuses]));

      // This one will conveniently be different only if statuses are different in some way.
      const statusInstanceCounts: Record<number, number> = {};
      Object.values(newState.statuses).forEach((status) => {
        statusInstanceCounts[status.id] = (statusInstanceCounts[status.id] ?? 0) + 1;
      });
      if (
        isDeepDifferent(statusInstanceCounts, this.reduxState.entities.entityStatusInstanceCounts[newState.entityID])
      ) {
        this.dispatch(addOrUpdateEntityStatusInstanceCounts([newState.entityID, statusInstanceCounts]));
      }
    }

    // `resources` arrives keyed by array index instead of resource ID.
    const betterResources: Record<string, EntityResource> = {};
    Object.values(newState.resources).forEach((resource) => (betterResources[resource.id] = resource));
    if (isDeepDifferent(betterResources, this.reduxState.entities.entityResources[newState.entityID])) {
      this.dispatch(addOrUpdateEntityResources([newState.entityID, betterResources]));
    }

    if (isEntityPlayer(newState)) {
      // The `stats` property handed to us is a map (not an array) keyed by array index.  We want it keyed by statID instead.
      const betterStats: Record<number, EntityStat> = {};
      Object.values(newState.stats).forEach((stat) => (betterStats[stat.id] = stat));
      if (isDeepDifferent(betterStats, this.reduxState.entities.entityStats[newState.entityID])) {
        this.dispatch(addOrUpdateEntityStats([newState.entityID, betterStats]));
      }

      // TODO: Optimally, these would be sent separately instead of split out manually.
      newState.resources = {};
      newState.stats = {};
      newState.statuses = {};
    }

    if (isDeepDifferent(newState, this.reduxState.entities.entities[newState.entityID])) {
      this.dispatch(addOrUpdateEntity(newState));
    }
  }

  private handleEntityContext(entityID: string, context: EntityContext) {
    this.dispatch(setEntityContext({ context, entityID }));
  }

  private handleEntityRemoved(entityID: string) {
    this.dispatch(removeEntity(entityID));
  }

  private handleEntityShowItemActions(message: ItemActionsMessage): void {
    const dispatch = this.dispatch;
    this.dispatch(
      showContextMenu({
        id: `ItemActions:${message.itemInstanceID}`,
        content: message.actions.map((action) => {
          const onClick = (): void => {
            performItemAction(
              message.itemInstanceID,
              message.numericItemDefID,
              action.id,
              action.uiReaction,
              message.itemEntityID,
              message.boneAlias,
              dispatch
            );
          };
          return {
            title: action.displayName,
            onClick
          };
        }),
        mouseX: message.mouseX,
        mouseY: message.mouseY
      })
    );
  }
}

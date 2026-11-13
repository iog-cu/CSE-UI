/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { StatusData, getStatusAmountTier, isPeriodicStatus, StatusAmountTier } from '../../helpers/statusHelpers';
import { EntityResource } from '@csegames/library/dist/camelotunchained/game/GameClientModels/EntityState';

// CSS classes
const Root = 'HUD-StatusEffectAmountCell-Root';
const Drain = 'HUD-StatusEffectAmountCell-Drain';
const UiText = 'HUD-StatusEffectAmountCell-UiText';
// Modifier for a uiText rendered without an Amount beside it (see the .Solo rule in the stylesheet).
const UiTextSolo = 'Solo';
const Amount = 'HUD-StatusEffectAmountCell-Amount';
const Positive = 'Positive';
const Negative = 'Negative';
const TierBold = 'TierBold';
const TierHigh = 'TierHigh';
const TierExtreme = 'TierExtreme';

interface Props {
  statusData: StatusData;
  // Positive effects render left of their icon, negative effects right of it; the drain fill
  // hugs the icon side in both cases.
  isPositive: boolean;
  // Health of the entity under the effect, for the conditional amount formatting. Re-evaluated
  // on every Redux health update (event-based); undefined disables tiering.
  health: EntityResource | undefined;
  // Timing state computed by the owning StatusEffectRow animation loop.
  elapsed: number | null;
  animationStart: number;
  animationDelay: number;
}

// The text/number cell beside a status icon in the standalone widget: the duration drain moved
// off the icon into this cell's background, the Amount stat (formerly the icon's corner badge)
// at triple the badge size with HP-relative conditional formatting, and the uiText shown only
// during the freshly-applied window. All state is owned by StatusEffectRow; this is presentational.
export function StatusEffectAmountCell(props: Props): JSX.Element | null {
  const { statusData, isPositive, elapsed, health } = props;
  const side = isPositive ? Positive : Negative;

  const amount = statusData.stats.Amount;
  const hasAmount = amount != null && amount > 1;
  let amountTierClass = '';
  if (amount != null && amount > 1 && health) {
    switch (getStatusAmountTier(amount, health.current)) {
      case StatusAmountTier.Bold:
        amountTierClass = TierBold;
        break;
      case StatusAmountTier.High:
        amountTierClass = TierHigh;
        break;
      case StatusAmountTier.Extreme:
        amountTierClass = TierExtreme;
        break;
    }
  }

  // Periodic statuses (DoTs/HoTs) drain in 1-second steps instead of smoothly. CSS steps() needs
  // an integer count, so the step width is duration/round(duration) rather than exactly 1s.
  const drainStyle: React.CSSProperties = {
    animationDuration: `${statusData.duration}s`,
    animationDelay: `${props.animationDelay}s`
  };
  if (isPeriodicStatus(statusData)) {
    drainStyle.animationTimingFunction = `steps(${Math.max(1, Math.round(statusData.duration))}, end)`;
  }

  return (
    <div className={`${Root} ${side}`}>
      {statusData.duration < Infinity && elapsed !== null && (
        // Keyed on the status start to restart the drain animation.
        <div className={`${Drain} ${side}`} key={props.animationStart} style={drainStyle} />
      )}
      {statusData.uiText ? (
        // Shown for the whole effect duration, not just the fresh window. With no Amount beside it
        // the uiText is the only content, so it takes the amount's size.
        <div className={hasAmount ? UiText : `${UiText} ${UiTextSolo}`}>{statusData.uiText}</div>
      ) : null}
      {hasAmount && <div className={`${Amount} ${side} ${amountTierClass}`}>{amount}</div>}
    </div>
  );
}

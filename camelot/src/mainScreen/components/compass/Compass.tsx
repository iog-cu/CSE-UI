/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { HUDLayer, HUDWidgetRegistration } from '../../redux/hudSlice';
import { RootState } from '../../redux/store';
import {
  CompassHeadingSource,
  HUDHorizontalAnchor,
  HUDVerticalAnchor
} from '@csegames/library/dist/camelotunchained/game/types/HUDTypes';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { AnimationData } from '@csegames/library/dist/_baseGame/GameClientModels/AnimationData';
import { floatEquals } from '@csegames/library/dist/_baseGame/utils/mathExtensions';
import { Faction } from '@csegames/library/dist/camelotunchained/webAPI/definitions';
import {
  AnyEntityStateModel,
  isEntityItem,
  isEntityPlayer
} from '@csegames/library/dist/camelotunchained/game/GameClientModels/EntityState';
import { PersonalMapMarker } from '@csegames/library/dist/camelotunchained/clientFunctions/HUDFunctions';
import { FactionDef } from '../../dataSources/manifest/factionManifest';
import { StringTableEntryDef } from '../../dataSources/manifest/stringTableManifest';
import { getFactionData } from '../../gameData/factionData';
import { getStringTableValue } from '../../helpers/stringTableHelpers';
import { getNPCTierIconImage } from '../../helpers/npcTierHelpers';
import { getResourceNodeIconURL } from '../../helpers/resourceNodeHelpers';
import { yawToCompassBearing } from '../../helpers/mapHelpers';
import { BorderBackground, BorderType, FactionBorder } from '../FactionBorder';

// CSS classes
const Root = 'HUD-Compass-Root';
const Frame = 'HUD-Compass-Frame';
const Window = 'HUD-Compass-Window';
const TickDot = 'HUD-Compass-TickDot';
const TickLabel = 'HUD-Compass-TickLabel';
const CenterIndicator = 'HUD-Compass-CenterIndicator';
const Marker = 'HUD-Compass-Marker';
const MarkerBackground = 'HUD-Compass-MarkerBackground';
const MarkerInnerIcon = 'HUD-Compass-MarkerInnerIcon';
const EndCap = 'HUD-Compass-EndCap';

const StringIDCompassDirectionN = 'CompassDirectionN';
const StringIDCompassDirectionNE = 'CompassDirectionNE';
const StringIDCompassDirectionE = 'CompassDirectionE';
const StringIDCompassDirectionSE = 'CompassDirectionSE';
const StringIDCompassDirectionS = 'CompassDirectionS';
const StringIDCompassDirectionSW = 'CompassDirectionSW';
const StringIDCompassDirectionW = 'CompassDirectionW';
const StringIDCompassDirectionNW = 'CompassDirectionNW';

export const CompassWidthDefault = 33;
export const CompassHeadingSourceDefault = CompassHeadingSource.Camera;
const DEFAULT_WIDTH_VMIN = 34;

const HALF_FOV_DEGREES = 45;
const DIRECTION_INTERVAL_DEGREES = 45;
const ANGLE_EPSILON_DEGREES = 0.05;
const DEGREES_PER_RADIAN = 180 / Math.PI;
const DIRECTION_STRING_IDS = [
  StringIDCompassDirectionN,
  StringIDCompassDirectionNE,
  StringIDCompassDirectionE,
  StringIDCompassDirectionSE,
  StringIDCompassDirectionS,
  StringIDCompassDirectionSW,
  StringIDCompassDirectionW,
  StringIDCompassDirectionNW
];

interface CompassDirection {
  degrees: number;
  stringID: string;
}

const DIRECTIONS: CompassDirection[] = DIRECTION_STRING_IDS.map((stringID, i) => ({
  degrees: i * DIRECTION_INTERVAL_DEGREES,
  stringID
}));

const DOT_DEGREES: number[] = DIRECTIONS.map((direction) => direction.degrees + DIRECTION_INTERVAL_DEGREES / 2);

// Normalizes an angle difference to the range [-180, 180).
function normalizeDelta(delta: number): number {
  return (((delta % 360) + 540) % 360) - 180;
}

function tickLeftPercent(degrees: number, heading: number): number {
  return 50 + (normalizeDelta(degrees - heading) / HALF_FOV_DEGREES) * 50;
}

function writeTickLeft(element: HTMLElement | null, degrees: number, heading: number): void {
  if (element && !isNaN(degrees)) {
    element.style.left = `${tickLeftPercent(degrees, heading)}%`;
  }
}

// NaN means no target; treat two NaNs as equal so no target doesn't write every frame.
function bearingEquals(a: number, b: number): boolean {
  return (isNaN(a) && isNaN(b)) || floatEquals(a, b, ANGLE_EPSILON_DEGREES);
}

const FactionlessMarkerFrameURL = getFactionData(Faction[Faction.Factionless]).compassIconImage;

function getTargetInnerIconURL(
  target: AnyEntityStateModel | null,
  tagAffixIDByStringID: Record<string, number>
): string | null {
  if (isEntityPlayer(target)) {
    return target.faction === Faction.Factionless ? getNPCTierIconImage(target.characterKind) : null;
  }
  if (isEntityItem(target)) {
    return getResourceNodeIconURL(target.tags, tagAffixIDByStringID);
  }
  return null;
}

interface ReactProps {
  isDragCopy: boolean;
}

interface InjectedProps {
  uiFactionID: string;
  factions: Record<string, FactionDef>;
  selfID: string | null;
  friendlyTargetID: string | null;
  friendlyTargetFaction: Faction | null;
  friendlyTargetInnerIconURL: string | null;
  enemyTargetID: string | null;
  enemyTargetFaction: Faction | null;
  enemyTargetInnerIconURL: string | null;
  personalMarker: PersonalMapMarker | null;
  personalMapMarkerVisible: boolean;
  widthPercent: number;
  headingSource: CompassHeadingSource;
  stringTable: Record<string, StringTableEntryDef>;
}

// Positions change every frame, so animate writes them to the DOM; state only tracks which markers show.
interface State {
  animationHandle: ListenerHandle;
  hasFriendlyBearing: boolean;
  hasEnemyBearing: boolean;
  hasPersonalMarkerBearing: boolean;
}

type Props = ReactProps & InjectedProps;

class ACompass extends React.Component<Props, State> {
  private heading: number = 0;
  private friendlyBearing: number = NaN;
  private enemyBearing: number = NaN;
  private personalMarkerBearing: number = NaN;
  private dotRefs = DOT_DEGREES.map(() => React.createRef<HTMLDivElement>());
  private labelRefs = DIRECTIONS.map(() => React.createRef<HTMLSpanElement>());
  private friendlyMarkerRef = React.createRef<HTMLDivElement>();
  private enemyMarkerRef = React.createRef<HTMLDivElement>();
  private personalMarkerRef = React.createRef<HTMLImageElement>();

  constructor(props: Props) {
    super(props);
    this.state = {
      animationHandle: clientAPI.startAnimation(this.animate.bind(this)),
      hasFriendlyBearing: false,
      hasEnemyBearing: false,
      hasPersonalMarkerBearing: false
    };
  }

  render(): JSX.Element {
    const heading = this.heading;
    const factionData = getFactionData(this.props.uiFactionID);
    const endImage = factionData.compassEndImage;
    // FactionBorder draws its border over its children, so the end caps and Window sit outside it.
    return (
      <div className={Root} style={{ width: `${(DEFAULT_WIDTH_VMIN * this.props.widthPercent) / 100}vmin` }}>
        <FactionBorder className={Frame} type={BorderType.Secondary} background={BorderBackground.PatternSmall}>
          <div className={CenterIndicator} style={{ backgroundColor: factionData.borderColor }} />
        </FactionBorder>
        <img className={`${EndCap} left`} src={endImage} />
        <img className={`${EndCap} right`} src={endImage} />
        <img className={`${EndCap} top`} src={endImage} />
        <img className={`${EndCap} bottom`} src={endImage} />
        <div className={Window}>
          {DOT_DEGREES.map((degrees, i) => (
            <div
              key={degrees}
              ref={this.dotRefs[i]}
              className={TickDot}
              style={{ left: `${tickLeftPercent(degrees, heading)}%` }}
            />
          ))}
          {this.state.hasFriendlyBearing &&
            this.renderTargetMarker(
              this.props.friendlyTargetID,
              this.props.friendlyTargetFaction,
              this.props.friendlyTargetInnerIconURL,
              this.friendlyBearing,
              this.friendlyMarkerRef
            )}
          {this.state.hasEnemyBearing &&
            this.renderTargetMarker(
              this.props.enemyTargetID,
              this.props.enemyTargetFaction,
              this.props.enemyTargetInnerIconURL,
              this.enemyBearing,
              this.enemyMarkerRef
            )}
          {this.state.hasPersonalMarkerBearing && (
            <img
              ref={this.personalMarkerRef}
              className={Marker}
              style={{ left: `${tickLeftPercent(this.personalMarkerBearing, heading)}%` }}
              src={factionData.personalMarkerCompassImage}
            />
          )}
          {/* After the markers, so the direction labels paint over any marker that reaches them. */}
          {DIRECTIONS.map((direction, i) => (
            <span
              key={direction.degrees}
              ref={this.labelRefs[i]}
              className={TickLabel}
              style={{ left: `${tickLeftPercent(direction.degrees, heading)}%` }}
            >
              {getStringTableValue(direction.stringID, this.props.stringTable)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  componentWillUnmount(): void {
    this.state.animationHandle.close();
  }

  private renderTargetMarker(
    targetID: string | null,
    faction: Faction | null,
    innerIconURL: string | null,
    bearing: number,
    markerRef: React.RefObject<HTMLDivElement>
  ): React.ReactNode {
    if (!targetID || targetID === this.props.selfID || faction === null) {
      return null;
    }

    const frameURL = innerIconURL
      ? FactionlessMarkerFrameURL
      : getFactionData(this.props.factions[Faction[faction]]?.id).compassIconImage;
    return (
      <div ref={markerRef} className={Marker} style={{ left: `${tickLeftPercent(bearing, this.heading)}%` }}>
        <img className={MarkerBackground} src={frameURL} />
        {innerIconURL && <img className={MarkerInnerIcon} src={innerIconURL} />}
      </div>
    );
  }

  private computePersonalMarkerBearing(data: AnimationData): number {
    const marker = this.props.personalMarker;
    if (!marker || !this.props.personalMapMarkerVisible || isNaN(data.playerX) || isNaN(data.playerY)) {
      return NaN;
    }
    // atan2 measures from east, counterclockwise, the same as game yaw.
    const markerYaw = Math.atan2(marker.y - data.playerY, marker.x - data.playerX) * DEGREES_PER_RADIAN;
    return yawToCompassBearing(markerYaw);
  }

  private animate(data: AnimationData): void {
    const cameraHeading = yawToCompassBearing(data.cameraYaw);
    // playerYaw is NaN while nothing is controlled.
    const followCharacter = this.props.headingSource === CompassHeadingSource.Character && !isNaN(data.playerYaw);
    const heading = followCharacter ? yawToCompassBearing(data.playerYaw) : cameraHeading;
    // Target bearings arrive relative to the camera; adding the camera heading makes them absolute.
    const friendlyBearing = this.props.friendlyTargetID ? cameraHeading + data.friendlyTargetBearing : NaN;
    const enemyBearing = this.props.enemyTargetID ? cameraHeading + data.enemyTargetBearing : NaN;
    const personalMarkerBearing = this.computePersonalMarkerBearing(data);

    const headingChanged = !floatEquals(heading, this.heading, ANGLE_EPSILON_DEGREES);
    if (headingChanged) {
      this.heading = heading;
      for (let i = 0; i < DOT_DEGREES.length; i++) {
        writeTickLeft(this.dotRefs[i].current, DOT_DEGREES[i], heading);
      }
      for (let i = 0; i < DIRECTIONS.length; i++) {
        writeTickLeft(this.labelRefs[i].current, DIRECTIONS[i].degrees, heading);
      }
    }
    if (headingChanged || !bearingEquals(friendlyBearing, this.friendlyBearing)) {
      this.friendlyBearing = friendlyBearing;
      writeTickLeft(this.friendlyMarkerRef.current, friendlyBearing, heading);
    }
    if (headingChanged || !bearingEquals(enemyBearing, this.enemyBearing)) {
      this.enemyBearing = enemyBearing;
      writeTickLeft(this.enemyMarkerRef.current, enemyBearing, heading);
    }
    if (headingChanged || !bearingEquals(personalMarkerBearing, this.personalMarkerBearing)) {
      this.personalMarkerBearing = personalMarkerBearing;
      writeTickLeft(this.personalMarkerRef.current, personalMarkerBearing, heading);
    }

    const hasFriendlyBearing = !isNaN(friendlyBearing);
    const hasEnemyBearing = !isNaN(enemyBearing);
    const hasPersonalMarkerBearing = !isNaN(personalMarkerBearing);
    if (
      hasFriendlyBearing !== this.state.hasFriendlyBearing ||
      hasEnemyBearing !== this.state.hasEnemyBearing ||
      hasPersonalMarkerBearing !== this.state.hasPersonalMarkerBearing
    ) {
      this.setState({ hasFriendlyBearing, hasEnemyBearing, hasPersonalMarkerBearing });
    }
  }
}

const mapStateToProps = (state: RootState, ownProps: ReactProps): Props => {
  const { friendlyTarget, enemyTarget } = state.entities;
  const { tagAffixIDByStringID } = state.gameDefs;
  const compassState = state.hud.widgets[WIDGET_ID_COMPASS]?.state;
  return {
    ...ownProps,
    uiFactionID: state.hud.uiFactionID,
    factions: state.gameDefs.factions,
    selfID: state.entities.selfID,
    friendlyTargetID: state.entities.friendlyTargetID,
    friendlyTargetFaction: friendlyTarget?.faction ?? null,
    friendlyTargetInnerIconURL: getTargetInnerIconURL(friendlyTarget, tagAffixIDByStringID),
    enemyTargetID: state.entities.enemyTargetID,
    enemyTargetFaction: enemyTarget?.faction ?? null,
    enemyTargetInnerIconURL: getTargetInnerIconURL(enemyTarget, tagAffixIDByStringID),
    personalMarker: state.hud.personalMapMarkers[state.loading.zoneID] ?? null,
    personalMapMarkerVisible: state.hud.personalMapMarkerVisible,
    widthPercent: compassState?.compassWidth ?? CompassWidthDefault,
    headingSource: compassState?.compassHeadingSource ?? CompassHeadingSourceDefault,
    stringTable: state.stringTable.stringTable
  };
};

const Compass = connect(mapStateToProps)(ACompass);

export const WIDGET_ID_COMPASS = 'Compass';
export const compassRegistry: HUDWidgetRegistration = {
  id: WIDGET_ID_COMPASS,
  nameStringID: 'HUDEditorWidgetNameCompass',
  // Centered under the mini map at the default UI scale, overlapping its bottom rim.
  defaults: {
    xAnchor: HUDHorizontalAnchor.Right,
    yAnchor: HUDVerticalAnchor.Top,
    xOffset: 6.9,
    yOffset: 20.5,
    layerOffset: 1
  },
  requiresGameDefsLoaded: true,
  layer: HUDLayer.HUD,
  render: (isDragCopy: boolean) => {
    return <Compass isDragCopy={isDragCopy} />;
  }
};

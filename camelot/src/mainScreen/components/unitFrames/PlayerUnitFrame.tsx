/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../../redux/store';
import { EntityResourceIDs } from '@csegames/library/dist/camelotunchained/game/types/EntityResourceIDs';
import {
  EntityResource,
  isEntityPlayer,
  PlayerEntityStateModel
} from '@csegames/library/dist/camelotunchained/game/GameClientModels/EntityState';
import { printWithSeparator } from '@csegames/library/dist/_baseGame/utils/numberUtils';
import { Faction } from '@csegames/library/dist/camelotunchained/webAPI/definitions';
import ContextMenuSource from '../ContextMenuSource';
import { ContextMenuItem, ContextMenuParams } from '../../redux/contextMenuSlice';
import { FactionDef } from '../../dataSources/manifest/factionManifest';
import {
  getStringTableValue,
  getTokenizedStringTableValue,
  StringIDGeneralComma
} from '../../helpers/stringTableHelpers';
import { StringTableEntryDef } from '../../dataSources/manifest/stringTableManifest';
import { FactionData, getFactionData } from '../../gameData/factionData';
import { CharacterKind } from '@csegames/library/dist/camelotunchained/game/types/CharacterKind';
import { getIsEntityNPC, getLockedResourceRatio, getShieldRatio } from '../../helpers/characterHelpers';
import {
  PlayerUnitFrameChrome,
  ClassIcon,
  FrameForeground,
  LevelForeground,
  NameForeground
} from './PlayerUnitFrameChrome';
import { ClassIconTooltip } from './ClassIconTooltip';
import { DETERMINATION_BUFF_STRING_ID, DETERMINATION_PIP_STACK_THRESHOLDS } from '../../helpers/statusHelpers';

// Images are imported so that WebPack can find them (and give us errors if they are missing).
import Health from '../../../images/unit-frames/unit-frame-health.png';
import LockedHealth from '../../../images/unit-frames/unit-frame-health-locked.png';
import Shield from '../../../images/unit-frames/unit-frame-health-shield.png';
import Courage from '../../../images/unit-frames/unit-frame-courage.png';
import Mana from '../../../images/unit-frames/unit-frame-mana.png';
import Focus from '../../../images/unit-frames/unit-frame-focus.png';
import Faith from '../../../images/unit-frames/unit-frame-faith.png';
import Determination from '../../../images/unit-frames/unit-frame-determination.png';
import Panic from '../../../images/unit-frames/unit-frame-panic.png';
import NPCTierIconMinor from '../../../images/unit-frames/npc-tier-icon-minor.png';
import NPCTierIconElite from '../../../images/unit-frames/npc-tier-icon-elite.png';
import NPCTierIconStrongElite from '../../../images/unit-frames/npc-tier-icon-strongelite.png';
import NPCTierIconUnique from '../../../images/unit-frames/npc-tier-icon-unique.png';
import NPCTierIconMiniboss from '../../../images/unit-frames/npc-tier-icon-miniboss.png';
import NPCTierIconBoss from '../../../images/unit-frames/npc-tier-icon-boss.png';
import JudgementPipFull from '../../../images/unit-frames/unit-frame-judgement-pip-full.png';
import DeterminationPipFull from '../../../images/unit-frames/unit-frame-determination-pip-full.png';
import { GameDefsState } from '../../redux/gameDefsSlice';
import { ClassIconSize, getClassIconSize } from '../../helpers/classIconHelpers';

// CSS classes
const Root = 'HUD-PlayerUnitFrame-Root';
const FrameRoot = 'HUD-PlayerUnitFrame-FrameRoot';
const HitRegion = 'HUD-PlayerUnitFrame-HitRegion';
const ClassIconHitRegion = 'HUD-PlayerUnitFrame-ClassIconHitRegion';
const FrameBackground = 'HUD-PlayerUnitFrame-FrameBackground';
const Marker = 'HUD-PlayerUnitFrame-Marker';
const MarkerHealth = 'HUD-PlayerUnitFrame-MarkerHealth';
const MarkerLockedHealth = 'HUD-PlayerUnitFrame-MarkerLockedHealth';
const MarkerShield = 'HUD-PlayerUnitFrame-MarkerShield';
const MarkerCourage = 'HUD-PlayerUnitFrame-MarkerCourage';
const MarkerMana = 'HUD-PlayerUnitFrame-MarkerMana';
const MarkerFocus = 'HUD-PlayerUnitFrame-MarkerFocus';
const MarkerFaith = 'HUD-PlayerUnitFrame-MarkerFaith';
const MarkerDetermination = 'HUD-PlayerUnitFrame-MarkerDetermination';
const PanicContainer = 'HUD-PlayerUnitFrame-PanicContainer';
const PanicBar = 'HUD-PlayerUnitFrame-PanicBar';
const SimplePanicContainer = 'HUD-PlayerUnitFrame-SimplePanicContainer';
const SimplePanicBar = 'HUD-PlayerUnitFrame-SimplePanicBar';
const PrimaryMiddle = 'HUD-PlayerUnitFrame-PrimaryMiddle';
const PrimaryMiddleBar = 'HUD-PlayerUnitFrame-PrimaryMiddleBar';
const LockedHealthBar = 'HUD-PlayerUnitFrame-LockedHealthBar';
const ShieldBar = 'HUD-PlayerUnitFrame-ShieldBar';
const SimplePrimaryMiddle = 'HUD-PlayerUnitFrame-SimplePrimaryMiddle';
const SimpleSecondaryMiddle = 'HUD-PlayerUnitFrame-SimpleSecondaryMiddle';
const PrimaryResourceText = 'HUD-PlayerUnitFrame-PrimaryResourceText';
const SecondaryMiddle = 'HUD-PlayerUnitFrame-SecondaryMiddle';
const SecondaryMiddleBar = 'HUD-PlayerUnitFrame-SecondaryMiddleBar';
const SecondaryResourceText = 'HUD-PlayerUnitFrame-SecondaryResourceText';
const SimpleNameForeground = 'HUD-PlayerUnitFrame-SimpleNameForeground';
const SimpleLevelNumber = 'HUD-PlayerUnitFrame-SimpleLevelNumber';
const SimpleNameText = 'HUD-PlayerUnitFrame-SimpleNameText';
const SimplePrimaryResourceText = 'HUD-PlayerUnitFrame-SimplePrimaryResourceText';
const SimpleSecondaryResourceText = 'HUD-PlayerUnitFrame-SimpleSecondaryResourceText';
const ResourcePips = 'HUD-PlayerUnitFrame-ResourcePips';
const ResourcePip = 'HUD-PlayerUnitFrame-ResourcePip';
const ResourcePipContent = 'HUD-PlayerUnitFrame-ResourcePipContent';
const ResourcePipBackground = 'HUD-PlayerUnitFrame-ResourcePipBackground';
const ResourcePipFill = 'HUD-PlayerUnitFrame-ResourcePipFill';

// String IDs
const StringIDUnitFrameCorpse = 'UnitFrameCorpse';
const StringIDUnitFrameOffline = 'UnitFrameOffline';
const StringIDUnitFramePartyLeader = 'UnitFramePartyLeader';
const StringIDUnitFrameWarbandDeputy = 'UnitFrameWarbandDeputy';
const StringIDUnitFrameResourceHealth = 'UnitFrameResourceHealth';
const StringIDUnitFrameResourceMana = 'UnitFrameResourceMana';
const StringIDUnitFrameResourceFocus = 'UnitFrameResourceFocus';
const StringIDUnitFrameResourceCourage = 'UnitFrameResourceCourage';
const StringIDUnitFrameResourceFaith = 'UnitFrameResourceFaith';
const StringIDUnitFrameResourceDetermination = 'UnitFrameResourceDetermination';

interface ReactProps {
  entityID: string;
  isAlive: boolean;
  name: string;
  faction: Faction;
  contextMenu?: ContextMenuItem[];
  isLeader: boolean;
  isDeputy: boolean;
  isOnline: boolean;
  isParty?: boolean;
  classID?: number;
  onTarget?: () => void;
  isSimple?: boolean;
  hasCompass?: boolean;
}

interface InjectedProps {
  defs: GameDefsState;
  friendlyTargetType: string | null;
  entity: PlayerEntityStateModel | undefined;
  statusInstanceCounts: Record<number, number>;
  resources: Record<string, EntityResource>;
  stringTable: Record<string, StringTableEntryDef>;
  determinationStacks: number;
  classIconSize: ClassIconSize;
}

type Props = ReactProps & InjectedProps;

class PlayerUnitFrame extends React.PureComponent<Props> {
  render(): JSX.Element {
    const faction = this.props.defs.factions[Faction[this.props.faction]];

    const entity = this.props.entity;
    const isNPC = getIsEntityNPC(entity);
    const hasClassIconTooltip = !!entity && this.props.isOnline && this.hasClassIcon();

    let name = this.props.name;
    if (!this.props.isAlive && this.props.entityID?.length > 0) {
      name += ` ${getStringTableValue(StringIDUnitFrameCorpse, this.props.stringTable)}`;
    }
    if (this.props.isLeader) {
      name += ` ${getStringTableValue(StringIDUnitFramePartyLeader, this.props.stringTable)}`;
    }
    if (this.props.isDeputy) {
      name += ` ${getStringTableValue(StringIDUnitFrameWarbandDeputy, this.props.stringTable)}`;
    }
    if (!this.props.isOnline) {
      name += ` ${getStringTableValue(StringIDUnitFrameOffline, this.props.stringTable)}`;
    }

    return (
      <div className={`${Root}${this.props.isSimple ? ' simple' : ''}`}>
        <div
          className={`${FrameRoot}${this.props.isSimple ? ' simple' : ''}${
            this.props.isSimple && this.props.faction === Faction.Factionless ? ' factionless-simple' : ''
          }${!this.props.isSimple && isNPC ? ' npc' : ''}`}
        >
          {entity && this.props.isOnline && this.getEntityContent(entity, name, faction)}
          {!entity && this.getOutOfZoneContent(name, faction, this.props.isSimple)}
          <ContextMenuSource
            className={`${HitRegion}${this.props.isSimple ? ' simple' : ''}${isNPC ? ' npc' : ''}`}
            onClick={this.props.onTarget}
            menuParams={this.getContextMenuParams()}
          >
            {hasClassIconTooltip && (
              <ClassIconTooltip
                className={`${ClassIconHitRegion}${this.props.isSimple ? ' simple' : ''}`}
                tooltipID={`UnitFrameClass_${this.props.entityID}`}
                classDef={this.props.defs.classesByNumericID[this.props.classID]}
                stringTable={this.props.stringTable}
              />
            )}
          </ContextMenuSource>
        </div>
        {this.props.children}
      </div>
    );
  }

  private getEntityContent(entity: PlayerEntityStateModel, name: string, faction: FactionDef): JSX.Element {
    const isFactionless = this.props.faction === Faction.Factionless;
    const factionData = getFactionData(faction.id);

    if (this.props.isSimple) {
      return this.getSimpleEntityContent(entity, name, factionData);
    }

    const health = this.props.resources[EntityResourceIDs.Health];
    const mana = this.props.resources[EntityResourceIDs.Mana];
    const focus = this.props.resources[EntityResourceIDs.Focus];
    const focusCharger = this.props.resources[EntityResourceIDs.FocusCharger];
    const courage = this.props.resources[EntityResourceIDs.Courage];
    const faith = this.props.resources[EntityResourceIDs.Faith];
    const determination = this.props.resources[EntityResourceIDs.Determination];
    const panic = this.props.resources[EntityResourceIDs.Panic];

    const healthRatio = health ? health.current / health.max : 0;
    const manaRatio = mana ? mana.current / mana.max : 0;
    const focusRatio = focus ? focus.current / focus.max : 0;
    let focusChargerRatio = focusCharger ? focusCharger.current / focusCharger.max : 0;
    // If focus is full, charger shows as full.
    if (focusRatio >= 1) focusChargerRatio = 1;
    const courageRatio = courage ? courage.current / courage.max : 0;
    const faithRatio = faith ? faith.current / faith.max : 0;
    const determinationRatio = determination ? determination.current / determination.max : 0;
    const panicRatio = panic ? panic.current / panic.max : 0;

    const isNPC = getIsEntityNPC(entity);
    const isRealmNPC = !isFactionless && isNPC;
    // For now, NPCs don't have a level to display (their icon occupies the level slot).
    let levelString: string = '';
    if (!isNPC && isEntityPlayer(entity) && entity.characterLevel != null) {
      levelString = (entity.characterLevel + 1).toFixed(0);
    }

    return (
      <>
        {/* Background */}
        <img
          className={FrameBackground}
          src={isRealmNPC ? factionData.universalUnitFrameBackgroundImage : factionData.unitFrameBackgroundImage}
        />
        {/* Middle */}
        <div className={PrimaryMiddle}>
          {/* Health bar */}
          {health && (
            <>
              {this.renderLockedHealth(health)}
              <img className={PrimaryMiddleBar} src={Health} style={{ width: `${healthRatio * 100}%` }} />
              {this.renderShield(health)}
              <div className={PrimaryResourceText}>
                {getTokenizedStringTableValue(StringIDUnitFrameResourceHealth, this.props.stringTable, {
                  CURRENT: printWithSeparator(
                    health.current,
                    getStringTableValue(StringIDGeneralComma, this.props.stringTable)
                  ),
                  MAX: printWithSeparator(health.max, getStringTableValue(StringIDGeneralComma, this.props.stringTable))
                })}
              </div>
              {healthRatio && (
                <div
                  className={`${Marker} ${MarkerHealth}`}
                  style={{
                    right: `calc(100% - ${healthRatio * 100}%)`
                  }}
                />
              )}
            </>
          )}
        </div>
        <div className={SecondaryMiddle}>
          {/* Courage bar */}
          {courage && (
            <>
              <img className={SecondaryMiddleBar} src={Courage} style={{ width: `${courageRatio * 100}%` }} />
              <div className={SecondaryResourceText}>
                {getTokenizedStringTableValue(StringIDUnitFrameResourceCourage, this.props.stringTable, {
                  CURRENT: printWithSeparator(
                    courage.current,
                    getStringTableValue(StringIDGeneralComma, this.props.stringTable)
                  ),
                  MAX: printWithSeparator(
                    courage.max,
                    getStringTableValue(StringIDGeneralComma, this.props.stringTable)
                  )
                })}
              </div>
              {courageRatio && (
                <div
                  className={`${Marker} ${MarkerCourage}`}
                  style={{ right: `calc(100% - ${courageRatio * 100}%)` }}
                />
              )}
            </>
          )}
          {/* Mana bar */}
          {mana && (
            <>
              <img className={SecondaryMiddleBar} src={Mana} style={{ width: `${manaRatio * 100}%` }} />
              <div className={SecondaryResourceText}>
                {getTokenizedStringTableValue(StringIDUnitFrameResourceMana, this.props.stringTable, {
                  CURRENT: printWithSeparator(
                    mana.current,
                    getStringTableValue(StringIDGeneralComma, this.props.stringTable)
                  ),
                  MAX: printWithSeparator(mana.max, getStringTableValue(StringIDGeneralComma, this.props.stringTable))
                })}
              </div>
              {manaRatio && (
                <div className={`${Marker} ${MarkerMana}`} style={{ right: `calc(100% - ${manaRatio * 100}%)` }} />
              )}
            </>
          )}
          {/* Focus bar */}
          {focus && (
            <>
              <img className={`${SecondaryMiddleBar} top`} src={Focus} style={{ width: `${focusRatio * 100}%` }} />
              <img
                className={`${SecondaryMiddleBar} bottom`}
                src={Focus}
                style={{ width: `${focusChargerRatio * 100}%` }}
              />
              {focusChargerRatio > 0 && (
                <div
                  className={`${Marker} ${MarkerFocus}`}
                  style={{ right: `calc(100% - ${focusChargerRatio * 100}%)` }}
                />
              )}
              <div className={SecondaryResourceText}>
                {getTokenizedStringTableValue(StringIDUnitFrameResourceFocus, this.props.stringTable, {
                  CURRENT: printWithSeparator(
                    focus.current,
                    getStringTableValue(StringIDGeneralComma, this.props.stringTable)
                  ),
                  MAX: printWithSeparator(focus.max, getStringTableValue(StringIDGeneralComma, this.props.stringTable))
                })}
              </div>
              {focusRatio && (
                <div className={`${Marker} ${MarkerFocus}`} style={{ right: `calc(100% - ${focusRatio * 100}%)` }} />
              )}
            </>
          )}
          {/* Faith bar */}
          {faith && (
            <>
              <img className={SecondaryMiddleBar} src={Faith} style={{ width: `${faithRatio * 100}%` }} />
              <div className={SecondaryResourceText}>
                {getTokenizedStringTableValue(StringIDUnitFrameResourceFaith, this.props.stringTable, {
                  CURRENT: printWithSeparator(
                    faith.current,
                    getStringTableValue(StringIDGeneralComma, this.props.stringTable)
                  ),
                  MAX: printWithSeparator(faith.max, getStringTableValue(StringIDGeneralComma, this.props.stringTable))
                })}
              </div>
              {faithRatio && (
                <div className={`${Marker} ${MarkerFaith}`} style={{ right: `calc(100% - ${faithRatio * 100}%)` }} />
              )}
            </>
          )}

          {/* Determination bar */}
          {determination && (
            <>
              <img
                className={SecondaryMiddleBar}
                src={Determination}
                style={{ width: `${determinationRatio * 100}%` }}
              />
              <div className={SecondaryResourceText}>
                {getTokenizedStringTableValue(StringIDUnitFrameResourceDetermination, this.props.stringTable, {
                  CURRENT: printWithSeparator(
                    determination.current,
                    getStringTableValue(StringIDGeneralComma, this.props.stringTable)
                  ),
                  MAX: printWithSeparator(
                    determination.max,
                    getStringTableValue(StringIDGeneralComma, this.props.stringTable)
                  )
                })}
              </div>
              {determinationRatio && (
                <div
                  className={`${Marker} ${MarkerDetermination}`}
                  style={{ right: `calc(100% - ${determinationRatio * 100}%)` }}
                />
              )}
            </>
          )}
        </div>
        <div className={PanicContainer}>
          <img className={PanicBar} style={{ width: `${panicRatio * 100}%` }} src={Panic} />
        </div>
        {/* Foreground */}
        <PlayerUnitFrameChrome
          isSimple={false}
          isParty={!!this.props.isParty}
          isLeader={this.props.isLeader}
          hasCompass={!!this.props.hasCompass}
          faction={this.props.faction}
          factionData={factionData}
          isFactionless={isFactionless}
          isNPC={isNPC}
          isRealmNPC={isRealmNPC}
          classID={this.props.classID}
          classDef={this.props.defs.classesByNumericID[this.props.classID!]}
          classIconSize={this.props.classIconSize}
          hasClassIcon={this.hasClassIcon()}
          name={name}
          levelString={levelString}
          npcTierIconSource={this.getNPCTierIconSource()}
        />
        {this.renderResourcePips(factionData)}
      </>
    );
  }

  private getNPCTierIconSource(): string {
    // We already know this is a "player", so the conversion should be reliable.
    switch (this.props.entity?.characterKind) {
      case CharacterKind.MinorNPC:
        return NPCTierIconMinor;
      case CharacterKind.EliteNPC:
        return NPCTierIconElite;
      case CharacterKind.StrongEliteNPC:
        return NPCTierIconStrongElite;
      case CharacterKind.UniqueNPC:
        return NPCTierIconUnique;
      case CharacterKind.MiniBossNPC:
        return NPCTierIconMiniboss;
      case CharacterKind.BossNPC:
        return NPCTierIconBoss;
    }

    // If unsure, give them the most basic icon.
    return NPCTierIconMinor;
  }

  private getSimpleEntityContent(entity: PlayerEntityStateModel, name: string, factionData: FactionData): JSX.Element {
    const isFactionless = this.props.faction === Faction.Factionless;
    const isNPC = getIsEntityNPC(entity);
    let levelString = '';
    if (!isNPC && isEntityPlayer(entity) && entity.characterLevel != null) {
      levelString = (entity.characterLevel + 1).toFixed(0);
    }
    const health = this.props.resources[EntityResourceIDs.Health];
    const mana = this.props.resources[EntityResourceIDs.Mana];
    const focus = this.props.resources[EntityResourceIDs.Focus];
    const focusCharger = this.props.resources[EntityResourceIDs.FocusCharger];
    const courage = this.props.resources[EntityResourceIDs.Courage];
    const faith = this.props.resources[EntityResourceIDs.Faith];
    const determination = this.props.resources[EntityResourceIDs.Determination];
    const panic = this.props.resources[EntityResourceIDs.Panic];

    const healthRatio = health ? health.current / health.max : 0;
    const manaRatio = mana ? mana.current / mana.max : 0;
    const focusRatio = focus ? focus.current / focus.max : 0;
    let focusChargerRatio = focusCharger ? focusCharger.current / focusCharger.max : 0;
    if (focusRatio >= 1) focusChargerRatio = 1;
    const courageRatio = courage ? courage.current / courage.max : 0;
    const faithRatio = faith ? faith.current / faith.max : 0;
    const determinationRatio = determination ? determination.current / determination.max : 0;
    const panicRatio = panic ? panic.current / panic.max : 0;

    const healthLabel = health ? `Health  ${Math.floor(health.current)} / ${Math.floor(health.max)}` : null;
    let secondaryLabel: string | null = null;
    if (courage) secondaryLabel = `Courage  ${Math.floor(courage.current)} / ${Math.floor(courage.max)}`;
    else if (mana) secondaryLabel = `Mana  ${Math.floor(mana.current)} / ${Math.floor(mana.max)}`;
    else if (focus) secondaryLabel = `Focus  ${Math.floor(focus.current)} / ${Math.floor(focus.max)}`;
    else if (faith) secondaryLabel = `Faith  ${Math.floor(faith.current)} / ${Math.floor(faith.max)}`;
    else if (determination)
      secondaryLabel = `Determination  ${Math.floor(determination.current)} / ${Math.floor(determination.max)}`;

    return (
      <>
        <img className={FrameBackground} src={factionData.simpleUnitFrameBackgroundImage} />
        <div className={SimplePrimaryMiddle}>
          {health && (
            <>
              {this.renderLockedHealth(health)}
              <img className={PrimaryMiddleBar} src={Health} style={{ width: `${healthRatio * 100}%` }} />
              {this.renderShield(health)}
              {healthRatio && (
                <div className={`${Marker} ${MarkerHealth}`} style={{ right: `calc(100% - ${healthRatio * 100}%)` }} />
              )}
            </>
          )}
          {healthLabel && <div className={SimplePrimaryResourceText}>{healthLabel}</div>}
        </div>
        <div className={SimpleSecondaryMiddle}>
          {courage && (
            <>
              <img className={SecondaryMiddleBar} src={Courage} style={{ width: `${courageRatio * 100}%` }} />
              {courageRatio > 0 && (
                <div
                  className={`${Marker} ${MarkerCourage}`}
                  style={{ right: `calc(100% - ${courageRatio * 100}%)` }}
                />
              )}
            </>
          )}
          {mana && (
            <>
              <img className={SecondaryMiddleBar} src={Mana} style={{ width: `${manaRatio * 100}%` }} />
              {manaRatio > 0 && (
                <div className={`${Marker} ${MarkerMana}`} style={{ right: `calc(100% - ${manaRatio * 100}%)` }} />
              )}
            </>
          )}
          {focus && (
            <>
              <img className={`${SecondaryMiddleBar} top`} src={Focus} style={{ width: `${focusRatio * 100}%` }} />
              {focusRatio > 0 && (
                <div className={`${Marker} ${MarkerFocus}`} style={{ right: `calc(100% - ${focusRatio * 100}%)` }} />
              )}
              <img
                className={`${SecondaryMiddleBar} bottom`}
                src={Focus}
                style={{ width: `${focusChargerRatio * 100}%` }}
              />
              {focusChargerRatio > 0 && (
                <div
                  className={`${Marker} ${MarkerFocus}`}
                  style={{ right: `calc(100% - ${focusChargerRatio * 100}%)` }}
                />
              )}
            </>
          )}
          {faith && (
            <>
              <img className={SecondaryMiddleBar} src={Faith} style={{ width: `${faithRatio * 100}%` }} />
              {faithRatio > 0 && (
                <div className={`${Marker} ${MarkerFaith}`} style={{ right: `calc(100% - ${faithRatio * 100}%)` }} />
              )}
            </>
          )}
          {determination && (
            <>
              <img
                className={SecondaryMiddleBar}
                src={Determination}
                style={{ width: `${determinationRatio * 100}%` }}
              />
              {determinationRatio > 0 && (
                <div
                  className={`${Marker} ${MarkerDetermination}`}
                  style={{ right: `calc(100% - ${determinationRatio * 100}%)` }}
                />
              )}
            </>
          )}
          {secondaryLabel && <div className={SimpleSecondaryResourceText}>{secondaryLabel}</div>}
        </div>
        <PlayerUnitFrameChrome
          isSimple={true}
          isParty={!!this.props.isParty}
          isLeader={this.props.isLeader}
          hasCompass={!!this.props.hasCompass}
          faction={this.props.faction}
          factionData={factionData}
          isFactionless={isFactionless}
          isNPC={isNPC}
          isRealmNPC={!isFactionless && isNPC}
          classID={this.props.classID}
          classDef={this.props.defs.classesByNumericID[this.props.classID!]}
          classIconSize={this.props.classIconSize}
          hasClassIcon={this.hasClassIcon()}
          name={name}
          levelString={levelString}
          npcTierIconSource={this.getNPCTierIconSource()}
        />
        {panic && (
          <div className={SimplePanicContainer}>
            <img className={SimplePanicBar} style={{ height: `${panicRatio * 100}%` }} src={Panic} />
          </div>
        )}
        <div className={SimpleNameForeground}>
          {levelString ? (
            <>
              [<span className={SimpleLevelNumber}>{levelString}</span>] <span className={SimpleNameText}>{name}</span>
            </>
          ) : (
            name
          )}
        </div>
        {this.renderResourcePips(factionData)}
      </>
    );
  }

  private getOutOfZoneContent(name: string, faction: FactionDef, isSimple?: boolean): JSX.Element {
    const factionData = getFactionData(faction.id);
    const bgImage = isSimple ? factionData.simpleUnitFrameBackgroundImage : factionData.unitFrameBackgroundImage;
    const fgImage = isSimple
      ? !this.props.isParty
        ? factionData.simpleUnitFrameForegroundImage
        : this.props.isLeader
        ? factionData.simpleUnitFrameForegroundPartyLeaderImage
        : factionData.simpleUnitFrameForegroundPartyMemberImage
      : !this.props.isParty
      ? this.props.hasCompass && factionData.unitFrameForegroundTargetImage
        ? factionData.unitFrameForegroundTargetImage
        : factionData.unitFrameForegroundImage
      : this.props.isLeader
      ? factionData.unitFrameForegroundPartyLeaderImage
      : factionData.unitFrameForegroundPartyMemberImage;
    return (
      <>
        <img className={FrameBackground} src={bgImage} />
        {this.props.isParty && this.props.classID && (
          <img className={ClassIcon} src={this.props.defs.classesByNumericID[this.props.classID].unitFrameIconImage} />
        )}
        <img className={FrameForeground} src={fgImage} />
        <div className={LevelForeground} />
        <div className={NameForeground}>{name}</div>
      </>
    );
  }

  private getContextMenuParams(): ContextMenuParams | undefined {
    const content = this.props.contextMenu;
    if (content && content.length > 0) {
      const params: ContextMenuParams = {
        id: `UnitFrame_${this.props.entityID}_${this.props.isParty}`,
        content
      };
      return params;
    } else {
      // If no content, then no context menu will appear.
      return undefined;
    }
  }

  private renderLockedHealth(health: EntityResource): JSX.Element | null {
    const lockedHealthRatio = getLockedResourceRatio(health);
    if (lockedHealthRatio <= 0) return null;

    return (
      <>
        <img className={LockedHealthBar} src={LockedHealth} style={{ width: `${lockedHealthRatio * 100}%` }} />
        <div className={`${Marker} ${MarkerLockedHealth}`} style={{ left: `${(1 - lockedHealthRatio) * 100}%` }} />
      </>
    );
  }

  private renderShield(health: EntityResource): JSX.Element | null {
    const shield = this.props.resources[EntityResourceIDs.Shield];
    if (!shield) return null;

    const shieldRatio = getShieldRatio(shield, health);
    if (shieldRatio <= 0) return null;

    return (
      <>
        <img className={ShieldBar} src={Shield} style={{ width: `${shieldRatio * 100}%` }} />
        <div className={`${Marker} ${MarkerShield}`} style={{ right: `${(1 - shieldRatio) * 100}%` }} />
      </>
    );
  }

  private renderResourcePips(factionData: FactionData): JSX.Element {
    const determination = this.props.resources[EntityResourceIDs.Determination];
    const judgement = this.props.resources[EntityResourceIDs.Judgement];

    return (
      <>
        {determination && (
          <div className={ResourcePips}>
            {DETERMINATION_PIP_STACK_THRESHOLDS.map((threshold, i) =>
              this.renderResourcePip(i, this.props.determinationStacks >= threshold, DeterminationPipFull, factionData)
            )}
          </div>
        )}
        {judgement && (
          <div className={ResourcePips}>
            {Array.from({ length: judgement.max }, (_, i) =>
              this.renderResourcePip(i, judgement.current >= i + 1, JudgementPipFull, factionData)
            )}
          </div>
        )}
      </>
    );
  }

  private renderResourcePip(
    pipIndex: number,
    isFull: boolean,
    fillImage: string,
    factionData: FactionData
  ): JSX.Element {
    return (
      <div key={pipIndex} className={ResourcePip}>
        <div className={ResourcePipContent}>
          <img className={ResourcePipBackground} src={factionData.unitFrameResourcePipBackground} />
          <img className={`${ResourcePipFill}${isFull ? ' full' : ''}`} src={fillImage} />
        </div>
      </div>
    );
  }

  // The fancy party layout draws its class icon outside the slot the other layouts share, so it doesn't count.
  private hasClassIcon(): boolean {
    const classDef = this.props.defs.classesByNumericID[this.props.classID];
    return (
      (this.props.isSimple || !this.props.isParty) &&
      !getIsEntityNPC(this.props.entity) &&
      !!this.props.classID &&
      !!classDef?.unitFrameIconImage
    );
  }
}

function mapStateToProps(state: RootState, ownProps: ReactProps): Props {
  const { stringTable } = state.stringTable;
  const rawEntity = state.entities.entities[ownProps.entityID];
  const determinationBuffNumericId = state.gameDefs.statusesByStringID?.[DETERMINATION_BUFF_STRING_ID]?.numericID;
  const determinationStacks =
    state.entities.entityStatusInstanceCounts[ownProps.entityID]?.[determinationBuffNumericId] ?? 0;

  return {
    ...ownProps,
    defs: state.gameDefs,
    friendlyTargetType: state.entities.friendlyTarget?.type ?? null,
    entity: isEntityPlayer(rawEntity) ? rawEntity : undefined,
    statusInstanceCounts: state.entities.entityStatusInstanceCounts[rawEntity?.entityID] ?? {},
    resources: state.entities.entityResources[rawEntity?.entityID] ?? {},
    stringTable,
    determinationStacks,
    classIconSize: getClassIconSize(state.hud.vminPx)
  };
}

export default connect(mapStateToProps)(PlayerUnitFrame);

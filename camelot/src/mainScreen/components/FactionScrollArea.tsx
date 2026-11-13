/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Dispatch } from '@reduxjs/toolkit';
import * as React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../redux/store';
import { getFactionData } from '../gameData/factionData';
import { genID } from '@csegames/library/dist/_baseGame/utils/idGen';
import { BorderBackground, BorderType, FactionBorder } from './FactionBorder';
import { SoundEvents } from '@csegames/library/dist/camelotunchained/game/types/SoundEvents';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';

const Root = 'HUD-FactionScrollArea-Root';
const Wrapper = 'HUD-FactionScrollArea-Wrapper';
const BarTrack = 'HUD-FactionScrollArea-BarTrack';
const BorderOverlay = 'HUD-FactionScrollArea-BorderOverlay';

const LONG_ASPECT_RATIO = 512 / 64;
const SHORT_ASPECT_RATIO = 98 / 32;
const THUMB_POSITION_STEPS = 1000;
const TRACK_WIDTH_RATIO = 0.28;
const TRACK_INSET_RATIO = (1 - TRACK_WIDTH_RATIO) / 2;

interface State {
  id: string;
  height: number;
  contentHeight: number;
}

interface ReactProps extends React.HTMLAttributes<HTMLDivElement> {
  contentClassName?: string;
  factionIDOverride?: string;
  scrollbarWidth?: string;
  topFadeAmount?: string;
  bottomFadeAmount?: string;
  useSmallThumb?: boolean;
  barOnLeft?: boolean;
  hideTrack?: boolean;
  showEmptyTrack?: boolean;
  borderType?: BorderType;
  background?: BorderBackground;
  soundEventScrolled?: SoundEvents;
  scrollRef?: (node: HTMLDivElement) => void;
}

interface InjectedProps {
  uiFactionID: string;
  dispatch?: Dispatch;
}

type Props = ReactProps & InjectedProps;

class AFactionScrollArea extends React.Component<Props, State> {
  private rootElement: HTMLDivElement | null = null;
  private wrapperRef = React.createRef<HTMLDivElement>();
  private contentRef = React.createRef<HTMLDivElement>();
  private thumbPositionStyleRef = React.createRef<HTMLStyleElement>();
  private thumbPositionStep: number = 0;

  constructor(props: Props) {
    super(props);

    this.state = {
      id: genID(),
      height: -1,
      contentHeight: -1
    };
  }

  render(): JSX.Element {
    const {
      contentClassName,
      topFadeAmount,
      bottomFadeAmount,
      scrollbarWidth,
      dispatch,
      className,
      useSmallThumb,
      barOnLeft,
      uiFactionID,
      factionIDOverride,
      hideTrack,
      showEmptyTrack,
      borderType,
      background,
      scrollRef,
      style,
      soundEventScrolled,
      onScroll,
      ...otherProps
    } = this.props;
    const finalScrollbarWidth = this.props.scrollbarWidth ?? '2.5vmin';
    const thumbHeight = `calc(${finalScrollbarWidth} * ${useSmallThumb ? SHORT_ASPECT_RATIO : LONG_ASPECT_RATIO})`;

    const factionData = getFactionData(this.props.uiFactionID);

    const isThumbShown = this.state.height < this.state.contentHeight;

    const topFade = topFadeAmount ?? '0%';
    const bottomFade = `calc(100% - ${bottomFadeAmount ?? '0%'})`;

    const finalStyle: React.CSSProperties = {
      ...(style ?? {}),
      maskImage: `linear-gradient(to bottom, transparent, black ${topFade}, black ${bottomFade}, transparent)`,
      WebkitMaskImage: `linear-gradient(to bottom, transparent, black ${topFade}, black ${bottomFade}, transparent)`
    };

    return (
      <div
        className={`${Root} ${className ?? ''}${barOnLeft ? ' barOnLeft' : ''}`}
        style={finalStyle}
        {...otherProps}
        ref={this.boundSetRootRef}
      >
        {((!hideTrack && isThumbShown) || (!hideTrack && !isThumbShown && showEmptyTrack)) && (
          <div
            className={BarTrack}
            style={{
              borderColor: factionData.borderColor,
              right: barOnLeft ? undefined : `calc(${finalScrollbarWidth} * ${TRACK_INSET_RATIO})`,
              left: barOnLeft ? `calc(${finalScrollbarWidth} * ${TRACK_INSET_RATIO})` : undefined,
              width: `calc(${finalScrollbarWidth} * ${TRACK_WIDTH_RATIO})`,
              borderRadius: `calc(${finalScrollbarWidth} * ${TRACK_WIDTH_RATIO / 2})`
            }}
          />
        )}
        {background && (
          <FactionBorder
            type={BorderType.None}
            background={background}
            className={BorderOverlay}
            style={{
              width: `calc(100% - ${finalScrollbarWidth})`,
              right: barOnLeft ? undefined : finalScrollbarWidth,
              left: barOnLeft ? finalScrollbarWidth : undefined
            }}
          />
        )}
        <div
          className={`${Wrapper} ${contentClassName ?? ''}`}
          id={this.state.id}
          ref={this.wrapperRef}
          onScroll={(e) => {
            this.updateThumbPosition();
            if (soundEventScrolled) {
              clientAPI.playGameSound(soundEventScrolled);
            }
            onScroll?.(e);
          }}
          onTransitionEnd={() => this.measureHeights()}
        >
          <style>{`${this.getThumbSelector()} { background-image: url(${
            useSmallThumb ? factionData.scrollbarShortImage : factionData.scrollbarImage
          }); height: ${thumbHeight} }`}</style>
          <style>{`#${this.state.id}::-webkit-scrollbar { width: ${finalScrollbarWidth}; }`}</style>
          <style ref={this.thumbPositionStyleRef} />
          <div style={barOnLeft ? { direction: 'ltr' } : {}} ref={this.contentRef}>
            {this.props.children}
          </div>
        </div>
        {borderType && (
          <FactionBorder
            type={borderType}
            className={BorderOverlay}
            style={{
              width: `calc(100% - ${finalScrollbarWidth})`,
              right: barOnLeft ? undefined : finalScrollbarWidth,
              left: barOnLeft ? finalScrollbarWidth : undefined
            }}
          />
        )}
      </div>
    );
  }

  componentDidMount(): void {
    this.measureHeights();
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>): void {
    this.measureHeights();
    if (prevState.height !== this.state.height || prevState.contentHeight !== this.state.contentHeight) {
      this.updateThumbPosition();
    }
  }

  // Also runs on transitionend, since content can resize through a CSS transition (e.g. FactionAccordion)
  // without this component re-rendering.
  private measureHeights(): void {
    const content = this.contentRef.current;
    if (!this.rootElement || !content) {
      return;
    }

    const height = this.rootElement.offsetHeight;
    const contentHeight = content.offsetHeight;
    if (height !== this.state.height || contentHeight !== this.state.contentHeight) {
      this.setState({ height, contentHeight });
    }
  }

  private getThumbSelector(): string {
    return `#${this.state.id}::-webkit-scrollbar-thumb`;
  }

  // The engine sizes the thumb by the visible fraction, so the art is placed inside it by scroll fraction to keep
  // it at the track ends.
  private updateThumbPosition(): void {
    const wrapper = this.wrapperRef.current;
    const thumbPositionStyle = this.thumbPositionStyleRef.current;
    if (!wrapper || !thumbPositionStyle) {
      return;
    }

    const maxScroll = wrapper.scrollHeight - wrapper.clientHeight;
    const step = maxScroll > 0 ? Math.round((wrapper.scrollTop / maxScroll) * THUMB_POSITION_STEPS) : 0;
    if (step !== this.thumbPositionStep) {
      this.thumbPositionStep = step;
      thumbPositionStyle.textContent = `${this.getThumbSelector()} { background-position: center ${
        (step * 100) / THUMB_POSITION_STEPS
      }%; }`;
    }
  }

  // A pre-bound ref function won't trigger unnecessary re-renders.
  private boundSetRootRef = this.setRootRef.bind(this);
  private setRootRef(r: HTMLDivElement): void {
    this.rootElement = r;
    // If an external ref was requested, pass it out.
    this.props.scrollRef?.(r);
  }
}

const mapStateToProps = (state: RootState, ownProps: ReactProps): Props => {
  return {
    ...ownProps,
    uiFactionID: ownProps.factionIDOverride ?? state.hud.uiFactionID
  };
};

export const FactionScrollArea = connect(mapStateToProps)(AFactionScrollArea);

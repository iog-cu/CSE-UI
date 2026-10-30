/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import * as React from 'react';
import { connect } from 'react-redux';
import { HUDLayer, HUDWidget, HUDWidgetRegistration } from '../../redux/hudSlice';
import { AddDispatch, RootState } from '../../redux/store';
import { ListenerHandle } from '@csegames/library/dist/_baseGame/listenerHandle';
import { HUDHorizontalAnchor, HUDVerticalAnchor } from '@csegames/library/dist/camelotunchained/game/types/HUDTypes';
import { ChatScope, ChatScopes, ChatTab } from '@csegames/library/dist/camelotunchained/game/types/ChatTypes';
import { getStringTableValue } from '../../helpers/stringTableHelpers';
import { StringTable } from '../../dataSources/manifest/stringTableManifest';
import { clientAPI } from '@csegames/library/dist/camelotunchained/MainScreenClientAPI';
import { getFactionData } from '../../gameData/factionData';
import { FactionBorder, BorderType, BorderBackground } from '../FactionBorder';
import { FactionScrollArea } from '../FactionScrollArea';
import { handleHUDWidgetResizeEvent } from '../BaseHUDWidget';
import { ChatLine } from './ChatLine';
import { chatHistory } from './ChatHistory';
import { allChatScopeDisplayData } from './ChatScopes';
import { chatService } from './ChatSetup';
import { ChatLineSimple } from './lines/ChatLineSimple';
import { ChatInput } from './ChatInput';
import { ChatTabs } from './ChatTabs';
import Escapable from '../Escapable';

// CSS classes
const Root = 'HUD-Chat-Root';
const RootActive = 'HUD-Chat-RootActive';
const MainBorder = 'HUD-Chat-MainBorder';
const Content = 'HUD-Chat-Content';
const MessagesScrollArea = 'HUD-Chat-MessagesScrollArea';
const MessagesScrollAreaUnseen = 'HUD-Chat-MessagesScrollArea-Unseen';
const Messages = 'HUD-Chat-Messages';

// String IDs
const StringIDChatRoomNotFound = 'ChatRoomNotFound';

interface ReactProps {
  isDragCopy: boolean;
}

interface InjectedProps {
  stringTable: StringTable;
  widgets: Record<string, HUDWidget>;
  vminPx: number;
  uiFactionID: string;
}

type Props = ReactProps & InjectedProps & AddDispatch;

// TODO : maintain array of prefiltered (by current tab), prerendered chat lines for faster display calculation
interface State {
  chatLines: ChatLine[];
  currentTab: ChatTab;
  isActive: boolean;
  hasUnseenMessages: boolean;
  pendingWhisperTarget?: string; // Character name to start a whisper to; applied by ChatInput.
}

interface Snapshot {
  shouldScroll: boolean;
}

class AChat extends React.Component<Props, State, Snapshot> {
  private rootRef: HTMLDivElement | null = null;
  private messagesEndRef: HTMLDivElement | null = null;
  private chatHistoryHandle: ListenerHandle | null = null;
  private isScrolledToBottom: boolean = true;

  constructor(props: Props) {
    super(props);
    this.state = {
      chatLines: chatHistory.chatLines,
      currentTab: clientAPI.getChatTabs()[0],
      isActive: false,
      hasUnseenMessages: false
    };

    // We expose this as a static function so we can trigger whispers from unit frames and context menus.
    // The HUD editor's drag copy must not take it over, or it would point at that copy after the drag ends.
    if (!props.isDragCopy) {
      Chat.requestWhisper = this.startWhisper.bind(this);
    }
  }

  // Opens the chat input in whisper mode for the given player (used by left-clicking a chat name).
  private startWhisper(name: string): void {
    this.setState({ pendingWhisperTarget: name, isActive: true });
  }

  render(): React.ReactNode {
    const selfWidget = this.props.widgets[WIDGET_ID_CHAT];
    const chatFontSize = (selfWidget?.state?.chatFontSize ?? 100) / 100;
    const { isActive } = this.state;

    return (
      <div
        className={isActive ? `${Root} ${RootActive}` : Root}
        onClick={() => this.setState({ isActive: true })}
        ref={this.setRootRef.bind(this)}
      >
        <ChatTabs
          isActive={isActive}
          setActive={(isActive: boolean) => this.setState({ isActive })}
          onTabChanged={(tab: ChatTab) => this.setState({ currentTab: tab })}
        />
        <FactionBorder
          className={MainBorder}
          type={BorderType.Primary}
          background={BorderBackground.PatternLarge}
          resizing={{
            onSizeChanged: (dt: number, dr: number, db: number, dl: number) =>
              handleHUDWidgetResizeEvent(selfWidget, false, this.props.vminPx, this.props.dispatch, dt, dr, db, dl),
            onSizeFinalized: (dt: number, dr: number, db: number, dl: number) =>
              handleHUDWidgetResizeEvent(selfWidget, true, this.props.vminPx, this.props.dispatch, dt, dr, db, dl)
          }}
        >
          <div className={Content}>
            <FactionScrollArea
              className={`${MessagesScrollArea}${this.state.hasUnseenMessages ? ` ${MessagesScrollAreaUnseen}` : ''}`}
              borderType={BorderType.Secondary}
              background={BorderBackground.Darken}
              scrollbarWidth={'1.5vmin'}
              useSmallThumb
              barOnLeft
              showEmptyTrack
              onScroll={this.handleMessagesScroll.bind(this)}
              style={
                {
                  '--chat-glow-color': getFactionData(this.props.uiFactionID).selectionGlowColor
                } as React.CSSProperties
              }
            >
              <div className={Messages} style={{ fontSize: `${chatFontSize}rem` }}>
                {this.renderChatLines()}
                <div ref={this.setMessagesRef.bind(this)} />
              </div>
            </FactionScrollArea>
            <ChatInput
              isActive={isActive}
              setActive={(isActive: boolean) => this.setState({ isActive })}
              getResponseTarget={() => chatHistory.lastWhisperSenderName}
              sendMessage={this.sendMessage.bind(this)}
              whisperTargetRequest={this.state.pendingWhisperTarget}
              onWhisperTargetConsumed={() => this.setState({ pendingWhisperTarget: undefined })}
              chatFontSize={chatFontSize}
            />
          </div>
        </FactionBorder>
        {isActive && !this.props.isDragCopy && (
          <Escapable escapeID='WIDGET_ID_CHAT' onEscape={() => this.setState({ isActive: false })} />
        )}
      </div>
    );
  }

  setRootRef(ref: HTMLDivElement | null): void {
    this.rootRef = ref;
  }

  setMessagesRef(ref: HTMLDivElement | null): void {
    this.messagesEndRef = ref;
  }

  componentDidMount(): void {
    this.chatHistoryHandle = chatHistory.addListener(() => this.setState({ chatLines: chatHistory.chatLines }));
    // Catch any line logged between the constructor and subscribing.
    if (this.state.chatLines !== chatHistory.chatLines) {
      this.setState({ chatLines: chatHistory.chatLines });
    }
    window.addEventListener('click', this.handleWindowClick);
    this.messagesEndRef?.scrollIntoView();
  }

  componentWillUnmount(): void {
    window.removeEventListener('click', this.handleWindowClick);
    this.chatHistoryHandle?.close();
    this.chatHistoryHandle = null;
  }

  getSnapshotBeforeUpdate(): Snapshot | null {
    return { shouldScroll: this.isScrolledToBottom };
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot: Snapshot): void {
    if (prevState.chatLines !== this.state.chatLines) {
      if (snapshot.shouldScroll) {
        this.messagesEndRef?.scrollIntoView();
      } else {
        this.setState({ hasUnseenMessages: true });
      }
    }

    if (this.state.currentTab !== prevState.currentTab) {
      this.messagesEndRef?.scrollIntoView();
    }
  }

  private handleMessagesScroll(e: React.UIEvent<HTMLDivElement>): void {
    const el = e.currentTarget;
    this.isScrolledToBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    if (this.isScrolledToBottom && this.state.hasUnseenMessages) {
      this.setState({ hasUnseenMessages: false });
    }
  }

  // Arrow property so addEventListener and removeEventListener get the same reference.
  private handleWindowClick = (e: MouseEvent): void => {
    if (this.state.isActive && !(e.target instanceof HTMLElement && this.rootRef?.contains(e.target))) {
      this.setState({ isActive: false });
    }
  };

  private renderChatLines(): React.ReactNode {
    const scopes = this.state.currentTab.scopes;
    if (!scopes) return null;

    const activeScopes = new Set(scopes);
    const elements = [];

    for (const line of this.state.chatLines) {
      if (!activeScopes.has(line.scope)) continue;
      elements.push(line.render());
    }
    return elements;
  }

  private sendMessage(scope: ChatScope, text: string, whisperTarget?: string): void {
    const room = chatService.rooms.find((r) => r.scope === scope);
    if (!room || (scope == ChatScopes.Whisper && !whisperTarget)) {
      chatHistory.addLine(
        new ChatLineSimple(
          ChatScopes.Error,
          getStringTableValue(
            allChatScopeDisplayData[scope]?.missingStringID ?? StringIDChatRoomNotFound,
            this.props.stringTable
          )
        )
      );
      return;
    }

    if (scope == ChatScopes.Whisper) {
      chatService.sendWhisper(whisperTarget!, text);
    } else {
      chatService.sendMessage(room, text);
    }
  }

  public static requestWhisper: (name: string) => void = (name: string) => {
    // Until Chat is initialized, we use a no-op function.
  };
}

const mapStateToProps = (state: RootState, ownProps: ReactProps): ReactProps & InjectedProps => {
  const { widgets, vminPx, uiFactionID } = state.hud;
  return {
    ...ownProps,
    stringTable: state.stringTable.stringTable,
    widgets,
    vminPx,
    uiFactionID
  };
};

export const Chat = connect(mapStateToProps)(AChat);

export const WIDGET_ID_CHAT = 'Chat';
export const chatRegistry: HUDWidgetRegistration = {
  id: WIDGET_ID_CHAT,
  nameStringID: 'HUDEditorWidgetNameChat',
  defaults: {
    xAnchor: HUDHorizontalAnchor.Left,
    yAnchor: HUDVerticalAnchor.Bottom,
    xOffset: 1,
    yOffset: 1,
    resizable: {
      widthVmin: 37.5,
      heightVmin: 21.5,
      minWidthVmin: 37.5,
      minHeightVmin: 21.5,
      isMaximized: false
    }
  },
  requiresGameDefsLoaded: true,
  layer: HUDLayer.HUD,
  render: (isDragCopy: boolean) => {
    return <Chat isDragCopy={isDragCopy} />;
  }
};

import * as React from 'react';
import { AddDispatch, AppDispatch, RootState } from '../../redux/store';
import { connect } from 'react-redux';
import { StringTableEntryDef } from '../../dataSources/manifest/stringTableManifest';
import { TextInput, TextInputType } from '../input/TextInput';
import { FactionButton } from '../FactionButton';
import {
  getStringTableValue,
  getStringTableValueOrFallback,
  getTokenizedStringTableValue,
  StringIDGeneralCancel
} from '../../helpers/stringTableHelpers';
import { StringIDGeneralConfirm } from '../../helpers/stringTableHelpers';
import { hideModal, hideModalById, showModal } from '../../redux/modalsSlice';
import { callCreateFriendInvite } from '../../helpers/rest/friendsRestCalls';
import { callSocialSetUserPermissions } from '../../helpers/rest/socialRestCalls';
import { getCallErrorText } from '../../helpers/errorConversionHelpers';
import { UserInteractions } from '@csegames/library/dist/camelotunchained/webAPI/definitions';

// CSS classes
const Root = 'HUD-AddFriendFoeDialog-Root';
const NameInputContainer = 'HUD-AddFriendFoeDialog-NameInputContainer';
const NameCharacterInput = 'HUD-AddFriendFoeDialog-NameCharacterInput';
const InputStatus = 'HUD-AddFriendFoeDialog-InputStatus';
const ButtonSection = 'HUD-AddFriendFoeDialog-ButtonSection';
const ActionButton = 'HUD-AddFriendFoeDialog-ActionButton';

// String IDs
export const StringIDFriendFoeAddFriendToList = 'FriendFoeAddFriendToList';
const StringIDFriendFoeAddFoeToList = 'FriendFoeAddFoeToList';
const StringIDFriendFoeInvitationSent = 'FriendFoeInvitationSent';
const StringIDFriendFoePlayerBlocked = 'FriendFoePlayerBlocked';
const StringIDFriendFoeInvitationFailed = 'FriendFoeInvitationFailed';
const StringIDFriendFoeBlockFailed = 'FriendFoeBlockFailed';

const ModalIDAddFriendFoe = 'AddFriendFoe';
const SENT_MESSAGE_DURATION_MS = 1000;

type SendStatus = 'idle' | 'sending' | 'sent' | 'failed';

interface State {
  inputValue: string;
  sendStatus: SendStatus;
  errorText: string;
}

interface AddFriendFoeDialogProps {
  isFoe?: boolean;
  initialName?: string;
  onAdded?: () => void;
}

interface InjectedProps {
  stringTable: Record<string, StringTableEntryDef>;
  minCharacterNameLength: number;
}

type Props = AddFriendFoeDialogProps & InjectedProps & AddDispatch;

class AAddFriendFoeDialog extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      inputValue: props.initialName ?? '',
      sendStatus: 'idle',
      errorText: ''
    };
  }

  render(): React.ReactNode {
    return (
      <div className={Root}>
        <TextInput
          type={TextInputType.General}
          className={NameInputContainer}
          inputClassName={NameCharacterInput}
          value={this.state.inputValue}
          setValue={(value: string) => {
            this.setState({ inputValue: value });
          }}
        />

        <div className={`${InputStatus}${this.state.sendStatus === 'failed' ? ' error' : ''}`}>
          {this.getStatusText()}
        </div>

        <div className={ButtonSection}>
          <FactionButton
            className={ActionButton}
            onClick={this.onAddClicked.bind(this)}
            disabled={
              this.state.sendStatus === 'sending' ||
              this.state.sendStatus === 'sent' ||
              this.state.inputValue.trim().length < this.props.minCharacterNameLength
            }
          >
            {getStringTableValue(StringIDGeneralConfirm, this.props.stringTable)}
          </FactionButton>
          <FactionButton className={ActionButton} onClick={this.onCancelClicked.bind(this)}>
            {getStringTableValue(StringIDGeneralCancel, this.props.stringTable)}
          </FactionButton>
        </div>
      </div>
    );
  }

  private getStatusText(): string {
    switch (this.state.sendStatus) {
      case 'sent': {
        return getTokenizedStringTableValue(
          this.props.isFoe ? StringIDFriendFoePlayerBlocked : StringIDFriendFoeInvitationSent,
          this.props.stringTable,
          { NAME: this.state.inputValue.trim() }
        );
      }
      case 'failed': {
        return this.state.errorText;
      }
      default: {
        return '';
      }
    }
  }

  private async onAddClicked(): Promise<void> {
    const name = this.state.inputValue.trim();
    this.setState({ sendStatus: 'sending' });

    const result = this.props.isFoe
      ? await this.props.dispatch(
          callSocialSetUserPermissions({ allowed: UserInteractions.None, blocked: UserInteractions.All, name })
        )
      : await this.props.dispatch(callCreateFriendInvite({ name }));

    if (result.meta.requestStatus !== 'fulfilled') {
      const fallbackText = this.props.isFoe
        ? getStringTableValueOrFallback(
            StringIDFriendFoeBlockFailed,
            this.props.stringTable,
            'Unable to block that player.'
          )
        : getStringTableValueOrFallback(
            StringIDFriendFoeInvitationFailed,
            this.props.stringTable,
            'Unable to send the invitation.'
          );
      this.setState({
        sendStatus: 'failed',
        errorText: getCallErrorText(result.payload, this.props.stringTable, fallbackText)
      });
      return;
    }

    this.setState({ sendStatus: 'sent' });
    window.setTimeout(() => {
      // By ID, since the player may have already closed the modal themselves.
      this.props.dispatch(hideModalById(ModalIDAddFriendFoe));
      this.props.onAdded?.();
    }, SENT_MESSAGE_DURATION_MS);
  }

  private onCancelClicked(): void {
    this.props.dispatch(hideModal());
  }
}

const mapStateToProps = (
  state: RootState,
  ownProps: AddFriendFoeDialogProps
): AddFriendFoeDialogProps & InjectedProps => {
  return {
    ...ownProps,
    stringTable: state.stringTable.stringTable,
    minCharacterNameLength: state.gameDefs.settings?.minCharacterNameLength ?? 3
  };
};

const AddFriendFoeDialog = connect(mapStateToProps)(AAddFriendFoeDialog);

export function showAddFriendFoeModal(
  dispatch: AppDispatch,
  stringTable: Record<string, StringTableEntryDef>,
  dialogProps: AddFriendFoeDialogProps
): void {
  dispatch(
    showModal({
      id: ModalIDAddFriendFoe,
      content: {
        title: getStringTableValue(
          dialogProps.isFoe ? StringIDFriendFoeAddFoeToList : StringIDFriendFoeAddFriendToList,
          stringTable
        ),
        message: '',
        body: <AddFriendFoeDialog {...dialogProps} />,
        buttons: null
      },
      escapable: true
    })
  );
}

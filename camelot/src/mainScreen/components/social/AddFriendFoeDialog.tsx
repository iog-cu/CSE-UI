import * as React from 'react';
import { AddDispatch, RootState } from '../../redux/store';
import { connect } from 'react-redux';
import { StringTableEntryDef } from '../../dataSources/manifest/stringTableManifest';
import { TextInput, TextInputType } from '../input/TextInput';
import { FactionButton } from '../FactionButton';
import {
  getStringTableValue,
  getTokenizedStringTableValue,
  StringIDGeneralCancel
} from '../../helpers/stringTableHelpers';
import { StringIDGeneralConfirm } from '../../helpers/stringTableHelpers';
import { hideModal } from '../../redux/modalsSlice';
import { callCreateFriendInvite } from '../../helpers/rest/friendsRestCalls';
import { callSocialSetUserPermissions, SocialSetUserPermissionsParams } from '../../helpers/rest/socialRestCalls';
import { UserInteractions } from '@csegames/library/dist/camelotunchained/webAPI/definitions';

// CSS classes
const Root = 'HUD-AddFriendFoeDialog-Root';
const NameInputContainer = 'HUD-AddFriendFoeDialog-NameInputContainer';
const NameCharacterInput = 'HUD-AddFriendFoeDialog-NameCharacterInput';
const InputStatus = 'HUD-AddFriendFoeDialog-InputStatus';
const ButtonSection = 'HUD-AddFriendFoeDialog-ButtonSection';
const ActionButton = 'HUD-AddFriendFoeDialog-ActionButton';

// String IDs
const StringIDFriendFoeInvitationSent = 'FriendFoeInvitationSent';
const StringIDFriendFoePlayerBlocked = 'FriendFoePlayerBlocked';

interface State {
  inputValue: string;
  lastInput: string;
}

interface ReactProps {
  isFoe?: boolean;
}

interface InjectedProps {
  stringTable: Record<string, StringTableEntryDef>;
  minCharacterNameLength: number;
}

type Props = ReactProps & InjectedProps & AddDispatch;

class AAddFriendFoeDialog extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      inputValue: '',
      lastInput: ''
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

        <div className={InputStatus}>
          {this.state.lastInput.length > 0
            ? getTokenizedStringTableValue(
                this.props.isFoe ? StringIDFriendFoePlayerBlocked : StringIDFriendFoeInvitationSent,
                this.props.stringTable,
                {
                  NAME: this.state.lastInput
                }
              )
            : ''}
        </div>

        <div className={ButtonSection}>
          <FactionButton
            className={ActionButton}
            onClick={this.onAddClicked.bind(this)}
            disabled={this.state.inputValue.trim().length < this.props.minCharacterNameLength}
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

  private onAddClicked(): void {
    const name = this.state.inputValue.trim();

    if (this.props.isFoe) {
      const perms: SocialSetUserPermissionsParams = {
        allowed: UserInteractions.None,
        blocked: UserInteractions.All,
        name
      };
      this.props.dispatch(callSocialSetUserPermissions(perms));
    } else {
      this.props.dispatch(callCreateFriendInvite({ name }));
    }
    this.setState({ lastInput: this.state.inputValue.trim() });
  }

  private onCancelClicked(): void {
    this.props.dispatch(hideModal());
  }
}

const mapStateToProps = (state: RootState, ownProps: ReactProps): ReactProps & InjectedProps => {
  return {
    ...ownProps,
    stringTable: state.stringTable.stringTable,
    minCharacterNameLength: state.gameDefs.settings?.minCharacterNameLength ?? 3
  };
};

export const AddFriendFoeDialog = connect(mapStateToProps)(AAddFriendFoeDialog);

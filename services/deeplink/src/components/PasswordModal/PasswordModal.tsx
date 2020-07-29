import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/pro-light-svg-icons/faTimes';

import {
  css,
  Card,
  Title,
  Input,
  Header,
  Button,
  Container,
  ButtonContainer,
} from './styles';

export interface PasswordModalProps {
  open: boolean;
  onOpen: (password: string) => void;
  onCancel: () => void;
  onOuterClick: () => void;
  onClose: () => void;
}

/* eslint-disable @typescript-eslint/explicit-function-return-type */
const PasswordModal: React.FC<PasswordModalProps> = props => {
  const { open, onOpen, onCancel, onClose, onOuterClick } = props;

  const [password, setPassword] = useState();

  if (!open) return null;

  return (
    <Container onClick={onOuterClick}>
      <Card onClick={e => e.stopPropagation()}>
        <Header>
          <Title>Enter File Password</Title>
          <FontAwesomeIcon icon={faTimes} css={css.icon} onClick={onClose} />
        </Header>
        <Input
          placeholder="File Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <ButtonContainer>
          <Button css={css.whitebutton} onClick={onCancel}>
            Cancel
          </Button>
          <Button css={css.blackbutton} onClick={() => onOpen(password)}>
            Open
          </Button>
        </ButtonContainer>
      </Card>
    </Container>
  );
};

PasswordModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpen: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onOuterClick: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default PasswordModal;

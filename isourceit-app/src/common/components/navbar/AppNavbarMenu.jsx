import React, { useContext } from 'react';
// import classNames from 'classnames';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
// import { Link } from 'react-router-dom';
import Nav from 'react-bootstrap/Nav';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
// import Identity from './Identity';
import { NavDropdown } from 'react-bootstrap';
import RootStore from '../../../RootStore';

function AppNavbarMenu({ className }) {
  const navigate = useNavigate();
  const { currentUser } = useContext(RootStore);

  const onDisconnect = () => {
    currentUser.disconnect().then(() => {
      navigate('/');
    });
  };

  return (
    <Nav className={className}>
      {currentUser.loggedIn
        ? (
          <NavDropdown title={currentUser.user?.username ?? 'unknown'} id="user-nav-dropdown">
            <NavDropdown.Item onClick={onDisconnect}>Disconnect</NavDropdown.Item>
          </NavDropdown>
        )
        : (
          <Nav.Link disabled className="text-muted">
            <FontAwesomeIcon icon={faUser} />
            {' '}
            <strong>Not connected</strong>
          </Nav.Link>
        )}
    </Nav>
  );
}

AppNavbarMenu.propTypes = {
  className: PropTypes.node,
};

AppNavbarMenu.defaultProps = {
  className: null,
};

export default observer(AppNavbarMenu);

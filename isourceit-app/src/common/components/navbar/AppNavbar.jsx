import React from 'react';
// import classNames from 'classnames';
// import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Navbar from 'react-bootstrap/Navbar';
// import ActionMenu from './ActionMenu';
// import AppNavbarMenu from './AppNavbarMenu';
import './AppNavbar.scss';

import logoPict from '../../../assets/logo.png';
import AppNavbarMenu from './AppNavbarMenu';

function AppNavbar() {
  return (
    <Navbar expand="xxl" fixed="top" bg="dark" variant="dark" className="py-1">
      <Navbar.Brand as={Link} to="/">
        <img
          src={logoPict}
          width="30"
          height="30"
          className="d-inline-block align-top"
          alt={`${APP_ENV_APP_TITLE} Logo`}
        />
        {' '}
        {APP_ENV_APP_TITLE}
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="IUTLavalAbsenceManagerNavbar" />
      <Navbar.Collapse id="IUTLavalAbsenceManagerNavbar">
        <AppNavbarMenu className="me-auto" />
      </Navbar.Collapse>
    </Navbar>
  );
}

export default AppNavbar;

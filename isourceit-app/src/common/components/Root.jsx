import React from 'react';
import { Container } from 'react-bootstrap';
import { Outlet } from 'react-router-dom';
import Errors from './errorNotifications/ErrorList';
import AppNavbar from './navbar/AppNavbar';

function Root() {
  return (
    <>
      <Errors />
      <AppNavbar />
      <main>
        <Container fluid>
          <Outlet />
        </Container>
      </main>
    </>
  );
}

export default Root;

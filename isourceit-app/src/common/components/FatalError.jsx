import React from 'react';
import { Alert, Col, Row } from 'react-bootstrap';
import { useRouteError } from 'react-router-dom';

function FatalError() {
  const error = useRouteError();

  console.error(error);
  const errorMessage = error?.message ?? error?.error?.message ?? 'Unknown error';

  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={10} md={6} lg={4}>
        <Alert variant="danger" className="mb-3">
          <Alert.Heading>Fatal Error</Alert.Heading>
          <p>
            Oups! A fatal error happened:
            {' '}
            {errorMessage}
          </p>
        </Alert>
      </Col>
    </Row>
  );
}

export default FatalError;

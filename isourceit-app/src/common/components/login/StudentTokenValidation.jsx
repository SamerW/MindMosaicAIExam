import React from 'react';
import { Col, Row } from 'react-bootstrap';
import { LoadingLoader } from '../Loading';

function StudentTokenValidation() {
  return (
    <Row>
      <Col xs={12} sm={10} md={6} lg={4} className="text-center">
        <h4>Validating token...</h4>
        <LoadingLoader />
      </Col>
    </Row>
  );
}

export default StudentTokenValidation;

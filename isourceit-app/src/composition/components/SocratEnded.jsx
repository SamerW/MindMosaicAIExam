import React from 'react';
import { observer, PropTypes as MPropTypes } from 'mobx-react';
// import PropTypes from 'prop-types';
import { Alert, Col, Row } from 'react-bootstrap';

function SocratEnded({ socrat }) {
  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={10} md={8} lg={6}>
        <Alert variant="success">
          <Alert.Heading>{socrat.name}</Alert.Heading>
          <p>
            You have finished the questionnaire. Well done!
          </p>
        </Alert>
      </Col>
    </Row>
  );
}

SocratEnded.propTypes = {
  socrat: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(SocratEnded);

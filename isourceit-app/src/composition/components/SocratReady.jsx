import React, { useState } from 'react';
import { observer, PropTypes as MPropTypes } from 'mobx-react';
// import PropTypes from 'prop-types';
import {
  Alert, Button, Col, Row,
} from 'react-bootstrap';

function SocratReady({ socrat }) {
  const [disabled, setDisabled] = useState(false);

  const startSocrat = () => {
    setDisabled(true);
    socrat.startSocrat().catch(() => setDisabled(false));
  };
  console.log("hhherre");
  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={10} md={8} lg={6}>
        <Alert variant="primary">
          <Alert.Heading>{socrat.name}</Alert.Heading>
          <hr />
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: socrat.description }} />
          <hr />
          <p className="mb-0">
            This questionnaire includes
            {' '}
            {socrat.nbQuestions}
            {' '}
            question
            {socrat.nbQuestions > 1 ? 's' : ''}
            .
          </p>
        </Alert>
        <div className="d-grid gap-2">
          <Button variant="success" size="lg" onClick={startSocrat} disabled={disabled}>
            Start the questionnaire
          </Button>
        </div>
      </Col>
    </Row>
  );
}

SocratReady.propTypes = {
  socrat: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(SocratReady);

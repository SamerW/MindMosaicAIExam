import { observer, PropTypes as MPropTypes } from 'mobx-react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import { Col, Row } from 'react-bootstrap';
import ExtResourceDragZone from './ExtResourceDragZone';
import ExtResourceIcon from './ExtResourceIcon';

function ExternalResourcesPanel({
  resources, addResource, removeResource, submitting, className, style,
}) {
  return (
    <>
      <Row className={classNames('my-3', className)} style={style}>
        <Col>
          <ExtResourceDragZone addResource={addResource} submitting={submitting} />
        </Col>
      </Row>
      <Row className={classNames('justify-content-left', className)} style={style}>
        {
          resources.map((rsc) => (
            <Col key={rsc.id} xs="auto" className="mt-2">
              <ExtResourceIcon
                resource={rsc}
                removeResource={removeResource}
                disabled={submitting}
              />
            </Col>
          ))
        }
      </Row>
    </>
  );
}

ExternalResourcesPanel.propTypes = {
  resources: MPropTypes.arrayOrObservableArray.isRequired,
  addResource: PropTypes.func.isRequired,
  removeResource: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.string,
};

ExternalResourcesPanel.defaultProps = {
  submitting: false,
  className: null,
  style: null,
};

export default observer(ExternalResourcesPanel);

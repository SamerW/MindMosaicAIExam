import { observer, PropTypes as MPropTypes } from 'mobx-react';
import React from 'react';
import PropTypes from 'prop-types';
import { Col, Row } from 'react-bootstrap';
import classNames from 'classnames';
import { LoadingLoader } from '../../../common/components/Loading';
import createActionView from './AnalyticsActions';

function ExamAnalyticsTimeline({
  actions, loadingActions, className, style,
}) {
  if (loadingActions) {
    return (
      <Row>
        <Col xs={12}>
          <h2 className="text-center">Loading actions</h2>
          <h2 className="text-center"><LoadingLoader /></h2>
        </Col>
      </Row>
    );
  }

  return (
    <Row className={classNames(className)} style={style}>
      <Col xs={12}>
        <div className="p-2 position-relative top-0 start-0 " style={{ width: '100%' }}>
          <div className="bg-secondary position-absolute top-0 start-50 translate-middle-x h-100 rounded" style={{ width: '10px' }} />
          <div>
            {
            actions?.map((action, idx) => createActionView({
              action,
              rightPosition: !!(idx & 0x1), // eslint-disable-line no-bitwise
              key: idx,
            }))
            }
          </div>
        </div>
      </Col>
    </Row>
  );
}

ExamAnalyticsTimeline.propTypes = {
  actions: MPropTypes.arrayOrObservableArray,
  loadingActions: PropTypes.bool,
  className: PropTypes.node,
  style: PropTypes.node,
};

ExamAnalyticsTimeline.defaultProps = {
  actions: null,
  loadingActions: false,
  className: null,
  style: null,
};

export default observer(ExamAnalyticsTimeline);

import React, { useState } from 'react';
import { observer, PropTypes as MPropTypes } from 'mobx-react';
import { createPortal } from 'react-dom';
import { Alert, Button, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretUp, faCaretDown } from '@fortawesome/free-solid-svg-icons';

import classNames from 'classnames';
import style from './TimeoutBox.scss';

const WARNING_THRESHOLD = 10 * 60; // 10 minutes
const DANGER_THRESHOLD = 3 * 60; // 3 min
const FLICKING_THRESHOLD = 1 * 60; // 1 min

function TimeoutBox({ timeoutManager }) {
  const [showTimeout, setShowTimeout] = useState(true);

  const timeLeft = timeoutManager.timeLeftSeconds;

  // Compute background color according to time left
  let bgColor = 'bg-success';
  if ((timeLeft ?? false) !== false) {
    if (timeLeft <= FLICKING_THRESHOLD) {
      // flicker every second
      // eslint-disable-next-line no-bitwise
      bgColor = (timeLeft & 0x1) ? 'bg-danger' : 'bg-dark';
    } else if (timeLeft <= DANGER_THRESHOLD) {
      bgColor = 'bg-danger';
    } else if (timeLeft <= WARNING_THRESHOLD) {
      bgColor = 'bg-warning';
    }
  }

  return createPortal(
    <aside className={style.timeoutBox}>
      <div
        className={classNames('text-white border border-1 border-dark rounded-1 d-flex justify-content-between align-items-center', bgColor)}
      >
        {
        showTimeout && (
          <div className="p-1 p-relative" style={{ width: '8rem' }}>{timeoutManager.timeLeftStr}</div>//
        )
        }
        <div className="p-1">
          <Button
            variant="outline-light"
            onClick={() => setShowTimeout(!showTimeout)}
            size="sm"
          >
            <FontAwesomeIcon aria-hidden="true" icon={showTimeout ? faCaretUp : faCaretDown} title={showTimeout ? 'hide' : 'show'} />
          </Button>
        </div>
      </div>
    </aside>,
    document.body,
  );
}

TimeoutBox.propTypes = {
  timeoutManager: MPropTypes.objectOrObservableObject.isRequired,
};

export default observer(TimeoutBox);

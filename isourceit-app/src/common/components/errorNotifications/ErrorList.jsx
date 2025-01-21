import React, { useState, useEffect, useContext } from 'react';
import { observer } from 'mobx-react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import Alert from 'react-bootstrap/Alert';
import { CSSTransition } from 'react-transition-group';
import RootStore from '../../../RootStore';

import style from './ErrorList.scss';

export function FancyAlert({ error, removeError }) {
  const [startAnimation, setStartAnimation] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  useEffect(() => {
    setStartAnimation(true);
    setShowAlert(true);
  }, []);
  return (
    <CSSTransition
      in={startAnimation}
      classNames={{
        enter: style.enter,
        enterActive: style.enterActive,
        exit: style.exit,
        exitActive: style.exitActive,
      }}
      timeout={{
        appear: 0,
        enter: 1500,
        exit: 500,
      }}
      onExited={() => {
        removeError(error.id);
      }}
    >
      <Alert
        variant="danger"
        onClose={() => setStartAnimation(false)}
        dismissible
        show={showAlert}
        transition={false}
      >
        <Alert.Heading>{error.title}</Alert.Heading>
        <p>{error.content}</p>
      </Alert>
    </CSSTransition>
  );
}

FancyAlert.propTypes = {
  error: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    content: PropTypes.string,
    title: PropTypes.string,
  }).isRequired,
  removeError: PropTypes.func.isRequired,
};

export function ErrorList({ errors, removeError }) {
  return (
    errors && !!errors.length && createPortal(
      <aside className={style.errorList}>
        {errors.map((error) => (
          <FancyAlert key={error.id} error={error} removeError={removeError} />
        ))}
      </aside>,
      document.body,
    )
  );
}

ErrorList.propTypes = {
  errors: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    content: PropTypes.string,
    title: PropTypes.string,
  })).isRequired,
  removeError: PropTypes.func.isRequired,
};

export function MobXErrorList() {
  const { errorManager } = useContext(RootStore);
  return (
    <ErrorList
      errors={errorManager.errors}
      removeError={(id) => errorManager.removeErrorById(id)}
    />
  );
}

export default observer(MobXErrorList);

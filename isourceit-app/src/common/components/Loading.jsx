import React, { memo } from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import Alert from 'react-bootstrap/Alert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

export function LoadingLoader({ className }) {
  return <FontAwesomeIcon icon={faSpinner} className={classNames('text-primary', className)} pulse />;
}

LoadingLoader.propTypes = {
  className: PropTypes.string,
};

LoadingLoader.defaultProps = {
  className: null,
};

function Loading({ loading, children }) {
  if (loading) {
    return <h2><LoadingLoader /></h2>;
  }
  return children;
}

Loading.propTypes = {
  loading: PropTypes.bool,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.element),
    PropTypes.element,
  ]),
};

Loading.defaultProps = {
  loading: false,
  children: null,
};

function _AdvancedLoading({ loading, loadingError, children }) {
  if (loadingError) {
    return (
      <Alert variant="danger">
        Erreur:
        {' '}
        {loadingError.message}
      </Alert>
    );
  }
  if (loading) {
    return <h2><LoadingLoader /></h2>;
  }
  return children;
}

_AdvancedLoading.propTypes = {
  loading: PropTypes.bool,
  loadingError: PropTypes.instanceOf(Error),
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.element),
    PropTypes.element,
  ]),
};

_AdvancedLoading.defaultProps = {
  loading: false,
  loadingError: null,
  children: null,
};

export const AdvancedLoading = memo(_AdvancedLoading);

function _AdvancedLoadingFactory({ loading, childrenFactory, loadingError }) {
  if (loadingError) {
    return (
      <Alert variant="danger">
        Erreur:
        {' '}
        {loadingError.message}
      </Alert>
    );
  }
  if (loading) {
    return <h2><LoadingLoader /></h2>;
  }
  return childrenFactory();
}

_AdvancedLoadingFactory.propTypes = {
  loading: PropTypes.bool,
  loadingError: PropTypes.instanceOf(Error),
  childrenFactory: PropTypes.func.isRequired,
};

_AdvancedLoadingFactory.defaultProps = {
  loading: false,
  loadingError: null,
};

export const AdvancedLoadingFactory = memo(_AdvancedLoading);

export default Loading;

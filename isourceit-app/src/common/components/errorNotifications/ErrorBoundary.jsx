import React from 'react';
import PropTypes from 'prop-types';
import Button from 'react-bootstrap/Button';

class ErrorBoundary extends React.Component {
  static propTypes = {
    children: PropTypes.arrayOf(PropTypes.element),
  };

  static defaultProps = {
    children: null,
  };

  constructor(props) {
    super(props);
    this.state = {
      errorCaught: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { errorCaught: true, error };
  }

  componentDidCatch(error, info) {
    console.warn('Une erreur est survenue !', error, info);
  }

  reset() {
    this.setState({
      errorCaught: false,
      error: null,
    });
  }

  render() {
    const { errorCaught, error } = this.state;
    const { children } = this.props;
    if (errorCaught) {
      return (
        <>
          <strong>Une erreur s&lsquo;est produite. Désolé.</strong>
          <p>{error.message}</p>
          <Button variant="success" onClick={() => this.reset()}>Reset</Button>
        </>
      );
    }
    return children;
  }
}

export default ErrorBoundary;

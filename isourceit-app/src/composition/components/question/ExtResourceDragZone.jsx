import PropTypes from 'prop-types';
import React, { useReducer, useRef } from 'react';
import {
  Button, Form, InputGroup,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faPaperPlane, faSpinner } from '@fortawesome/free-solid-svg-icons';

function createDZState() {
  return {
    file: null,
    url: '',
  };
}

function reduceDZState(state, action) {
  switch (action.type) {
    case 'set-file':
      return {
        ...state, file: action.file, url: '',
      };
    case 'reset-file':
      return { ...state, file: null };
    case 'set-url':
      return {
        ...state, file: null, url: action.url,
      };
    case 'reset-url':
      return { ...state, url: '' };
    default:
      throw new Error(`Illegal action type ${action.type}.`);
  }
}

function ExtResourceDragZone({ addResource, submitting }) {
  const fileInputRef = useRef();
  const [state, dispatch] = useReducer(reduceDZState, createDZState());

  const resetFile = () => {
    dispatch({ type: 'reset-file' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (state.file) {
      addResource({
        title: state.file.name,
        description: state.file.type,
        rscType: 'file',
      }).then(() => resetFile());
    } else if (state.url) {
      const url = new URL(state.url);
      addResource({
        title: url.hostname,
        description: state.url,
        rscType: 'url',
      }).then(() => dispatch({ type: 'reset-url' }));
    }
  };

  return (
    <fieldset disabled={submitting}>
      <Form.Label className="mb-3">Paste your link or drop your file here</Form.Label>
      <InputGroup size="sm" className="mb-3">
        <Form.Control
          type="url"
          placeholder="https://super-resource.com"
          aria-label="Add url button"
          aria-describedby="resource-panel-url"
          onChange={(e) => dispatch({ type: 'set-url', url: e.target.value })}
          value={state.url}
          disabled={!!state.file}
        />
        <Button
          id="button-resource-panel-url"
          variant="outline-danger"
          onClick={() => dispatch({ type: 'reset-url' })}
          disabled={!!state.file}
        >
          <FontAwesomeIcon aria-hidden="true" icon={faTrashAlt} title="Reset the url" />
        </Button>
      </InputGroup>
      <InputGroup size="sm" className="mb-3">
        <Form.Control
          type="file"
          aria-label="Add file button"
          aria-describedby="resource-panel-file"
          ref={fileInputRef}
          onChange={(e) => dispatch({ type: 'set-file', file: e.target.files[0] })}
          disabled={!!state.url}
        />
        <Button
          id="button-resource-panel-file"
          variant="outline-danger"
          onClick={resetFile}
          disabled={!!state.url}
        >
          <FontAwesomeIcon aria-hidden="true" icon={faTrashAlt} title="Reset the file" />
        </Button>
      </InputGroup>
      <div className="d-grid gap-2">
        <Button
          variant="outline-primary"
          type="button"
          disabled={!state.url && !state.file}
          size="sm"
          onClick={handleSubmit}
        >
          {
            submitting ? (
              <FontAwesomeIcon icon={faSpinner} spinPulse />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} />
            )
          }
        </Button>
      </div>
    </fieldset>
  );
}

ExtResourceDragZone.propTypes = {
  addResource: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

ExtResourceDragZone.defaultProps = {
  submitting: false,
};

export default ExtResourceDragZone;

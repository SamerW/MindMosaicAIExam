import { observer, PropTypes as MPropTypes } from 'mobx-react';
import PropTypes from 'prop-types';
import React from 'react';
import {
  Button, ButtonGroup, OverlayTrigger, Popover,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';

function buildResourcePopover(resource) {
  return (
    <Popover id={`popover-resource-${resource.id}`}>
      <Popover.Header as="h3">{resource.title}</Popover.Header>
      <Popover.Body>
        Type:&nbsp;
        {resource.rsc_type}
        <br />
        {
          resource.rsc_type === 'url' ? (
            <a href={resource.description}>{resource.description}</a>
          ) : resource.description
        }
      </Popover.Body>
    </Popover>
  );
}

function ExtResourceIcon({ resource, removeResource, disabled }) {
  let printableTitle = resource.title || '?';
  if (printableTitle.length > 10) {
    printableTitle = `${printableTitle.substring(0, 7)}...`;
  }
  const titleStyle = resource.rsc_type === 'file' ? 'primary' : 'success';
  const rscPopover = buildResourcePopover(resource);

  return (
    <ButtonGroup aria-label="Resource information" size="sm">
      <OverlayTrigger trigger="click" placement="auto" overlay={rscPopover}>
        <Button variant={titleStyle}>
          {printableTitle}
        </Button>
      </OverlayTrigger>
      <Button variant="danger" disabled={disabled}>
        <FontAwesomeIcon
          aria-hidden="true"
          icon={faTrashAlt}
          title="Delete"
          onClick={() => removeResource(resource.id)}
        />
      </Button>
    </ButtonGroup>
  );
}

ExtResourceIcon.propTypes = {
  resource: MPropTypes.objectOrObservableObject.isRequired,
  removeResource: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

ExtResourceIcon.defaultProps = {
  disabled: false,
};

export default observer(ExtResourceIcon);

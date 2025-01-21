import React from 'react';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBaby } from '@fortawesome/free-solid-svg-icons';

export function formatIdentity(firstname, lastname) {
  return `${firstname?.toLowerCase()?.replace(/(?:^|\s|-)\w/g, (m) => m.toUpperCase())} ${lastname?.toUpperCase()}`.trim();
}

function Identity({
  firstname, lastname, href, underage, raw, className,
}) {
  const content = formatIdentity(firstname, lastname);
  if (!content) {
    return raw ? <>Identité inconnue</> : <i className="text-warning">Identité inconnue</i>;
  }
  if (raw) {
    return content;
  }
  const formatedName = href
    ? <Link to={href} className={className}>{content}</Link>
    : <span className={className}>{content}</span>;
  if (underage) {
    return (
      <>
        <FontAwesomeIcon icon={faBaby} className="text-danger me-1" />
        {formatedName}
      </>
    );
  }
  return formatedName;
}

Identity.propTypes = {
  firstname: PropTypes.string,
  lastname: PropTypes.string,
  href: PropTypes.string,
  underage: PropTypes.bool,
  raw: PropTypes.bool,
  className: PropTypes.string,
};

Identity.defaultProps = {
  firstname: null,
  lastname: null,
  underage: false,
  href: null,
  raw: false,
  className: null,
};

export default observer(Identity);

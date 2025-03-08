/* eslint-disable react/jsx-props-no-spreading */
import { observer, PropTypes as MPropTypes } from 'mobx-react';
import PropTypes from 'prop-types';
import React from 'react';
import { Col, Row } from 'react-bootstrap';
import classNames from 'classnames';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import stylesheet from './AnalyticsAction.scss';
import { dateToLocalDateTimeString, formatSecondDuration } from '../../../services/timeService';

export function BaseAction({
  title, timestamp, footer, children, className, variant, rightPosition,
}) {
  const textColor = `text-${variant}`;
  const borderColor = `border-${variant}`;

  return (
    <div className={classNames('position-relative mb-2 p-0 d-flex align-items-center', { 'ms-auto': rightPosition }, className, stylesheet.AnalyticsAction)}>
      {
        rightPosition && (
          <div className={classNames('d-inline-block', stylesheet.pointer)}>
            <FontAwesomeIcon icon={faPlay} rotation={180} className="text-secondary" />
          </div>
        )
      }
      <div className={classNames('border border-1 rounded d-inline-block p-1', borderColor, stylesheet.panel)}>
        <h5 className={classNames({ 'text-end': !rightPosition }, textColor)}>{title}</h5>
        { children }
        <hr className={classNames(textColor)} />
        {
        footer ? (
          <p className="mb-0">
            {dateToLocalDateTimeString(timestamp)}
            {' - '}
            {footer}
          </p>
        ) : (
          <p className="mb-0">{dateToLocalDateTimeString(timestamp)}</p>
        )
        }
      </div>
      {
        !rightPosition && (
          <div className={classNames('d-inline-block', stylesheet.pointer)}>
            <FontAwesomeIcon icon={faPlay} className="text-secondary" />
          </div>
        )
      }
    </div>
  );
}

BaseAction.propTypes = {
  title: PropTypes.string.isRequired,
  timestamp: PropTypes.instanceOf(Date).isRequired,
  footer: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.arrayOf(PropTypes.element)]),
  className: PropTypes.node,
  variant: PropTypes.string,
  rightPosition: PropTypes.bool,
};

BaseAction.defaultProps = {
  children: null,
  footer: null,
  className: null,
  variant: 'primary',
  rightPosition: false,
};

function _StartExamAction({ action, ...props }) {
  return (<BaseAction title="Start the exam" timestamp={action.timestamp} variant="danger" {...props} />);
}

_StartExamAction.propTypes = {
  action: MPropTypes.objectOrObservableObject.isRequired,
};

export const StartExamAction = observer(_StartExamAction);

function _ChangedQuestion({ action, ...props }) {
  return (
    <BaseAction title={`(Q${action.question_idx + 1}) Change question`} timestamp={action.timestamp} variant="secondary" {...props}>
      <Row>
        <Col xs="auto">
          <u>Next question:</u>
          {' '}
          {`Q${action.next_question_idx + 1}`}
        </Col>
      </Row>
    </BaseAction>
  );
}

_ChangedQuestion.propTypes = {
  action: MPropTypes.objectOrObservableObject.isRequired,
};

export const ChangedQuestion = observer(_ChangedQuestion);

function _LostFocus({ action, ...props }) {
  const title = (action.question_idx ?? false) !== false
    ? `(Q${action.question_idx + 1}) Lost focus` : 'Lost focus (no question selected)';
  return (
    <BaseAction title={title} timestamp={action.timestamp} variant="secondary" {...props}>
      <Row>
        <Col xs="auto">
          <u>Lost time:</u>
          {' '}
          {dateToLocalDateTimeString(action.timestamp)}
        </Col>
        <Col xs="auto">
          <u>Return time:</u>
          {' '}
          {dateToLocalDateTimeString(action.return_timestamp)}
        </Col>
        <Col xs="auto">
          <u>Duration:</u>
          {' '}
          {formatSecondDuration(action.duration_seconds)}
        </Col>
        <Col xs="auto">
          <u>Page hidden during focus lost?</u>
          {' '}
          {action.page_hidden ? 'yes' : 'no' }
        </Col>
      </Row>
    </BaseAction>
  );
}

_LostFocus.propTypes = {
  action: MPropTypes.objectOrObservableObject.isRequired,
};

export const LostFocus = observer(_LostFocus);

function _WroteInitialAnswerAction({ action, ...props }) {
  return (
    <BaseAction title={`(Q${action.question_idx + 1}) Wrote initial answer`} timestamp={action.timestamp} {...props}>
      <p className="mb-0">{action.text}</p>
    </BaseAction>
  );
}

_WroteInitialAnswerAction.propTypes = {
  action: MPropTypes.objectOrObservableObject.isRequired,
};

export const WroteInitialAnswerAction = observer(_WroteInitialAnswerAction);

function _AskChatAIAction({ action, ...props }) {

  return (
    <BaseAction title={`(Q${action.question_idx + 1}) Ask Chat AI`} timestamp={action.timestamp} variant="success" {...props}>
      <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
        <u>Prompt:</u>
        {' '}
        {action.prompt}
      </p>
      <p className="mb-1" style={{ whiteSpace: 'pre-line' }}>
        <u>Answer:</u>
        {' '}
        {action.answer}
      </p>
      <p className="mb-2" style={{ whiteSpace: 'pre-line' }}>
        <u>Comment:</u>
        {' '}
        {action.comment}
      </p>
    </BaseAction>
  );
}

_AskChatAIAction.propTypes = {
  action: MPropTypes.objectOrObservableObject.isRequired,
};

export const SearchEngineAction = observer(_SearchEngineAction);

function _SearchEngineAction({ action, ...props }) {

  return (
    <BaseAction title={`(Q${action.question_idx + 1}) Search Engine`} timestamp={action.timestamp} variant="success" {...props}>
      <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
        <u>Query:</u>
        {' '}
        {action.query}
      </p>
      <p className="mb-1" style={{ whiteSpace: 'pre-line' }}>
        <u>Results:</u>
        {' '}
        {action.results}
      </p>
    </BaseAction>
  );
}

_SearchEngineAction.propTypes = {
  action: MPropTypes.objectOrObservableObject.isRequired,
};

export const VisitUrlAction = observer(_VisitUrlAction);

function _VisitUrlAction({ action, ...props }) {

  return (
    <BaseAction title={`(Q${action.question_idx + 1}) Visit URL`} timestamp={action.timestamp} variant="success" {...props}>
      <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
        <u>Url:</u>
        {' '}
        {action.url}
      </p>
      <p className="mb-1" style={{ whiteSpace: 'pre-line' }}>
        <u>Engine:</u>
        {' '}
        {action.search_engine_name}
      </p>
    </BaseAction>
  );
}

_VisitUrlAction.propTypes = {
  action: MPropTypes.objectOrObservableObject.isRequired,
};

export const AskChatAIAction = observer(_AskChatAIAction);

function _AddResourceAction({ action, ...props }) {
  return (
    <BaseAction title={`(Q${action.question_idx + 1}) Add resource`} timestamp={action.timestamp} variant="success" {...props}>
      <Row>
        <Col xs="auto">
          <u>Title:</u>
          {' '}
          {action.title}
        </Col>
        <Col xs="auto">
          <u>Description:</u>
          {' '}
          {
            action.rsc_type === 'url' ? (
              <a href={action.description}>{action.description}</a>
            ) : (
              <span>{action.description}</span>
            )
          }
        </Col>
        <Col xs="auto">
          <u>Type:</u>
          {' '}
          {action.rsc_type}
        </Col>
        <Col xs="auto">
          <u>Removed:</u>
          {' '}
          {dateToLocalDateTimeString(action.removed) ?? 'no' }
        </Col>
      </Row>
    </BaseAction>
  );
}

_AddResourceAction.propTypes = {
  action: MPropTypes.objectOrObservableObject.isRequired,
};

export const AddResourceAction = observer(_AddResourceAction);

function _WroteFinalAnswerAction({ action, ...props }) {
  return (
    <BaseAction title={`(Q${action.question_idx + 1}) Wrote final answer`} timestamp={action.timestamp} {...props}>
      <p className="mb-0">{action.text}</p>
    </BaseAction>
  );
}

_WroteFinalAnswerAction.propTypes = {
  action: MPropTypes.objectOrObservableObject.isRequired,
};

export const WroteFinalAnswerAction = observer(_WroteFinalAnswerAction);

function _SubmitExamAction({ action, ...props }) {
  return (<BaseAction title="Submit exam" timestamp={action.timestamp} variant="danger" {...props} />);
}

_SubmitExamAction.propTypes = {
  action: MPropTypes.objectOrObservableObject.isRequired,
};

export const SubmitExamAction = observer(_SubmitExamAction);

export default function createActionView({ action, key, rightPosition = false }) {
  if (!action || !action.action_type) {
    console.error('Unmanageable action!', action);
    throw new Error('Unmanageable action.');
  }
  switch (action.action_type) {
    case 'StartExam':
      return (<StartExamAction key={key} action={action} rightPosition={rightPosition} />);
    case 'ChangedQuestion':
      return (<ChangedQuestion key={key} action={action} rightPosition={rightPosition} />);
    case 'LostFocus':
      return (<LostFocus key={key} action={action} rightPosition={rightPosition} />);
    case 'WriteInitialAnswer':
      return (<WroteInitialAnswerAction key={key} action={action} rightPosition={rightPosition} />);
    case 'AskChatAI':
      return (<AskChatAIAction key={key} action={action} rightPosition={rightPosition} />);
    case 'SearchEngine':
      return (<SearchEngineAction key={key} action={action} rightPosition={rightPosition} />);
    case 'VisitUrl':
      return (<VisitUrlAction key={key} action={action} rightPosition={rightPosition} />);
    case 'AddExternalResource':
      return (<AddResourceAction key={key} action={action} rightPosition={rightPosition} />);
    case 'WriteFinalAnswer':
      return (<WroteFinalAnswerAction key={key} action={action} rightPosition={rightPosition} />);
    case 'SubmitExam':
      return (<SubmitExamAction key={key} action={action} rightPosition={rightPosition} />);
    default:
      console.error('Unmanageable action type!', action.action_type);
      throw new Error(`Unmanageable action ${action.action_type}.`);
  }
}

import { observer, PropTypes as MPropTypes } from 'mobx-react';
// import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import { Tab, Tabs } from 'react-bootstrap';
import ChatAIChat from './ChatAIChat';
import ChatAIChatCopyPaste from './ChatAIChatCopyPaste';
import ExternalResourcesPanel from './ExternalResourcesPanel';

function MultiResourcePanel({
  chats, chatActions, onSubmitChat, resources, addResource,
  removeResource, submitting, className, style,
}) {
  return (
    <Tabs
      defaultActiveKey={chats[0]?.id ?? ''}
      id="multi-chat-ai-panel"
      className={className}
      style={style}
    >
      {
        chats.map((chat) => (
          <Tab key={chat.id} eventKey={chat.id} title={chat.title}>
            {
              chat.copyPaste ? (
                <ChatAIChatCopyPaste
                  chatActions={chatActions[chat.id]}
                  onSubmit={(data) => onSubmitChat({ ...data, chat })}
                  submitting={submitting}
                  chatId={chat.id}
                />
              ) : (
                <ChatAIChat
                  chatActions={chatActions[chat.id]}
                  onSubmit={(data) => onSubmitChat({ ...data, chat })}
                  submitting={submitting}
                  chatId={chat.id}
                />
              )
            }
          </Tab>
        ))
      }
      <Tab eventKey="resource" title="External resources">
        <ExternalResourcesPanel
          resources={resources}
          addResource={addResource}
          removeResource={removeResource}
          submitting={submitting}
        />
      </Tab>
    </Tabs>
  );
}

MultiResourcePanel.propTypes = {
  chats: MPropTypes.arrayOrObservableArray.isRequired,
  chatActions: MPropTypes.objectOrObservableObject.isRequired,
  onSubmitChat: PropTypes.func.isRequired,
  resources: MPropTypes.arrayOrObservableArray.isRequired,
  addResource: PropTypes.func.isRequired,
  removeResource: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  className: PropTypes.node,
  style: PropTypes.instanceOf(Object),
};

MultiResourcePanel.defaultProps = {
  submitting: false,
  className: null,
  style: null,
};

export default observer(MultiResourcePanel);

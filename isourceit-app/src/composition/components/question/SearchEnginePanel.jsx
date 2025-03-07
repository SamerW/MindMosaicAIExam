import { observer, PropTypes as MPropTypes } from 'mobx-react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { Col, Row, Form, Button, ListGroup, Tab, Tabs } from 'react-bootstrap';
import ExtResourceDragZone from './ExtResourceDragZone';
import ExtResourceIcon from './ExtResourceIcon';
import { sendQuerySearch,visitUrl } from '../../model/netLayer';

function SearchEnginePanel({
  resources, addResource, removeResource, submitting, engineId, className, style, onSubmit, questionId
}) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('search');

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      const data = await sendQuerySearch({
        engine_id: engineId,
        query: query,
        question_id: questionId,
      });
      setSearchResults(data);
      setQuery('');
    } catch (error) {
      console.error('Error sending query:', error);
      alert('Failed to fetch results. Please try again.');
    }
  };

  const handleVisit = async(url) => {
    if (!url.trim()) return;
    try {
      const data = await visitUrl({
        engine_id: engineId,
        url: url,
        question_id: questionId,
      });

    } catch (error) {
      console.error('Error sending query:', error);
      alert('Failed to fetch results. Please try again.');
    }
  };

  const submitQuery = () => {
    const correctedQuery = query?.trim();
    const payload = { query: correctedQuery || null };
    if (payload.query) {
      onSubmit(payload);
      setQuery('');
    }
  };

  return (
    <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
      <Tab eventKey="search" title="Search">
        <Row className="mb-3">
          <Col xs={8}>
            <Form.Control
              type="text"
              placeholder="Enter search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Col>
          <Col xs={4}>
            <Button onClick={handleSearch} disabled={submitting} variant="primary">Search</Button>
          </Col>
        </Row>

        {/* Search Results Display */}
        <Row>
          <Col>
            <ListGroup>
              {searchResults.map((result) => (
                <ListGroup.Item key={result.id}>
                  <div><strong>{result.title || 'No Title'}</strong></div>
                  <div><small>{result.description || 'No description available'}</small></div>
                  <a href={result.url} target="_blank" rel="noopener noreferrer" onClick={() => handleVisit(result.url)}>{result.url}</a>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Col>
        </Row>
      </Tab>
    </Tabs>
  );
}

SearchEnginePanel.propTypes = {
  resources: MPropTypes.arrayOrObservableArray.isRequired,
  addResource: PropTypes.func.isRequired,
  removeResource: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.string,
};

SearchEnginePanel.defaultProps = {
  submitting: false,
  className: null,
  style: null,
};

export default observer(SearchEnginePanel);

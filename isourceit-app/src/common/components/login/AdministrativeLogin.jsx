import React, { useContext, useReducer } from 'react';
import {
  Alert,
  Button, Col, Form, Row,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react';
import RootStore from '../../../RootStore';

function initState() {
  return {
    username: '',
    password: '',
    disabled: false,
  };
}

function reduce(state, action) {
  switch (action.type) {
    case 'set-username':
      return { ...state, username: action.value };
    case 'set-password':
      return { ...state, password: action.value };
    case 'set-disabled':
      return { ...state, disabled: action.value };
    default:
      throw new Error(`Illegal action type to reduce: ${action.type}.`);
  }
}

function TeacherLogin() {
  const navigate = useNavigate();
  const { currentUser } = useContext(RootStore);
  const [state, dispatch] = useReducer(reduce, initState());

  const attemptLogin = (e) => {
    e.preventDefault();
    const username = state.username.trim();
    if (username && state.password) {
      dispatch({ type: 'set-disabled', value: true });
      currentUser.administrativeAuth({ username, password: state.password }).then(
        () => {
          navigate('/');
        },
      ).finally(() => dispatch({ type: 'set-disabled', value: false }));
    }
  };

  return (
    <Row className="justify-content-center">
      <Col xs={12} sm={10} md={6} lg={4}>
        <Alert variant="success" className="mb-3">
          <Alert.Heading>Administrative login</Alert.Heading>
          <p>
            This login page is reserved to administrator and teachers.
            If you want to log to this system as a student for a particular exam,
            please use the link you obtained from your teacher.
          </p>
        </Alert>
        <Form onSubmit={attemptLogin}>
          <fieldset disabled={state.disabled}>
            <Form.Group className="mb-3" controlId="TeacherLoginUsername">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter username"
                required
                value={state.username}
                onChange={(e) => dispatch({ type: 'set-username', value: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="TeacherLoginPassword">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Password"
                required
                value={state.password}
                onChange={(e) => dispatch({ type: 'set-password', value: e.target.value })}
              />
            </Form.Group>
            <Button variant="primary" type="submit">
              Login
            </Button>
          </fieldset>
        </Form>
      </Col>
    </Row>
  );
}

export default observer(TeacherLogin);

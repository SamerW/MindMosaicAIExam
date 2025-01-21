import { makeAutoObservable, runInAction } from 'mobx';
import { io } from 'socket.io-client';

class SocketManager {
  _socket = null;

  _connected = false;

  _answerCallback = null;

  constructor() {
    makeAutoObservable(this, {
      _socket: false,
      socket: false,
      _answerCallback: false,
      answerCallback: false,
      init: false,
      release: false,
    });
  }

  get connected() {
    return this._connected;
  }

  get socket() {
    return this._socket;
  }

  get answerCallback() {
    return this._answerCallback;
  }

  set answerCallback(cb) {
    this._answerCallback = cb;
  }

  init() {
    if (this._connected) {
      console.warn('Socket already connected');
      return;
    }
    const socketOptions = {
      transports: ['websocket', 'polling'],
    };
    if (APP_ENV_WEBSOCKET_PATH_URL) {
      socketOptions.path = APP_ENV_WEBSOCKET_PATH_URL;
    }
    this._socket = io(APP_ENV_WEBSOCKET_BASE_URL, socketOptions);

    this._socket.on('connect', () => {
      // console.log('Socket connected'); // eslint-disable-line no-console
      runInAction(() => {
        this._connected = true;
      });
    });

    this._socket.on('connect_error', (err) => {
      console.warn('Socket disconnected by error', err.message);
      runInAction(() => {
        this._connected = false;
      });
    });

    this._socket.on('disconnect', () => {
      // console.log('Socket disconnected'); // eslint-disable-line no-console
      runInAction(() => {
        this._connected = false;
      });
    });

    // this._socket.on('info', (info) => {
    //   console.log('Info received', info.message); // eslint-disable-line no-console
    // });

    this._socket.on('answer', (answer) => {
      if (this._answerCallback) {
        this._answerCallback(answer, this._socket.id);
      }
    });
  }

  release() {
    if (!this._connected) {
      console.warn('Socket not connected');
    }
    this._socket.close();
    this._socket = null;
  }
}

export default SocketManager;

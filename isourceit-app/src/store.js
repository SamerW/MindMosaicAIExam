import ERROR_MANAGER from './common/model/ErrorManager';
import LoggedUser from './common/model/LoggedUser';

const STORE = {
  currentUser: new LoggedUser(),
  errorManager: ERROR_MANAGER,
};

export default STORE;

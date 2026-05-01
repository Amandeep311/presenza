import { combineReducers } from 'redux';
import authReducer from './authReducer';
import attendanceReducer from './attendanceReducer'; 
import uiReducer from './uiReducer';
import leaveReducer from './leaveReducer';
import { employeeProfileReducer } from './employeeReducer';
import kraReducer from './kraReducer';
import employeeReducer from './employeeDataReducer';
import meetingReducer from './meetingReducer';
import expenseReducer from './expenseReducer';

const appReducer = combineReducers({
  auth: authReducer,
  attendance: attendanceReducer, 
  ui: uiReducer,
  leave: leaveReducer,
  employeeProfile: employeeProfileReducer,
  kra: kraReducer,
  employees: employeeReducer,
  meetings: meetingReducer,
  expense: expenseReducer,
});

const rootReducer = (state, action) => {
  if (action.type === 'LOGOUT' || action.type === 'RESET_APP_STATE') {
    state = undefined;
  }
  return appReducer(state, action);
};

export default rootReducer;
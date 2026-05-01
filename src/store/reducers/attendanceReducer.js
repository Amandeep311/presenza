import * as types from '../actions/types';

const initialState = {
  // Punch In/Out states
  punchInLoading: false,
  punchOutLoading: false,
  punchInData: null,
  punchOutData: null,
  punchError: null,

  // History states
  historyLoading: false,
  history: [],
  historyError: null,

  // Today's attendance
  todayLoading: false,
  todayAttendance: null,
  todayError: null,

  // Break states
  breakLoading: false,
  activeBreak: null,
  breakError: null,

  // Status
  isCheckedIn: false,
  currentStatus: 'NOT_PUNCHED', // NOT_PUNCHED, PUNCHED_IN, PUNCHED_OUT, ON_BREAK
  lastPunchIn: null,
  lastPunchOut: null,
  location: null,
};

const attendanceReducer = (state = initialState, action) => {
  switch (action.type) {
    // Punch In
    case types.PUNCH_IN_REQUEST:
      return {
        ...state,
        punchInLoading: true,
        punchError: null,
      };

    case types.PUNCH_IN_SUCCESS:
      return {
        ...state,
        punchInLoading: false,
        punchInData: action.payload,
        isCheckedIn: true,
        currentStatus: 'PUNCHED_IN',
        lastPunchIn: action.payload,
        punchError: null,
      };

    case types.PUNCH_IN_FAIL:
      return {
        ...state,
        punchInLoading: false,
        punchError: action.payload,
      };

    // Punch Out
    case types.PUNCH_OUT_REQUEST:
      return {
        ...state,
        punchOutLoading: true,
        punchError: null,
      };

    case types.PUNCH_OUT_SUCCESS:
      return {
        ...state,
        punchOutLoading: false,
        punchOutData: action.payload,
        isCheckedIn: false,
        currentStatus: 'PUNCHED_OUT',
        lastPunchOut: action.payload,
        punchInData: null,
        activeBreak: null, // Clear any active break when punching out
        punchError: null,
      };

    case types.PUNCH_IN_CANCEL:
      return {
        ...state,
        punchInLoading: false,
        punchError: null,
      };

    case types.PUNCH_OUT_FAIL:
      return {
        ...state,
        punchOutLoading: false,
        punchError: action.payload,
      };

    case types.PUNCH_OUT_CANCEL:
      return {
        ...state,
        punchOutLoading: false,
        punchError: null,
      };

    // Attendance History
    case types.ATTENDANCE_HISTORY_REQUEST:
      return {
        ...state,
        historyLoading: true,
        historyError: null,
      };

    case types.ATTENDANCE_HISTORY_SUCCESS:
      // Check if there's an active break in the history
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = action.payload?.find(record => {
        const recordDate = record.date.split('T')[0];
        return recordDate === today;
      });

      // Check for ongoing break in today's sessions
      let activeBreak = state.activeBreak;
      if (todayRecord?.sessions?.length > 0) {
        const lastSession =
          todayRecord.sessions[todayRecord.sessions.length - 1];
        const ongoingBreak = lastSession?.breaks?.find(b => !b.breakOut);

        if (ongoingBreak) {
          activeBreak = {
            breakIn: ongoingBreak.breakIn,
            breakType: ongoingBreak.breakType,
            remarks: ongoingBreak.remarks,
          };
        } else {
          activeBreak = null;
        }
      }

      return {
        ...state,
        historyLoading: false,
        history: action.payload,
        activeBreak: activeBreak,
        currentStatus: activeBreak ? 'ON_BREAK' : state.currentStatus,
        historyError: null,
      };

    case types.ATTENDANCE_HISTORY_FAIL:
      return {
        ...state,
        historyLoading: false,
        historyError: action.payload,
      };

    // Today's Attendance
    case types.TODAY_ATTENDANCE_REQUEST:
      return {
        ...state,
        todayLoading: true,
        todayError: null,
      };

    case types.TODAY_ATTENDANCE_SUCCESS:
      return {
        ...state,
        todayLoading: false,
        todayAttendance: action.payload,
        isCheckedIn: action.payload?.isCheckedIn || false,
        currentStatus: action.payload?.status || 'NOT_PUNCHED',
        location: action.payload?.location || null,
        todayError: null,
      };

    case types.TODAY_ATTENDANCE_FAIL:
      return {
        ...state,
        todayLoading: false,
        todayError: action.payload,
      };

    // Break In
    case 'BREAK_IN_REQUEST':
      return {
        ...state,
        breakLoading: true,
        breakError: null,
      };

    case 'BREAK_IN_SUCCESS':
      // Extract break info from response
      let breakInfo = null;
      if (action.payload?.sessions?.length > 0) {
        const lastSession =
          action.payload.sessions[action.payload.sessions.length - 1];
        const newBreak = lastSession?.breaks?.[lastSession.breaks.length - 1];
        if (newBreak) {
          breakInfo = {
            breakIn: newBreak.breakIn,
            breakType: newBreak.breakType,
            remarks: newBreak.remarks,
          };
        }
      }

      return {
        ...state,
        breakLoading: false,
        activeBreak: breakInfo,
        currentStatus: 'ON_BREAK',
        breakError: null,
      };

    // Break Out
    case 'BREAK_OUT_REQUEST':
      return {
        ...state,
        breakLoading: true,
        breakError: null,
      };

    case 'BREAK_OUT_SUCCESS':
      return {
        ...state,
        breakLoading: false,
        activeBreak: null,
        currentStatus: 'PUNCHED_IN',
        breakError: null,
      };

    case 'BREAK_IN_FAIL':
    case 'BREAK_OUT_FAIL':
      return {
        ...state,
        breakLoading: false,
        breakError: action.payload,
      };

    // Reset state on logout
    case types.LOGOUT:
    case types.RESET_APP_STATE:
      return initialState;

    default:
      return state;
  }
};

export default attendanceReducer;

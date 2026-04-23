import {
  CREATE_MEETING_REQUEST,
  CREATE_MEETING_SUCCESS,
  CREATE_MEETING_FAIL,
  FETCH_MEETINGS_REQUEST,
  FETCH_MEETINGS_SUCCESS,
  FETCH_MEETINGS_FAIL,
  UPDATE_MEETING_STATUS_REQUEST,
  UPDATE_MEETING_STATUS_SUCCESS,
  UPDATE_MEETING_STATUS_FAIL,
} from "../actions/types";

const initialState = {
  loading: false,
  creatingMeeting: false,
  updatingStatus: false,
  meetings: [],
  currentMeeting: null,
  error: null,
};

const meetingReducer = (state = initialState, action) => {
  switch (action.type) {
    // Create Meeting
    case CREATE_MEETING_REQUEST:
      return {
        ...state,
        creatingMeeting: true,
        error: null,
      };

    case CREATE_MEETING_SUCCESS:
      return {
        ...state,
        creatingMeeting: false,
        currentMeeting: action.payload,
        meetings: [action.payload, ...state.meetings],
        error: null,
      };

    case CREATE_MEETING_FAIL:
      return {
        ...state,
        creatingMeeting: false,
        error: action.payload,
      };

    // Fetch Meetings
    case FETCH_MEETINGS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case FETCH_MEETINGS_SUCCESS:
      return {
        ...state,
        loading: false,
        meetings: action.payload,
        error: null,
      };

    case FETCH_MEETINGS_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    // Update Meeting Status
    case UPDATE_MEETING_STATUS_REQUEST:
      return {
        ...state,
        updatingStatus: true,
        error: null,
      };

    case UPDATE_MEETING_STATUS_SUCCESS: {
      const updatedMeeting = action.payload;
      const updatedMeetings = state.meetings.map(meeting =>
        meeting._id === updatedMeeting._id ? updatedMeeting : meeting
      );
      
      return {
        ...state,
        updatingStatus: false,
        meetings: updatedMeetings,
        currentMeeting: updatedMeeting,
        error: null,
      };
    }

    case UPDATE_MEETING_STATUS_FAIL:
      return {
        ...state,
        updatingStatus: false,
        error: action.payload,
      };

    default:
      return state;
  }
};

export default meetingReducer;
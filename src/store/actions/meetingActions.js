import apiService from "../../services/apiService";
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
} from "./types";

// Create a new meeting
export const createMeeting = (meetingData) => async dispatch => {
  try {
    console.log('📝 Creating meeting...', meetingData);
    
    dispatch({ type: CREATE_MEETING_REQUEST });

    const response = await apiService.post('/meeting', meetingData);

    console.log('📡 Response status:', response.status);

    if (response.status >= 200 && response.status < 300) {
      const meeting = response.data?.data || response.data;

      dispatch({
        type: CREATE_MEETING_SUCCESS,
        payload: meeting,
      });

      return { 
        success: true, 
        data: meeting,
        message: response.data?.message 
      };
    } else {
      throw new Error(response.data?.message || 'Failed to create meeting');
    }
    
  } catch (error) {
    console.log('❌ Create meeting error:', error.message);
    
    dispatch({
      type: CREATE_MEETING_FAIL,
      payload: error.response?.data?.message || error.message || 'Failed to create meeting',
    });
    
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

// Fetch all meetings
export const fetchMeetings = () => async dispatch => {
  try {
    console.log('📝 Fetching meetings...');
    
    dispatch({ type: FETCH_MEETINGS_REQUEST });

    const response = await apiService.get('/meeting');

    console.log('📡 Response status:', response.status);

    if (response.status >= 200 && response.status < 300) {
      let meetingsData = [];
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        meetingsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        meetingsData = response.data;
      }

      console.log("✅ Fetched meetings:", meetingsData.length);

      dispatch({
        type: FETCH_MEETINGS_SUCCESS,
        payload: meetingsData,
      });

      return { 
        success: true, 
        data: meetingsData,
        message: response.data?.message 
      };
    } else {
      throw new Error(response.data?.message || 'Failed to fetch meetings');
    }
    
  } catch (error) {
    console.log('❌ Fetch meetings error:', error.message);
    
    dispatch({
      type: FETCH_MEETINGS_FAIL,
      payload: error.response?.data?.message || error.message || 'Failed to fetch meetings',
    });
    
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

// Update meeting attendance status
export const updateMeetingStatus = (meetingId, status) => async dispatch => {
  try {
    console.log('📝 Updating meeting status:', { meetingId, status });
    
    dispatch({ type: UPDATE_MEETING_STATUS_REQUEST });

    const response = await apiService.patch(`/meeting/${meetingId}/status`, { status });

    console.log('📡 Response status:', response.status);

    if (response.status >= 200 && response.status < 300) {
      const updatedMeeting = response.data?.data || response.data;

      dispatch({
        type: UPDATE_MEETING_STATUS_SUCCESS,
        payload: updatedMeeting,
      });

      return { 
        success: true, 
        data: updatedMeeting,
        message: response.data?.message 
      };
    } else {
      throw new Error(response.data?.message || 'Failed to update meeting status');
    }
    
  } catch (error) {
    console.log('❌ Update meeting status error:', error.message);
    
    dispatch({
      type: UPDATE_MEETING_STATUS_FAIL,
      payload: error.response?.data?.message || error.message || 'Failed to update meeting status',
    });
    
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};
import apiService from "../../services/apiService";
import {
  FETCH_KRA_REQUEST,
  FETCH_KRA_SUCCESS,
  FETCH_KRA_FAIL,
  FETCH_KRA_BY_ID_REQUEST,
  FETCH_KRA_BY_ID_SUCCESS,
  FETCH_KRA_BY_ID_FAIL,
  UPDATE_KRA_METRIC_REQUEST,
  UPDATE_KRA_METRIC_SUCCESS,
  UPDATE_KRA_METRIC_FAIL,
} from "./types";

// Fetch all KRA for logged-in employee
export const fetchKRA = () => async dispatch => {
  try {
    console.log('📝 Fetching KRA...');
    
    dispatch({ type: FETCH_KRA_REQUEST });

    const response = await apiService.get('/kra');

    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', response.data);

    // Check for successful response
    if (response.status >= 200 && response.status < 300) {
      let kraData = [];
      
      // Handle different response structures
      if (response.data?.data && Array.isArray(response.data.data)) {
        kraData = response.data.data;
      } else if (Array.isArray(response.data)) {
        kraData = response.data;
      } else if (response.data?.success === true && response.data?.data) {
        kraData = response.data.data;
      }

      console.log("✅ Fetched KRA data:", kraData.length, "KRA entries");

      dispatch({
        type: FETCH_KRA_SUCCESS,
        payload: kraData,
      });

      return { 
        success: true, 
        data: kraData,
        message: response.data?.message 
      };
    } else {
      throw new Error(response.data?.message || 'Failed to fetch KRA');
    }
    
  } catch (error) {
    console.log('❌ Fetch KRA error:', error.message);
    
    dispatch({
      type: FETCH_KRA_FAIL,
      payload: error.response?.data?.message || error.message || 'Failed to fetch KRA',
    });
    
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

// Fetch single KRA by ID
export const fetchKRAById = (kraId) => async dispatch => {
  try {
    console.log('📝 Fetching KRA by ID:', kraId);
    
    dispatch({ type: FETCH_KRA_BY_ID_REQUEST });

    const response = await apiService.get(`/kra/${kraId}`);

    console.log('📡 Response status:', response.status);

    if (response.status >= 200 && response.status < 300) {
      let kraItem = response.data?.data || response.data;

      dispatch({
        type: FETCH_KRA_BY_ID_SUCCESS,
        payload: kraItem,
      });

      return { 
        success: true, 
        data: kraItem 
      };
    } else {
      throw new Error(response.data?.message || 'Failed to fetch KRA details');
    }
    
  } catch (error) {
    console.log('❌ Fetch KRA by ID error:', error.message);
    
    dispatch({
      type: FETCH_KRA_BY_ID_FAIL,
      payload: error.response?.data?.message || error.message,
    });
    
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

// Update KRA metric (achieved value)
export const updateKRAMetric = (kraId, metricId, achievedValue) => async dispatch => {
  try {
    console.log('📝 Updating KRA metric:', { kraId, metricId, achievedValue });
    
    dispatch({ type: UPDATE_KRA_METRIC_REQUEST });

    const response = await apiService.put(`/kra/${kraId}/metrics/${metricId}`, {
      achieved: achievedValue
    });

    console.log('📡 Response status:', response.status);

    if (response.status >= 200 && response.status < 300) {
      const updatedMetric = response.data?.data || response.data;

      dispatch({
        type: UPDATE_KRA_METRIC_SUCCESS,
        payload: {
          kraId,
          metricId,
          data: updatedMetric
        },
      });

      return { 
        success: true, 
        data: updatedMetric 
      };
    } else {
      throw new Error(response.data?.message || 'Failed to update KRA metric');
    }
    
  } catch (error) {
    console.log('❌ Update KRA metric error:', error.message);
    
    dispatch({
      type: UPDATE_KRA_METRIC_FAIL,
      payload: error.response?.data?.message || error.message,
    });
    
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};
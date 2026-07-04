// store/actions/kraActions.js

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
  UPDATE_KRA_STATUS_REQUEST,
  UPDATE_KRA_STATUS_SUCCESS,
  UPDATE_KRA_STATUS_FAIL,
} from "./types";

// Fetch all KRA for logged-in employee
export const fetchKRA = () => async dispatch => {
  try {
    console.log('📝 Fetching KRA...');
    
    dispatch({ type: FETCH_KRA_REQUEST });

    const response = await apiService.get('/kra');

    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', response.data);

    if (response.status >= 200 && response.status < 300) {
      const responseData = response.data;
      
      if (responseData?.success && responseData?.data) {
        dispatch({
          type: FETCH_KRA_SUCCESS,
          payload: responseData.data,
        });

        return { 
          success: true, 
          data: responseData.data,
          message: responseData.message 
        };
      } else {
        let kraData = [];
        if (Array.isArray(responseData)) {
          kraData = responseData;
        } else if (responseData?.kras) {
          kraData = responseData.kras;
        }

        dispatch({
          type: FETCH_KRA_SUCCESS,
          payload: { kras: kraData, total: kraData.length },
        });

        return { 
          success: true, 
          data: { kras: kraData },
          message: 'KRA fetched successfully' 
        };
      }
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

// Update KRA metric (achieved value) - FIXED
export const updateKRAMetric = (kraId, metricId, achievedValue) => async dispatch => {
  try {
    console.log('📝 Updating KRA metric:', { kraId, metricId, achievedValue });
    
    dispatch({ type: UPDATE_KRA_METRIC_REQUEST });

    // Use the correct endpoint and method as per your API
    const response = await apiService.patch(`/kra/${kraId}/metrics`, {
      metrics: [
        {
          id: metricId,
          achieved: achievedValue
        }
      ]
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', response.data);

    if (response.status >= 200 && response.status < 300) {
      const responseData = response.data;
      
      if (responseData?.success && responseData?.data) {
        // Extract the updated metric data
        const updatedData = responseData.data;
        let updatedMetric = null;
        
        // Find the updated metric in the response
        if (updatedData.metrics && Array.isArray(updatedData.metrics)) {
          updatedMetric = updatedData.metrics.find(m => 
            (m._id === metricId || m.id === metricId)
          );
        }
        
        // If metric not found in response, use the data we sent
        if (!updatedMetric) {
          updatedMetric = { 
            achieved: achievedValue,
            _id: metricId,
            id: metricId
          };
        }

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
          data: updatedData,
          message: responseData.message || 'Metric updated successfully' 
        };
      } else {
        // If the response doesn't have the expected structure, but was successful
        dispatch({
          type: UPDATE_KRA_METRIC_SUCCESS,
          payload: {
            kraId,
            metricId,
            data: { 
              achieved: achievedValue,
              _id: metricId,
              id: metricId
            }
          },
        });

        return { 
          success: true, 
          data: { achieved: achievedValue },
          message: 'Metric updated successfully' 
        };
      }
    } else {
      throw new Error(response.data?.message || 'Failed to update KRA metric');
    }
    
  } catch (error) {
    console.log('❌ Update KRA metric error:', error.message);
    console.log('Error details:', error.response?.data);
    
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

// Update KRA Status
export const updateKRAStatus = (kraId, status) => async dispatch => {
  try {
    console.log('📝 Updating KRA status:', { kraId, status });
    
    dispatch({ type: UPDATE_KRA_STATUS_REQUEST });

    const response = await apiService.patch(`/kra/${kraId}/status`, {
      status: status
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', response.data);

    if (response.status >= 200 && response.status < 300) {
      const responseData = response.data;
      
      if (responseData?.success) {
        dispatch({
          type: UPDATE_KRA_STATUS_SUCCESS,
          payload: {
            kraId,
            status: status,
            data: responseData.data
          },
        });

        return { 
          success: true, 
          data: responseData.data,
          message: responseData.message || 'Status updated successfully' 
        };
      } else {
        throw new Error(responseData?.message || 'Failed to update status');
      }
    } else {
      throw new Error(response.data?.message || 'Failed to update KRA status');
    }
    
  } catch (error) {
    console.log('❌ Update KRA status error:', error.message);
    console.log('Error details:', error.response?.data);
    
    dispatch({
      type: UPDATE_KRA_STATUS_FAIL,
      payload: error.response?.data?.message || error.message,
    });
    
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};
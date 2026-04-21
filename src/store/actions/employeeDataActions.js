import apiService from "../../services/apiService";
import {
  FETCH_EMPLOYEES_REQUEST,
  FETCH_EMPLOYEES_SUCCESS,
  FETCH_EMPLOYEES_FAIL,
} from "./types";

// Fetch all employees
export const fetchEmployees = () => async dispatch => {
  try {
    console.log('📝 Fetching employees...');
    
    dispatch({ type: FETCH_EMPLOYEES_REQUEST });

    const response = await apiService.get('/employee');

    console.log('📡 Response status:', response.status);

    if (response.status >= 200 && response.status < 300) {
      let employeesData = [];
      
      // Handle response structure
      if (response.data?.data && Array.isArray(response.data.data)) {
        employeesData = response.data.data;
      } else if (Array.isArray(response.data)) {
        employeesData = response.data;
      }

      console.log("✅ Fetched employees:", employeesData.length);

      dispatch({
        type: FETCH_EMPLOYEES_SUCCESS,
        payload: employeesData,
      });

      return { 
        success: true, 
        data: employeesData,
        message: response.data?.message 
      };
    } else {
      throw new Error(response.data?.message || 'Failed to fetch employees');
    }
    
  } catch (error) {
    console.log('❌ Fetch employees error:', error.message);
    
    dispatch({
      type: FETCH_EMPLOYEES_FAIL,
      payload: error.response?.data?.message || error.message || 'Failed to fetch employees',
    });
    
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};
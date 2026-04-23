import * as types from './types';
import apiService from '../../services/apiService';
import { logout } from './authActions';

export const getEmployeeProfile = () => async dispatch => {
  try {
    console.log('👤 Fetching employee profile...');

    dispatch({
      type: types.EMPLOYEE_PROFILE_REQUEST,
    });

    const response = await apiService.get('/employee/profile');

    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to fetch profile');
    }

    const profileData = response.data?.data || {};

    console.log('✅ Profile fetched:', profileData);

    dispatch({
      type: types.EMPLOYEE_PROFILE_SUCCESS,
      payload: profileData,
    });

    return {
      success: true,
      data: profileData,
    };
  } catch (error) {
    console.log('❌ Profile fetch error:', error.message);
    
    // Check for session expiry
    if (error.message === 'SESSION_EXPIRED' || error.isSessionExpired) {
      console.log('🔐 Session expired during profile fetch, logging out...');
      await dispatch(logout());
      return {
        success: false,
        error: 'SESSION_EXPIRED',
      };
    }
    
    dispatch({
      type: types.EMPLOYEE_PROFILE_FAIL,
      payload: error.response?.data?.message || error.message || 'Failed to fetch profile',
    });

    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};
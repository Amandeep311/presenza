import ReactNativeBiometrics from 'react-native-biometrics';
import EncryptedStorage from 'react-native-encrypted-storage';
import DeviceInfo from 'react-native-device-info';
import { BASE_URL } from '../../utils/GlobalText';
import apiSevice from '../../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  saveTokens,
  getAccessToken,
  getRefreshToken,
  getUser,
  clearTokens,
  forceClearTokens,
  debugKeychain,
} from '../../utils/keychainHelper';

// Import action types - YAHAN AUTH_LOADING BHI IMPORT KARO
import {
  SEND_OTP_REQUEST,
  SEND_OTP_SUCCESS,
  SEND_OTP_FAIL,
  VERIFY_OTP_REQUEST,
  VERIFY_OTP_SUCCESS,
  VERIFY_OTP_FAIL,
  BIOMETRIC_LOGIN_REQUEST,
  BIOMETRIC_LOGIN_SUCCESS,
  BIOMETRIC_LOGIN_FAIL,
  REFRESH_TOKEN_REQUEST,
  REFRESH_TOKEN_SUCCESS,
  REFRESH_TOKEN_FAIL,
  LOGOUT,
  RESET_APP_STATE,
  SET_BIOMETRIC_AVAILABLE,
  AUTH_LOADING, // 👈 YEH ADD KARO
} from '../reducers/authReducer';

import { UI_SET_ALERT, UI_HIDE_ALERT } from '../reducers/uiReducer';
import { showToast } from '../../components/common/ToastProvider';

const rnBiometrics = new ReactNativeBiometrics();

// ==================== DEVICE INFO HELPERS ====================
const getDeviceInfo = async () => {
  try {
    return {
      deviceId: await DeviceInfo.getUniqueId(),
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appVersion: DeviceInfo.getVersion(),
      osVersion: DeviceInfo.getSystemVersion(),
    };
  } catch (error) {
    console.log('❌ Error getting device info:', error);
    return {
      deviceId: 'unknown',
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appVersion: '1.0',
      osVersion: '1.0',
    };
  }
};

// ==================== UI ACTIONS ====================
export const setAlert = (message, type = 'success') => ({
  type: UI_SET_ALERT,
  payload: { message, type },
});

export const hideAlert = () => ({
  type: UI_HIDE_ALERT,
});

// ==================== BIOMETRIC ACTIONS ====================
export const checkBiometricAvailability = () => async dispatch => {
  try {
    const { available } = await rnBiometrics.isSensorAvailable();
    dispatch({ type: SET_BIOMETRIC_AVAILABLE, payload: available });
    return available;
  } catch (error) {
    console.log('Biometric check error:', error);
    dispatch({ type: SET_BIOMETRIC_AVAILABLE, payload: false });
    return false;
  }
};

export const initBiometrics = () => async dispatch => {
  try {
    const { available } = await rnBiometrics.isSensorAvailable();
    if (available) {
      const { keysExist } = await rnBiometrics.biometricKeysExist();
      if (!keysExist) {
        await rnBiometrics.createKeys();
      }
      dispatch({ type: SET_BIOMETRIC_AVAILABLE, payload: true });
      return true;
    }
    dispatch({ type: SET_BIOMETRIC_AVAILABLE, payload: false });
    return false;
  } catch (error) {
    console.log('Biometrics init error:', error);
    dispatch({ type: SET_BIOMETRIC_AVAILABLE, payload: false });
    return false;
  }
};

// ==================== SEND OTP ACTIONS ====================
export const sendOtp = emp => async dispatch => {
  try {
    dispatch({ type: SEND_OTP_REQUEST });

    const cleanEmployeeId = emp.trim().toUpperCase();
    const deviceInfo = await getDeviceInfo();

    // Get FCM token from AsyncStorage (saved during app initialization)
    let fcmToken = await AsyncStorage.getItem('fcm_token');
    
    // If not found in AsyncStorage, try to get it from device
    if (!fcmToken) {
      try {
        // Import messaging dynamically to avoid issues
        const messaging = require('@react-native-firebase/messaging').default;
        fcmToken = await messaging().getToken();
        // Save for future use
        await AsyncStorage.setItem('fcm_token', fcmToken);
      } catch (error) {
        console.log('⚠️ Could not get FCM token:', error);
        fcmToken = '';
      }
    }

    const payload = {
      employeeCode: cleanEmployeeId,
      device: {
        deviceId: deviceInfo.deviceId,
        deviceType: 'MOBILE',
        fcmToken: fcmToken || '', // Add FCM token
      },
    };

    console.log('📤 Send OTP Payload:', payload);

    const response = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-device-id': deviceInfo.deviceId,
        'x-platform': deviceInfo.platform,
        'x-app-version': deviceInfo.appVersion,
        'x-os-version': deviceInfo.osVersion,
        'x-fcmToken': fcmToken || '',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      dispatch({
        type: SEND_OTP_FAIL,
        payload: data.message || 'Failed to send OTP',
      });
      showToast(data.message || 'Failed to send OTP', 'error');
      return { success: false, message: data.message };
    }

    dispatch({
      type: SEND_OTP_SUCCESS,
      payload: {
        employeeCode: cleanEmployeeId,
        message: data.message,
      },
    });

    showToast('OTP sent successfully', 'success');
    return {
      success: true,
      step: data.step,
      employeeCode: cleanEmployeeId,
    };
  } catch (error) {
    console.log('Send OTP error:', error);
    dispatch({
      type: SEND_OTP_FAIL,
      payload: 'Network error. Please try again.',
    });
    showToast('Network error. Please try again.', 'error');
    return { success: false };
  }
};

// ==================== RESEND OTP ACTIONS ====================
export const resendOtp = (emp, fcmToken) => async dispatch => {
  try {
    dispatch({ type: SEND_OTP_REQUEST });

    // ✅ FIX: Use the emp parameter passed from VerifyOTP screen, not from state
    const cleanEmployeeId = emp.trim().toUpperCase();
    const deviceInfo = await getDeviceInfo();

    // If fcmToken is not provided, try to get it from AsyncStorage
    let token = fcmToken;
    if (!token) {
      token = await AsyncStorage.getItem('fcm_token');
      if (!token) {
        try {
          const messaging = require('@react-native-firebase/messaging').default;
          token = await messaging().getToken();
          await AsyncStorage.setItem('fcm_token', token);
        } catch (error) {
          console.log('⚠️ Could not get FCM token for resend:', error);
          token = '';
        }
      }
    }

    const payload = {
      employeeCode: cleanEmployeeId,
      device: {
        deviceId: deviceInfo.deviceId,
        deviceType: 'MOBILE',
        fcmToken: token || '', // Add FCM token
      },
    };

    console.log('📤 Resend OTP Payload:', payload);

    const response = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-device-id': deviceInfo.deviceId,
        'x-platform': deviceInfo.platform,
        'x-app-version': deviceInfo.appVersion,
        'x-os-version': deviceInfo.osVersion,
        'x-fcmToken': token || '',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      dispatch({
        type: SEND_OTP_FAIL,
        payload: data.message || 'Failed to resend OTP',
      });
      showToast(data.message || 'Failed to resend OTP', 'error');
      return { success: false };
    }

    dispatch({
      type: SEND_OTP_SUCCESS,
      payload: { employeeCode: cleanEmployeeId },
    });

    return { success: true };
  } catch (error) {
    console.log('Resend OTP error:', error);
    dispatch({
      type: SEND_OTP_FAIL,
      payload: 'Network error. Please try again.',
    });
    showToast('Network error. Please try again.', 'error');
    return { success: false };
  }
};

// ==================== VERIFY OTP ACTIONS ====================
export const verifyOtp = (employeeCode, otp, fcmToken) => async dispatch => {
  try {
    dispatch({ type: VERIFY_OTP_REQUEST });

    const deviceInfo = await getDeviceInfo();

    // If fcmToken is not provided, try to get it from AsyncStorage
    let token = fcmToken;
    if (!token) {
      token = await AsyncStorage.getItem('fcm_token');
      if (!token) {
        try {
          const messaging = require('@react-native-firebase/messaging').default;
          token = await messaging().getToken();
          await AsyncStorage.setItem('fcm_token', token);
        } catch (error) {
          console.log('⚠️ Could not get FCM token for verification:', error);
          token = '';
        }
      }
    }

    const payload = {
      employeeCode,
      otp,
      device: {
        deviceId: deviceInfo.deviceId,
        deviceType: 'MOBILE',
        fcmToken: token || '', // Add FCM token
      },
    };

    console.log('📤 Verify OTP Payload:', payload);

    const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': deviceInfo.deviceId,
        'x-platform': deviceInfo.platform,
        'x-app-version': deviceInfo.appVersion,
        'x-os-version': deviceInfo.osVersion,
        'x-fcmToken': token || '',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      dispatch({
        type: VERIFY_OTP_FAIL,
        payload: data.message || 'OTP verification failed',
      });
      showToast(data.message || 'OTP verification failed', 'error');
      return { success: false, message: data.message };
    }

    const { access, refresh } = data.data.tokens;
    const user = data.data.user;

    // Save FCM token to AsyncStorage for future use
    if (token) {
      await AsyncStorage.setItem('fcm_token', token);
    }

    await saveTokens(access.token, refresh.token, user);
    await AsyncStorage.setItem('user', JSON.stringify(user));

    dispatch({
      type: VERIFY_OTP_SUCCESS,
      payload: {
        accessToken: access.token,
        refreshToken: refresh.token,
        user,
      },
    });

    // showToast('Login successful', 'success');
    return { success: true, data: data.data };
  } catch (error) {
    console.log('Verify OTP error:', error);
    dispatch({
      type: VERIFY_OTP_FAIL,
      payload: 'Network error. Please try again.',
    });
    showToast('Network error. Please try again.', 'error');
    return { success: false };
  }
};

// ==================== BIOMETRIC LOGIN ACTIONS ====================
export const biometricLogin = () => async dispatch => {
  try {
    console.log('🔐 Biometric login attempt...');
    dispatch({ type: BIOMETRIC_LOGIN_REQUEST });

    const { available } = await rnBiometrics.isSensorAvailable();
    console.log('📱 Biometric available:', available);

    if (!available) {
      console.log('❌ Biometric not available');
      dispatch({
        type: BIOMETRIC_LOGIN_FAIL,
        payload: 'Biometric not available',
      });
      return { success: false };
    }

    console.log('🖐️ Prompting for biometric...');
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: 'Authenticate to continue',
    });

    console.log('📱 Biometric prompt result:', success);

    if (!success) {
      console.log('❌ Biometric authentication failed');
      dispatch({
        type: BIOMETRIC_LOGIN_FAIL,
        payload: 'Biometric authentication failed',
      });
      return { success: false };
    }

    console.log('🔑 Getting credentials from AsyncStorage...');
    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();
    const user = await getUser();

    console.log('📦 Credentials found:', !!accessToken);

    if (accessToken && refreshToken && user) {
      console.log('✅ Biometric login successful, restoring session...');
      dispatch({
        type: BIOMETRIC_LOGIN_SUCCESS,
        payload: { accessToken, refreshToken, user },
      });
      return { success: true };
    }

    console.log('❌ No access token found');
    dispatch({
      type: BIOMETRIC_LOGIN_FAIL,
      payload: 'No saved credentials found',
    });
    return { success: false };
  } catch (error) {
    console.log('❌ Biometric login error:', error);
    showToast(error.message || 'Biometric login failed', 'error');
    dispatch({
      type: BIOMETRIC_LOGIN_FAIL,
      payload: error.message,
    });
    return { success: false };
  }
};

// ==================== TOKEN REFRESH ACTIONS ====================
export const refreshToken = refreshToken => async dispatch => {
  try {
    dispatch({ type: REFRESH_TOKEN_REQUEST });

    const deviceInfo = await getDeviceInfo();

    const response = await fetch(`${BASE_URL}/auth/refresh-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': deviceInfo.deviceId,
        'x-platform': deviceInfo.platform,
        'x-app-version': deviceInfo.appVersion,
        'x-os-version': deviceInfo.osVersion,
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const { access } = data.data;

    await AsyncStorage.setItem('accessToken', access.token);

    dispatch({
      type: REFRESH_TOKEN_SUCCESS,
      payload: access.token,
    });

    return access.token;
  } catch (error) {
    console.log('Refresh token error:', error);
    dispatch({ type: REFRESH_TOKEN_FAIL });
    dispatch(logout());
    return null;
  }
};

// ==================== SIMPLE LOGOUT ACTIONS ====================
let isLoggingOut = false;

export const logout =
  (skipToast = false) =>
  async dispatch => {
    // Prevent multiple simultaneous logouts
    if (isLoggingOut) {
      console.log('🚪 Logout already in progress, skipping...');
      return;
    }

    isLoggingOut = true;

    try {
      console.log('🚪 Logout started...');

      // Try to call logout API (don't wait for it)
      const accessToken = await getAccessToken();
      const refreshToken = await getRefreshToken();
      const user = await getUser();
      const wasLoggedIn = !!(accessToken || refreshToken || user);

      const deviceInfo = await getDeviceInfo();

      if (accessToken) {
        try {
          await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              'x-device-id': deviceInfo.deviceId,
              'x-platform': deviceInfo.platform,
              'x-app-version': deviceInfo.appVersion,
              'x-os-version': deviceInfo.osVersion,
            },
          }).catch(e => console.log('Logout API call failed:', e));
        } catch (e) {
          console.log('Logout API error:', e);
        }
      }

      // Clear ONLY our specific keys, NOT everything
      await clearTokens();

      // Clear FCM token on logout
      await AsyncStorage.removeItem('fcm_token');

      // Dispatch logout action to clear Redux state
      dispatch({ type: LOGOUT });

      // Reset all other states
      dispatch({ type: 'ATTENDANCE_RESET_STATE' });
      dispatch({ type: 'EMPLOYEE_PROFILE_RESET' });
      dispatch({ type: 'LEAVE_RESET_STATE' });
      dispatch({ type: 'EXPENSE_RESET_STATE' });

      // Only show toast if not skipping (i.e., not initial check)
      if (!skipToast && wasLoggedIn) {
        showToast('Logged out successfully', 'success');
      }
      console.log('✅ Logout complete');
    } catch (error) {
      console.log('❌ Logout error:', error);
      dispatch({ type: LOGOUT });
    } finally {
      setTimeout(() => {
        isLoggingOut = false;
      }, 1000);
    }
  };

export const resetAppState = () => ({
  type: RESET_APP_STATE,
});

// ==================== CHECK AUTH STATE ====================
export const checkAuthState = () => async dispatch => {
  try {
    console.log('🔍 Checking auth state...');

    // Pehle loading true karo
    dispatch({ type: AUTH_LOADING, payload: true });

    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();
    const user = await getUser();

    console.log('📦 Storage check:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasUser: !!user,
    });

    if (accessToken && refreshToken && user) {
      console.log('✅ User found, restoring session...');
      dispatch({
        type: VERIFY_OTP_SUCCESS,
        payload: { accessToken, refreshToken, user },
      });
    } else {
      console.log('❌ No user found, staying on login screen');
      // 🔥 FIX: Don't dispatch LOGOUT action here
      // Just set loading to false and let user see login screen
      dispatch({ type: AUTH_LOADING, payload: false });
      // Remove this line: dispatch({ type: LOGOUT });
    }

    return { success: true };
  } catch (error) {
    console.log('❌ Check auth error:', error);
    dispatch({ type: AUTH_LOADING, payload: false });
    return { success: false };
  }
};

// ==================== UPDATE FCM TOKEN ====================
export const updateFCMToken = (fcmToken) => async dispatch => {
  try {
    if (!fcmToken) {
      console.log('⚠️ No FCM token provided to update');
      return { success: false };
    }

    // Save token to AsyncStorage
    await AsyncStorage.setItem('fcm_token', fcmToken);

    // If user is logged in, send token to server
    const accessToken = await getAccessToken();
    if (accessToken) {
      const deviceInfo = await getDeviceInfo();
      
      const response = await fetch(`${BASE_URL}/auth/update-fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-device-id': deviceInfo.deviceId,
          'x-platform': deviceInfo.platform,
          'x-app-version': deviceInfo.appVersion,
          'x-os-version': deviceInfo.osVersion,
          'x-fcmToken': fcmToken,
        },
        body: JSON.stringify({ fcmToken }),
      });

      if (response.ok) {
        console.log('✅ FCM token updated on server');
      } else {
        console.log('⚠️ Failed to update FCM token on server');
      }
    }

    return { success: true };
  } catch (error) {
    console.log('❌ Error updating FCM token:', error);
    return { success: false };
  }
};
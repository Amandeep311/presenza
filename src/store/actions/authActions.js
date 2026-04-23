import ReactNativeBiometrics from 'react-native-biometrics';
import EncryptedStorage from 'react-native-encrypted-storage';
import DeviceInfo from 'react-native-device-info';
import { BASE_URL } from '../../utils/GlobalText';
import apiSevice from '../../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const rnBiometrics = new ReactNativeBiometrics();

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

    const payload = {
      employeeCode: emp.trim(),
      device: {
        deviceId: await DeviceInfo.getUniqueId(),
        deviceType: 'MOBILE',
      },
    };

    const response = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      dispatch({
        type: SEND_OTP_FAIL,
        payload: data.message || 'Failed to send OTP',
      });
      dispatch(setAlert(data.message || 'Failed to send OTP', 'error'));
      return { success: false, message: data.message };
    }

    dispatch({
      type: SEND_OTP_SUCCESS,
      payload: { employeeCode: emp.trim(), message: data.message },
    });

    dispatch(setAlert('OTP sent successfully', 'success'));
    return {
      success: true,
      step: data.step,
      employeeCode: emp.trim(),
    };
  } catch (error) {
    console.log('Send OTP error:', error);
    dispatch({
      type: SEND_OTP_FAIL,
      payload: 'Network error. Please try again.',
    });
    dispatch(setAlert('Network error. Please try again.', 'error'));
    return { success: false };
  }
};

// ==================== RESEND OTP ACTIONS ====================
export const resendOtp = emp => async dispatch => {
  try {
    dispatch({ type: SEND_OTP_REQUEST });

    const payload = {
      employeeCode: emp.trim().toLowerCase(),
      device: {
        deviceId: await DeviceInfo.getUniqueId(),
        deviceType: 'MOBILE',
      },
    };

    const response = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      dispatch({
        type: SEND_OTP_FAIL,
        payload: data.message || 'Failed to resend OTP',
      });
      return { success: false };
    }

    dispatch({
      type: SEND_OTP_SUCCESS,
      payload: { employeeCode: emp.trim().toLowerCase() },
    });

    return { success: true };
  } catch (error) {
    console.log('Resend OTP error:', error);
    dispatch({
      type: SEND_OTP_FAIL,
      payload: 'Network error. Please try again.',
    });
    return { success: false };
  }
};

// ==================== VERIFY OTP ACTIONS ====================
export const verifyOtp = (employeeCode, otp) => async dispatch => {
  try {
    dispatch({ type: VERIFY_OTP_REQUEST });

    const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeCode, otp }),
    });

    const data = await response.json();

    if (!response.ok) {
      dispatch({
        type: VERIFY_OTP_FAIL,
        payload: data.message || 'OTP verification failed',
      });
      dispatch(setAlert(data.message || 'OTP verification failed', 'error'));
      return { success: false, message: data.message };
    }

    const { access, refresh } = data.data.tokens;
    const user = data.data.user;

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

    // dispatch(setAlert('Login successful', 'success'));
    return { success: true, data: data.data };
  } catch (error) {
    console.log('Verify OTP error:', error);
    dispatch({
      type: VERIFY_OTP_FAIL,
      payload: 'Network error. Please try again.',
    });
    dispatch(setAlert('Network error. Please try again.', 'error'));
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

    const response = await fetch(`${BASE_URL}/auth/refresh-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

export const logout = () => async dispatch => {
  try {
    console.log('🚪 Logout started...');

    // Try to call logout API (don't wait for it)
    const accessToken = await getAccessToken();
    if (accessToken) {
      try {
        await fetch(`${BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }).catch(e => console.log('Logout API call failed:', e));
      } catch (e) {
        console.log('Logout API error:', e);
      }
    }

    // Clear ONLY our specific keys, NOT everything
    await clearTokens(); // This should clear only our tokens
    
    // IMPORTANT: Don't use AsyncStorage.clear() as it will wipe everything
    // Don't use EncryptedStorage.clear() as it will wipe everything
    
    // Dispatch logout action to clear Redux state
    dispatch({ type: LOGOUT });
    
    // Reset all other states
    dispatch({ type: 'ATTENDANCE_RESET_STATE' });
    dispatch({ type: 'EMPLOYEE_PROFILE_RESET' });
    dispatch({ type: 'LEAVE_RESET_STATE' });
    
    dispatch(setAlert('Logged out successfully', 'success'));
    console.log('✅ Logout complete');
  } catch (error) {
    console.log('❌ Logout error:', error);
    // Even if error, clear Redux state
    dispatch({ type: LOGOUT });
  }
};

export const resetAppState = () => ({
  type: RESET_APP_STATE,
});

// // ==================== HELPER FUNCTIONS ====================
// const saveCredentialsToKeychain = async (
//   email,
//   accessToken,
//   refreshToken,
//   user,
// ) => {
//   try {
//     const credentials = JSON.stringify({
//       email,
//       accessToken,
//       refreshToken,
//       user,
//     });

//     await Keychain.setInternetCredentials(
//       'com.presenza.app',
//       'user_credentials',
//       credentials,
//     );

//     await EncryptedStorage.setItem(
//       'auth_tokens',
//       JSON.stringify({
//         accessToken,
//         refreshToken,
//       }),
//     );

//     return true;
//   } catch (error) {
//     console.log('Save credentials error:', error);
//     return false;
//   }
// };

// const getCredentialsFromKeychain = async () => {
//   try {
//     const credentials = await Keychain.getInternetCredentials(
//       'com.presenza.app',
//     );
//     if (credentials) {
//       return JSON.parse(credentials.password);
//     }
//     return null;
//   } catch (error) {
//     console.log('Get credentials error:', error);
//     return null;
//   }
// };

// ==================== CHECK AUTH STATE ====================
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
      dispatch({ type: LOGOUT }); // ✅ THIS IS THE REAL FIX
    }

    return { success: true };
  } catch (error) {
    console.log('❌ Check auth error:', error);
    dispatch({ type: AUTH_LOADING, payload: false });
    return { success: false };
  }
};

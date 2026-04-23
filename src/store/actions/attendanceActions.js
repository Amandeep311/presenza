import {
  checkAndRequestLocationPermission,
  getCurrentLocation,
} from '../../utils/utils';
import { getAddressFromCoords } from '../../utils/utils';
import { launchCamera } from 'react-native-image-picker';
import { requestCameraPermission } from '../../utils/utils';
import apiService from '../../services/apiService';
import * as types from './types';
import { logout, setAlert } from './authActions';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import ImageResizer from 'react-native-image-resizer';

// ==================== HELPER FUNCTIONS ====================

const compressImage = async uri => {
  try {
    console.log('🖼️ Compressing image...');
    const response = await ImageResizer.createResizedImage(
      uri,
      1024,
      1024,
      'JPEG',
      70,
      0,
      undefined,
      false,
      { mode: 'contain', onlyScaleDown: true },
    );
    console.log('✅ Image compressed:', response.uri);
    return response;
  } catch (error) {
    console.log('❌ Image compression failed, using original:', error);
    return { uri };
  }
};

const checkNetworkWithRetry = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) throw new Error('NO_INTERNET');

      if (netInfo.isInternetReachable === false) {
        if (Platform.OS === 'android') {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            await fetch('https://www.google.com', {
              method: 'HEAD',
              signal: controller.signal,
              mode: 'no-cors',
            });
            clearTimeout(timeoutId);
            return true;
          } catch {
            if (i === retries - 1) throw new Error('NO_INTERNET_REACHABLE');
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
        } else {
          if (i === retries - 1) throw new Error('NO_INTERNET_REACHABLE');
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
      }
      return true;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};

const getLocationWithTimeout = async (timeout = 15000) => {
  const location = await Promise.race([
    getCurrentLocation(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('LOCATION_TIMEOUT')), timeout),
    ),
  ]);
  return location;
};

const openCameraWithTimeout = async (options, timeout = 30000) => {
  return Promise.race([
    launchCamera(options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('CAMERA_TIMEOUT')), timeout),
    ),
  ]);
};

// ==================== PUNCH IN ====================
export const punchIn = () => async dispatch => {
  try {
    console.log('📝 PUNCH IN: Starting...');
    dispatch({ type: types.PUNCH_IN_REQUEST });

    await checkNetworkWithRetry();

    // Check and request location permission
    const hasLocationPermission = await checkAndRequestLocationPermission();
    if (!hasLocationPermission) {
      dispatch(
        setAlert('Location permission is required for attendance', 'error'),
      );
      dispatch({
        type: types.PUNCH_IN_FAIL,
        payload: 'Location permission denied',
      });
      return { success: false, error: 'LOCATION_PERMISSION_DENIED' };
    }
    const location = await getLocationWithTimeout();
    const { latitude, longitude } = location;

    let address = `${latitude}, ${longitude}`;
    try {
      address = await getAddressFromCoords(latitude, longitude);
    } catch (e) {
      console.log('⚠️ Address fetch failed, using coords');
    }

    const hasCameraPermission = await requestCameraPermission();
    if (!hasCameraPermission) {
      dispatch(setAlert('Camera permission is required', 'error'));
      dispatch({
        type: types.PUNCH_IN_FAIL,
        payload: 'Camera permission denied',
      });
      return { success: false, error: 'CAMERA_PERMISSION_DENIED' };
    }

    const cameraResult = await openCameraWithTimeout({
      mediaType: 'photo',
      cameraType: 'front',
      quality: 0.7,
      saveToPhotos: false,
      includeBase64: false,
    });

    if (cameraResult.didCancel) {
      dispatch({ type: types.PUNCH_IN_FAIL, payload: 'Camera cancelled' });
      return { success: false, error: 'CAMERA_CANCELLED' };
    }

    if (!cameraResult.assets || cameraResult.assets.length === 0) {
      dispatch(setAlert('Failed to capture image', 'error'));
      dispatch({ type: types.PUNCH_IN_FAIL, payload: 'No image captured' });
      return { success: false, error: 'NO_IMAGE' };
    }

    const photo = cameraResult.assets[0];
    const compressedImage = await compressImage(photo.uri);

    const formData = new FormData();
    formData.append('latitude', String(latitude));
    formData.append('longitude', String(longitude));
    formData.append('address', address);
    formData.append('timestamp', String(Date.now()));
    formData.append(
      'deviceInfo',
      JSON.stringify({
        platform: Platform.OS,
        version: Platform.Version,
      }),
    );

    let fileUri = compressedImage.uri;
    if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
      fileUri = 'file://' + fileUri;
    }

    formData.append('image', {
      uri: fileUri,
      type: photo.type || 'image/jpeg',
      name: photo.fileName || `selfie_${Date.now()}.jpg`,
    });

    console.log('🌐 POST /attendance/punch-in');
    const response = await apiService.upload('/attendance/punch-in', formData);

    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', JSON.stringify(response.data, null, 2));

    if (response.status === 409) {
      dispatch(setAlert('Already punched in today!', 'info'));
      return { success: false, error: 'ALREADY_PUNCHED_IN' };
    }

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(response.data?.message || 'Punch in failed');
    }

    console.log('✅ Punch in successful');
    dispatch({
      type: types.PUNCH_IN_SUCCESS,
      payload: response.data?.data || response.data,
    });
    dispatch(setAlert('Attendance marked successfully!', 'success'));
    await dispatch(getAttendanceHistory());

    return { success: true, data: response.data?.data };
  } catch (error) {
    console.log('❌ Punch in error:', error.message);

    let errorMessage = 'Punch in failed';
    let errorType = 'UNKNOWN_ERROR';

    if (error.response?.status === 409) {
      errorMessage = 'Already punched in today!';
      errorType = 'ALREADY_PUNCHED_IN';
    } else if (error.message === 'NO_INTERNET') {
      errorMessage = 'No internet connection';
      errorType = 'NO_INTERNET';
    } else if (error.message === 'LOCATION_TIMEOUT') {
      errorMessage = 'Location timeout. Please enable GPS.';
      errorType = 'LOCATION_TIMEOUT';
    } else if (error.message === 'LOCATION_FAILED') {
      errorMessage = 'Failed to get location. Please enable GPS.';
      errorType = 'LOCATION_FAILED';
    } else if (error.message === 'CAMERA_TIMEOUT') {
      errorMessage = 'Camera not responding. Please restart app.';
      errorType = 'CAMERA_TIMEOUT';
    } else {
      errorMessage =
        error.response?.data?.message || error.message || 'Punch in failed';
    }

    dispatch({ type: types.PUNCH_IN_FAIL, payload: errorMessage });

    if (errorType !== 'CAMERA_CANCELLED') {
      dispatch(setAlert(errorMessage, 'error'));
    }

    return { success: false, error: errorType, message: errorMessage };
  }
};

// ==================== PUNCH OUT ====================
export const punchOut = () => async dispatch => {
  try {
    console.log('📝 PUNCH OUT: Starting...');
    dispatch({ type: types.PUNCH_OUT_REQUEST });

    await checkNetworkWithRetry();

    // Check and request location permission
    const hasLocationPermission = await checkAndRequestLocationPermission();
    if (!hasLocationPermission) {
      dispatch(
        setAlert('Location permission is required for attendance', 'error'),
      );
      dispatch({
        type: types.PUNCH_OUT_FAIL,
        payload: 'Location permission denied',
      });
      return { success: false, error: 'LOCATION_PERMISSION_DENIED' };
    }

    const location = await getLocationWithTimeout();
    const { latitude, longitude } = location;

    let address = `${latitude}, ${longitude}`;
    try {
      address = await getAddressFromCoords(latitude, longitude);
    } catch (e) {
      console.log('⚠️ Address fetch failed, using coords');
    }

    const hasCameraPermission = await requestCameraPermission();
    if (!hasCameraPermission) {
      dispatch(setAlert('Camera permission is required', 'error'));
      dispatch({
        type: types.PUNCH_OUT_FAIL,
        payload: 'Camera permission denied',
      });
      return { success: false, error: 'CAMERA_PERMISSION_DENIED' };
    }

    const cameraResult = await openCameraWithTimeout({
      mediaType: 'photo',
      cameraType: 'front',
      quality: 0.7,
      saveToPhotos: false,
      includeBase64: false,
    });

    if (cameraResult.didCancel) {
      dispatch({ type: types.PUNCH_OUT_FAIL, payload: 'Camera cancelled' });
      return { success: false, error: 'CAMERA_CANCELLED' };
    }

    if (!cameraResult.assets || cameraResult.assets.length === 0) {
      dispatch(setAlert('Failed to capture image', 'error'));
      dispatch({ type: types.PUNCH_OUT_FAIL, payload: 'No image captured' });
      return { success: false, error: 'NO_IMAGE' };
    }

    const photo = cameraResult.assets[0];
    const compressedImage = await compressImage(photo.uri);

    const formData = new FormData();
    formData.append('latitude', String(latitude));
    formData.append('longitude', String(longitude));
    formData.append('address', address);
    formData.append('timestamp', String(Date.now()));

    let fileUri = compressedImage.uri;
    if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
      fileUri = 'file://' + fileUri;
    }

    formData.append('image', {
      uri: fileUri,
      type: photo.type || 'image/jpeg',
      name: photo.fileName || `selfie_${Date.now()}.jpg`,
    });

    console.log('🌐 POST /attendance/punch-out');
    const response = await apiService.upload('/attendance/punch-out', formData);

    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', JSON.stringify(response.data, null, 2));

    if (response.status === 400) {
      const msg = response.data?.message || 'Not punched in yet';
      dispatch(setAlert(msg, 'error'));
      return { success: false, error: 'NOT_PUNCHED_IN' };
    }

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(response.data?.message || 'Punch out failed');
    }

    console.log('✅ Punch out successful');
    dispatch({
      type: types.PUNCH_OUT_SUCCESS,
      payload: response.data?.data || response.data,
    });
    dispatch(setAlert('Punch out successful!', 'success'));
    await dispatch(getAttendanceHistory());

    return { success: true, data: response.data?.data };
  } catch (error) {
    console.log('❌ Punch out error:', error.message);

    let errorMessage = 'Punch out failed';

    if (error.response?.status === 400) {
      errorMessage = error.response.data?.message || 'Not punched in yet';
    } else if (error.message === 'NO_INTERNET') {
      errorMessage = 'No internet connection';
    } else if (error.message === 'LOCATION_TIMEOUT') {
      errorMessage = 'Location timeout. Please enable GPS.';
    } else if (error.message === 'CAMERA_TIMEOUT') {
      errorMessage = 'Camera not responding. Please restart app.';
    } else {
      errorMessage =
        error.response?.data?.message || error.message || 'Punch out failed';
    }

    dispatch({ type: types.PUNCH_OUT_FAIL, payload: errorMessage });

    if (error.message !== 'CAMERA_CANCELLED') {
      dispatch(setAlert(errorMessage, 'error'));
    }

    return { success: false, error: error.message, message: errorMessage };
  }
};

// ==================== GET ATTENDANCE HISTORY ====================
// attendanceActions.js - Add SESSION_EXPIRED handling

export const getAttendanceHistory = (params = {}) => async dispatch => {
  try {
    console.log('📊 Fetching attendance history...');
    dispatch({ type: types.ATTENDANCE_HISTORY_REQUEST });

    const queryParams = new URLSearchParams();
    if (params.month) queryParams.append('month', params.month);
    if (params.year) queryParams.append('year', params.year);
    if (params.limit) queryParams.append('limit', params.limit);

    const queryString = queryParams.toString();
    const endpoint = `/attendance/history${
      queryString ? `?${queryString}` : ''
    }`;

    const response = await apiService.get(endpoint);

    if (response.status !== 200) {
      throw new Error(response.data?.message || 'Failed to fetch history');
    }

    const historyData = response.data?.data || [];
    console.log('✅ History fetched:', historyData.length, 'records');

    dispatch({
      type: types.ATTENDANCE_HISTORY_SUCCESS,
      payload: historyData,
    });
    return { success: true, data: historyData };
  } catch (error) {
    console.log('❌ Get history error:', error.message);
    
    // Check for session expiry
    if (error.message === 'SESSION_EXPIRED' || error.isSessionExpired) {
      console.log('🔐 Session expired, logging out...');
      await dispatch(logout());
      return { success: false, error: 'SESSION_EXPIRED' };
    }
    
    dispatch({
      type: types.ATTENDANCE_HISTORY_FAIL,
      payload: error.message || 'Failed to fetch history',
    });
    return { success: false, error: error.message };
  }
};

// ==================== GET TODAY'S ATTENDANCE ====================
export const getTodayAttendance = () => async dispatch => {
  try {
    console.log("📊 Fetching today's attendance...");
    dispatch({ type: types.TODAY_ATTENDANCE_REQUEST });

    const response = await apiService.get('/attendance/today');

    console.log('📡 Response status:', response.status);

    if (response.status !== 200) {
      throw new Error(
        response.data?.message || "Failed to fetch today's attendance",
      );
    }

    const attendanceData = response.data?.data || null;
    console.log("✅ Today's attendance fetched:", attendanceData);

    dispatch({ type: types.TODAY_ATTENDANCE_SUCCESS, payload: attendanceData });
    return { success: true, data: attendanceData };
  } catch (error) {
    console.log('❌ Get today attendance error:', error.message);
    dispatch({
      type: types.TODAY_ATTENDANCE_FAIL,
      payload: error.message || "Failed to fetch today's attendance",
    });
    return { success: false, error: error.message };
  }
};

// ==================== GET ATTENDANCE STATS ====================
export const getAttendanceStats =
  (period = 'month') =>
  async dispatch => {
    try {
      console.log(`📊 Fetching attendance stats for ${period}...`);
      dispatch({ type: types.ATTENDANCE_STATS_REQUEST });

      const response = await apiService.get(
        `/attendance/stats?period=${period}`,
      );

      if (response.status !== 200) {
        throw new Error(response.data?.message || 'Failed to fetch stats');
      }

      dispatch({
        type: types.ATTENDANCE_STATS_SUCCESS,
        payload: response.data?.data,
      });
      return { success: true, data: response.data?.data };
    } catch (error) {
      console.log('❌ Get stats error:', error.message);
      dispatch({ type: types.ATTENDANCE_STATS_FAIL, payload: error.message });
      return { success: false };
    }
  };

// ==================== CLEAR ATTENDANCE STATE ====================
export const clearAttendanceState = () => ({
  type: types.CLEAR_ATTENDANCE_STATE,
});

// ==================== BREAK IN ====================
export const breakIn = (breakType, remarks) => async (dispatch, getState) => {
  try {
    console.log('☕ BREAK IN: Starting...');
    dispatch({ type: 'BREAK_IN_REQUEST' });

    console.log('🌐 POST /attendance/break-in', { breakType, remarks });
    const response = await apiService.post('/attendance/break-in', {
      breakType: breakType || 'LUNCH',
      remarks: remarks || 'Break started',
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', JSON.stringify(response.data, null, 2));

    if (response.status === 400) {
      const msg = response.data?.message || '';
      if (msg.toLowerCase().includes('already on a break')) {
        dispatch(setAlert('You are already on a break!', 'error'));
        return { success: false, error: 'ALREADY_ON_BREAK' };
      }
      if (msg.toLowerCase().includes('not punched in')) {
        dispatch(setAlert('Please punch in first!', 'error'));
        return { success: false, error: 'NOT_PUNCHED_IN' };
      }
      dispatch(setAlert(msg || 'Break in failed', 'error'));
      return { success: false, error: 'BAD_REQUEST', message: msg };
    }

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(response.data?.message || 'Break in failed');
    }

    if (response.data?.success === false) {
      throw new Error(response.data.message || 'Break in failed');
    }

    console.log('✅ Break in successful');
    dispatch({
      type: 'BREAK_IN_SUCCESS',
      payload: response.data?.data || response.data,
    });
    dispatch(setAlert('Break started!', 'success'));
    await dispatch(getAttendanceHistory());

    return { success: true, data: response.data?.data };
  } catch (error) {
    console.log('❌ Break in error:', error.message);

    const msg = error.response?.data?.message || error.message;

    dispatch({ type: 'BREAK_IN_FAIL', payload: msg });

    if (
      !msg?.toLowerCase().includes('already on a break') &&
      !msg?.toLowerCase().includes('not punched in')
    ) {
      dispatch(setAlert(msg || 'Failed to start break', 'error'));
    }

    return { success: false, message: msg };
  }
};

// ==================== BREAK OUT ====================
export const breakOut = (breakType, remarks) => async (dispatch, getState) => {
  try {
    console.log('☕ BREAK OUT: Starting...');
    dispatch({ type: 'BREAK_OUT_REQUEST' });

    console.log('🌐 POST /attendance/break-out', { breakType, remarks });
    const response = await apiService.post('/attendance/break-out', {
      breakType: breakType || 'LUNCH',
      remarks: remarks || 'Break ended',
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response data:', JSON.stringify(response.data, null, 2));

    if (response.status === 400) {
      const msg = response.data?.message || '';
      if (msg.toLowerCase().includes('not on a break')) {
        dispatch(setAlert('You are not on a break!', 'error'));
        return { success: false, error: 'NOT_ON_BREAK' };
      }
      dispatch(setAlert(msg || 'Break out failed', 'error'));
      return { success: false, error: 'BAD_REQUEST', message: msg };
    }

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(response.data?.message || 'Break out failed');
    }

    if (response.data?.success === false) {
      throw new Error(response.data.message || 'Break out failed');
    }

    console.log('✅ Break out successful');
    dispatch({
      type: 'BREAK_OUT_SUCCESS',
      payload: response.data?.data || response.data,
    });
    dispatch(setAlert('Break ended!', 'success'));
    await dispatch(getAttendanceHistory());

    return { success: true, data: response.data?.data };
  } catch (error) {
    console.log('❌ Break out error:', error.message);

    const msg = error.response?.data?.message || error.message;

    dispatch({ type: 'BREAK_OUT_FAIL', payload: msg });

    if (!msg?.toLowerCase().includes('not on a break')) {
      dispatch(setAlert(msg || 'Failed to end break', 'error'));
    }

    return { success: false, message: msg };
  }
};

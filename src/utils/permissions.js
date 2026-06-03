// src/utils/permissions.js
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

let permissionCallbacks = null;

/**
 * Check and request camera permission
 */
export const requestCameraPermission = async (showSettingsAlert = true) => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: '📸 Camera Permission',
          message: 'App needs camera access to capture your attendance selfie',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        }
      );
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Camera permission granted');
        return { granted: true, status: 'granted' };
      } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        if (showSettingsAlert) {
          Alert.alert(
            '📸 Camera Permission Required',
            'Camera permission is needed for attendance verification.\n\nWithout this permission, you will not be able to Punch In/Out.',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
        return { granted: false, status: 'blocked', message: 'Camera permission permanently denied' };
      } else {
        return { granted: false, status: 'denied', message: 'Camera permission denied' };
      }
    } catch (err) {
      console.warn('Camera permission error:', err);
      return { granted: false, status: 'error', message: err.message };
    }
  } else {
    // iOS
    try {
      const status = await check(PERMISSIONS.IOS.CAMERA);
      
      if (status === RESULTS.GRANTED) {
        return { granted: true, status: 'granted' };
      } else if (status === RESULTS.DENIED) {
        const requestStatus = await request(PERMISSIONS.IOS.CAMERA);
        return { 
          granted: requestStatus === RESULTS.GRANTED, 
          status: requestStatus === RESULTS.GRANTED ? 'granted' : 'denied',
          message: requestStatus === RESULTS.GRANTED ? null : 'Camera permission denied'
        };
      } else if (status === RESULTS.BLOCKED) {
        if (showSettingsAlert) {
          Alert.alert(
            '📸 Camera Permission Required',
            'Camera permission is needed for attendance verification.\n\nWithout this permission, you will not be able to Punch In/Out.',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
        return { granted: false, status: 'blocked', message: 'Camera permission blocked' };
      } else {
        return { granted: false, status: 'denied', message: 'Camera permission denied' };
      }
    } catch (err) {
      console.warn('Camera permission error:', err);
      return { granted: false, status: 'error', message: err.message };
    }
  }
};

/**
 * Check and request location permission
 */
export const requestLocationPermission = async (showSettingsAlert = true) => {
  if (Platform.OS === 'android') {
    try {
      // First check if already granted
      const fineLocationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      
      if (fineLocationGranted) {
        console.log('✅ Location permission already granted');
        return { granted: true, status: 'granted' };
      }
      
      // Request permission
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '📍 Location Permission',
          message: 'App needs location access to verify your attendance location',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        }
      );
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Location permission granted');
        return { granted: true, status: 'granted' };
      } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        if (showSettingsAlert) {
          Alert.alert(
            '📍 Location Permission Required',
            'Location permission is needed to verify your attendance location.\n\nWithout this permission, you will not be able to Punch In/Out.',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
        return { granted: false, status: 'blocked', message: 'Location permission permanently denied' };
      } else {
        return { granted: false, status: 'denied', message: 'Location permission denied' };
      }
    } catch (err) {
      console.warn('Location permission error:', err);
      return { granted: false, status: 'error', message: err.message };
    }
  } else {
    // iOS
    try {
      const status = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      
      if (status === RESULTS.GRANTED) {
        return { granted: true, status: 'granted' };
      } else if (status === RESULTS.DENIED) {
        const requestStatus = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return { 
          granted: requestStatus === RESULTS.GRANTED, 
          status: requestStatus === RESULTS.GRANTED ? 'granted' : 'denied',
          message: requestStatus === RESULTS.GRANTED ? null : 'Location permission denied'
        };
      } else if (status === RESULTS.BLOCKED) {
        if (showSettingsAlert) {
          Alert.alert(
            '📍 Location Permission Required',
            'Location permission is needed to verify your attendance location.\n\nWithout this permission, you will not be able to Punch In/Out.',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
        return { granted: false, status: 'blocked', message: 'Location permission blocked' };
      } else {
        return { granted: false, status: 'denied', message: 'Location permission denied' };
      }
    } catch (err) {
      console.warn('Location permission error:', err);
      return { granted: false, status: 'error', message: err.message };
    }
  }
};

/**
 * NEW FUNCTION: Just check permissions without requesting (for app start)
 */
export const checkPermissionsWithoutRequest = async () => {
  console.log('🔐 Checking permissions without requesting...');
  
  if (Platform.OS === 'android') {
    const cameraGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    const locationGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    
    return {
      camera: { granted: cameraGranted, status: cameraGranted ? 'granted' : 'denied' },
      location: { granted: locationGranted, status: locationGranted ? 'granted' : 'denied' },
      allGranted: cameraGranted && locationGranted
    };
  } else {
    const cameraStatus = await check(PERMISSIONS.IOS.CAMERA);
    const locationStatus = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    
    const cameraGranted = cameraStatus === RESULTS.GRANTED;
    const locationGranted = locationStatus === RESULTS.GRANTED;
    
    return {
      camera: { granted: cameraGranted, status: cameraGranted ? 'granted' : 'denied' },
      location: { granted: locationGranted, status: locationGranted ? 'granted' : 'denied' },
      allGranted: cameraGranted && locationGranted
    };
  }
};

/**
 * FIXED: Check both permissions at app start - ONLY CHECK, NO REQUEST
 * This only checks permissions without showing any dialogs or popups
 */
export const checkAllPermissionsAtStart = async () => {
  console.log('🔐 Checking all permissions at app start (no popups)...');
  
  // Use the check-only function
  const result = await checkPermissionsWithoutRequest();
  
  console.log('📱 Permission check result:', {
    camera: result.camera.granted,
    location: result.location.granted,
    allGranted: result.allGranted
  });
  
  return {
    camera: { granted: result.camera.granted, status: result.camera.status },
    location: { granted: result.location.granted, status: result.location.status },
    allGranted: result.allGranted
  };
};

/**
 * Quick check - no alerts (for background checks)
 */
export const quickCheckPermissions = async () => {
  if (Platform.OS === 'android') {
    const cameraGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    const locationGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    
    return {
      camera: cameraGranted,
      location: locationGranted,
      allGranted: cameraGranted && locationGranted
    };
  } else {
    const cameraStatus = await check(PERMISSIONS.IOS.CAMERA);
    const locationStatus = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    
    return {
      camera: cameraStatus === RESULTS.GRANTED,
      location: locationStatus === RESULTS.GRANTED,
      allGranted: cameraStatus === RESULTS.GRANTED && locationStatus === RESULTS.GRANTED
    };
  }
};

/**
 * Show permission required dialog for Punch In attempt
 */
export const showPermissionRequiredDialog = (missingPermissions, onOpenSettings) => {
  let message = '';
  
  if (missingPermissions.camera && missingPermissions.location) {
    message = 'Camera and Location permissions are required to Punch In/Out.\n\nPlease enable both permissions in settings.';
  } else if (missingPermissions.camera) {
    message = 'Camera permission is required to capture your attendance selfie.\n\nPlease enable camera permission in settings.';
  } else if (missingPermissions.location) {
    message = 'Location permission is required to verify your attendance location.\n\nPlease enable location permission in settings.';
  }
  
  Alert.alert(
    '⚠️ Permissions Required',
    message,
    [
      { text: 'Not Now', style: 'cancel' },
      { text: 'Open Settings', onPress: onOpenSettings }
    ]
  );
};

/**
 * Set callbacks for permission checks (to be used in DailyPunch screen)
 */
export const setPermissionCallbacks = (callbacks) => {
  permissionCallbacks = callbacks;
};

/**
 * Get permission status (for real-time checks)
 */
export const getPermissionStatus = async () => {
  const quickCheck = await quickCheckPermissions();
  return quickCheck;
};
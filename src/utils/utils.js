// src/utils/utils.js
import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { request, check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { GOOGLE_API_KEY } from './GlobalText';

export const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return '0 mins';
  
  const units = [
    { label: 'week', value: 7 * 24 * 60 }, // minutes in a week
    { label: 'day', value: 24 * 60 },      // minutes in a day
    { label: 'hour', value: 60 },           // minutes in an hour
    { label: 'min', value: 1 }              // minutes
  ];

  const result = [];
  let remaining = minutes;

  for (const unit of units) {
    if (remaining >= unit.value) {
      const count = Math.floor(remaining / unit.value);
      remaining %= unit.value;
      
      if (count > 0) {
        const plural = count > 1 ? `${unit.label}s` : unit.label;
        result.push(`${count} ${plural}`);
      }
    }
  }

  return result.join(' ') || `${minutes} mins`;
};

// Alternative formats based on need
export const formatDurationShort = (minutes) => {
  if (!minutes || minutes === 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const formatDurationDetailed = (minutes) => {
  if (!minutes || minutes === 0) return '0 minutes';
  
  const weeks = Math.floor(minutes / (7 * 24 * 60));
  const days = Math.floor((minutes % (7 * 24 * 60)) / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  
  const parts = [];
  if (weeks > 0) parts.push(`${weeks} week${weeks > 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (mins > 0) parts.push(`${mins} minute${mins > 1 ? 's' : ''}`);
  
  return parts.join(', ') || '0 minutes';
};

// For attendance/tracking specific format
export const formatAttendanceDuration = (minutes) => {
  if (!minutes || minutes === 0) return '--:--';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} hrs`;
};

/**
 * Get address from coordinates using Google Maps API
 */
export const getAddressFromCoords = async (lat, lng) => {
  const GOOGLE_API_KEY = 'AIzaSyA2aty_E8JFBJIIDS4hN2tIAvQCwy_yskk';

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();
    console.log("data=======",data);
    
    return data.results[0].formatted_address;

    if (data.status !== 'OK' || !data.results.length) {
      return 'Address unavailable';
    }

  } catch (error) {
    console.log('Geocode error:', error);
    return 'Address unavailable';
  }
};

/**
 * Check and request location permission
 */
export const checkAndRequestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      // Check if already granted
      const fineLocationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      const coarseLocationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      );
      
      if (fineLocationGranted && coarseLocationGranted) {
        console.log('Location permissions already granted');
        return true;
      }
      
      // Request permission
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'App needs access to your location for attendance verification',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Location permission granted');
        return true;
      } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Location Permission Required',
          'Location permission is needed to verify your attendance location. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      } else {
        Alert.alert('Location Permission Denied', 'Location access is required for attendance.');
        return false;
      }
    } catch (err) {
      console.warn('Location permission error:', err);
      return false;
    }
  } else {
    // iOS
    try {
      const status = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      if (status === RESULTS.GRANTED) {
        return true;
      } else if (status === RESULTS.DENIED) {
        const requestStatus = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (requestStatus === RESULTS.GRANTED) {
          return true;
        } else if (requestStatus === RESULTS.BLOCKED) {
          Alert.alert(
            'Location Permission Required',
            'Location permission is needed to verify your attendance location. Please enable it in settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
        return false;
      } else if (status === RESULTS.BLOCKED) {
        Alert.alert(
          'Location Permission Required',
          'Location permission is blocked. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }
      return false;
    } catch (err) {
      console.warn('Location permission error:', err);
      return false;
    }
  }
};

/**
 * Get current location with permission handling
 */
export const getCurrentLocation = async () => {
  // First check and request permission
  const hasPermission = await checkAndRequestLocationPermission();
  
  if (!hasPermission) {
    throw new Error('LOCATION_PERMISSION_DENIED');
  }
  
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('Location obtained:', { latitude, longitude, accuracy });
        resolve({ latitude, longitude, accuracy });
      },
      (error) => {
        console.log('Location error:', error);
        let errorMessage = 'LOCATION_FAILED';
        
        switch (error.code) {
          case 1:
            errorMessage = 'LOCATION_PERMISSION_DENIED';
            break;
          case 2:
            errorMessage = 'LOCATION_UNAVAILABLE';
            break;
          case 3:
            errorMessage = 'LOCATION_TIMEOUT';
            break;
          default:
            errorMessage = 'LOCATION_FAILED';
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        forceRequestLocation: true,
        showLocationDialog: true,
      }
    );
  });
};

/**
 * Request camera permission with proper handling
 */
export const requestCameraPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'App needs access to your camera for attendance selfies',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Camera permission granted');
        return true;
      } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Camera Permission Required',
          'Camera permission is needed for attendance verification. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      } else {
        Alert.alert('Camera Permission Denied', 'Camera access is required for attendance.');
        return false;
      }
    } catch (err) {
      console.warn('Camera permission error:', err);
      return false;
    }
  } else {
    // iOS
    try {
      const status = await check(PERMISSIONS.IOS.CAMERA);
      if (status === RESULTS.GRANTED) {
        return true;
      } else if (status === RESULTS.DENIED) {
        const requestStatus = await request(PERMISSIONS.IOS.CAMERA);
        if (requestStatus === RESULTS.GRANTED) {
          return true;
        } else if (requestStatus === RESULTS.BLOCKED) {
          Alert.alert(
            'Camera Permission Required',
            'Camera permission is needed for attendance verification. Please enable it in settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
        return false;
      } else if (status === RESULTS.BLOCKED) {
        Alert.alert(
          'Camera Permission Required',
          'Camera permission is blocked. Please enable it in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }
      return false;
    } catch (err) {
      console.warn('Camera permission error:', err);
      return false;
    }
  }
};

export const formatMinutesToHours = (minutes) => {
  if (!minutes && minutes !== 0) return '---';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} min`;
};

/**
 * Show permission dialog for both camera and location
 */
export const requestAllPermissions = async () => {
  const cameraGranted = await requestCameraPermission();
  const locationGranted = await checkAndRequestLocationPermission();
  
  return {
    camera: cameraGranted,
    location: locationGranted,
    allGranted: cameraGranted && locationGranted
  };
};

/**
 * Check if location services are enabled (Android only)
 */
export const isLocationEnabled = async () => {
  if (Platform.OS === 'android') {
    try {
      const locationEnabled = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return locationEnabled;
    } catch (err) {
      return false;
    }
  }
  return true; // iOS handled differently
};
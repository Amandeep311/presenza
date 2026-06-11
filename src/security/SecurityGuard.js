import { Alert, BackHandler, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

let compromised = false;
let lastTime = Date.now();
let intervalRef = null;
let lastServerCheck = null;
let backgroundTimestamp = null;

// 👇 GLOBAL HOOK (UI block ke liye)
global.setBlockedGlobal = null;

// ================= SERVER TIME SYNC (with retry and caching) =================
let cachedServerTime = null;
let lastServerFetchTime = 0;
const SERVER_CACHE_DURATION = 60000; // 1 minute cache

const getServerTime = async (forceRefresh = false) => {
  const now = Date.now();

  // Return cached server time if within duration
  if (
    !forceRefresh &&
    cachedServerTime &&
    now - lastServerFetchTime < SERVER_CACHE_DURATION
  ) {
    console.log('📦 Using cached server time');
    return cachedServerTime;
  }

  try {
    const response = await fetch('https://timeapi.io/api/v1/time/current/utc', {
      method: 'GET',
      headers: { accept: '*/*' },
      timeout: 5000, // 5 second timeout
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (data.utc_time) {
      cachedServerTime = new Date(data.utc_time).getTime();
      lastServerFetchTime = now;
      console.log('✅ Server time fetched successfully');
      return cachedServerTime;
    }
    return null;
  } catch (error) {
    console.log('⚠️ Server time fetch failed:', error.message);
    return cachedServerTime || null; // Return cached if available
  }
};

// ================= IMPROVED TIME TAMPERING DETECTION =================
const detectTimeTampering = async () => {
  const now = Date.now();
  const diff = Math.abs(now - lastTime); // Use absolute difference

  // 🟢 ALLOW natural background/foreground transitions
  // Background mein jane ke time ka diff store karo

  // Case 1: Very small normal difference (less than 5 seconds) - Always allow
  if (diff < 5000) {
    // 5 seconds ka buffer
    lastTime = now;
    return false;
  }

  // Case 2: Check if app was in background (user allowed to change timezone)
  if (backgroundTimestamp) {
    const backgroundDuration = now - backgroundTimestamp;
    // Agar phone background mein tha aur time difference background duration se kam hai
    // to legitimate timezone change ho sakta hai
    if (diff <= backgroundDuration + 60000) {
      // 1 minute extra buffer
      console.log('✅ Timezone change while in background (legitimate)');
      lastTime = now;
      backgroundTimestamp = null;
      return false;
    }
  }

  // Case 3: Time went backwards significantly (more than 30 seconds)
  if (now < lastTime - 30000) {
    console.log('⏪ Time went BACKWARDS by', Math.abs(now - lastTime), 'ms');
    return true;
  }

  // Case 4: Time jumped forward too much (more than 15 minutes)
  if (diff > 15 * 60 * 1000) {
    console.log('⏩ Time jumped FORWARD by', diff / 1000, 'seconds');
    return true;
  }

  // Case 5: Check with stored reference only if difference is massive
  const storedTime = await AsyncStorage.getItem('last_verified_time');
  if (storedTime) {
    const storedDiff = Math.abs(now - parseInt(storedTime));
    // Only block if difference is more than 1 hour without background
    if (storedDiff > 60 * 60 * 1000 && !backgroundTimestamp) {
      console.log(
        '⚠️ Large time mismatch without background:',
        storedDiff / 1000,
        'seconds',
      );
      return true;
    }
  }

  // Update lastTime
  lastTime = now;
  await AsyncStorage.setItem('last_verified_time', now.toString());
  return false;
};

// ================= IMPROVED SERVER TIME VALIDATION =================
const validateWithServerTime = async () => {
  // Don't validate too frequently (every 2 minutes minimum)
  const now = Date.now();
  if (lastServerCheck && now - lastServerCheck < 120000) {
    console.log('⏭️ Skipping server validation (too frequent)');
    return false;
  }

  try {
    const serverTime = await getServerTime();

    if (!serverTime) {
      console.log('⚠️ No server time available, skipping validation');
      return false;
    }

    const deviceTime = now;
    const timeDiff = Math.abs(deviceTime - serverTime);

    // 🟢 Much more lenient threshold (2 hours for legitimate travel)
    const TIME_VALIDATION_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours

    if (timeDiff > TIME_VALIDATION_THRESHOLD) {
      // Check if this is a one-time legitimate change
      const lastValidTime = await AsyncStorage.getItem(
        'last_valid_server_time',
      );
      if (lastValidTime) {
        const sinceLastValid = Math.abs(now - parseInt(lastValidTime));
        // Agar last valid check 6 hours se zyada purana hai, travel ho sakta hai
        if (sinceLastValid > 6 * 60 * 60 * 1000) {
          console.log('✅ Timezone change detected (likely legitimate travel)');
          await AsyncStorage.setItem('last_valid_server_time', now.toString());
          lastServerCheck = now;
          return false;
        }
      }

      console.log(
        '❌ Time difference too high:',
        timeDiff / 1000 / 60,
        'minutes',
      );
      lastServerCheck = now;
      return true;
    }

    console.log('✅ Server time validation passed');
    await AsyncStorage.setItem('last_valid_server_time', now.toString());
    lastServerCheck = now;
    return false;
  } catch (error) {
    console.log('❌ Error in validateWithServerTime:', error.message);
    return false;
  }
};

// ================= MOCK LOCATION (with debounce) =================
let lastMockCheck = 0;
const detectMockLocation = async () => {
  const now = Date.now();
  if (now - lastMockCheck < 10000) return false; // Debounce 10 seconds

  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      pos => {
        lastMockCheck = now;
        if (Platform.OS === 'android') {
          const isMocked = pos?.mocked === true;
          const accuracy = pos?.coords?.accuracy;
          const isSuspiciousAccuracy = accuracy === 5.0 || accuracy === 3.0;
          const detected = isMocked || (isSuspiciousAccuracy && accuracy < 10);

          if (detected) {
            console.log('📍 Mock location detected');
          }
          resolve(detected);
        } else {
          resolve(false);
        }
      },
      error => {
        console.log('❌ Geolocation error:', error.message);
        resolve(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 30000, // Allow 30 seconds old location
        forceRequestLocation: true,
        showLocationDialog: false, // Don't show dialog on background checks
      },
    );
  });
};

// ================= EMULATOR =================
const detectEmulator = async () => {
  try {
    return await DeviceInfo.isEmulator();
  } catch (error) {
    console.log('Emulator check error:', error);
    return false;
  }
};

// ================= DEBUGGER DETECTION =================
const detectDebugger = () => {
  if (
    typeof global.__REMOTEDEV__ !== 'undefined' &&
    global.__REMOTEDEV__ === true
  ) {
    console.log('🐛 Remote debugger detected');
    return true;
  }
  return false;
};

// ================= UPDATED: SHOW ALERT INSTEAD OF CRASHING =================
const showSecurityAlertAndContinue = (reason, details = '') => {
  console.log('🚨 SECURITY VIOLATION:', reason, details);

  Alert.alert(
    'Security Warning 🛡️',
    `${reason}\n\n${details}\n\nThis app cannot run on compromised devices.\n\nPlease enable automatic date & time and restart the app.`,
    [
      {
        text: 'Continue Anyway',
        onPress: () => {
          console.log('User chose to continue despite security warning');
          // You can optionally disable sensitive features here
        },
        style: 'cancel',
      },
      {
        text: 'Exit App',
        onPress: () => {
          if (Platform.OS === 'android') {
            BackHandler.exitApp();
          } else {
            // iOS: Just close the alert, can't programmatically exit
            console.log('iOS: User chose to exit - please close app manually');
            Alert.alert('Exit App', 'Please close the app manually from app switcher');
          }
        },
        style: 'destructive',
      }
    ],
    { cancelable: false }
  );
};

// ================= BLOCK UI (Updated to not crash) =================
const triggerBlock = (reason, details = '') => {
  if (compromised) return;

  compromised = true;
  console.log('🚨 SECURITY VIOLATION:', reason, details);

  if (global.setBlockedGlobal) {
    global.setBlockedGlobal(true);
  }

  // Show alert but don't crash the app
  showSecurityAlertAndContinue(reason, details);
};

// ================= IMPROVED APP STATE CHANGE HANDLER =================
export const onAppStateChange = async nextAppState => {
  console.log('📱 App state changed to:', nextAppState);

  const now = Date.now();

  // App coming to foreground
  if (nextAppState === 'active') {
    console.log('🔄 App came to foreground');

    // Don't run immediate time check - wait 1 second for system to stabilize
    setTimeout(async () => {
      if (compromised) return;

      // Only run server check if it's been more than 5 minutes
      const timeSinceLastServerCheck = now - (lastServerCheck || 0);
      if (timeSinceLastServerCheck > 5 * 60 * 1000) {
        const serverMismatch = await validateWithServerTime();
        if (serverMismatch) {
          triggerBlock(
            'Device time mismatch with server',
            'Your device time is incorrect.\nPlease enable automatic date & time.',
          );
        }
      }

      // Check mock location (lightweight)
      const isMock = await detectMockLocation();
      if (isMock && !__DEV__) {
        triggerBlock(
          'Mock location detected',
          'Please disable mock location apps',
        );
      }
    }, 1000);

    // Clear background timestamp after coming to foreground
    backgroundTimestamp = null;
  }

  // App going to background
  if (nextAppState.match(/inactive|background/)) {
    console.log('⏸️ App going to background');
    backgroundTimestamp = now;
  }
};

// ================= PAGE-LEVEL CHECK (Called when page opens) =================
export const performPageLevelSecurityCheck = async () => {
  console.log('🔐 Performing page-level security check...');

  if (compromised) return false;

  try {
    // Only run lightweight checks on page navigation
    const isMock = await detectMockLocation();
    if (isMock && !__DEV__) {
      triggerBlock(
        'Mock location detected',
        'Please disable mock location apps',
      );
      return false;
    }

    console.log('✅ Page-level security check passed');
    return true;
  } catch (error) {
    console.log('❌ Error during page-level check:', error);
    return true;
  }
};

// ================= MAIN INITIALIZATION =================
export const startSecurityGuard = async () => {
  console.log('🔒 Starting Security Guard...');

  try {
    const isDebugging = detectDebugger();
    if (isDebugging && !__DEV__) {
      triggerBlock('Debugger detected', 'Please disconnect debug tools');
      return;
    }

    // Optional: Emulator check (can be disabled for testing)
    const isEmulator = await detectEmulator();
    if (isEmulator && !__DEV__) {
      // triggerBlock('Emulator detected', 'This app cannot run on emulators');
      console.log('⚠️ Emulator detected (testing mode)');
    }

    // Initial server time check (more lenient)
    const serverTime = await getServerTime(true);
    if (serverTime) {
      const timeDiff = Math.abs(Date.now() - serverTime);
      if (timeDiff > 24 * 60 * 60 * 1000) {
        // 24 hours ka buffer
        triggerBlock(
          'Device time manipulation detected',
          'Your device time does not match server time.\nPlease enable automatic date & time.',
        );
        return;
      }
    }

    // Initialize lastTime
    lastTime = Date.now();
    await AsyncStorage.setItem('last_verified_time', lastTime.toString());

    console.log('✅ Security Guard initialization successful');

    // ✅ Periodic checks (every 30 seconds only, not 8 seconds)
    intervalRef = setInterval(async () => {
      if (compromised) {
        clearInterval(intervalRef);
        return;
      }

      // Only run heavy checks if app is in foreground
      if (!backgroundTimestamp) {
        const timeIssue = await detectTimeTampering();
        if (timeIssue) {
          triggerBlock(
            'Device time manipulation detected',
            'You changed the device time while app was running.\nPlease enable automatic date & time.',
          );
          return;
        }

        const mock = await detectMockLocation();
        if (mock && !__DEV__) {
          triggerBlock(
            'Mock location detected',
            'Please disable mock location apps',
          );
          return;
        }

        // Server validation every 5 minutes
        const now = Date.now();
        if (!lastServerCheck || now - lastServerCheck > 5 * 60 * 1000) {
          const serverMismatch = await validateWithServerTime();
          if (serverMismatch) {
            triggerBlock(
              'Device time mismatch with server',
              'Your device time is incorrect.\nPlease enable automatic date & time.',
            );
            return;
          }
        }
      }
    }, 30000); // Check every 30 seconds instead of 8 seconds
  } catch (error) {
    console.log('❌ Error starting security guard:', error);
  }
};

// ================= STOP SECURITY GUARD =================
export const stopSecurityGuard = () => {
  console.log('🔒 Stopping Security Guard...');
  if (intervalRef) {
    clearInterval(intervalRef);
    intervalRef = null;
  }
  lastServerCheck = null;
  backgroundTimestamp = null;
};

// ================= RESET =================
export const resetSecurityGuard = async () => {
  console.log('🔄 Resetting Security Guard...');
  await stopSecurityGuard();
  compromised = false;
  lastTime = Date.now();
  backgroundTimestamp = null;
  await startSecurityGuard();
};

// ================= GET COMPROMISE STATUS =================
export const isDeviceCompromised = () => compromised;

// ================= RESET COMPROMISE FLAG =================
export const resetCompromiseFlag = () => {
  console.log('🔧 Resetting compromise flag');
  compromised = false;
};
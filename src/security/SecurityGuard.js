import { Alert, BackHandler, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

let compromised = false;
let lastTime = Date.now();
let intervalRef = null;
let serverTimeSyncRef = null;
let appStateMonitorRef = null;

// 👇 GLOBAL HOOK (UI block ke liye)
global.setBlockedGlobal = null;

// ================= SERVER TIME SYNC =================
// Server se current UTC time fetch karne ke liye (timeapi.io)
const getServerTime = async () => {
  try {
    const response = await fetch('https://timeapi.io/api/v1/time/current/utc', {
      method: 'GET',
      headers: {
        accept: '*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // API response format: { "utc_time": "2026-04-24T04:29:36.006152Z" }
    if (data.utc_time) {
      return new Date(data.utc_time).getTime();
    }

    console.log('Invalid server time response:', data);
    return null;
  } catch (error) {
    console.log('Server time fetch failed:', error.message);
    return null;
  }
};

// ================= INITIAL TIME CHECK =================
const checkInitialTime = async () => {
  const serverTime = await getServerTime();

  if (!serverTime) {
    console.log('⚠️ Could not fetch server time, skipping initial check');
    return false;
  }

  const deviceTime = Date.now();
  const timeDiff = Math.abs(deviceTime - serverTime);

  console.log('📱 Device Time:', deviceTime);
  console.log('🌐 Server Time:', serverTime);
  console.log('⏱️ Time Difference:', timeDiff, 'ms');

  // 5 minutes se zyada difference hai toh time tampering
  const TIME_THRESHOLD = 15 * 60 * 1000; // 5 minutes

  if (timeDiff > TIME_THRESHOLD) {
    console.log(
      '❌ Time tampering detected! Difference:',
      timeDiff / 1000,
      'seconds',
    );
    return true;
  }

  // Store initial reference
  await AsyncStorage.setItem('last_verified_time', deviceTime.toString());
  console.log('✅ Initial time check passed');
  return false;
};

// ================= TIME TAMPERING DETECTION =================
const detectTimeTampering = async () => {
  const now = Date.now();
  const diff = now - lastTime;

  // CASE 1: Time went backwards (negative difference)
  if (diff < 0) {
    console.log('⏪ Time went BACKWARDS by', Math.abs(diff), 'ms');
    return true;
  }

  // CASE 2: Time jumped forward too much (more than 2 minutes)
  // This handles scenarios where time is manually advanced
  if (diff > 2 * 60 * 1000) {
    console.log('⏩ Time jumped FORWARD by', diff / 1000, 'seconds');
    return true;
  }

  // CASE 3: Check with stored last verified time from disk
  const storedTime = await AsyncStorage.getItem('last_verified_time');
  if (storedTime) {
    const storedDiff = Math.abs(now - parseInt(storedTime));
    // Agar stored time se 5 minute zyada difference hai aur interval se nahi aaya
    if (storedDiff > 5 * 60 * 1000 && intervalRef) {
      console.log(
        '🕐 Time mismatch with stored reference:',
        storedDiff / 1000,
        'seconds',
      );
      return true;
    }
  }

  lastTime = now;
  await AsyncStorage.setItem('last_verified_time', now.toString());
  return false;
};

// ================= SERVER TIME VALIDATION (Every 30 sec) =================
const validateWithServerTime = async () => {
  try {
    const serverTime = await getServerTime();

    if (!serverTime) {
      console.log('⚠️ Could not fetch server time, skipping validation');
      return false;
    }

    const deviceTime = Date.now();
    const timeDiff = Math.abs(deviceTime - serverTime);

    // Allow 1 hour difference for timezone changes
    const TIME_VALIDATION_THRESHOLD = 60 * 60 * 1000; // 1 hour
    const AUTOMATIC_TIMEZONE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

    // If difference is more than 1 hour, but user might be traveling
    if (timeDiff > TIME_VALIDATION_THRESHOLD) {
      // Check if this is a one-time legitimate change
      const lastValidTime = await AsyncStorage.getItem(
        'last_valid_server_time',
      );
      if (lastValidTime) {
        const sinceLastValid = Date.now() - parseInt(lastValidTime);
        // If last check was long ago (>24h), user might have traveled legitimately
        if (sinceLastValid > AUTOMATIC_TIMEZONE_THRESHOLD) {
          console.log(
            '✅ Timezone change detected - probably legitimate travel',
          );
          await AsyncStorage.setItem(
            'last_valid_server_time',
            deviceTime.toString(),
          );
          return false; // Don't block
        }
      }
      console.log('❌ Time difference too high:', timeDiff / 1000, 'seconds');
      return true; // Block if rapid change
    }

    console.log('✅ Server time validation passed');
    return false;
  } catch (error) {
    console.log('❌ Error in validateWithServerTime:', error.message);
    return false;
  }
};

// ================= MOCK LOCATION =================
const detectMockLocation = () => {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      pos => {
        if (Platform.OS === 'android') {
          // Android: check mocked flag
          const isMocked = pos?.mocked === true;

          // Additional check: agar accuracy bohot perfect hai (typical for mock)
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
        timeout: 8000,
        maximumAge: 0,
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );
  });
};

// ================= EMULATOR =================
const detectEmulator = async () => {
  try {
    const isEmulator = await DeviceInfo.isEmulator();
    if (isEmulator) {
      console.log('🖥️ Emulator detected');
    }
    return isEmulator;
  } catch (error) {
    console.log('Emulator check error:', error);
    return false;
  }
};

// ================= ROOT/JAILBREAK DETECTION (Optional) =================
const detectRoot = async () => {
  try {
    if (Platform.OS === 'android') {
      // Check for root binaries
      const rootPaths = [
        '/system/app/Superuser.apk',
        '/sbin/su',
        '/system/bin/su',
        '/system/xbin/su',
        '/data/local/xbin/su',
        '/data/local/bin/su',
        '/system/sd/xbin/su',
        '/system/bin/failsafe/su',
        '/data/local/su',
      ];

      // Note: React Native me file system check limited hai
      // Better to use native module for root detection
      return false;
    } else {
      // iOS jailbreak detection
      return false;
    }
  } catch (error) {
    console.log('Root check error:', error);
    return false;
  }
};

// ================= DEBUGGER DETECTION =================
const detectDebugger = () => {
  // Check if remote debugger is connected (Metro bundler debugging)
  if (
    typeof global.__REMOTEDEV__ !== 'undefined' &&
    global.__REMOTEDEV__ === true
  ) {
    console.log('🐛 Remote debugger detected');
    return true;
  }

  // Check for debugger port
  // Note: Production build me yeh false hona chahiye
  if (__DEV__) {
    // Development mode - warning but not blocking
    console.log('⚠️ App is in development mode');
    return false;
  }

  return false;
};

// ================= KILL APP =================
const killApp = () => {
  if (Platform.OS === 'android') {
    BackHandler.exitApp();
  } else {
    // iOS: throw error to crash app
    throw new Error('Security violation - Device compromised');
  }
};

// ================= BLOCK UI =================
const triggerBlock = (reason, details = '') => {
  if (compromised) return;

  compromised = true;

  console.log('🚨 SECURITY VIOLATION:', reason, details);

  // 🔴 BLOCK UI
  if (global.setBlockedGlobal) {
    global.setBlockedGlobal(true);
  }

  Alert.alert(
    'Security Violation 🚨',
    `${reason}\n\n${details}\n\nThis app cannot run on compromised devices.\n\nThe app will close in 5 seconds.`,
    [
      {
        text: 'OK',
        onPress: () => {
          // Exit immediately on OK
          killApp();
        },
      },
    ],
    { cancelable: false },
  );

  // 🔥 Force kill after 5 seconds (if user doesn't press OK)
  setTimeout(() => {
    if (!compromised) return;
    killApp();
  }, 5000);
};

// ================= PAGE-LEVEL CHECK (Called when page opens) =================
// This is a lightweight check to run every time user navigates to/opens a page
export const performPageLevelSecurityCheck = async () => {
  console.log('🔐 Performing page-level security check...');

  if (compromised) {
    console.log('⚠️ Device already marked as compromised');
    return false;
  }

  try {
    // Check 1: Mock location (quick check)
    const isMock = await detectMockLocation();
    if (isMock) {
      triggerBlock(
        'Mock location detected',
        'Please disable mock location apps',
      );
      return false;
    }

    // Check 2: Server time validation (main check on page open)
    const serverMismatch = await validateWithServerTime();
    if (serverMismatch) {
      triggerBlock(
        'Device time mismatch with server',
        'Your device time is incorrect.\nPlease enable automatic date & time.',
      );
      return false;
    }

    // Check 3: Local time tampering detection
    const timeIssue = await detectTimeTampering();
    if (timeIssue) {
      triggerBlock(
        'Device time manipulation detected',
        'You changed the device time while app was running.\nPlease enable automatic date & time.',
      );
      return false;
    }

    console.log('✅ Page-level security check passed');
    return true;
  } catch (error) {
    console.log('❌ Error during page-level check:', error);
    return true; // Allow to proceed on error (graceful degradation)
  }
};

// ================= IMMEDIATE SECURITY CHECK (on AppState change) =================
// 🔥 YEH FUNCTION TURANT CALL HONA CHAHIYE JAISE HI APP INACTIVE/ACTIVE HO
const performImmediateSecurityCheck = async () => {
  console.log('⚡ IMMEDIATE security check triggered (AppState change)');

  if (compromised) {
    console.log('⚠️ Device already marked as compromised');
    return false;
  }

  try {
    // Check 1: Time tampering (fastest check first)
    const timeIssue = await detectTimeTampering();
    if (timeIssue) {
      triggerBlock(
        'Device time manipulation detected',
        'You changed the device time while app was running.\nPlease enable automatic date & time.',
      );
      return false;
    }

    // Check 2: Mock location
    const isMock = await detectMockLocation();
    if (isMock) {
      triggerBlock(
        'Mock location detected',
        'Please disable mock location apps',
      );
      return false;
    }

    // Check 3: Server time validation (can be done in background)
    const serverMismatch = await validateWithServerTime();
    if (serverMismatch) {
      triggerBlock(
        'Device time mismatch with server',
        'Your device time is incorrect.\nPlease enable automatic date & time.',
      );
      return false;
    }

    console.log('✅ Immediate security check passed');
    return true;
  } catch (error) {
    console.log('❌ Error during immediate check:', error);
    return true; // Allow to proceed on error
  }
};

// ================= MAIN INITIALIZATION =================
export const startSecurityGuard = async () => {
  console.log('🔒 Starting Security Guard...');

  try {
    // Step 1: Check for debugger (development mode warning)
    const isDebugging = detectDebugger();
    if (isDebugging && !__DEV__) {
      triggerBlock('Debugger detected', 'Please disconnect debug tools');
      return;
    }

    // Step 2: Check emulator (commented out by default)
    const isEmulator = await detectEmulator();
    if (isEmulator) {
      triggerBlock('Emulator detected', 'This app cannot run on emulators');
      return;
    }

    // Step 3: Check mock location
    const isMock = await detectMockLocation();
    if (isMock) {
      triggerBlock(
        'Mock location detected',
        'Please disable mock location apps',
      );
      return;
    }

    // Step 4: Check initial time with server (timeapi.io)
    const timeTampered = await checkInitialTime();
    if (timeTampered) {
      triggerBlock(
        'Device time manipulation detected',
        'Your device time does not match server time.\nPlease enable automatic date & time.',
      );
      return;
    }

    // Step 5: Check root/jailbreak (optional - commented)
    // const isRooted = await detectRoot();
    // if (isRooted) {
    //   triggerBlock('Root/Jailbreak detected', 'This app cannot run on rooted/jailbroken devices');
    //   return;
    // }

    // Initialize lastTime
    lastTime = Date.now();
    await AsyncStorage.setItem('last_verified_time', lastTime.toString());

    console.log('✅ Security Guard initialization successful');

    // Step 6: Start periodic background checks (every 8 seconds)
    let serverCheckCounter = 0;

    intervalRef = setInterval(async () => {
      if (compromised) {
        clearInterval(intervalRef);
        return;
      }

      // Check 1: Time tampering (memory + storage)
      const timeIssue = await detectTimeTampering();
      if (timeIssue) {
        triggerBlock(
          'Device time manipulation detected',
          'You changed the device time while app was running.\nPlease enable automatic date & time.',
        );
        return;
      }

      // Check 2: Mock location
      const mock = await detectMockLocation();
      if (mock) {
        triggerBlock(
          'Mock location detected',
          'Please disable mock location apps',
        );
        return;
      }

      // Check 3: Server time validation (every 30 seconds - 4-5 intervals of 8sec)
      serverCheckCounter++;
      if (serverCheckCounter >= 4) {
        serverCheckCounter = 0;
        const serverMismatch = await validateWithServerTime();
        if (serverMismatch) {
          triggerBlock(
            'Device time mismatch with server',
            'Your device time is incorrect.\nPlease enable automatic date & time.',
          );
          return;
        }
      }
    }, 8000); // Check every 8 seconds
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
};

// ================= RESET (for app resume) =================
export const resetSecurityGuard = async () => {
  console.log('🔄 Resetting Security Guard...');
  await stopSecurityGuard();
  compromised = false;
  await startSecurityGuard();
};

// ================= GET COMPROMISE STATUS =================
export const isDeviceCompromised = () => {
  return compromised;
};

// ================= RESET COMPROMISE FLAG (for testing) =================
export const resetCompromiseFlag = () => {
  console.log('🔧 Resetting compromise flag for testing');
  compromised = false;
};

// ================= EXPORT IMMEDIATE CHECK (for AppNavigator) =================
export const onAppStateChange = async nextAppState => {
  console.log('📱 App state changed to:', nextAppState);

  // Jab app background se active ho, turant check karo
  if (nextAppState === 'active') {
    console.log('🔄 App came to foreground - running immediate security check');
    await performImmediateSecurityCheck();
  }

  // Jab app inactive/background ho, checks ka interval pause karo
  if (nextAppState.match(/inactive|background/)) {
    console.log('⏸️ App going to background - pausing continuous checks');
    // Optional: pauseChecks();
  }
};

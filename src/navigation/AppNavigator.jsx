import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Linking,
  Text,
  TouchableOpacity,
  AppState,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import VersionCheck from 'react-native-version-check';
import DeviceInfo from 'react-native-device-info';
import { ToastProvider, showToast } from '../components/common/ToastProvider';

import LoginScreen from '../screens/auth/Login';
import HomeScreen from '../screens/home/Home';
import VerifyOTP from '../screens/auth/VerifyOtp';
import DailyPunch from '../screens/home/punch/DailyPunch';
import ReportsScreen from '../screens/home/reports/ReportsScreen';
import AppLoader from '../components/loader/AppLoader';
import { checkAuthState } from '../store/actions/authActions';
import { debugStorage } from '../utils/keychainHelper';
import LeaveScreen from '../screens/home/leave/LeaveScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import Reimbursement from '../screens/home/reimbursement/Reimbursement';
import Meetings from '../screens/home/meetings/Meetings';
import KRA from '../screens/home/kra/KRA';

// ============================================================
// 🚨 SECURITY GUARD - COMMENTED FOR EMULATOR TESTING
// To enable security: Uncomment the import and all related code below
// ============================================================
import {
  startSecurityGuard,
  stopSecurityGuard,
  resetSecurityGuard,
  isDeviceCompromised,
  onAppStateChange,
} from '../security/SecurityGuard';
// ============================================================

import {
  checkAllPermissionsAtStart,
  quickCheckPermissions,
  setPermissionCallbacks,
} from '../utils/permissions';

const Stack = createNativeStackNavigator();

// Global function to show toast from anywhere
global.showToast = showToast;

// ================= STACKS =================
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Verify_Otp" component={VerifyOTP} />
    <Stack.Screen name="AuthSettings" component={SettingsScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="DailyPuch" component={DailyPunch} />
    <Stack.Screen name="Reports" component={ReportsScreen} />
    <Stack.Screen name="Leave" component={LeaveScreen} />
    <Stack.Screen name="AppSettings" component={SettingsScreen} />
    <Stack.Screen name="Reimbursement" component={Reimbursement} />
    <Stack.Screen name="Meetings" component={Meetings} />
    <Stack.Screen name="KRA" component={KRA} />
  </Stack.Navigator>
);

// ================= MAIN =================
const AppNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector(state => state.auth);
  const toastRef = useRef(null);
  const appStateRef = useRef('active');

  const [forceUpdate, setForceUpdate] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [storeVersion, setStoreVersion] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [securityInitialized, setSecurityInitialized] = useState(false);
  const [permissionsInitialized, setPermissionsInitialized] = useState(false);
  const [permissionsStatus, setPermissionsStatus] = useState({
    camera: false,
    location: false,
  });

  // ================= 🔒 PERMISSION CHECK AT START =================
  const initializePermissions = async () => {
    console.log('🔐 [HIGHEST PRIORITY] Checking permissions at app start...');

    try {
      const result = await checkAllPermissionsAtStart();

      setPermissionsStatus({
        camera: result.camera.granted,
        location: result.location.granted,
      });

      if (!result.allGranted) {
        console.log('⚠️ Permissions missing, showing warning');
        // showToast(
        //   '⚠️ Camera & Location permissions required for attendance',
        //   'warning',
        //   5000,
        // );
      } else {
        console.log('✅ All permissions granted at start');
      }

      setPermissionsInitialized(true);
      return result;
    } catch (error) {
      console.log('❌ Permission initialization error:', error);
      setPermissionsInitialized(true);
      return { allGranted: false };
    }
  };

  // ============================================================
  // 🚨 SECURITY - COMMENTED FOR EMULATOR TESTING
  // To enable: Uncomment the function below
  // ============================================================
  const initializeSecurity = async () => {
    console.log('🔒 Initializing Security Guard...');

    global.setBlockedGlobal = isBlocked => {
      console.log('🚨 Security block triggered:', isBlocked);
      setBlocked(isBlocked);
    };

    try {
      await startSecurityGuard();
      console.log('✅ Security Guard started successfully');
    } catch (error) {
      console.log('❌ Error starting security guard:', error);
    }

    setSecurityInitialized(true);
  };
  // ============================================================

  // ================= INITIALIZE EVERYTHING ON APP START =================
  useEffect(() => {
    console.log('🚀 App initializing - Phase 1: Permissions');

    initializePermissions().then(() => {
      // 🚨 SECURITY - COMMENTED FOR EMULATOR TESTING
      // To enable: Uncomment the line below
      initializeSecurity();
      console.log(
        '🚀 App initializing - Phase 2: Security (DISABLED FOR TESTING)',
      );
    });

    dispatch(checkAuthState());
    checkAppVersion();
    debugStorage();

    return () => {
      // 🚨 SECURITY - COMMENTED FOR EMULATOR TESTING
      // To enable: Uncomment the line below
      console.log('🔒 Stopping Security Guard on unmount');
      stopSecurityGuard();
      console.log('🔒 Security Guard disabled for testing');
    };
  }, [dispatch]);

  // ================= APP STATE MONITORING (IMPROVED) =================
  useEffect(() => {
    console.log('📱 Setting up AppState listener...');

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      console.log('📱 Removing AppState listener');
      subscription.remove();
    };
  }, []);

  // 🔥 IMPROVED: Immediate checks on app state change
  const handleAppStateChange = async nextAppState => {
    console.log(
      `📱 App state changed: ${appStateRef.current} → ${nextAppState}`,
    );

    // ========== APP COMING TO FOREGROUND ==========
    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('🔄 ⭐ APP FOREGROUND - Running immediate security checks');

      // � SECURITY - COMMENTED FOR EMULATOR TESTING
      // To enable: Uncomment the code below
      try {
        await onAppStateChange(nextAppState);
      } catch (error) {
        console.log('❌ Error in immediate security check:', error);
      }

      // Permissions quick check
      const quickCheck = await quickCheckPermissions();
      setPermissionsStatus({
        camera: quickCheck.camera,
        location: quickCheck.location,
      });

      if (!quickCheck.allGranted) {
        showToast(
          '⚠️ Permissions missing. Please enable in settings.',
          'warning',
          4000,
        );
      }

      // 🚨 SECURITY - COMMENTED FOR EMULATOR TESTING
      // To enable: Uncomment the code below
      // // Reset security guard (re-initialize after background)
      await resetSecurityGuard();

      // // Check if device was compromised while in background
      if (isDeviceCompromised()) {
        console.log('⚠️ Device marked as compromised');
        setBlocked(true);
      }
    }

    // ========== APP GOING TO BACKGROUND ==========
    if (nextAppState.match(/inactive|background/)) {
      console.log('⏸️ APP BACKGROUND - Pausing some checks');
      // 🚨 SECURITY - COMMENTED FOR EMULATOR TESTING
      // To enable: Uncomment the code below
      try {
        await onAppStateChange(nextAppState);
      } catch (error) {
        console.log('❌ Error handling background state:', error);
      }
    }

    appStateRef.current = nextAppState;
  };

  // ================= VERSION CHECK =================
  const checkAppVersion = async () => {
    try {
      console.log('📦 Checking app version...');
      const res = await VersionCheck.needUpdate();

      if (res?.isNeeded) {
        console.log('⚠️ Update needed:', res.storeUrl);
        setForceUpdate(true);
        setStoreUrl(res.storeUrl);
        const latest = await VersionCheck.getLatestVersion();
        setStoreVersion(latest);
      } else {
        console.log('✅ App is up to date');
        setForceUpdate(false);
      }
    } catch (e) {
      console.log('❌ Version check error:', e);
    }
  };

  // ================= EXPOSE PERMISSION STATUS TO CHILDREN =================
  useEffect(() => {
    setPermissionCallbacks({
      getStatus: async () => {
        const quickCheck = await quickCheckPermissions();
        setPermissionsStatus(quickCheck);
        return quickCheck;
      },
      status: permissionsStatus,
    });
  }, [permissionsStatus]);

  // ================= LOADING STATES =================
  // 🚨 SECURITY DISABLED FOR EMULATOR TESTING
  // securityInitialized is always true when security is commented out
  if (loading || !permissionsInitialized) {
    return (
      // <View style={styles.initContainer}>
      <AppLoader />
      // </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔴 FULL BLOCK SCREEN (SECURITY VIOLATION) */}
      {blocked && (
        <View style={styles.blockContainer}>
          <View style={styles.blockContent}>
            <Text style={styles.blockTitle}>🚨 Security Violation</Text>
            <Text style={styles.blockText}>
              A security issue has been detected on your device.{'\n\n'}
              This app cannot run on compromised devices.{'\n\n'}
              The app will close in a few seconds.
            </Text>
            <ActivityIndicator
              size="large"
              color="#FF6B6B"
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      )}

      {/* ⚠️ PERMISSION WARNING BANNER */}
      {/* {!blocked &&
          !permissionsStatus.camera &&
          !permissionsStatus.location && (
            <View style={styles.permissionBanner}>
              <Text style={styles.permissionBannerText}>
                ⚠️ Camera & Location permissions required for attendance
              </Text>
              <TouchableOpacity onPress={() => Linking.openSettings()}>
                <Text style={styles.permissionBannerLink}>Enable</Text>
              </TouchableOpacity>
            </View>
          )} */}

      {/* {!blocked &&
          !permissionsStatus.camera &&
          permissionsStatus.location && (
            <View
              style={[styles.permissionBanner, { backgroundColor: '#FF9800' }]}
            >
              <Text style={styles.permissionBannerText}>
                📸 Camera permission required for selfie capture
              </Text>
              <TouchableOpacity onPress={() => Linking.openSettings()}>
                <Text style={styles.permissionBannerLink}>Enable</Text>
              </TouchableOpacity>
            </View>
          )}

        {!blocked &&
          permissionsStatus.camera &&
          !permissionsStatus.location && (
            <View
              style={[styles.permissionBanner, { backgroundColor: '#FF9800' }]}
            >
              <Text style={styles.permissionBannerText}>
                📍 Location permission required for attendance verification
              </Text>
              <TouchableOpacity onPress={() => Linking.openSettings()}>
                <Text style={styles.permissionBannerLink}>Enable</Text>
              </TouchableOpacity>
            </View>
          )} */}

      {/* FORCE UPDATE MODAL */}
      {!blocked && (
        <Modal visible={forceUpdate} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <Text style={styles.title}>Update Required 🚨</Text>
              <Text style={styles.desc}>
                Please update the app to continue using it.
              </Text>
              <Text style={styles.version}>
                Your Version: {DeviceInfo.getVersion()}
              </Text>
              {storeVersion && (
                <Text style={styles.version}>
                  Latest Version: {storeVersion}
                </Text>
              )}
              <TouchableOpacity
                style={styles.button}
                onPress={() => storeUrl && Linking.openURL(storeUrl)}
              >
                <Text style={styles.buttonText}>Update Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* NORMAL APP NAVIGATION */}
      {!blocked &&
        !forceUpdate &&
        (isAuthenticated ? <AppStack /> : <AuthStack />)}
    </View>
  );
};

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1128' },
  initContainer: {
    flex: 1,
    backgroundColor: '#0A1128',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initText: { color: '#fff', marginTop: 16, fontSize: 14 },
  permissionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 1000,
  },
  permissionBannerText: { color: '#fff', fontSize: 12, flex: 1 },
  permissionBannerLink: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0A1128',
  },
  desc: { textAlign: 'center', marginBottom: 15, color: '#555', fontSize: 14 },
  version: { fontSize: 14, marginBottom: 5, color: '#333' },
  button: {
    marginTop: 15,
    backgroundColor: '#0A1128',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  blockContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10000,
  },
  blockContent: { alignItems: 'center', paddingHorizontal: 20 },
  blockTitle: {
    color: '#FF6B6B',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  blockText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default AppNavigator;

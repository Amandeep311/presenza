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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  requestCameraPermission,
  requestLocationPermission,
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

  // CRITICAL: Use a ref to prevent duplicate toasts in the same session
  const isShowingToast = useRef(false);
  const toastTimeoutRef = useRef(null);

  // Function to show toast only once
  const showToastOnce = (message, type, duration) => {
    // Clear any pending toast
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    // If we're already showing a toast, don't show another
    if (isShowingToast.current) {
      console.log('⏭️ Toast already showing, skipping duplicate');
      return;
    }
    
    console.log('🔔 Showing toast');
    isShowingToast.current = true;
    showToast(message, type, duration);
    
    // Reset the flag after the toast duration
    toastTimeoutRef.current = setTimeout(() => {
      isShowingToast.current = false;
      console.log('✅ Toast flag reset');
    }, duration);
  };

  // Function to request permissions and show popup
  const requestPermissions = async () => {
    console.log('📱 Requesting permissions...');
    
    const cameraResult = await requestCameraPermission(true);
    const locationResult = await requestLocationPermission(true);
    
    const cameraGranted = cameraResult.granted;
    const locationGranted = locationResult.granted;
    
    console.log(`Camera: ${cameraGranted}, Location: ${locationGranted}`);
    
    setPermissionsStatus({
      camera: cameraGranted,
      location: locationGranted,
    });
    
    return { cameraGranted, locationGranted };
  };

  // Function to check and show toast based on permissions
  const checkAndShowToast = async (cameraGranted, locationGranted) => {
    const hasAllPermissions = cameraGranted && locationGranted;
    
    console.log(`Checking permissions - Camera: ${cameraGranted}, Location: ${locationGranted}, All: ${hasAllPermissions}`);
    
    if (hasAllPermissions) {
      // All permissions are granted - clear the flag
      await AsyncStorage.removeItem('toast_shown_for_missing_permissions');
      console.log('✅ All permissions granted, cleared toast flag');
      return;
    }
    
    // Some permissions are missing
    const missingPermissions = [];
    if (!cameraGranted) missingPermissions.push('Camera');
    if (!locationGranted) missingPermissions.push('Location');
    
    console.log(`Missing permissions: ${missingPermissions.join(', ')}`);
    
    // Check if we've shown toast before for missing permissions
    const toastShown = await AsyncStorage.getItem('toast_shown_for_missing_permissions');
    console.log('Toast shown flag from storage:', toastShown);
    
    if (!toastShown) {
      // Show toast and save flag
      const message = missingPermissions.length === 2 
        ? '⚠️ Camera & Location permissions are missing. Please enable in settings.'
        : `⚠️ ${missingPermissions[0]} permission is missing. Please enable in settings.`;
      
      // Use the single toast function
      showToastOnce(message, 'warning', 4000);
      await AsyncStorage.setItem('toast_shown_for_missing_permissions', 'true');
    } else {
      console.log('⏭️ Toast already shown before for missing permissions, skipping');
    }
  };

  // ================= INITIALIZE PERMISSIONS =================
  const initializePermissions = async () => {
    console.log('🔐 Initializing permissions...');

    try {
      // Request permissions (this will show the popup)
      const { cameraGranted, locationGranted } = await requestPermissions();
      
      console.log(`Permissions result - Camera: ${cameraGranted}, Location: ${locationGranted}`);

      // Check and show toast if needed
      await checkAndShowToast(cameraGranted, locationGranted);

      setPermissionsInitialized(true);
      return { cameraGranted, locationGranted };
    } catch (error) {
      console.log('❌ Permission initialization error:', error);
      setPermissionsInitialized(true);
      return { cameraGranted: false, locationGranted: false };
    }
  };

  // ============================================================
  // 🚨 SECURITY - COMMENTED FOR EMULATOR TESTING
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

  // ================= INITIALIZE EVERYTHING ON APP START =================
  useEffect(() => {
    console.log('🚀 App initializing');

    initializePermissions().then(() => {
      initializeSecurity();
      console.log('🚀 App initialization complete');
    });

    dispatch(checkAuthState());
    checkAppVersion();
    debugStorage();

    return () => {
      console.log('🔒 Cleaning up');
      stopSecurityGuard();
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [dispatch]);

  // ================= CHECK PERMISSIONS ON FOREGROUND =================
  const checkPermissionsOnForeground = async () => {
    console.log('🔄 Checking permissions on foreground...');
    
    try {
      const quickCheck = await quickCheckPermissions();
      console.log('Quick check result:', quickCheck);
      
      const cameraGranted = quickCheck.camera;
      const locationGranted = quickCheck.location;
      
      setPermissionsStatus({
        camera: cameraGranted,
        location: locationGranted,
      });
      
      const hasAllPermissions = cameraGranted && locationGranted;
      
      if (hasAllPermissions) {
        // All permissions are granted - clear the flag
        await AsyncStorage.removeItem('toast_shown_for_missing_permissions');
        console.log('✅ All permissions granted on foreground, cleared toast flag');
      } else {
        // Some permissions are still missing
        const toastShown = await AsyncStorage.getItem('toast_shown_for_missing_permissions');
        
        // Only show toast if we haven't shown it before AND permissions are not all granted
        if (!toastShown) {
          const missingPermissions = [];
          if (!cameraGranted) missingPermissions.push('Camera');
          if (!locationGranted) missingPermissions.push('Location');
          
          const message = missingPermissions.length === 2 
            ? '⚠️ Camera & Location permissions are missing. Please enable in settings.'
            : `⚠️ ${missingPermissions[0]} permission is missing. Please enable in settings.`;
          
          console.log(`🔔 Showing toast for missing permissions on foreground: ${missingPermissions.join(', ')}`);
          
          // Use the single toast function
          showToastOnce(message, 'warning', 4000);
          await AsyncStorage.setItem('toast_shown_for_missing_permissions', 'true');
        } else {
          console.log('⏭️ Toast already shown before, skipping on foreground');
        }
      }
      
    } catch (error) {
      console.log('Error checking permissions:', error);
    }
  };

  // ================= APP STATE MONITORING =================
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

  const handleAppStateChange = async nextAppState => {
    console.log(`📱 App state changed: ${appStateRef.current} → ${nextAppState}`);

    // ========== APP COMING TO FOREGROUND ==========
    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('🔄 APP FOREGROUND - Checking permissions');
      
      // Wait for app to be fully active
      setTimeout(async () => {
        await checkPermissionsOnForeground();
      }, 1000);

      // Security checks
      try {
        await onAppStateChange(nextAppState);
        await resetSecurityGuard();
        if (isDeviceCompromised()) {
          console.log('⚠️ Device marked as compromised');
          setBlocked(true);
        }
      } catch (error) {
        console.log('❌ Error in security checks:', error);
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
        console.log('📱 getStatus called, result:', quickCheck);
        setPermissionsStatus({
          camera: quickCheck.camera,
          location: quickCheck.location,
        });
        return quickCheck;
      },
      status: permissionsStatus,
    });
  }, [permissionsStatus]);

  // ================= LOADING STATES =================
  if (loading || !permissionsInitialized) {
    return <AppLoader />;
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
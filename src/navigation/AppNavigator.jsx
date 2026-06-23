import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import NetInfo from '@react-native-community/netinfo';

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

// ✅ Screens
import MaintenanceScreen from '../screens/MaintenanceScreen';
import NoInternetScreen from '../screens/NoInternetScreen';
import { checkApiHealth } from '../utils/healthCheck';

// ============================================================
// 🚨 SECURITY GUARD
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

// Helper function to compare versions
const compareVersions = (a, b) => {
  if (!a || !b) return 0;
  const pa = a.toString().split('.').map(part => Number(part) || 0);
  const pb = b.toString().split('.').map(part => Number(part) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
};

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

  // ✅ HEALTH CHECK STATES
  const [isApiHealthy, setIsApiHealthy] = useState(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const healthCheckDoneRef = useRef(false);

  // ✅ INTERNET CONNECTION STATE - INITIALIZE AS FALSE to prevent loading state issues
  const [isInternetConnected, setIsInternetConnected] = useState(false);
  const [isCheckingInternet, setIsCheckingInternet] = useState(false);
  const [isInitialCheckComplete, setIsInitialCheckComplete] = useState(false);

  // ✅ Track if auth was already checked
  const authCheckedRef = useRef(false);

  // ✅ Toast throttling
  const [noInternetToastVisible, setNoInternetToastVisible] = useState(false);
  const [lastNoInternetToastTime, setLastNoInternetToastTime] = useState(0);

  // CRITICAL: Use a ref to prevent duplicate toasts in the same session
  const isShowingToast = useRef(false);
  const toastTimeoutRef = useRef(null);

  // ✅ Function to show no internet message with throttling
  const showNoInternetMessage = useCallback(() => {
    const now = Date.now();
    if (!noInternetToastVisible && (now - lastNoInternetToastTime) >= 3000) {
      setNoInternetToastVisible(true);
      setLastNoInternetToastTime(now);
      showToast('No internet connection. Please check your internet.', 'error');
      setTimeout(() => {
        setNoInternetToastVisible(false);
      }, 3000);
    }
  }, [noInternetToastVisible, lastNoInternetToastTime]);

  // ✅ NETWORK MONITORING
  useEffect(() => {
    let mounted = true;

    const unsubscribe = NetInfo.addEventListener(state => {
      if (!mounted) return;
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      console.log(`📡 Network state changed: ${connected ? 'Connected' : 'Disconnected'}`);
      setIsInternetConnected(connected);
      
      // ✅ If internet becomes available and health check was previously done, recheck
      if (connected && healthCheckDoneRef.current && mounted) {
        console.log('📡 Internet restored, rechecking API health...');
        performHealthCheck();
      }
    });

    // ✅ Initial check
    NetInfo.fetch().then(state => {
      if (!mounted) return;
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      console.log(`📡 Initial internet connection: ${connected ? 'Connected' : 'Disconnected'}`);
      setIsInternetConnected(connected);
      setIsInitialCheckComplete(true);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // ✅ CHECK INTERNET FUNCTION
  const checkInternetConnection = useCallback(async () => {
    if (isCheckingInternet) return;
    
    setIsCheckingInternet(true);
    console.log('📡 Checking internet connection...');
    
    try {
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected === true && netInfo.isInternetReachable !== false;
      
      console.log(`📡 Internet connection: ${isConnected ? '✅ Connected' : '❌ Disconnected'}`);
      setIsInternetConnected(isConnected);
      return isConnected;
    } catch (error) {
      console.log('❌ Internet check error:', error);
      setIsInternetConnected(false);
      return false;
    } finally {
      setIsCheckingInternet(false);
    }
  }, [isCheckingInternet]);

  // ✅ HEALTH CHECK FUNCTION
  const performHealthCheck = useCallback(async () => {
    if (isCheckingHealth) {
      console.log('⏭️ Health check already in progress, skipping');
      return;
    }
    
    // ✅ First check internet connection
    const isConnected = await checkInternetConnection();
    
    if (!isConnected) {
      console.log('❌ No internet connection');
      showNoInternetMessage();
      setIsInternetConnected(false);
      // ✅ Set API healthy to null to show loading only on initial check
      // But keep previous state if already set
      return false;
    }
    
    setIsCheckingHealth(true);
    console.log('📡 Performing health check...');
    
    try {
      const result = await checkApiHealth();
      console.log('📡 Health check result:', result);
      
      // ✅ Set both states based on result
      setIsApiHealthy(result.isHealthy);
      setIsInternetConnected(true);
      
      if (result.isHealthy) {
        healthCheckDoneRef.current = true;
        console.log('✅ API is healthy, app will load');
      } else {
        healthCheckDoneRef.current = false;
        console.log('❌ API is not healthy, user can retry');
      }
      
      return result.isHealthy;
    } catch (error) {
      console.log('❌ Health check error:', error);
      setIsApiHealthy(false);
      healthCheckDoneRef.current = false;
      return false;
    } finally {
      setIsCheckingHealth(false);
    }
  }, [isCheckingHealth, checkInternetConnection, showNoInternetMessage]);

  // Function to show toast only once
  const showToastOnce = (message, type, duration) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    if (isShowingToast.current) {
      console.log('⏭️ Toast already showing, skipping duplicate');
      return;
    }
    
    console.log('🔔 Showing toast');
    isShowingToast.current = true;
    showToast(message, type, duration);
    
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
      await AsyncStorage.removeItem('toast_shown_for_missing_permissions');
      console.log('✅ All permissions granted, cleared toast flag');
      return;
    }
    
    const missingPermissions = [];
    if (!cameraGranted) missingPermissions.push('Camera');
    if (!locationGranted) missingPermissions.push('Location');
    
    console.log(`Missing permissions: ${missingPermissions.join(', ')}`);
    
    const toastShown = await AsyncStorage.getItem('toast_shown_for_missing_permissions');
    console.log('Toast shown flag from storage:', toastShown);
    
    if (!toastShown) {
      const message = missingPermissions.length === 2 
        ? '⚠️ Camera & Location permissions are missing. Please enable in settings.'
        : `⚠️ ${missingPermissions[0]} permission is missing. Please enable in settings.`;
      
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
      const { cameraGranted, locationGranted } = await requestPermissions();
      
      console.log(`Permissions result - Camera: ${cameraGranted}, Location: ${locationGranted}`);

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
  // 🚨 SECURITY
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

  // ================= VERSION CHECK =================
  const checkAppVersion = async () => {
    try {
      console.log('📦 Checking app version...');
      
      const currentVersion = await VersionCheck.getCurrentVersion();
      console.log('Current version:', currentVersion);
      
      let latestVersion = currentVersion;
      let storeUrl = null;
      
      try {
        latestVersion = await VersionCheck.getLatestVersion();
        storeUrl = await VersionCheck.getStoreUrl();
        console.log('Latest version from store:', latestVersion);
        console.log('Store URL:', storeUrl);
      } catch (versionError) {
        console.log('⚠️ Skipping version check (development environment):', versionError.message);
        setForceUpdate(false);
        return;
      }
      
      const compareResult = compareVersions(currentVersion, latestVersion);
      const needsUpdate = compareResult < 0;
      
      const MIN_SUPPORTED_VERSION = '1.0.0';
      const isBelowMinimum = compareVersions(currentVersion, MIN_SUPPORTED_VERSION) < 0;
      
      if (needsUpdate || isBelowMinimum) {
        console.log('⚠️ Update needed!');
        console.log(`Current: ${currentVersion}, Latest: ${latestVersion}`);
        setForceUpdate(true);
        setStoreUrl(storeUrl);
        setStoreVersion(latestVersion);
      } else {
        console.log('✅ App is up to date');
        setForceUpdate(false);
      }
    } catch (e) {
      console.log('❌ Version check error:', e);
      setForceUpdate(false);
    }
  };

  // Function to open app store
  const openAppStore = async () => {
    const url = storeUrl || (await VersionCheck.getStoreUrl());
    if (!url) {
      console.log('⚠️ Store URL not available');
      Alert.alert('Error', 'Could not open app store. Please update manually.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.log('❌ Failed to open store URL:', err);
      Alert.alert('Error', 'Could not open app store. Please update manually.');
    }
  };

  // ================= CHECK AUTH STATE =================
  useEffect(() => {
    if (!authCheckedRef.current) {
      console.log('🔍 Running auth check...');
      authCheckedRef.current = true;
      dispatch(checkAuthState());
    }
  }, [dispatch]);

  // ================= INITIALIZE EVERYTHING ON APP START =================
  useEffect(() => {
    console.log('🚀 App initializing');

    // ✅ Only perform health check after internet check is complete
    if (isInitialCheckComplete && !healthCheckDoneRef.current) {
      performHealthCheck();
    }

    initializePermissions().then(() => {
      initializeSecurity();
      console.log('🚀 App initialization complete');
    });

    checkAppVersion();
    debugStorage();

    return () => {
      console.log('🔒 Cleaning up');
      stopSecurityGuard();
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [isInitialCheckComplete]);

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
        await AsyncStorage.removeItem('toast_shown_for_missing_permissions');
        console.log('✅ All permissions granted on foreground, cleared toast flag');
      } else {
        const toastShown = await AsyncStorage.getItem('toast_shown_for_missing_permissions');
        
        if (!toastShown) {
          const missingPermissions = [];
          if (!cameraGranted) missingPermissions.push('Camera');
          if (!locationGranted) missingPermissions.push('Location');
          
          const message = missingPermissions.length === 2 
            ? '⚠️ Camera & Location permissions are missing. Please enable in settings.'
            : `⚠️ ${missingPermissions[0]} permission is missing. Please enable in settings.`;
          
          console.log(`🔔 Showing toast for missing permissions on foreground: ${missingPermissions.join(', ')}`);
          
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

    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('🔄 APP FOREGROUND - Checking permissions');
      
      setTimeout(async () => {
        await checkPermissionsOnForeground();
      }, 1000);

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

  // ================= RENDER STATES - CORRECT ORDER =================

  // 1. ✅ SHOW LOADING ONLY ON INITIAL APP START (before internet check completes)
  if (!isInitialCheckComplete) {
    return (
      <View style={[styles.initContainer, { backgroundColor: '#0A1128' }]}>
        <ActivityIndicator size="large" color="#FACC15" />
        <Text style={[styles.initText, { color: '#9CA3AF' }]}>
          Loading...
        </Text>
      </View>
    );
  }

  // 2. ✅ SHOW NO INTERNET SCREEN - When internet is disconnected
  if (!isInternetConnected) {
    return (
      <NoInternetScreen
        onRetry={performHealthCheck}
        isChecking={isCheckingHealth || isCheckingInternet}
      />
    );
  }

  // 3. ✅ SHOW MAINTENANCE SCREEN - Only when internet is connected AND API is down
  if (isApiHealthy === false && isInternetConnected === true) {
    return (
      <MaintenanceScreen
        onRetry={performHealthCheck}
        isChecking={isCheckingHealth}
      />
    );
  }

  // 4. ✅ Show loading while health check is in progress (only on initial check)
  if (isApiHealthy === null && isCheckingHealth) {
    return (
      <View style={[styles.initContainer, { backgroundColor: '#0A1128' }]}>
        <ActivityIndicator size="large" color="#FACC15" />
        <Text style={[styles.initText, { color: '#9CA3AF' }]}>
          Checking system status...
        </Text>
      </View>
    );
  }

  // 5. Show loading state
  if (loading || !permissionsInitialized) {
    return <AppLoader />;
  }

  // 6. Show normal app
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

      {/* 📱 VERSION UPDATE MODAL */}
      {forceUpdate && !blocked && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <Text style={styles.title}>Update Required</Text>
              <Text style={styles.desc}>
                A new version of the app is available. Please update to continue using the app.
              </Text>
              {storeVersion ? (
                <Text style={styles.version}>Latest version: {storeVersion}</Text>
              ) : null}
              <TouchableOpacity style={styles.button} onPress={openAppStore}>
                <Text style={styles.buttonText}>Update Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* NORMAL APP NAVIGATION */}
      {!blocked && !forceUpdate && (isAuthenticated ? <AppStack /> : <AuthStack />)}
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
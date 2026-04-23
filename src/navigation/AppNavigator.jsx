import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Linking,
  Text,
  TouchableOpacity,
  AppState,
  Modal,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import VersionCheck from 'react-native-version-check';
import DeviceInfo from 'react-native-device-info';

import LoginScreen from '../screens/auth/Login';
import HomeScreen from '../screens/home/Home';
import VerifyOTP from '../screens/auth/VerifyOtp';
import DailyPunch from '../screens/home/punch/DailyPunch';
import ReportsScreen from '../screens/home/reports/ReportsScreen';
import AppLoader from '../components/loader/AppLoader';
import SlideableAlert from '../components/common/SlideableAlert';
import { checkAuthState, hideAlert } from '../store/actions/authActions';
import { debugStorage } from '../utils/keychainHelper';
import LeaveScreen from '../screens/home/leave/LeaveScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import SalarySlip from '../screens/home/salarySlip/SalarySlip';
import Reimbursement from '../screens/home/reimbursement/Reimbursement';
import Meetings from '../screens/home/meetings/Meetings';
import KRA from '../screens/home/kra/KRA';


const Stack = createNativeStackNavigator();

// ── Auth Stack ────────────────────────────────────
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Verify_Otp" component={VerifyOTP} />
    <Stack.Screen name="AuthSettings" component={SettingsScreen} />
  </Stack.Navigator>
);

// ── App Stack ─────────────────────────────────────
const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="DailyPuch" component={DailyPunch} />
    <Stack.Screen name="Reports" component={ReportsScreen} />
    <Stack.Screen name="Leave" component={LeaveScreen} />
    <Stack.Screen name="AppSettings" component={SettingsScreen} />
    <Stack.Screen name="SalarySlip" component={SalarySlip} />
    <Stack.Screen name="Reimbursement" component={Reimbursement} />
        <Stack.Screen name="Meetings" component={Meetings} />
    <Stack.Screen name="KRA" component={KRA} />

  </Stack.Navigator>
);

const AppNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector(state => state.auth);
  console.log(
    'auth state:::::::',
    useSelector(state => state.auth),
  );
  const { alert } = useSelector(state => state.ui);

  const [forceUpdate, setForceUpdate] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [storeVersion, setStoreVersion] = useState('');

  // Version Check
  const checkAppVersion = async () => {
    try {
      const res = await VersionCheck.needUpdate();

      console.log('VersionCheck:', res);

      if (res?.isNeeded) {
        setForceUpdate(true);
        setStoreUrl(res.storeUrl);

        // optional: get latest version
        const latest = await VersionCheck.getLatestVersion();
        setStoreVersion(latest);
      } else {
        setForceUpdate(false);
      }
    } catch (e) {
      console.log('❌ Version check error:', e);
    }
  };

  // Recheck when app comes back from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        checkAppVersion();
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    debugStorage();
  }, []);

  useEffect(() => {
    console.log('🚀 App initializing...');
    dispatch(checkAuthState());
    checkAppVersion();
  }, []);

  if (loading) {
    return <AppLoader />;
  }

  return (
    <View style={styles.container}>
      {/* 🔥 Normal App */}
      {!forceUpdate && (isAuthenticated ? <AppStack /> : <AuthStack />)}

      {/* 🔥 FORCE UPDATE MODAL */}
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

            {storeVersion ? (
              <Text style={styles.version}>Latest Version: {storeVersion}</Text>
            ) : null}

            <TouchableOpacity
              style={styles.button}
              onPress={() => Linking.openURL(storeUrl)}
            >
              <Text style={styles.buttonText}>Update Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Alerts */}
      <SlideableAlert
        visible={alert.visible}
        message={alert.message}
        type={alert.type}
        onDismiss={() => dispatch(hideAlert())}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1128',
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
  },
  desc: {
    textAlign: 'center',
    marginBottom: 15,
    color: '#555',
  },
  version: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  button: {
    marginTop: 15,
    backgroundColor: '#0A1128',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default AppNavigator;

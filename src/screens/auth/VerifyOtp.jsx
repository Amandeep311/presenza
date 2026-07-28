import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  Text,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Clock, Settings } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Fonts } from '../../utils/GlobalText';
import LogoHeader from '../../components/Login/LogoHeader';
import PrimaryButton from '../../components/common/PrimaryButton';
import OTPInput from '../../components/common/OTPInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

import {
  verifyOtp,
  hideAlert,
  setAlert,
  resendOtp,
  checkAuthState,
} from '../../store/actions/authActions';
import { showToast } from '../../components/common/ToastProvider';
import { RESET_SEND_OTP } from '../../store/reducers/authReducer';

const VerifyOTP = ({ route, navigation }) => {
  const { employeeId } = route.params;
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  const { verifyOtpLoading, sendOtpLoading } = useSelector(state => state.auth);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(hp('3%'))).current;

  // ============ FCM TOKEN FUNCTIONS ============
  const getFCMToken = async () => {
    try {
      // Check if messaging is available
      if (!messaging) {
        console.log('⚠️ Firebase messaging not available');
        return null;
      }

      // Request permission for iOS
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('⚠️ FCM permission denied on iOS');
          return null;
        }
      }

      // Get FCM token
      const token = await messaging().getToken();
      console.log('📱 FCM Token:', token);

      // Store token in AsyncStorage for later use
      await AsyncStorage.setItem('fcm_token', token);

      return token;
    } catch (error) {
      console.log('❌ Error getting FCM token:', error);
      return null;
    }
  };

  // ============ TIMER PERSISTENCE FUNCTIONS ============
  const saveTimerState = async expiryTime => {
    try {
      await AsyncStorage.setItem('otp_timer_expiry', expiryTime.toString());
      await AsyncStorage.setItem('otp_employee_id', employeeId);
    } catch (error) {
      console.log('Error saving timer state:', error);
    }
  };

  const loadTimerState = async () => {
    try {
      const savedExpiry = await AsyncStorage.getItem('otp_timer_expiry');
      const savedEmployeeId = await AsyncStorage.getItem('otp_employee_id');
      const savedResendCount = await AsyncStorage.getItem('otp_resend_count');

      if (savedExpiry && savedEmployeeId === employeeId) {
        const expiryTime = parseInt(savedExpiry, 10);
        const now = Date.now();
        const remainingSeconds = Math.max(
          0,
          Math.floor((expiryTime - now) / 1000),
        );

        if (remainingSeconds > 0) {
          setTimer(remainingSeconds);
          setCanResend(false);
          return true;
        }
      }

      if (savedResendCount && savedEmployeeId === employeeId) {
        setResendCount(parseInt(savedResendCount, 10));
      }

      return false;
    } catch (error) {
      console.log('Error loading timer state:', error);
      return false;
    }
  };

  const clearTimerState = async () => {
    try {
      await AsyncStorage.removeItem('otp_timer_expiry');
      await AsyncStorage.removeItem('otp_resend_count');
    } catch (error) {
      console.log('Error clearing timer state:', error);
    }
  };

  useEffect(() => {
    console.log('🔐 VerifyOTP mounted for employee ID:', employeeId);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Load saved timer state
    loadTimerState();

    return () => {
      console.log('🔐 VerifyOTP unmounted');
      dispatch({ type: RESET_SEND_OTP });
    };
  }, []);

  // Timer effect
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          const newTimer = prev - 1;
          if (newTimer > 0) {
            const expiryTime = Date.now() + newTimer * 1000;
            saveTimerState(expiryTime);
          }
          return newTimer;
        });
      }, 1000);
    } else {
      setCanResend(true);
      clearTimerState();
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      showToast(
        t.alerts.otpError || 'Please enter complete 6-digit OTP',
        'error',
      );
      return;
    }

    console.log('🔑 Verifying OTP for employee ID:', employeeId);

    try {
      // Get FCM token
      let fcmToken = await getFCMToken();
      console.log("fcmToken--v---", fcmToken);

      // If token is null or empty, try to get from AsyncStorage
      if (!fcmToken) {
        fcmToken = await AsyncStorage.getItem('fcm_token');
      }

      console.log('📱 Sending FCM Token with OTP verification:', fcmToken);

      // Call verifyOtp with employeeId, otp, and fcmToken
      const result = await dispatch(
        verifyOtp(employeeId, otpString, fcmToken || '')
      );

      if (result.success) {
        console.log('✅ OTP verified successfully');
        await clearTimerState();
        dispatch(checkAuthState());
      } else {
        setOtp(['', '', '', '', '', '']);
      }
    } catch (error) {
      console.error('❌ Error in verify OTP:', error);
      showToast(
        error.message || 'Failed to verify OTP. Please try again.',
        'error'
      );
    }
  };

  const handleResendOtp = async () => {
    if (resendCount >= 3) {
      showToast(
        'Maximum resend limit reached (3 attempts). Please try again later.',
        'error',
      );
      return;
    }

    if (!canResend) {
      showToast(`Please wait ${timer} seconds before resending`, 'error');
      return;
    }

    setResendLoading(true);

    try {
      console.log('📧 Resending OTP for employee ID:', employeeId);

      // Get FCM token for resend as well
      let fcmToken = await getFCMToken();
      console.log("fcmtoken---fcmToken-->", fcmToken);

      if (!fcmToken) {
        fcmToken = await AsyncStorage.getItem('fcm_token');
      }
      console.log("fcmtoken----->", fcmToken);

      const result = await dispatch(resendOtp(employeeId, fcmToken || ''));

      if (result.success) {
        const newCount = resendCount + 1;
        setResendCount(newCount);
        await AsyncStorage.setItem('otp_resend_count', newCount.toString());

        setTimer(30);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);

        const expiryTime = Date.now() + 30 * 1000;
        await saveTimerState(expiryTime);

        showToast(t.alerts.otpSent || 'OTP resent successfully', 'success');
      } else {
        showToast(
          result.error || 'Failed to resend OTP. Please try again.',
          'error'
        );
      }
    } catch (error) {
      console.error('❌ Error in resend OTP:', error);
      showToast(
        error.message || 'Failed to resend OTP. Please try again.',
        'error'
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Login');
    }
  };

  const isResendDisabled = !canResend || resendCount >= 3 || resendLoading;

  return (
    <View style={[styles.rootContainer, { backgroundColor: C.background }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />

      <View style={[styles.topShadow, { backgroundColor: C.topShadow }]} />
      <View
        style={[styles.bottomShadow, { backgroundColor: C.bottomShadow }]}
      />

      <KeyboardAvoidingView
        style={styles.kavContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
      >
        <Animated.View
          style={[
            styles.animatedContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <ArrowLeft size={wp('5%')} color={C.textPrimary} />
              <Text style={[styles.backButtonText, { color: C.textSecondary }]}>
                {t.buttons.back || 'Back'}
              </Text>
            </TouchableOpacity>

            <LogoHeader />

            <View style={styles.otpHeader}>
              <Text style={[styles.otpTitle, { color: C.textPrimary }]}>
                {t.otp.title}
              </Text>
              <Text style={[styles.otpSubtitle, { color: C.textSecondary }]}>
                {t.otp.subtitle}
              </Text>
              <Text style={[styles.otpEmail, { color: C.primary }]}>
                {employeeId}
              </Text>
            </View>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.otpContainer}>
                <OTPInput otp={otp} setOtp={setOtp} />
              </View>
            </TouchableWithoutFeedback>

            <View style={styles.resendContainer}>
              {resendCount < 3 && (
                <>
                  {(!canResend || resendCount >= 3) ? (
                    <Text style={[styles.resendText, { color: C.textSecondary }]}>
                      {`${t.otp.resendIn || 'Resend in'} 00:${timer.toString().padStart(2, '0')}`}
                    </Text>
                  ) : (
                    <Text style={[styles.resendText, { color: C.textSecondary }]}>
                      {t.otp.resendPrompt || "Didn't receive the code?"}
                    </Text>
                  )}
                </>
              )}

              {canResend && resendCount < 3 && (
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={isResendDisabled}
                >
                  {resendLoading ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <Text style={[styles.resendButton, { color: C.primary }]}>
                      {' '}
                      {t.otp.resendButton}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {resendCount > 0 && resendCount < 3 && (
              <Text style={[styles.resendInfoText, { color: C.textTertiary }]}>
                {3 - resendCount} resend attempt(s) remaining
              </Text>
            )}

            {resendCount >= 3 && (
              <Text style={[styles.resendInfoText, { color: '#E74C3C' }]}>
                Maximum resend limit reached. Please try again later.
              </Text>
            )}

            <PrimaryButton
              title={t.otp.verifyButton}
              onPress={handleVerifyOtp}
              loading={verifyOtpLoading}
              disabled={otp.join('').length !== 6 || verifyOtpLoading}
              style={styles.verifyButton}
            />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      <TouchableOpacity
        style={[styles.settingsButton, { backgroundColor: C.primary }]}
        onPress={() =>
          navigation.navigate('AuthSettings', { fromAuth: true })
        }
        activeOpacity={0.8}
      >
        <Settings size={wp('5%')} color={C.textDark} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    position: 'relative',
  },
  settingsButton: {
    position: 'absolute',
    bottom: hp('6%'),
    right: wp('6%'),
    width: wp('14%'),
    height: wp('14%'),
    borderRadius: wp('7%'),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 999,
  },
  topShadow: {
    position: 'absolute',
    top: -hp('1%'),
    right: -wp('2%'),
    opacity: 0.9,
    width: wp('90%'),
    height: hp('35%'),
    borderBottomLeftRadius: wp('25%'),
  },
  bottomShadow: {
    position: 'absolute',
    bottom: -hp('1%'),
    left: -wp('2%'),
    opacity: 0.5,
    width: wp('75%'),
    height: hp('35%'),
    borderTopRightRadius: wp('50%'),
  },
  kavContainer: { flex: 1 },
  animatedContainer: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: wp('6%') },
  scrollContent: {
    flexGrow: 1,
    paddingTop: hp('20%'),
    paddingBottom: hp('12%'),
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('4%'),
    alignSelf: 'flex-start',
    position: 'absolute',
    top: '10%',
    left: '3%',
  },
  backButtonText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.light,
    marginLeft: wp('2%'),
  },
  otpHeader: { alignItems: 'center', marginBottom: hp('3%') },
  otpTitle: {
    fontSize: wp('6%'),
    fontFamily: Fonts.medium,
    marginBottom: hp('1%'),
  },
  otpSubtitle: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.light,
    textAlign: 'center',
  },
  otpEmail: {
    fontSize: wp('4%'),
    fontFamily: Fonts.medium,
    marginTop: hp('0.5%'),
  },
  otpContainer: { width: '100%', marginBottom: hp('2%') },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('1%'),
    gap: wp('1%'),
  },
  resendText: { fontSize: wp('3.5%'), fontFamily: Fonts.light },
  resendButton: { fontSize: wp('3.5%'), fontFamily: Fonts.medium },
  resendInfoText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.light,
    textAlign: 'center',
    marginBottom: hp('2%'),
  },
  verifyButton: { marginBottom: hp('2%') },
  helpText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.light,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default VerifyOTP;
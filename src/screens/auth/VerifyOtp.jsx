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
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Clock } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Fonts } from '../../utils/GlobalText';
import LogoHeader from '../../components/Login/LogoHeader';
import PrimaryButton from '../../components/common/PrimaryButton';
import SlideableAlert from '../../components/common/SlideableAlert';
import OTPInput from '../../components/common/OTPInput';
import { Settings } from 'lucide-react-native';

import {
  verifyOtp,
  hideAlert,
  setAlert,
  resendOtp,
  checkAuthState,
} from '../../store/actions/authActions';
import { showToast } from '../../components/common/ToastProvider';

const VerifyOTP = ({ route, navigation }) => {
  const { employeeId } = route.params; 
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const [disabledd, setDisabledd] = useState(false);
  const { verifyOtpLoading } = useSelector(state => state.auth);
  const { alert } = useSelector(state => state.ui);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(hp('3%'))).current;

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

    return () => console.log('🔐 VerifyOTP unmounted');
  }, []);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      // dispatch(
      //   setAlert(
      //     t.alerts.otpError || 'Please enter complete 6-digit OTP',
      //     'error',
      //   ),
      // );
      showToast(t.alerts.otpError || 'Please enter complete 6-digit OTP', 'error');
      return;
    }

    console.log('🔑 Verifying OTP for employee ID:', employeeId);
    const result = await dispatch(verifyOtp(employeeId, otpString)); 

    if (result.success) {
      console.log('✅ OTP verified successfully');
      dispatch(checkAuthState());
    } else {
      setOtp(['', '', '', '', '', '']);
    }
  };

  const handleResendOtp = async () => {
    setOtp(['', '', '', '', '', '']);
    setDisabledd(true);
    if (!canResend) return;

    console.log('📧 Resending OTP for employee ID:', employeeId);
    const result = await dispatch(resendOtp(employeeId)); 
    if (result.success) {
      setTimer(30);
      setDisabledd(false);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      // dispatch(
      //   setAlert(t.alerts.otpSent || 'OTP resent successfully', 'success'),
      // );
      showToast(t.alerts.otpSent || 'OTP resent successfully', 'success');
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Login');
    }
  };

  return (
    <View style={[styles.rootContainer, { backgroundColor: C.background }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />

      {/* Fixed decorative blobs */}
      <View style={[styles.topShadow, { backgroundColor: C.topShadow }]} />
      <View
        style={[styles.bottomShadow, { backgroundColor: C.bottomShadow }]}
      />

      <SlideableAlert
        visible={alert.visible}
        message={alert.message}
        type={alert.type}
        onDismiss={() => dispatch(hideAlert())}
      />

      <KeyboardAvoidingView
        style={styles.kavContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                {employeeId} {/* Display employeeId instead of email */}
              </Text>
            </View>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.otpContainer}>
                <OTPInput otp={otp} setOtp={setOtp} />
              </View>
            </TouchableWithoutFeedback>

            <View style={styles.resendContainer}>
              <Clock size={wp('4%')} color={C.textSecondary} />
              <Text style={[styles.resendText, { color: C.textSecondary }]}>
                {canResend
                  ? t.otp.resendPrompt || "Didn't receive the code?"
                  : `${t.otp.resendIn || 'Resend in'} 00:${timer
                      .toString()
                      .padStart(2, '0')}`}
              </Text>
              {canResend && (
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={verifyOtpLoading || disabledd}
                >
                  <Text style={[styles.resendButton, { color: C.primary }]}>
                    {' '}
                    {t.otp.resendButton}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <PrimaryButton
              title={t.otp.verifyButton}
              onPress={handleVerifyOtp}
              loading={verifyOtpLoading}
              disabled={otp.join('').length !== 6 || verifyOtpLoading}
              style={styles.verifyButton}
            />

            <Text style={[styles.helpText, { color: C.textSecondary }]}>
              {t.otp.validity || 'OTP is valid for 5 minutes'}
            </Text>
          </ScrollView>
        </Animated.View>
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: C.primary }]}
          onPress={() => navigation.navigate('AuthSettings', { fromAuth: true })}
        >
          <Settings size={wp('5%')} color={C.textDark} />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  settingsButton: {
    position: 'absolute',
    bottom: hp('4%'),
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
  kavContainer: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: wp('6%'),
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: hp('20%'),
    paddingBottom: hp('6%'),
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
  otpHeader: {
    alignItems: 'center',
    marginBottom: hp('3%'),
  },
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
  otpContainer: {
    width: '100%',
    marginBottom: hp('2%'),
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('3%'),
    gap: wp('1%'),
  },
  resendText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.light,
  },
  resendButton: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
  },
  verifyButton: {
    marginBottom: hp('2%'),
  },
  helpText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.light,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default VerifyOTP;
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  Keyboard,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Colors, Fonts } from '../../utils/GlobalText';
import LogoHeader from '../../components/Login/LogoHeader';
import WelcomeText from '../../components/Login/WelcomeText';
import FloatingLabelInput from '../../components/common/FloatingLabelInput';
import PrimaryButton from '../../components/common/PrimaryButton';
import { sendOtp, hideAlert } from '../../store/actions/authActions';
import { Settings } from 'lucide-react-native';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const { sendOtpLoading, sendOtpSuccess } = useSelector(state => state.auth);
  const { alert } = useSelector(state => state.ui);

  const [employeeId, setEmployeeId] = useState('');
  const [employeeIdError, setEmployeeIdError] = useState('');
  
  // ✅ FIX: Prevent multiple API calls and duplicate toasts
  const isSendingRef = useRef(false);
  const lastErrorTimeRef = useRef(0);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    console.log('🔐 LoginScreen mounted');
    return () => {
      console.log('🔐 LoginScreen unmounted');
      // Cleanup timeout on unmount
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // ✅ FIX: Prevent duplicate error toasts by clearing previous timeout
  useEffect(() => {
    if (alert && alert.message && !alert.success) {
      const currentTime = Date.now();
      
      // Check if we're showing the same error within 2 seconds
      if ((currentTime - lastErrorTimeRef.current) < 2000) {
        // This is a duplicate, don't show again
        console.log('Duplicate toast prevented');
        return;
      }
      
      // Update last error time
      lastErrorTimeRef.current = currentTime;
      
      // Clear any existing timeout
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      
      // Auto-hide alert after 3 seconds
      toastTimeoutRef.current = setTimeout(() => {
        dispatch(hideAlert());
        toastTimeoutRef.current = null;
      }, 3000);
    }
  }, [alert, dispatch]);

  // ✅ FIX: Reset form when screen focuses
  useFocusEffect(
    useCallback(() => {
      setEmployeeId('');
      setEmployeeIdError('');
      isSendingRef.current = false;
      lastErrorTimeRef.current = 0;
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
      // Hide any existing alerts when screen focuses
      dispatch(hideAlert());
    }, [dispatch])
  );

  useEffect(() => {
    if (sendOtpSuccess && employeeId) {
      console.log('📧 OTP sent successfully, navigating to verification');
      isSendingRef.current = false; // Reset sending flag
      navigation.navigate('Verify_Otp', {
        employeeId: employeeId.trim().toUpperCase(),
      });
    }
  }, [sendOtpSuccess, employeeId, navigation]);

  const filterAlphanumeric = (text) => {
    return text.replace(/[^a-zA-Z0-9]/g, '');
  };

  const validateEmployeeId = (id) => {
    return id && id.trim().length > 0;
  };

  const handleSendOtp = async () => {
    Keyboard.dismiss();
    
    // ✅ FIX: Prevent multiple API calls while one is in progress
    if (isSendingRef.current) {
      console.log('API call already in progress, ignoring duplicate click');
      return;
    }
    
    // Clear previous error
    setEmployeeIdError('');

    if (!validateEmployeeId(employeeId)) {
      setEmployeeIdError('Please enter a valid Employee ID');
      return;
    }

    // Set sending flag to prevent multiple calls
    isSendingRef.current = true;
    
    console.log('📤 Sending OTP for employee ID:', employeeId);
    const payloadEmployeeId = employeeId.trim().toUpperCase();
    
    try {
      await dispatch(sendOtp(payloadEmployeeId));
    } catch (error) {
      console.error('Error sending OTP:', error);
      isSendingRef.current = false;
    }
  };

  return (
    <View style={[styles.rootContainer, { backgroundColor: C.background }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />

      <View style={[styles.topShadow, { backgroundColor: C.topShadow }]} />
      <View style={[styles.bottomShadow, { backgroundColor: C.bottomShadow }]} />

      <KeyboardAvoidingView
        style={styles.kavContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LogoHeader />
          <WelcomeText />

          <View style={styles.formContainer}>
            <FloatingLabelInput
              label="Employee ID"
              value={employeeId}
              onChangeText={text => {
                const filteredText = filterAlphanumeric(text);
                setEmployeeId(filteredText);
                setEmployeeIdError('');
                // Reset flags when user starts typing
                isSendingRef.current = false;
              }}
              keyboardType="default"
              maxLength={20}
              placeholder="Enter your Employee ID"
              placeholderTextColor={C.textSecondary}
            />
            {employeeIdError ? (
              <Text style={[styles.errorText, { color: C.error }]}>
                {employeeIdError}
              </Text>
            ) : null}

            <PrimaryButton
              title={t.login.sendOtpButton}
              onPress={handleSendOtp}
              loading={sendOtpLoading}
              disabled={!validateEmployeeId(employeeId) || sendOtpLoading || isSendingRef.current}
            />
          </View>
        </ScrollView>
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
    bottom: -hp('10%'),
    left: -wp('2%'),
    opacity: 0.4,
    width: wp('90%'),
    height: hp('35%'),
    borderTopRightRadius: wp('50%'),
  },
  kavContainer: {
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
  formContainer: {
    width: '100%',
    marginTop: hp('2%'),
    marginBottom: hp('4%'),
  },
  errorText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.light,
    marginTop: -hp('1%'),
    marginBottom: hp('1%'),
    marginLeft: wp('2%'),
  },
});

export default LoginScreen;
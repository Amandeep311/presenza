import React, { useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { Fonts } from '../../utils/GlobalText';
import { useTheme } from '../../context/ThemeContext';

const OTPInput = ({ otp, setOtp }) => {
  const inputs = useRef([]);
  const { theme } = useTheme();
  const C = theme.colors;
  
  // Check if it's light theme
  const isLightTheme = theme.dark === false;

  const handleChange = (text, index) => {
    // Allow only numbers
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText.length > 1) {
      // Handle paste
      const pastedOtp = numericText.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      
      // Focus next empty box
      const nextEmptyIndex = newOtp.findIndex((val, i) => i > index && !val);
      if (nextEmptyIndex !== -1) {
        inputs.current[nextEmptyIndex]?.focus();
      } else if (index + pastedOtp.length < 6) {
        inputs.current[index + pastedOtp.length]?.focus();
      }
    } else {
      const newOtp = [...otp];
      newOtp[index] = numericText;
      setOtp(newOtp);
      
      // Auto-focus next input
      if (numericText && index < 5) {
        inputs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous input on backspace
      inputs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index) => {
    // Select all text in the current input
    inputs.current[index]?.setNativeProps({ selection: { start: 0, end: 1 } });
  };

  return (
    <View style={styles.container}>
      {otp.map((digit, index) => (
        <TextInput
          key={index}
          ref={ref => inputs.current[index] = ref}
          style={[
            styles.box,
            digit && styles.boxFilled,
            {
              borderColor: digit ? C.primary : C.border,
              backgroundColor: digit ? C.primary + '10' : C.surface,
              color: isLightTheme ? '#000000' : C.textPrimary,
            },
          ]}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => handleFocus(index)}
          keyboardType="number-pad"
          maxLength={6}
          selectTextOnFocus
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp('2%'),
    gap: wp('2%'),
  },
  box: {
    width: wp('13%'),
    height: wp('13%'),
    borderWidth: 1.5,
    borderRadius: wp('2%'),
    textAlign: 'center',
    fontSize: wp('5%'),
    fontFamily: Fonts.medium,
  },
  boxFilled: {
    // Empty now - styles are handled inline
  },
});

export default OTPInput;
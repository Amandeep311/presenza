import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Fonts } from '../utils/GlobalText';

const NoInternetScreen = ({ onRetry, isChecking }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: C.error + '15' }]}>
          <Text style={styles.icon}>📡</Text>
        </View>

        <Text style={[styles.title, { color: C.textPrimary }]}>
          {t.internet?.noConnection || 'No Internet Connection'}
        </Text>

        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          {t.internet?.message || 'Please check your internet connection and try again.'}
        </Text>

        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: C.primary },
            isChecking && { opacity: 0.7 },
          ]}
          onPress={onRetry}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color={C.textDark} />
          ) : (
            <Text style={[styles.retryText, { color: C.textDark }]}>
              {t.buttons?.retry || 'Retry'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: wp('8%'),
  },
  iconContainer: {
    width: wp('20%'),
    height: wp('20%'),
    borderRadius: wp('10%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('3%'),
  },
  icon: {
    fontSize: wp('12%'),
  },
  title: {
    fontSize: wp('6%'),
    fontFamily: Fonts.bold,
    marginBottom: hp('1.5%'),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: wp('3.8%'),
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginBottom: hp('4%'),
    lineHeight: hp('2.8%'),
  },
  retryButton: {
    paddingHorizontal: wp('10%'),
    paddingVertical: hp('2%'),
    borderRadius: wp('3%'),
  },
  retryText: {
    fontSize: wp('4%'),
    fontFamily: Fonts.medium,
  },
});

export default NoInternetScreen;
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Fonts } from '../../../utils/GlobalText';
import { useTheme } from '../../../context/ThemeContext';
import { MONTHS } from './data/holidayData';

/**
 * MonthNavigator
 *
 * Props:
 *  - month       {number}   - 0-indexed current month
 *  - year        {number}
 *  - onPrev      {function} - called when left arrow pressed
 *  - onNext      {function} - called when right arrow pressed
 *  - minMonth    {number}   - lowest allowed month (default 0)
 *  - maxMonth    {number}   - highest allowed month (default 11)
 */
const MonthNavigator = ({
  month,
  year,
  onPrev,
  onNext,
  minMonth = 0,
  maxMonth = 11,
}) => {
  const { theme } = useTheme();
  const C = theme.colors;

  return (
    <View style={styles.monthNav}>
      <TouchableOpacity
        onPress={onPrev}
        style={[
          styles.navBtn,
          { backgroundColor: C.surface, borderColor: C.border },
          month === minMonth && { opacity: 0.3 },
        ]}
        disabled={month === minMonth}
      >
        <ChevronLeft
          size={wp('5%')}
          color={month === minMonth ? C.disabled : C.textPrimary}
        />
      </TouchableOpacity>

      <View style={styles.monthTitleWrap}>
        <Text style={[styles.monthTitle, { color: C.textPrimary }]}>
          {MONTHS[month]}
        </Text>
        <Text style={[styles.monthYear, { color: C.textSecondary }]}>
          {year}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onNext}
        style={[
          styles.navBtn,
          { backgroundColor: C.surface, borderColor: C.border },
          month === maxMonth && { opacity: 0.3 },
        ]}
        disabled={month === maxMonth}
      >
        <ChevronRight
          size={wp('5%')}
          color={month === maxMonth ? C.disabled : C.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp('5%'),
    marginTop: hp('1%'),
    marginBottom: hp('1%'),
  },
  navBtn: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitleWrap: { alignItems: 'center' },
  monthTitle: {
    fontSize: wp('6%'),
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  monthYear: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
});

export default MonthNavigator;
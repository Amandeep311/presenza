import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { Colors, Fonts } from '../../../utils/GlobalText';
import { useTheme } from '../../../context/ThemeContext';
import {
  toDateStr,
  getDaysInMonth,
  getFirstDayOfMonth,
  getNthSaturday,
  isHolidayForBranch,
  isWeeklyOff,
  HOLIDAY_MAP,
} from './Calendarutils';
import { DAYS } from './data/holidayData';

/**
 * CalendarGrid
 *
 * Props:
 *  - year         {number}       - e.g. 2026
 *  - month        {number}       - 0-indexed (0 = January)
 *  - startDate    {string|null}  - "YYYY-MM-DD"
 *  - endDate      {string|null}  - "YYYY-MM-DD"
 *  - todayStr     {string}       - "YYYY-MM-DD" (today)
 *  - userBranch   {string}       - e.g. "CHD"
 *  - onDayPress   {function}     - (day: number, dateStr: string) => void
 */
const CalendarGrid = ({
  year,
  month,
  startDate,
  endDate,
  todayStr,
  userBranch,
  onDayPress,
}) => {
  const { theme } = useTheme();
  const C = theme.colors;

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const secondSat = getNthSaturday(year, month, 2);
  const fourthSat = getNthSaturday(year, month, 4);

  // Build cell array: nulls for padding + day numbers
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const getDayStyle = (day) => {
    if (!day) return null;

    const dateStr = toDateStr(year, month, day);
    const dayOfWeek = new Date(year, month, day).getDay();

    const isSunday = dayOfWeek === 0;
    const isSecondSat = day === secondSat;
    const isFourthSat = day === fourthSat;
    const isOff = isSunday || isSecondSat || isFourthSat;

    const holiday = HOLIDAY_MAP[dateStr];
    const branchHoliday = isHolidayForBranch(dateStr, userBranch);
    const domType = holiday ? Object.values(holiday.branches) : [];
    const hasHoliday = !!holiday;
    const isHalf = branchHoliday &&
      (branchHoliday.type === 'half1' || branchHoliday.type === 'half2');
    const isFullHoliday = branchHoliday && branchHoliday.type === 'full';

    const isToday =
      new Date(todayStr).getFullYear() === year &&
      new Date(todayStr).getMonth() === month &&
      new Date(todayStr).getDate() === day;
    const isPast = new Date(dateStr) < new Date(todayStr);

    const effectiveEnd = endDate || startDate;
    const inRange =
      startDate && effectiveEnd &&
      dateStr >= startDate && dateStr <= effectiveEnd;
    const isStart = dateStr === startDate;
    const isEnd = dateStr === (endDate || startDate);

    const isRangeStart = isStart && startDate !== endDate && endDate;
    const isRangeEnd = isEnd && startDate !== endDate && endDate;
    const isRangeMid = inRange && !isStart && !isEnd;
    const isSingleSelected = isStart && (!endDate || startDate === endDate);

    // ── Resolve colors ──
    let cellBg = 'transparent';
    let numColor = C.textPrimary;
    let fontFam = Fonts.medium;
    let borderColor = 'transparent';
    let borderW = 1;

    if (isPast) numColor = C.disabled;

    if (isOff && !hasHoliday) {
      cellBg = C.error + '12';
      numColor = C.error;
      fontFam = Fonts.bold;
    }
    if (hasHoliday && !isHalf && branchHoliday) {
      cellBg = C.primary + '18';
      numColor = C.primary;
      fontFam = Fonts.bold;
    }
    if (isHalf && branchHoliday) {
      cellBg = C.warning + '18';
      numColor = C.warning;
      fontFam = Fonts.bold;
    }
    if (isOff && hasHoliday) {
      cellBg = C.error + '22';
      numColor = C.error;
      fontFam = Fonts.bold;
    }
    if (isToday) {
      borderColor = C.success + '90';
      borderW = 1.5;
      numColor = C.success;
      fontFam = Fonts.bold;
    }
    if (isSingleSelected) {
      cellBg = C.primary;
      numColor = '#fff';
      borderColor = C.primary;
    }
    if (isRangeStart || isRangeEnd) {
      cellBg = C.primary;
      numColor = '#fff';
    }
    if (isRangeMid) {
      cellBg = C.primary + '28';
      numColor = C.primary;
    }

    return {
      cellBg, numColor, fontFam, borderColor, borderW,
      hasHoliday, isHalf, isOff, branchHoliday,
      isSingleSelected, isRangeStart, isRangeEnd, isRangeMid,
      dateStr,
    };
  };

  return (
    <View
      style={[
        styles.calCard,
        { backgroundColor: C.surface, borderColor: C.border },
      ]}
    >
      {/* Day-of-week header */}
      <View style={styles.dayHeaderRow}>
        {DAYS.map((d, i) => (
          <View key={d} style={styles.dayHeaderCell}>
            <Text
              style={[
                styles.dayHeaderText,
                { color: i === 0 ? C.error : C.textSecondary },
              ]}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.divider, { backgroundColor: C.border }]} />

      {/* Date grid */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={idx} style={styles.dayCell} />;

          const s = getDayStyle(day);

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dayCell,
                {
                  backgroundColor: s.cellBg,
                  borderColor: s.borderColor,
                  borderWidth: s.borderW,
                },
              ]}
              onPress={() => onDayPress(day, s.dateStr)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNum,
                  { color: s.numColor, fontFamily: s.fontFam },
                ]}
              >
                {day}
              </Text>

              {/* Holiday dot */}
              {s.hasHoliday &&
                !s.isSingleSelected &&
                !s.isRangeStart &&
                !s.isRangeEnd && (
                  <View
                    style={[
                      styles.holidayDot,
                      {
                        backgroundColor: s.isOff
                          ? C.error
                          : s.isHalf
                          ? C.warning
                          : C.primary,
                      },
                    ]}
                  />
                )}

              {/* Half-day indicator */}
              {s.isHalf &&
                !s.isOff &&
                !s.isSingleSelected &&
                !s.isRangeStart &&
                !s.isRangeEnd &&
                s.branchHoliday && (
                  <Text style={[styles.halfText, { color: C.warning }]}>½</Text>
                )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calCard: {
    marginHorizontal: wp('4%'),
    borderRadius: wp('5%'),
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: hp('1%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    paddingTop: hp('1.5%'),
    paddingBottom: hp('1%'),
    paddingHorizontal: wp('1%'),
  },
  dayHeaderCell: { flex: 1, alignItems: 'center' },
  dayHeaderText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.3,
  },
  divider: { height: 1, marginHorizontal: wp('3%'), marginBottom: hp('0.5%') },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: wp('1%'),
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: wp('2%'),
    position: 'relative',
    paddingBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayNum: { fontSize: wp('3.4%'), fontFamily: Fonts.medium },
  holidayDot: {
    position: 'absolute',
    bottom: wp('1%'),
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  halfText: {
    position: 'absolute',
    top: 1,
    right: wp('1%'),
    fontSize: wp('2%'),
    fontFamily: Fonts.bold,
  },
});

export default CalendarGrid;
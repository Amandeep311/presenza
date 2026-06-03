import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { Fonts } from '../../../utils/GlobalText';
import { useTheme } from '../../../context/ThemeContext';

import MonthNavigator from './Monthnavigator';
import CalendarGrid from './CalenderGrid';
import HolidayList from './Holidaylist';
import DayDetailPopup from './Daydetailpopup';

import {
  toDateStr,
  getNthSaturday,
  isWeeklyOff,
  isHolidayForBranch,
  isFreeDayForBranch,
  HOLIDAY_MAP,
} from './Calendarutils';

import { USER_BRANCH } from './data/holidayData';

const ReusableCalendar = ({
  year,
  userBranch,
  startDate,
  endDate,
  selectionMode,
  leaveType,
  todayStr,
  onStartDateChange,
  onEndDateChange,
  onSelectionModeChange,
  onFullHolidayPress,
  onHalfHolidayPress,
  showHolidayList = true,
  showStats = true,
  minMonth = 0,
  maxMonth = 11,
}) => {
  const { theme } = useTheme();
  const C = theme.colors;

  const [currentMonth, setCurrentMonth] = useState(
    new Date().getMonth()
  );

  // Day detail popup state
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupDate, setPopupDate] = useState(null);

  // Leave alert modal state
  const [leaveAlertVisible, setLeaveAlertVisible] = useState(false);

  // Global tap lock
  const globalTapLock = useRef(false);

  const secondSat = getNthSaturday(year, currentMonth, 2);
  const fourthSat = getNthSaturday(year, currentMonth, 4);

  // Count of holidays this month
  const monthHolidayCount = Object.values(HOLIDAY_MAP).filter(h => {
    const d = new Date(h.date);
    return (
      d.getMonth() === currentMonth &&
      d.getFullYear() === year
    );
  }).length;

  const handleDayPress = (day, dateStr) => {
    const dateObj = new Date(dateStr);
    const todayObj = new Date(todayStr);

    // Past date → show info popup only
    if (dateObj < todayObj) {
      openInfoPopup(day, dateStr);
      return;
    }

    const branchHoliday = isHolidayForBranch(
      dateStr,
      userBranch
    );

    const off = isWeeklyOff(dateStr);

    // Full holiday
    if (
      branchHoliday &&
      branchHoliday.type === 'full' &&
      !off
    ) {
      onFullHolidayPress?.({
        date: dateStr,
        holiday: branchHoliday.holiday,
        day,
      });
      return;
    }

    // Half holiday
    if (
      branchHoliday &&
      (branchHoliday.type === 'half1' ||
        branchHoliday.type === 'half2')
    ) {
      onHalfHolidayPress?.({
        date: dateStr,
        holiday: branchHoliday.holiday,
        halfType: branchHoliday.type,
        day,
        onProceed: () =>
          proceedWithSelection(dateStr),
      });
      return;
    }

    // Weekly off
    if (off) {
      openInfoPopup(day, dateStr);
      return;
    }

    proceedWithSelection(dateStr);
  };

  const proceedWithSelection = dateStr => {
    if (selectionMode === 'start') {
      onStartDateChange?.(dateStr);
      onEndDateChange?.(null);
      onSelectionModeChange?.('end');
    } else {
      if (
        leaveType === 'half' ||
        leaveType === 'short'
      ) {
        onEndDateChange?.(startDate);
        onSelectionModeChange?.('start');
      } else {
        if (dateStr < startDate) {
          onEndDateChange?.(startDate);
          onStartDateChange?.(dateStr);
        } else {
          onEndDateChange?.(dateStr);
        }

        onSelectionModeChange?.('start');
      }
    }
  };

  const openInfoPopup = (day, dateStr) => {
    const holiday = HOLIDAY_MAP[dateStr];

    const dayOfWeek = new Date(dateStr).getDay();

    const isSunday = dayOfWeek === 0;
    const isSecondSat = day === secondSat;
    const isFourthSat = day === fourthSat;

    if (
      holiday ||
      isSunday ||
      isSecondSat ||
      isFourthSat
    ) {
      setPopupDate({
        day,
        dateStr,
        holiday,
        isSunday,
        isSecondSat,
        isFourthSat,
      });

      setPopupVisible(true);
    }
  };

  return (
    <View>
      {/* Month Navigator */}
      <MonthNavigator
        month={currentMonth}
        year={year}
        onPrev={() =>
          setCurrentMonth(m =>
            Math.max(minMonth, m - 1)
          )
        }
        onNext={() =>
          setCurrentMonth(m =>
            Math.min(maxMonth, m + 1)
          )
        }
        minMonth={minMonth}
        maxMonth={maxMonth}
      />

      {/* Stats Row */}
      {showStats && (
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statChip,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
              },
            ]}>
            <View
              style={[
                styles.statDot,
                {
                  backgroundColor: C.primary,
                },
              ]}
            />
            <Text
              style={[
                styles.statChipText,
                {
                  color: C.textSecondary,
                },
              ]}>
              {monthHolidayCount} Holiday
              {monthHolidayCount !== 1
                ? 's'
                : ''}
            </Text>
          </View>

          <View
            style={[
              styles.statChip,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
              },
            ]}>
            <View
              style={[
                styles.statDot,
                {
                  backgroundColor: C.error,
                },
              ]}
            />
            <Text
              style={[
                styles.statChipText,
                {
                  color: C.textSecondary,
                },
              ]}>
              Sun + 2nd/4th Sat Off
            </Text>
          </View>
        </View>
      )}

      {/* Calendar Grid */}
      <CalendarGrid
        year={year}
        month={currentMonth}
        startDate={startDate}
        endDate={endDate}
        todayStr={todayStr}
        userBranch={userBranch}
        onDayPress={handleDayPress}
      />

      {/* Holiday List */}
      {showHolidayList && (
        <HolidayList
          month={currentMonth}
          year={year}
          userBranch={userBranch}
        />
      )}

      {/* Day Detail Popup */}
      <DayDetailPopup
        visible={popupVisible}
        onClose={() => {
          setPopupVisible(false);

          setTimeout(() => {
            globalTapLock.current = false;
          }, 200);
        }}
        selectedDate={popupDate}
        userBranch={userBranch}
      />

      {/* Leave Alert Modal */}
      <Modal
        visible={leaveAlertVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setLeaveAlertVisible(false);

          setTimeout(() => {
            globalTapLock.current = false;
          }, 200);
        }}>
        <View />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp('3%'),
    marginBottom: hp('1.5%'),
  },

  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1.5%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.6%'),
    borderRadius: 20,
    borderWidth: 1,
  },

  statDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statChipText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
  },
});

export default ReusableCalendar;
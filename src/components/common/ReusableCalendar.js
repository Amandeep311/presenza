// components/ReusableCalendar.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { Fonts } from '../../utils/GlobalText';
import { ChevronLeft, ChevronRight, X, CalendarDays, Info } from 'lucide-react-native';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
// const getNthSaturday = (year, month, n) => {
//   let count = 0;
//   for (let d = 1; d <= 31; d++) {
//     const date = new Date(year, month, d);
//     if (date.getMonth() !== month) break;
//     if (date.getDay() === 6) {
//       count++;
//       if (count === n) return d;
//     }
//   }
//   return -1;
// };

const toDateStr = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const ReusableCalendar = ({
  year = 2026,
  currentMonth,
  setCurrentMonth,
  onDayPress,
  getDayInfo,
  theme,
  showHolidayPopup = true,
}) => {
  const C = theme.colors;
  const [selectedDate, setSelectedDate] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const daysInMonth = getDaysInMonth(year, currentMonth);
  const firstDay = getFirstDayOfMonth(year, currentMonth);
  const secondSat = getNthSaturday(year, currentMonth, 2);
  const fourthSat = getNthSaturday(year, currentMonth, 4);

  const prevMonth = () => setCurrentMonth(m => Math.max(0, m - 1));
  const nextMonth = () => setCurrentMonth(m => Math.min(11, m + 1));

  const showHolidayInfo = (day, dateStr, dayInfo) => {
    setSelectedDate({
      day,
      dateStr,
      ...dayInfo,
    });
    setPopupVisible(true);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDayPress = (day) => {
    if (!day) return;
    const dateStr = toDateStr(year, currentMonth, day);
    const dayInfo = getDayInfo(day, dateStr);
    
    if (showHolidayPopup && dayInfo?.isHoliday) {
      showHolidayInfo(day, dateStr, dayInfo);
    } else {
      onDayPress(day, dateStr, dayInfo);
    }
  };

  return (
    <>
      {/* Month Navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={prevMonth}
          style={[
            styles.navBtn,
            { backgroundColor: C.surface, borderColor: C.border },
            currentMonth === 0 && { opacity: 0.3 },
          ]}
          disabled={currentMonth === 0}
        >
          <ChevronLeft size={wp('5%')} color={currentMonth === 0 ? C.disabled : C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.monthTitleWrap}>
          <Text style={[styles.monthTitle, { color: C.textPrimary }]}>
            {MONTHS[currentMonth]}
          </Text>
          <Text style={[styles.monthYear, { color: C.textSecondary }]}>
            {year}
          </Text>
        </View>
        <TouchableOpacity
          onPress={nextMonth}
          style={[
            styles.navBtn,
            { backgroundColor: C.surface, borderColor: C.border },
            currentMonth === 11 && { opacity: 0.3 },
          ]}
          disabled={currentMonth === 11}
        >
          <ChevronRight size={wp('5%')} color={currentMonth === 11 ? C.disabled : C.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statChip, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.statDot, { backgroundColor: C.primary }]} />
          <Text style={[styles.statChipText, { color: C.textSecondary }]}>
            Holidays
          </Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.statDot, { backgroundColor: C.error }]} />
          <Text style={[styles.statChipText, { color: C.textSecondary }]}>
            Sun + 2nd/4th Sat Off
          </Text>
        </View>
      </View>

      {/* Calendar Card */}
      <View style={[styles.calCard, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={styles.dayHeaderRow}>
          {DAYS.map((d, i) => (
            <View key={d} style={styles.dayHeaderCell}>
              <Text style={[styles.dayHeaderText, { color: i === 0 ? C.error : C.textSecondary }]}>
                {d}
              </Text>
            </View>
          ))}
        </View>
        <View style={[styles.divider, { backgroundColor: C.border }]} />

        <View style={styles.grid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={idx} style={styles.dayCell} />;
            
            const dateStr = toDateStr(year, currentMonth, day);
            const info = getDayInfo(day, dateStr);
            
            let cellBg = info?.backgroundColor || 'transparent';
            let numColor = info?.textColor || C.textPrimary;
            let fontFam = info?.fontFamily || Fonts.medium;
            let borderColor = info?.borderColor || 'transparent';
            let borderW = info?.borderWidth || 0;
            let showDot = info?.showDot;
            let dotColor = info?.dotColor;
            let showHalfIcon = info?.showHalfIcon;
            let halfIconColor = info?.halfIconColor;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: cellBg,
                    borderColor,
                    borderWidth: borderW,
                  },
                ]}
                onPress={() => handleDayPress(day)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayNum, { color: numColor, fontFamily: fontFam }]}>
                  {day}
                </Text>
                {showDot && (
                  <View style={[styles.holidayDot, { backgroundColor: dotColor }]} />
                )}
                {showHalfIcon && (
                  <Text style={[styles.halfText, { color: halfIconColor }]}>½</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Day Detail Popup */}
      {showHolidayPopup && (
        <Modal
          visible={popupVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPopupVisible(false)}
        >
          <TouchableOpacity
            style={[styles.popupOverlay, { backgroundColor: C.overlayBg }]}
            activeOpacity={1}
            onPress={() => setPopupVisible(false)}
          >
            <View style={[styles.popupCard, { backgroundColor: C.surfaceSolid, borderColor: C.border }]}>
              <View style={styles.popupHeader}>
                <Text style={[styles.popupDate, { color: C.textPrimary }]}>
                  {selectedDate
                    ? new Date(selectedDate.dateStr).toLocaleDateString('en-US', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })
                    : ''}
                </Text>
                <TouchableOpacity
                  onPress={() => setPopupVisible(false)}
                  style={[styles.popupClose, { backgroundColor: C.background, borderColor: C.border }]}
                >
                  <X size={wp('4%')} color={C.textSecondary} />
                </TouchableOpacity>
              </View>

              {selectedDate?.isWeeklyOff && (
                <View style={[styles.popupHolidayRow, { backgroundColor: C.error + '15' }]}>
                  <CalendarDays size={wp('5%')} color={C.error} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.popupHolidayName, { color: C.textPrimary }]}>
                      {selectedDate.isSunday ? 'Sunday' : 
                       selectedDate.isSecondSat ? '2nd Saturday' : '4th Saturday'}
                    </Text>
                    <Text style={[styles.popupHolidayType, { color: C.error }]}>
                      Weekly Off
                    </Text>
                  </View>
                </View>
              )}

              {selectedDate?.holiday && (
                <View style={[styles.popupHolidayRow, { backgroundColor: selectedDate.holidayColor + '15' }]}>
                  <CalendarDays size={wp('5%')} color={selectedDate.holidayColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.popupHolidayName, { color: C.textPrimary }]}>
                      {selectedDate.holiday.name}
                    </Text>
                    <Text style={[styles.popupHolidayType, { color: selectedDate.holidayColor }]}>
                      {selectedDate.holidayType === 'full' ? '✓ Full Day' :
                       selectedDate.holidayType === 'half1' ? '½ First Half' : '½ Second Half'}
                    </Text>
                  </View>
                </View>
              )}

              {selectedDate?.branches && selectedDate.branches.length > 0 && (
                <View style={styles.popupBranchWrap}>
                  <Text style={[styles.popupBranchLabel, { color: C.textSecondary }]}>
                    Branches:
                  </Text>
                  <View style={styles.branchPillsWrap}>
                    {selectedDate.branches.map((branch, i) => (
                      <View
                        key={i}
                        style={[
                          styles.branchPill,
                          { backgroundColor: branch.isUser ? branch.color + '30' : branch.color + '18' }
                        ]}
                      >
                        <Text style={[styles.branchPillText, { color: branch.color }]}>
                          {branch.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
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
  monthYear: { fontSize: wp('3%'), fontFamily: Fonts.regular, marginTop: 1 },
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
  statDot: { width: 7, height: 7, borderRadius: 4 },
  statChipText: { fontSize: wp('2.8%'), fontFamily: Fonts.regular },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: wp('1%') },
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
  popupOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('8%'),
  },
  popupCard: {
    borderRadius: wp('5%'),
    padding: wp('5%'),
    width: '100%',
    borderWidth: 1,
    gap: hp('1.5%'),
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  popupDate: { fontSize: wp('4%'), fontFamily: Fonts.bold, flex: 1 },
  popupClose: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  popupHolidayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp('3%'),
    padding: wp('3.5%'),
    borderRadius: wp('3%'),
  },
  popupHolidayName: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.bold,
    marginBottom: 3,
  },
  popupHolidayType: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },
  popupBranchWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  popupBranchLabel: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },
  branchPillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  branchPill: {
    paddingHorizontal: wp('2%'),
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  branchPillText: { fontSize: wp('2.3%'), fontFamily: Fonts.medium },
});

export default ReusableCalendar;
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { X, CalendarDays, Building2, Sunrise, Sunset } from 'lucide-react-native';
import { Fonts } from '../../../utils/GlobalText';
import { useTheme } from '../../../context/ThemeContext';
import { isAllBranches, getDomType } from './Calendarutils';

/**
 * DayDetailPopup
 *
 * Shows detailed info about a tapped date (weekly off / holiday info).
 *
 * Props:
 *  - visible      {boolean}
 *  - onClose      {function}
 *  - selectedDate {object|null}  - { dateStr, holiday, isSunday, isSecondSat, isFourthSat }
 *  - userBranch   {string}
 */
const DayDetailPopup = ({ visible, onClose, selectedDate, userBranch }) => {
  const { theme } = useTheme();
  const C = theme.colors;

  if (!selectedDate) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: C.overlayBg }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: C.surfaceSolid, borderColor: C.border },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.dateText, { color: C.textPrimary }]}>
              {new Date(selectedDate.dateStr).toLocaleDateString('en-US', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: C.background, borderColor: C.border },
              ]}
            >
              <X size={wp('4%')} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Weekly Off Row */}
          {(selectedDate.isSunday ||
            selectedDate.isSecondSat ||
            selectedDate.isFourthSat) && (
            <View
              style={[styles.holidayRow, { backgroundColor: C.error + '15' }]}
            >
              <CalendarDays size={wp('5%')} color={C.error} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.holidayName, { color: C.textPrimary }]}>
                  {selectedDate.isSunday
                    ? 'Sunday'
                    : selectedDate.isSecondSat
                    ? '2nd Saturday'
                    : '4th Saturday'}
                </Text>
                <Text style={[styles.holidayType, { color: C.error }]}>
                  Weekly Off
                </Text>
              </View>
            </View>
          )}

          {/* Holiday Row */}
          {selectedDate.holiday &&
            (() => {
              const h = selectedDate.holiday;
              const domType = getDomType(h.branches);
              const all = isAllBranches(h.branches);
              const branchEntries = Object.entries(h.branches);
              const color = domType === 'full' ? C.primary : C.warning;

              return (
                <>
                  <View
                    style={[
                      styles.holidayRow,
                      { backgroundColor: color + '15' },
                    ]}
                  >
                    {domType === 'half1' ? (
                      <Sunrise size={wp('5%')} color={color} />
                    ) : domType === 'half2' ? (
                      <Sunset size={wp('5%')} color={color} />
                    ) : (
                      <CalendarDays size={wp('5%')} color={color} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.holidayName, { color: C.textPrimary }]}
                      >
                        {h.name}
                      </Text>
                      <Text
                        style={[
                          styles.holidayType,
                          {
                            color:
                              domType === 'full' ? C.success : C.warning,
                          },
                        ]}
                      >
                        {domType === 'full'
                          ? '✓ Full Day'
                          : domType === 'half1'
                          ? '½ First Half'
                          : '½ Second Half'}
                      </Text>
                    </View>
                  </View>

                  {/* Branch pills */}
                  <View style={styles.branchWrap}>
                    <Building2 size={wp('3%')} color={C.textSecondary} />
                    <Text
                      style={[styles.branchLabel, { color: C.textSecondary }]}
                    >
                      Branches:
                    </Text>
                    {all ? (
                      <View
                        style={[
                          styles.branchPill,
                          {
                            backgroundColor: C.success + '18',
                            borderColor: C.success + '40',
                          },
                        ]}
                      >
                        <Text
                          style={[styles.branchPillText, { color: C.success }]}
                        >
                          All
                        </Text>
                      </View>
                    ) : (
                      branchEntries.map(([branch, type], bi) => {
                        const isHalfB = type === 'half1' || type === 'half2';
                        const bc = isHalfB ? C.warning : C.primary;
                        const isUser = branch === userBranch;
                        return (
                          <View
                            key={bi}
                            style={[
                              styles.branchPill,
                              {
                                backgroundColor: isUser
                                  ? bc + '30'
                                  : bc + '18',
                                borderColor: isUser ? bc + '80' : bc + '40',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.branchPillText,
                                {
                                  color: bc,
                                  fontFamily: isUser
                                    ? Fonts.bold
                                    : Fonts.medium,
                                },
                              ]}
                            >
                              {branch}
                              {isHalfB ? ' ½' : ''}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                </>
              );
            })()}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('8%'),
  },
  card: {
    borderRadius: wp('5%'),
    padding: wp('5%'),
    width: '100%',
    borderWidth: 1,
    gap: hp('1.5%'),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: { fontSize: wp('4%'), fontFamily: Fonts.bold, flex: 1 },
  closeBtn: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  holidayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp('3%'),
    padding: wp('3.5%'),
    borderRadius: wp('3%'),
  },
  holidayName: { fontSize: wp('3.5%'), fontFamily: Fonts.bold, marginBottom: 3 },
  holidayType: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },
  branchWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  branchLabel: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },
  branchPill: {
    paddingHorizontal: wp('2%'),
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  branchPillText: { fontSize: wp('2.3%'), fontFamily: Fonts.medium },
});

export default DayDetailPopup;
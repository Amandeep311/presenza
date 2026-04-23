import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {
  CalendarDays,
  Building2,
  Sunrise,
  Sunset,
} from 'lucide-react-native';
import { Fonts } from '../../../utils/GlobalText';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { HOLIDAYS_2026, DAYS } from './data/holidayData';
import { isAllBranches, getDomType } from './Calendarutils';

/**
 * HolidayList
 *
 * Renders the holiday list for a given month.
 *
 * Props:
 *  - month      {number} - 0-indexed
 *  - year       {number}
 *  - userBranch {string} - e.g. "CHD"
 */
const HolidayList = ({ month, year, userBranch }) => {
  const { theme } = useTheme();
  const C = theme.colors;
  const { t } = useLanguage();

  const monthHolidays = HOLIDAYS_2026?.filter(h => {
    const d = new Date(h.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  if (monthHolidays.length === 0) return null;

  return (
    <View style={styles.holidayList}>
      <Text style={[styles.holidayListTitle, { color: C.textSecondary }]}>
        {t?.leave?.holidaysThisMonth || 'HOLIDAYS THIS MONTH'}
      </Text>

      {monthHolidays.map((h, i) => {
        const d = new Date(h.date);
        const day = d.getDate();
        const dow = DAYS[d.getDay()];
        const all = isAllBranches(h.branches);
        const domType = getDomType(h.branches);
        const isHalf = domType === 'half1' || domType === 'half2';
        const branchEntries = Object.entries(h.branches);
        const isForUserBranch = !!h.branches[userBranch];

        return (
          <View
            key={i}
            style={[
              styles.holidayListItem,
              {
                backgroundColor: C.surface,
                borderColor: isForUserBranch
                  ? isHalf ? C.warning + '60' : C.primary + '60'
                  : C.border,
              },
            ]}
          >
            {/* Date Box */}
            <View
              style={[
                styles.holidayDateBox,
                {
                  backgroundColor:
                    domType === 'full' ? C.primary + '20' : C.warning + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.holidayDateDay,
                  { color: domType === 'full' ? C.primary : C.warning },
                ]}
              >
                {day}
              </Text>
              <Text
                style={[
                  styles.holidayDateDow,
                  {
                    color:
                      domType === 'full'
                        ? C.primary + 'AA'
                        : C.warning + 'AA',
                  },
                ]}
              >
                {dow}
              </Text>
            </View>

            {/* Info */}
            <View style={styles.holidayListInfo}>
              {/* Name + Your Branch badge */}
              <View style={styles.holidayNameRow}>
                <Text
                  style={[styles.holidayListName, { color: C.textPrimary }]}
                >
                  {h.name}
                </Text>
                {isForUserBranch && (
                  <View
                    style={[
                      styles.yourBranchBadge,
                      { backgroundColor: C.success + '20' },
                    ]}
                  >
                    <Text
                      style={[styles.yourBranchText, { color: C.success }]}
                    >
                      {t?.leave?.yourBranchLabel || 'Your Branch'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Type pill */}
              <View
                style={[
                  styles.holidayTypePill,
                  {
                    backgroundColor:
                      domType === 'full'
                        ? C.success + '20'
                        : C.warning + '20',
                  },
                ]}
              >
                {domType === 'half1' ? (
                  <Sunrise size={wp('2.8%')} color={C.warning} />
                ) : domType === 'half2' ? (
                  <Sunset size={wp('2.8%')} color={C.warning} />
                ) : (
                  <CalendarDays size={wp('2.8%')} color={C.success} />
                )}
                <Text
                  style={[
                    styles.holidayTypeText,
                    { color: domType === 'full' ? C.success : C.warning },
                  ]}
                >
                  {domType === 'full'
                    ? t?.leave?.fullDay || 'Full Day'
                    : domType === 'half1'
                    ? t?.leave?.firstHalf || 'First Half'
                    : t?.leave?.secondHalf || 'Second Half'}
                </Text>
              </View>

              {/* Branch pills */}
              <View style={styles.branchRow}>
                <Building2 size={wp('2.8%')} color={C.textSecondary} />
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
                      All Branches
                    </Text>
                  </View>
                ) : (
                  <View style={styles.branchPillsWrap}>
                    {branchEntries.map(([branch, type], bi) => {
                      const isHalfB = type === 'half1' || type === 'half2';
                      const color = isHalfB ? C.warning : C.primary;
                      const isUser = branch === userBranch;
                      return (
                        <View
                          key={bi}
                          style={[
                            styles.branchPill,
                            {
                              backgroundColor: isUser
                                ? color + '30'
                                : color + '18',
                              borderColor: isUser
                                ? color + '80'
                                : color + '40',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.branchPillText,
                              {
                                color,
                                fontFamily: isUser ? Fonts.bold : Fonts.medium,
                              },
                            ]}
                          >
                            {branch}
                            {isHalfB ? ' ½' : ''}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  holidayList: { marginHorizontal: wp('4%'), marginTop: hp('2%') },
  holidayListTitle: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.8,
    marginBottom: hp('1.2%'),
    paddingHorizontal: wp('1%'),
  },
  holidayListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: wp('3.5%'),
    marginBottom: hp('1%'),
    padding: wp('3.5%'),
    borderWidth: 1,
    gap: wp('3%'),
  },
  holidayDateBox: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  holidayDateDay: { fontSize: wp('4.5%'), fontFamily: Fonts.bold },
  holidayDateDow: { fontSize: wp('2.4%'), fontFamily: Fonts.regular },
  holidayListInfo: { flex: 1, gap: 6 },
  holidayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    flexWrap: 'wrap',
  },
  holidayListName: { fontSize: wp('3.2%'), fontFamily: Fonts.medium, flex: 1 },
  yourBranchBadge: {
    paddingHorizontal: wp('2%'),
    paddingVertical: 2,
    borderRadius: 20,
  },
  yourBranchText: { fontSize: wp('2.2%'), fontFamily: Fonts.bold },
  holidayTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: wp('2%'),
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },
  holidayTypeText: { fontSize: wp('2.6%'), fontFamily: Fonts.medium },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  branchPillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  branchPill: {
    paddingHorizontal: wp('2%'),
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  branchPillText: { fontSize: wp('2.3%'), fontFamily: Fonts.medium },
});

export default HolidayList;
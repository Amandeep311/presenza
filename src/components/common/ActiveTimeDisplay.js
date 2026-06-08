// src/components/common/ActiveTimeDisplay.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { Clock, Coffee, AlertCircle, LogOut } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Fonts } from '../../utils/GlobalText';

const ActiveTimeDisplay = ({
  // Active Time Props
  punchInTime,
  isOnBreak,
  breakStartTime,
  breakType,
  onEndBreak,
  breakLoading,

  // Status Banner Props
  isAbsent,
  isUserLate,
  isHalfDay,
  isPunchedIn,
  hasAnySessionToday,
  isEarlyLeave,
  todaysPunchIn,
  firstPunchIn,
  lastSession,
  lateMinutes,
  earlyLeaveMinutes,
  statusConfig,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [breakDuration, setBreakDuration] = useState('00:00');
  const [isBreakInitialLoad, setIsBreakInitialLoad] = useState(true);

  const formatTime = time => {
    if (!time) return '--:-- --';
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatMinutes = minutes => {
    if (!minutes) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const getBreakLabel = type => {
  switch (type) {
    case 'LUNCH':
      return t.breaks?.lunch || 'Lunch';
    case 'TEA':
      return t.breaks?.tea || 'Tea';
    case 'COFFEE':
      return t.breaks?.coffee || 'Coffee';
    case 'PERSONAL':
      return t.breaks?.personal || 'Personal';
    case 'SALES_MEETING':
      return 'Sales Meeting';
    case 'FOLLOW_UP':
      return 'Follow Up';
    case 'DEMO':
      return 'Demo';
    case 'COLLECTIONS':
      return 'Collections';
    case 'OTHER':
      return t.breaks?.other || 'Other';
    default:
      return type || (t.breaks?.breakType || 'Break');
  }
};

  // Initial load delay for break (same logic as original BreakStatusBar)
  useEffect(() => {
    if (!breakStartTime) return;
    setIsBreakInitialLoad(true);
    const timer = setTimeout(() => setIsBreakInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, [breakStartTime]);

  // Main ticker — handles both active time and break duration
  useEffect(() => {
    if (!punchInTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const punchIn = new Date(punchInTime);

      const totalDiffMs = now - punchIn;
      const totalHours = Math.floor(totalDiffMs / 3600000);
      const totalMins = Math.floor((totalDiffMs % 3600000) / 60000);
      const totalSecs = Math.floor((totalDiffMs % 60000) / 1000);

      setElapsedTime(
        `${totalHours.toString().padStart(2, '0')}:${totalMins
          .toString()
          .padStart(2, '0')}:${totalSecs.toString().padStart(2, '0')}`,
      );

      if (isOnBreak && breakStartTime && !isBreakInitialLoad) {
        const breakStart = new Date(breakStartTime);
        const breakDiffMs = now - breakStart;
        const hours = Math.floor(breakDiffMs / 3600000);
        const mins = Math.floor((breakDiffMs % 3600000) / 60000);
        const secs = Math.floor((breakDiffMs % 60000) / 1000);

        if (hours > 0) {
          setBreakDuration(
            `${hours.toString().padStart(2, '0')}:${mins
              .toString()
              .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
          );
        } else {
          setBreakDuration(
            `${mins.toString().padStart(2, '0')}:${secs
              .toString()
              .padStart(2, '0')}`,
          );
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [punchInTime, isOnBreak, breakStartTime, isBreakInitialLoad]);

  const getBorderColor = () => {
    if (isAbsent) return C.error;
    if (isOnBreak) return C.warning;
    if (isUserLate || isHalfDay || isEarlyLeave) return C.warning;
    if (isPunchedIn) return C.success;
    return C.border;
  };

  const getDotColor = () => {
    if (isAbsent) return C.error;
    if (isOnBreak) return C.warning;
    if (isUserLate || isHalfDay || isEarlyLeave) return C.warning;
    if (isPunchedIn) return C.success;
    return C.textSecondary;
  };

  const borderColor = getBorderColor();
  const dotColor = getDotColor();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: C.surface,
            borderColor: borderColor + '60',
          },
        ]}>

        {/* ── Status Row (always visible) ── */}
        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={[styles.statusLabel, { color: C.textPrimary }]}>
              {statusConfig?.label || 'Unknown Status'}
            </Text>
          </View>
          {(isPunchedIn || isOnBreak) && (
            <Text style={[styles.sinceText, { color: C.textSecondary }]}>
              {t.attendance?.since || 'Since'}{' '}
              {formatTime(firstPunchIn || todaysPunchIn)}
            </Text>
          )}
        </View>

        {/* ── Absent Block ── */}
        {isAbsent && (
          <>
            <View style={[styles.divider, { backgroundColor: C.border }]} />
            <View style={styles.absentBlock}>
              <View
                style={[
                  styles.absentIconTile,
                  { backgroundColor: C.error + '20' },
                ]}>
                <AlertCircle size={wp('5.5%')} color={C.error} />
              </View>
              <Text style={[styles.absentTitle, { color: C.error }]}>
                {t.attendance?.markedAbsent || 'Marked Absent'}
              </Text>
              <Text style={[styles.absentSub, { color: C.textSecondary }]}>
                {t.attendance?.noAttendance || 'No attendance recorded today'}
              </Text>
            </View>
          </>
        )}

        {/* ── Tags Row: Late + HalfDay + EarlyLeave ── */}
        {!isAbsent && (isUserLate || isHalfDay || isEarlyLeave) && (
          <>
            <View style={[styles.divider, { backgroundColor: C.border }]} />
            <View style={[styles.tagsRow,{  paddingVertical: hp('0%'),}]}>
              {/* {isUserLate && isPunchedIn && (
                <View
                  style={[styles.tag, { backgroundColor: C.error + '20' }]}>
                  <Text style={[styles.tagText, { color: C.error }]}>
                    {t.attendance?.lateBy || 'Late by'}{' '}
                    {formatMinutes(lateMinutes)}
                  </Text>
                </View>
              )} */}
              {isHalfDay && isPunchedIn && (
                <View
                  style={[styles.tag, { backgroundColor: C.warning + '20' }]}>
                  <Text style={[styles.tagText, { color: C.warning }]}>
                    {t.attendance?.halfDay || 'Half Day'}
                  </Text>
                </View>
              )}
              {isEarlyLeave && (
                <View
                  style={[styles.tag, { backgroundColor: C.warning + '20' }]}>
                  <Text style={[styles.tagText, { color: C.warning }]}>
                    {t.attendance?.earlyLeave || 'Early Leave'} (
                    {formatMinutes(earlyLeaveMinutes)})
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Active Time Block (isPunchedIn & NOT on break) ── */}
        {!isAbsent && isPunchedIn && punchInTime && !isOnBreak && (
          <>
            <View style={[styles.divider, { backgroundColor: C.border }]} />
            <View style={styles.timerBlock}>
              <View
                style={[
                  styles.iconTile,
                  { backgroundColor: C.primary + '18' },
                ]}>
                <Clock size={wp('5%')} color={C.primary} />
              </View>
              <View style={styles.timerInfo}>
                <Text
                  style={[styles.timerLabel, { color: C.textSecondary }]}>
                  {t.breaks?.activeTime || 'ACTIVE TIME'}
                </Text>
                <Text style={[styles.timerValue, { color: C.textPrimary }]}>
                  {elapsedTime}
                </Text>
                <Text style={[styles.timerMeta, { color: C.textSecondary }]}>
                  {t.attendance?.punchedInAt || 'Punched in at'}{' '}
                  {formatTime(punchInTime)}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* ── Break Block — replaces BreakStatusBar entirely ── */}
        {!isAbsent && isOnBreak && breakStartTime && (
          <>
            <View style={[styles.divider, { backgroundColor: C.border }]} />
            {/* Break main row */}
            <View
              style={[
                styles.breakBlock,
                { backgroundColor: C.warning + '12' },
              ]}>
              <View
                style={[
                  styles.iconTile,
                  { backgroundColor: C.warning + '25' },
                ]}>
                <Coffee size={wp('5%')} color={C.warning} />
              </View>
              <View style={styles.breakInfo}>
                <Text
                  style={[styles.breakTypeLabel, { color: C.textPrimary }]}>
                  {getBreakLabel(breakType)}
                </Text>
                {isBreakInitialLoad ? (
                  <View style={styles.breakLoadingRow}>
                    <Text style={[styles.breakValue, { color: C.warning }]}>
                      00:00
                    </Text>
                    <View
                      style={[
                        styles.loadingDot,
                        { backgroundColor: C.warning },
                      ]}
                    />
                    <View
                      style={[
                        styles.loadingDot,
                        { backgroundColor: C.warning, opacity: 0.6 },
                      ]}
                    />
                    <View
                      style={[
                        styles.loadingDot,
                        { backgroundColor: C.warning, opacity: 0.3 },
                      ]}
                    />
                  </View>
                ) : (
                  <Text style={[styles.breakValue, { color: C.warning }]}>
                    {breakDuration}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.endBreakBtn,
                  { backgroundColor: C.warning },
                  (breakLoading || isBreakInitialLoad) && styles.disabledBtn,
                ]}
                onPress={onEndBreak}
                disabled={breakLoading || isBreakInitialLoad}>
                <Text
                  style={[styles.endBreakBtnText, { color: C.textDark }]}>
                  {t.breaks?.endBreak || 'End Break'}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Active time shown as a small footer row while on break */}
            <View
              style={[
                styles.breakActiveTimeRow,
                { borderTopColor: C.border },
              ]}>
              <Clock size={wp('3%')} color={C.textSecondary} />
              <Text
                style={[
                  styles.breakActiveTimeText,
                  { color: C.textSecondary },
                ]}>
                {t.breaks?.activeTime || 'Active time'}:{' '}
                <Text
                  style={{
                    color: C.textPrimary,
                    fontFamily: Fonts.semiBold,
                  }}>
                  {elapsedTime}
                </Text>
              </Text>
            </View>
          </>
        )}

        {/* ── Last Punch Out (hasAnySessionToday && !isPunchedIn && !isAbsent) ── */}
        {!isAbsent && hasAnySessionToday && !isPunchedIn && (
          <>
            <View style={[styles.divider, { backgroundColor: C.border }]} />
            <View style={styles.lastPunchRow}>
              <LogOut size={wp('3.5%')} color={C.textSecondary} />
              <Text
                style={[styles.lastPunchText, { color: C.textSecondary }]}>
                {t.attendance?.lastPunchOut || 'Last punch out at'}{' '}
                <Text
                  style={[styles.lastPunchBold, { color: C.textPrimary }]}>
                  {formatTime(lastSession?.punchOut)}
                </Text>
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: hp('2%'),
    width: '100%',
  },
  card: {
    borderRadius: wp('4%'),
    borderWidth: 1,
    overflow: 'hidden',
  },

  // ── Status Row ──
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.4%'),
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
  },
  dot: {
    width: wp('2%'),
    height: wp('2%'),
    borderRadius: wp('1%'),
  },
  statusLabel: {
    fontSize: wp('3.8%'),
    fontFamily: Fonts.semiBold,
  },
  sinceText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
  },

  divider: {
    height: 0.5,
  },

  // ── Absent Block ──
  absentBlock: {
    alignItems: 'center',
    paddingVertical: hp('2.5%'),
    paddingHorizontal: wp('4%'),
    gap: hp('0.8%'),
  },
  absentIconTile: {
    width: wp('11%'),
    height: wp('11%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp('0.4%'),
  },
  absentTitle: {
    fontSize: wp('4%'),
    fontFamily: Fonts.semiBold,
  },
  absentSub: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
  },

  // ── Tags Row ──
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1%'),
  },
  tag: {
    paddingHorizontal: wp('2.5%'),
    paddingVertical: hp('0.4%'),
    borderRadius: wp('4%'),
  },
  tagText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.semiBold,
  },

  // ── Timer Block (active, not on break) ──
  timerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('3%'),
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.6%'),
  },
  iconTile: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('2.5%'),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timerInfo: {
    flex: 1,
  },
  timerLabel: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: hp('0.2%'),
  },
  timerValue: {
    fontSize: wp('6%'),
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  timerMeta: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
    marginTop: hp('0.3%'),
  },

  // ── Break Block ──
  breakBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('3%'),
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.4%'),
  },
  breakInfo: {
    flex: 1,
  },
  breakTypeLabel: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
    marginBottom: hp('0.2%'),
  },
  breakValue: {
    fontSize: wp('4%'),
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  breakLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1%'),
  },
  loadingDot: {
    width: wp('1%'),
    height: wp('1%'),
    borderRadius: wp('0.5%'),
  },
  endBreakBtn: {
    paddingHorizontal: wp('3.5%'),
    paddingVertical: hp('0.9%'),
    borderRadius: wp('2%'),
  },
  endBreakBtnText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  breakActiveTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1.5%'),
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('0.8%'),
    borderTopWidth: 0.5,
  },
  breakActiveTimeText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
  },

  // ── Last Punch Row ──
  lastPunchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.2%'),
  },
  lastPunchText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
    fontStyle: 'italic',
  },
  lastPunchBold: {
    fontFamily: Fonts.semiBold,
    fontStyle: 'normal',
  },
});

export default ActiveTimeDisplay;
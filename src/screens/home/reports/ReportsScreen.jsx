// src/screens/home/reports/ReportsScreen.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import {
  CalendarDays,
  Clock,
  Coffee,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  ChevronLeft,
} from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Fonts } from '../../../utils/GlobalText';
import { getAttendanceHistory } from '../../../store/actions/attendanceActions';
import { formatDuration } from '../../../utils/utils';

// ── Helpers ───────────────────────────────────────
const formatTime = ds => {
  if (!ds) return '--:-- --';
  try {
    return new Date(ds).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '--:-- --';
  }
};

const formatFullDate = ds => {
  if (!ds) return '';
  try {
    return new Date(ds).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const fmtDur = minutes => {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// ── Single Record Card ────────────────────────────
const RecordCard = ({ record }) => {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const sessions = record.sessions || [];

  const getStatusConfig = status => {
    switch (status) {
      case 'PRESENT':
        return {
          label: t.reports.present,
          color: C.success,
          icon: CheckCircle2,
        };
      case 'ABSENT':
        return { label: t.reports.absent, color: C.error, icon: XCircle };
      case 'HALF_DAY':
        return {
          label: t.reports.halfDay,
          color: C.warning,
          icon: AlertCircle,
        };
      // case 'LEAVE':
      //   return { label: t.reports.leave, color: C.info, icon: CalendarDays };
      default:
        return {
          label: status || t.reports.unknown || 'Unknown',
          color: C.textSecondary,
          icon: AlertCircle,
        };
    }
  };

  const statusCfg = getStatusConfig(record.attendanceStatus);
  const StatusIcon = statusCfg.icon;

  const totalMinutes = sessions.reduce(
    (t, s) => t + (s.durationMinutes || 0),
    0,
  );
  const totalBreakMinutes = sessions.reduce(
    (t, s) =>
      t + (s.breaks || []).reduce((bt, b) => bt + (b.durationMinutes || 0), 0),
    0,
  );

  const firstPunchIn = sessions[0]?.punchIn;
  const lastPunchOut = sessions[sessions.length - 1]?.punchOut;

  return (
    <View
      style={[
        cardStyles.wrapper,
        {
          backgroundColor: C.surface,
          borderColor: C.border,
        },
      ]}
    >
      {/* Row Header */}
      <TouchableOpacity
        style={cardStyles.cardHeader}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}
      >
        {/* Date + Status */}
        <View style={cardStyles.dateBlock}>
          <View
            style={[cardStyles.statusDot, { backgroundColor: statusCfg.color }]}
          />
          <View>
            <Text style={[cardStyles.dateText, { color: C.textPrimary }]}>
              {formatFullDate(record.date)}
            </Text>
            <View
              style={[
                cardStyles.statusBadge,
                { backgroundColor: statusCfg.color + '22' },
              ]}
            >
              <StatusIcon size={wp('2.8%')} color={statusCfg.color} />
              <Text style={[cardStyles.statusText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Times + expand */}
        <View style={cardStyles.rightBlock}>
          <View style={cardStyles.timeRow}>
            <Text style={[cardStyles.timeIn, { color: C.success }]}>
              {formatTime(firstPunchIn)}
            </Text>
            <Text style={[cardStyles.timeSep, { color: C.textSecondary }]}>
              →
            </Text>
            <Text
              style={[
                cardStyles.timeOut,
                { color: lastPunchOut ? C.error : C.textSecondary },
              ]}
            >
              {lastPunchOut ? formatTime(lastPunchOut) : '---'}
            </Text>
          </View>
          <Text style={[cardStyles.durText, { color: C.textSecondary }]}>
            {fmtDur(totalMinutes)}
          </Text>
          {expanded ? (
            <ChevronUp
              size={wp('4%')}
              color={C.textSecondary}
              style={{ marginTop: 4 }}
            />
          ) : (
            <ChevronDown
              size={wp('4%')}
              color={C.textSecondary}
              style={{ marginTop: 4 }}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded Detail */}
      {expanded && (
        <View
          style={[
            cardStyles.detail,
            {
              borderTopColor: C.border,
              backgroundColor: C.background,
            },
          ]}
        >
          {/* Stats strip */}
          <View
            style={[
              cardStyles.statsStrip,
              {
                borderBottomColor: C.border,
              },
            ]}
          >
            <View style={cardStyles.stripItem}>
              <TrendingUp size={wp('3.5%')} color={C.primary} />
              <Text style={[cardStyles.stripLabel, { color: C.textSecondary }]}>
                {t.reports.work}
              </Text>
              <Text style={[cardStyles.stripValue, { color: C.primary }]}>
                {fmtDur(totalMinutes)}
              </Text>
            </View>
            <View
              style={[cardStyles.stripDivider, { backgroundColor: C.border }]}
            />
            <View style={cardStyles.stripItem}>
              <Coffee size={wp('3.5%')} color={C.warning} />
              <Text style={[cardStyles.stripLabel, { color: C.textSecondary }]}>
                {t.reports.break}
              </Text>
              <Text style={[cardStyles.stripValue, { color: C.warning }]}>
                {fmtDur(totalBreakMinutes)}
              </Text>
            </View>
            <View
              style={[cardStyles.stripDivider, { backgroundColor: C.border }]}
            />
            <View style={cardStyles.stripItem}>
              <Clock size={wp('3.5%')} color={C.info} />
              <Text style={[cardStyles.stripLabel, { color: C.textSecondary }]}>
                {t.reports.sessions || 'Sessions'}
              </Text>
              <Text style={[cardStyles.stripValue, { color: C.info }]}>
                {sessions.length}
              </Text>
            </View>
          </View>

          {/* Sessions */}
          {sessions.map((session, si) => (
            <View
              key={si}
              style={[
                cardStyles.sessionBlock,
                {
                  backgroundColor: C.surface,
                  borderColor: C.border,
                },
              ]}
            >
              <Text style={[cardStyles.sessionTitle, { color: C.primary }]}>
                {t.reports.session || 'Session'} {si + 1}
              </Text>

              {/* Punch times */}
              <View style={cardStyles.punchRow}>
                <View style={cardStyles.punchItem}>
                  <Text
                    style={[cardStyles.punchLabel, { color: C.textSecondary }]}
                  >
                    {t.reports.in}
                  </Text>
                  <Text style={[cardStyles.punchTime, { color: C.success }]}>
                    {formatTime(session.punchIn)}
                  </Text>
                </View>
                <View
                  style={[cardStyles.punchDash, { backgroundColor: C.border }]}
                />
                <View style={cardStyles.punchItem}>
                  <Text
                    style={[cardStyles.punchLabel, { color: C.textSecondary }]}
                  >
                    {t.reports.out}
                  </Text>
                  <Text
                    style={[
                      cardStyles.punchTime,
                      { color: session.punchOut ? C.error : C.textSecondary },
                    ]}
                  >
                    {session.punchOut
                      ? formatTime(session.punchOut)
                      : t.reports.ongoing}
                  </Text>
                </View>
                <View
                  style={[
                    cardStyles.durBadge,
                    { backgroundColor: C.primary + '20' },
                  ]}
                >
                  <Text style={[cardStyles.durBadgeText, { color: C.primary }]}>
                    {fmtDur(session.durationMinutes)}
                  </Text>
                </View>
              </View>

              {/* Breaks in session */}
              {session.breaks?.length > 0 && (
                <View style={cardStyles.breaksBlock}>
                  {session.breaks.map((b, bi) => (
                    <View
                      key={bi}
                      style={[
                        cardStyles.breakItem,
                        { borderTopColor: C.border },
                      ]}
                    >
                      <Coffee size={wp('3%')} color={C.warning} />
                      <Text
                        style={[cardStyles.breakTypeText, { color: C.warning }]}
                      >
                        {b.breakType}
                      </Text>
                      <Text
                        style={[
                          cardStyles.breakTimes,
                          { color: C.textSecondary },
                        ]}
                      >
                        {formatTime(b.breakIn)}
                        {b.breakOut
                          ? ` → ${formatTime(b.breakOut)}`
                          : ` → ${t.reports.ongoing}`}
                      </Text>
                      <View
                        style={[
                          cardStyles.durBadge,
                          {
                            backgroundColor: C.warning + '20',
                            marginLeft: 'auto',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            cardStyles.durBadgeText,
                            { color: C.warning },
                          ]}
                        >
                          {b.durationMinutes ? fmtDur(b.durationMinutes) : '●'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Location */}
              {session.punchInLocation?.address && (
                <View
                  style={[cardStyles.locationRow, { borderTopColor: C.border }]}
                >
                  <MapPin size={wp('3%')} color={C.textSecondary} />
                  <Text
                    style={[
                      cardStyles.locationText,
                      { color: C.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {session.punchInLocation.address}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ── Card Styles ───────────────────────────────────
const cardStyles = StyleSheet.create({
  wrapper: {
    borderRadius: wp('4%'),
    marginBottom: hp('1.2%'),
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('4%'),
  },
  dateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2.5%'),
    flex: 1,
  },
  statusDot: {
    width: wp('1.5%'),
    height: hp('5%'),
    borderRadius: wp('1%'),
  },
  dateText: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: wp('2%'),
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: wp('2.4%'),
    fontFamily: Fonts.medium,
  },
  rightBlock: {
    alignItems: 'flex-end',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeIn: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
  },
  timeSep: {
    fontSize: wp('2.4%'),
  },
  timeOut: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
  },
  durText: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  detail: {
    borderTopWidth: 1,
  },
  statsStrip: {
    flexDirection: 'row',
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('4%'),
    borderBottomWidth: 1,
  },
  stripItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  stripLabel: {
    fontSize: wp('2.4%'),
    fontFamily: Fonts.regular,
  },
  stripValue: {
    fontSize: wp('3%'),
    fontFamily: Fonts.bold,
  },
  stripDivider: {
    width: 1,
    marginVertical: hp('0.5%'),
  },
  sessionBlock: {
    marginHorizontal: wp('4%'),
    marginTop: hp('1.2%'),
    marginBottom: hp('0.5%'),
    borderRadius: wp('3%'),
    padding: wp('3%'),
    borderWidth: 1,
  },
  sessionTitle: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    marginBottom: hp('0.8%'),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  punchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    marginBottom: hp('0.8%'),
  },
  punchItem: { alignItems: 'center' },
  punchLabel: {
    fontSize: wp('2.2%'),
    fontFamily: Fonts.regular,
  },
  punchTime: {
    fontSize: wp('3%'),
    fontFamily: Fonts.bold,
  },
  punchDash: {
    flex: 1,
    height: 1,
  },
  durBadge: {
    paddingHorizontal: wp('2.5%'),
    paddingVertical: 3,
    borderRadius: 20,
  },
  durBadgeText: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
  },
  breaksBlock: {
    marginTop: hp('0.5%'),
    gap: hp('0.5%'),
  },
  breakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    paddingVertical: hp('0.5%'),
    borderTopWidth: 1,
  },
  breakTypeText: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
  },
  breakTimes: {
    fontSize: wp('2.4%'),
    fontFamily: Fonts.regular,
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1.5%'),
    marginTop: hp('0.8%'),
    paddingTop: hp('0.5%'),
    borderTopWidth: 1,
  },
  locationText: {
    flex: 1,
    fontSize: wp('2.4%'),
    fontFamily: Fonts.regular,
  },
});

// ── Main Reports Screen ───────────────────────────
const ReportsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const { history, historyLoading } = useSelector(state => state.attendance);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    console.log('ReportsScreen mounted');
    dispatch(getAttendanceHistory());
    return () => console.log('📊 ReportsScreen unmounted');
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(getAttendanceHistory());
    setRefreshing(false);
  }, []);

  // Sort history newest first
  const sortedHistory = [...(history || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  // Filter
  const filters = [
    'ALL',
    'PRESENT',
    'ABSENT',
    'HALF_DAY',
    'SHORT_LEAVE',
    // 'LEAVE',
  ];
  const filtered =
    activeFilter === 'ALL'
      ? sortedHistory
      : sortedHistory.filter(r => {
          if (activeFilter === 'SHORT_LEAVE') {
            return r.attendanceStatus === 'SHORT_LEAVE';
          }
          if (activeFilter === 'HALF_DAY') {
            return r.attendanceStatus === 'HALF_DAY';
          }
          if (activeFilter === 'ABSENT') {
            return r.attendanceStatus === 'ABSENT';
          }
          if (activeFilter === 'PRESENT') {
            return r.attendanceStatus === 'PRESENT';
          }
          // if (activeFilter === 'LEAVE') {
          //   return r.attendanceStatus === 'LEAVE';
          // }
          return r.status === activeFilter;
        });

  // Summary stats from full history
  const stats = {
    present: sortedHistory.filter(r => r.attendanceStatus === 'PRESENT').length,
    absent: sortedHistory.filter(r => r.attendanceStatus === 'ABSENT').length,
    halfDay: sortedHistory.filter(r => r.attendanceStatus === 'HALF_DAY')
      .length,
    shortLeave: sortedHistory.filter(r => r.attendanceStatus === 'SHORT_LEAVE')
      .length,
    // leave: sortedHistory.filter(r => r.attendanceStatus === 'LEAVE').length,
    totalWorked: sortedHistory.reduce(
      (t, r) => t + (r.totalWorkingMinutes || 0),
      0,
    ),
    totalBreak: sortedHistory.reduce(
      (t, r) => t + (r.totalBreakMinutes || 0),
      0,
    ),
  };

  const filterLabels = {
    ALL: t.reports.all,
    PRESENT: t.reports.present,
    ABSENT: t.reports.absent,
    HALF_DAY: t.reports.halfDay,
    LEAVE: t.reports.leave,
    SHORT_LEAVE: t.reports.shortLeave,
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: C.background,
            borderBottomColor: C.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            {
              backgroundColor: C.surface,
              borderColor: C.border,
            },
          ]}
        >
          <ChevronLeft size={wp('5%')} color={C.textPrimary} />
        </TouchableOpacity>

        {/* Page Title */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: C.textPrimary }]}>
            {t.reports.title}
          </Text>
          <Text style={[styles.pageSubtitle, { color: C.textSecondary }]}>
            {sortedHistory.length} {t.reports.totalRecords}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
      >
        {/* ── Summary Cards ── */}
        <View style={styles.summaryGrid}>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: C.surface,
                borderColor: C.success + '50',
              },
            ]}
          >
            <CheckCircle2 size={wp('5%')} color={C.success} />
            <Text style={[styles.summaryNum, { color: C.textPrimary }]}>
              {stats.present}
            </Text>
            <Text style={[styles.summaryLbl, { color: C.textSecondary }]}>
              {t.reports.present}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: C.surface,
                borderColor: C.error + '50',
              },
            ]}
          >
            <XCircle size={wp('5%')} color={C.error} />
            <Text style={[styles.summaryNum, { color: C.textPrimary }]}>
              {stats.absent}
            </Text>
            <Text style={[styles.summaryLbl, { color: C.textSecondary }]}>
              {t.reports.absent}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: C.surface,
                borderColor: C.warning + '50',
              },
            ]}
          >
            <AlertCircle size={wp('5%')} color={C.warning} />
            <Text style={[styles.summaryNum, { color: C.textPrimary }]}>
              {stats.halfDay}
            </Text>
            <Text style={[styles.summaryLbl, { color: C.textSecondary }]}>
              {t.reports.halfDay}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: C.surface,
                borderColor: C.warning + '50',
              },
            ]}
          >
            <Clock size={wp('5%')} color={C.warning} />
            <Text style={[styles.summaryNum, { color: C.textPrimary }]}>
              {stats.shortLeave}
            </Text>
            <Text style={[styles.summaryLbl, { color: C.textSecondary }]}>
              {t.reports.shortLeave}
            </Text>
          </View>
          {/* <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: C.surface,
                borderColor: C.info + '50',
              },
            ]}
          >
            <CalendarDays size={wp('5%')} color={C.info} />
            <Text style={[styles.summaryNum, { color: C.textPrimary }]}>
              {stats.leave}
            </Text>
            <Text style={[styles.summaryLbl, { color: C.textSecondary }]}>
              {t.reports.leave}
            </Text>
          </View> */}
        </View>

        {/* ── Work Summary Strip ── */}
        <View
          style={[
            styles.workStrip,
            {
              backgroundColor: C.surface,
              borderColor: C.border,
            },
          ]}
        >
          <View style={styles.workItem}>
            <TrendingUp size={wp('4%')} color={C.primary} />
            <View>
              <Text style={[styles.workValue, { color: C.primary }]}>
                {fmtDur(stats.totalWorked)}
              </Text>
              <Text style={[styles.workLbl, { color: C.textSecondary }]}>
                {t.reports.totalWorked}
              </Text>
            </View>
          </View>
          <View style={[styles.stripDivider, { backgroundColor: C.border }]} />
          <View style={styles.workItem}>
            <Coffee size={wp('4%')} color={C.warning} />
            <View>
              <Text style={[styles.workValue, { color: C.warning }]}>
                {fmtDur(stats.totalBreak)}
              </Text>
              <Text style={[styles.workLbl, { color: C.textSecondary }]}>
                {t.reports.totalBreak}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Filter Pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterPill,
                {
                  backgroundColor: activeFilter === f ? C.primary : C.surface,
                  borderColor: activeFilter === f ? C.primary : C.border,
                },
              ]}
              onPress={() => setActiveFilter(f)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: activeFilter === f ? C.textDark : C.textSecondary },
                  activeFilter === f && { fontFamily: Fonts.medium },
                ]}
              >
                {filterLabels[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Records List ── */}
        {historyLoading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>
              {t.reports.loading}
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <CalendarDays size={wp('12%')} color={C.textSecondary} />
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
              {t.reports.noRecords}
            </Text>
            <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
              {activeFilter === 'ALL'
                ? t.reports.pullToRefresh
                : `${t.reports.no} ${filterLabels[activeFilter]} ${t.reports.records}`}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((record, i) => (
              <RecordCard
                key={record._id || record.date || i}
                record={record}
              />
            ))}
          </View>
        )}

        <View style={{ height: hp('4%') }} />
      </ScrollView>
    </View>
  );
};

// ── Screen Styles ─────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingBottom: hp('2%'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    paddingTop: Platform.OS === 'ios' ? hp('6%') : hp('5%'),
    paddingBottom: hp('2%'),
    borderBottomWidth: 1,
  },
  backBtn: {
    width: wp('9%'),
    height: wp('9%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeader: {
    flex: 1,
    paddingLeft: wp('3%'),
  },
  pageTitle: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    paddingHorizontal: wp('4%'),
    paddingTop: hp('2%'),
    gap: wp('2.5%'),
  },
  summaryCard: {
    flex: 1,
    borderRadius: wp('3.5%'),
    padding: wp('3%'),
    alignItems: 'center',
    gap: hp('0.5%'),
    borderWidth: 1,
  },
  summaryNum: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
  },
  summaryLbl: {
    fontSize: wp('2.2%'),
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  workStrip: {
    flexDirection: 'row',
    marginHorizontal: wp('5%'),
    marginTop: hp('1.5%'),
    borderRadius: wp('3.5%'),
    borderWidth: 1,
    overflow: 'hidden',
  },
  workItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2.5%'),
    padding: wp('4%'),
  },
  workValue: {
    fontSize: wp('4%'),
    fontFamily: Fonts.bold,
  },
  workLbl: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.regular,
  },
  stripDivider: {
    width: 1,
    marginVertical: wp('3%'),
  },
  filterRow: {
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.5%'),
    gap: wp('2%'),
  },
  filterPill: {
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('0.7%'),
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
  },
  list: {
    paddingHorizontal: wp('5%'),
  },
  loadingWrap: {
    alignItems: 'center',
    paddingTop: hp('8%'),
    gap: hp('1.5%'),
  },
  loadingText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.regular,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: hp('8%'),
    gap: hp('1%'),
  },
  emptyTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
    marginTop: hp('1%'),
  },
  emptySubtitle: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
  },
});

export default ReportsScreen;

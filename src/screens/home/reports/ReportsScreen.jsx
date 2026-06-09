// src/screens/home/reports/ReportsScreen.jsx - COMPLETE WITH FILTERS
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
  Modal,
  TextInput,
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
  Filter,
  X,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Fonts } from '../../../utils/GlobalText';
import { getAttendanceHistory } from '../../../store/actions/attendanceActions';
import { formatMinutesToHours } from '../../../utils/utils';

// ── Date Filter Helpers ───────────────────────────────────────
const getDateRange = (filter, customDate = null) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  const day = today.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  startOfWeek.setDate(today.getDate() - diffToMonday);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1,
  );
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  switch (filter) {
    case 'TODAY':
      return { start: today, end: today };
    case 'THIS_WEEK':
      return { start: startOfWeek, end: today };
    case 'THIS_MONTH':
      return { start: startOfMonth, end: today };
    case 'LAST_MONTH':
      return { start: startOfLastMonth, end: endOfLastMonth };
    case 'CUSTOM':
      return customDate || { start: today, end: today };
    default:
      return { start: null, end: null };
  }
};

const isDateInRange = (dateStr, startDate, endDate) => {
  if (!startDate || !endDate) return true;
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date >= startDate && date <= endDate;
};

const formatDateForDisplay = date => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

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
  if (!minutes && minutes !== 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatMinutes = minutes => {
  if (!minutes && minutes !== 0) return '---';
  if (minutes >= 60) return formatMinutesToHours(minutes);
  return `${minutes} min`;
};

// ── Get API Status Config (Original - UNCHANGED) ──
const getApiStatusConfig = (status, C, t) => {
  // Check for Week Off (Sunday or weekly off)
  if (status === 'WEEK_OFF') {
    return {
      label: 'Week Off',
      color: C.textSecondary,
      icon: CalendarDays,
    };
  }
  if (status === 'ON_LEAVE') {
    return {
      label: 'On Leave',
      color: C.textSecondary,
      icon: CalendarDays,
    };
  }
  switch (status) {
    case 'PRESENT':
      return {
        label: t.reports?.present || 'Present',
        color: C.success,
        icon: CheckCircle2,
      };
    case 'ABSENT':
      return {
        label: t.reports?.absent || 'Absent',
        color: C.error,
        icon: XCircle,
      };
    case 'HALF_DAY':
      return {
        label: t.reports?.halfDay || 'Half Day',
        color: C.warning,
        icon: AlertCircle,
      };
    case 'SHORT_LEAVE':
      return {
        label: t.reports?.shortLeave || 'Short Leave',
        color: C.warning,
        icon: AlertCircle,
      };
    default:
      return {
        label: status || 'Unknown',
        color: C.textSecondary,
        icon: AlertCircle,
      };
  }
};

// ── Get Extra Details (Late, Early, Short Leave) - EXTRA, NOT OVERRIDING ──
const getExtraDetails = (record, C) => {
  const details = [];

  if (record.isLate === true && record.lateMinutes > 0) {
    details.push({
      type: 'late',
      message: `⚠️ Late Login: ${formatMinutes(record.lateMinutes)} late`,
      color: C.warning,
    });
  }

  if (record.isEarlyLeave === true && record.earlyLeaveMinutes > 0) {
    details.push({
      type: 'early',
      message: `⚠️ Early Logout: ${formatMinutes(
        record.earlyLeaveMinutes,
      )} early`,
      color: C.warning,
    });
  }

  if (record.morningShortLeave?.isShortLeave === true) {
    details.push({
      type: 'shortLeaveAM',
      message: `⚠️ Morning Short Leave: ${formatMinutes(
        record.morningShortLeave.minutes,
      )}`,
      color: C.info,
    });
  }

  if (record.eveningShortLeave?.isShortLeave === true) {
    details.push({
      type: 'shortLeavePM',
      message: `⚠️ Evening Short Leave: ${formatMinutes(
        record.eveningShortLeave.minutes,
      )}`,
      color: C.info,
    });
  }

  return details;
};

// ── Single Record Card ────────────────────────────
const RecordCard = ({ record }) => {

  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const sessions = record.sessions || [];
  console.log("sessions=======>", sessions);


  // ✅ ORIGINAL API STATUS - Jaise ka taise
  const apiStatusConfig = getApiStatusConfig(record.attendanceStatus, C, t);
  const ApiStatusIcon = apiStatusConfig.icon;

  // ✅ EXTRA DETAILS - Alag se
  const extraDetails = getExtraDetails(record, C);

  const totalMinutes = sessions.reduce(
    (sum, s) => sum + (s.durationMinutes || 0),
    0,
  );
  const totalBreakMinutes = sessions.reduce(
    (sum, s) =>
      sum +
      (s.breaks || []).reduce((bt, b) => bt + (b.durationMinutes || 0), 0),
    0,
  );

  const firstPunchIn = sessions[0]?.punchIn;
  const autoPunch = sessions[0]?.autoPunchedOut
  const lastPunchOut = sessions[sessions.length - 1]?.punchOut;

  return (
    <View
      style={[
        cardStyles.wrapper,
        { backgroundColor: C.surface, borderColor: C.border },
      ]}
    >
      <TouchableOpacity
        style={cardStyles.cardHeader}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}
      >
        <View style={cardStyles.dateBlock}>
          <View
            style={[
              cardStyles.statusDot,
              { backgroundColor: apiStatusConfig.color },
            ]}
          />
          <View>
            <Text style={[cardStyles.dateText, { color: C.textPrimary }]}>
              {formatFullDate(record.date)}
            </Text>
            <View
              style={[
                cardStyles.statusBadge,
                { backgroundColor: apiStatusConfig.color + '22' },
              ]}
            >
              <ApiStatusIcon size={wp('2.8%')} color={apiStatusConfig.color} />
              <Text
                style={[
                  cardStyles.statusText,
                  { color: apiStatusConfig.color },
                ]}
              >
                {apiStatusConfig.label}
              </Text>
            </View>
          </View>
        </View>

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
              {autoPunch ? '---' : lastPunchOut ? formatTime(lastPunchOut) : '---'}
              {/* {lastPunchOut ? formatTime(lastPunchOut) : '---'} */}
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

      {expanded && (
        <View
          style={[
            cardStyles.detail,
            { borderTopColor: C.border, backgroundColor: C.background },
          ]}
        >
          {/* 🔥 EXTRA DETAILS - Late Login, Early Logout, Short Leave */}
          {extraDetails.length > 0 && (
            <View
              style={[
                cardStyles.extraDetailsContainer,
                {
                  backgroundColor: C.warning + '08',
                  borderColor: C.warning + '30',
                },
              ]}
            >
              {extraDetails.map((detail, idx) => (
                <Text
                  key={idx}
                  style={[cardStyles.extraDetailText, { color: detail.color }]}
                >
                  {detail.message}
                </Text>
              ))}
            </View>
          )}

          <View
            style={[cardStyles.statsStrip, { borderBottomColor: C.border }]}
          >
            <View style={cardStyles.stripItem}>
              <TrendingUp size={wp('3.5%')} color={C.primary} />
              <Text style={[cardStyles.stripLabel, { color: C.textSecondary }]}>
                {t.reports?.work || 'Work'}
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
                {t.reports?.break || 'Break'}
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
                {t.reports?.sessions || 'Sessions'}
              </Text>
              <Text style={[cardStyles.stripValue, { color: C.info }]}>
                {sessions.length}
              </Text>
            </View>
          </View>

          {sessions.map((session, si) => (
            <View
              key={si}
              style={[
                cardStyles.sessionBlock,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <Text style={[cardStyles.sessionTitle, { color: C.primary }]}>
                {t.reports?.session || 'Session'} {si + 1}
              </Text>

              <View style={cardStyles.punchRow}>
                <View style={cardStyles.punchItem}>
                  <Text
                    style={[cardStyles.punchLabel, { color: C.textSecondary }]}
                  >
                    {t.reports?.in || 'In'}
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
                    {t.reports?.out || 'Out'}
                  </Text>
                  <Text
                    style={[
                      cardStyles.punchTime,
                      { color: session.punchOut ? C.error : C.textSecondary },
                    ]}
                  >
                    {/* {session.punchOut
                      ? formatTime(session.punchOut)
                      : t.reports?.ongoing || 'Ongoing'} */}
                    {
                      autoPunch
                        ? '---'
                        : session.punchOut
                          ? formatTime(session.punchOut)
                          : t.reports?.ongoing || 'Ongoing'
                    }
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
                          : ` → ${t.reports?.ongoing || 'Ongoing'}`}
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
  extraDetailsContainer: {
    margin: wp('4%'),
    marginBottom: 0,
    padding: wp('3%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    gap: 4,
  },
  extraDetailText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
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

// ── Custom Date Range Modal ───────────────────────
const CustomDateModal = ({ visible, onClose, onApply, theme }) => {
  const C = theme.colors;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApply = () => {
    if (startDate && endDate) {
      onApply({ start: new Date(startDate), end: new Date(endDate) });
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: C.overlayBg }]}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
              Custom Date Range
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={wp('5%')} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.modalLabel, { color: C.textSecondary }]}>
            Start Date (YYYY-MM-DD)
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: C.background,
                borderColor: C.border,
                color: C.textPrimary,
              },
            ]}
            placeholder="2024-01-01"
            placeholderTextColor={C.textSecondary}
            value={startDate}
            onChangeText={setStartDate}
          />
          <Text
            style={[
              styles.modalLabel,
              { color: C.textSecondary, marginTop: hp('2%') },
            ]}
          >
            End Date (YYYY-MM-DD)
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: C.background,
                borderColor: C.border,
                color: C.textPrimary,
              },
            ]}
            placeholder="2024-01-31"
            placeholderTextColor={C.textSecondary}
            value={endDate}
            onChangeText={setEndDate}
          />
          <TouchableOpacity
            style={[styles.modalApplyBtn, { backgroundColor: C.primary }]}
            onPress={handleApply}
          >
            <Text style={[styles.modalApplyText, { color: C.textDark }]}>
              Apply
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── Main Reports Screen ───────────────────────────
const ReportsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const { history, historyLoading } = useSelector(state => state.attendance);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('THIS_MONTH');
  const [customDate, setCustomDate] = useState(null);
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  useEffect(() => {
    dispatch(getAttendanceHistory());
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(getAttendanceHistory());
    setRefreshing(false);
  }, []);

  const applyDateFilter = (filter, custom = null) => {
    setDateFilter(filter);
    if (filter === 'CUSTOM' && custom) {
      setCustomDate(custom);
    }
    setShowDateFilterModal(false);
  };

  // Apply both filters: Date + Status
  const getFilteredHistory = () => {
    if (!history || history.length === 0) return [];

    const { start, end } = getDateRange(dateFilter, customDate);

    let filtered = [...history];

    // Apply date filter
    if (start && end) {
      filtered = filtered.filter(record =>
        isDateInRange(record.date, start, end),
      );
    }

    // Apply status filter
    if (activeStatusFilter !== 'ALL') {
      filtered = filtered.filter(
        record => record.attendanceStatus === activeStatusFilter,
      );
    }

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const filteredHistory = getFilteredHistory();

  // Stats from FILTERED history
  const stats = {
    present: filteredHistory.filter(r => r.attendanceStatus === 'PRESENT')
      .length,
    absent: filteredHistory.filter(r => r.attendanceStatus === 'ABSENT').length,
    halfDay: filteredHistory.filter(r => r.attendanceStatus === 'HALF_DAY')
      .length,
    shortLeave: filteredHistory.filter(
      r => r.attendanceStatus === 'SHORT_LEAVE',
    ).length,
    totalWorked: filteredHistory.reduce(
      (sum, r) => sum + (r.totalWorkingMinutes || 0),
      0,
    ),
    totalBreak: filteredHistory.reduce(
      (sum, r) => sum + (r.totalBreakMinutes || 0),
      0,
    ),
  };

  const statusFilters = ['ALL', 'PRESENT', 'ABSENT', 'HALF_DAY', 'SHORT_LEAVE'];
  const dateFilters = [
    { id: 'TODAY', label: 'Today' },
    { id: 'THIS_WEEK', label: 'This Week' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'LAST_MONTH', label: 'Last Month' },
    { id: 'CUSTOM', label: 'Custom' },
  ];

  const getDateFilterLabel = () => {
    if (dateFilter === 'CUSTOM' && customDate) {
      return `${formatDateForDisplay(
        customDate.start,
      )} - ${formatDateForDisplay(customDate.end)}`;
    }
    return dateFilters.find(f => f.id === dateFilter)?.label || 'This Month';
  };

  const statusLabels = {
    ALL: t.reports?.all || 'All',
    PRESENT: t.reports?.present || 'Present',
    ABSENT: t.reports?.absent || 'Absent',
    HALF_DAY: t.reports?.halfDay || 'Half Day',
    SHORT_LEAVE: t.reports?.shortLeave || 'Short Leave',
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />

      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: C.background, borderBottomColor: C.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <ChevronLeft size={wp('5%')} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: C.textPrimary }]}>
            {t.reports?.title || 'Reports'}
          </Text>
          <Text style={[styles.pageSubtitle, { color: C.textSecondary }]}>
            {filteredHistory.length} {t.reports?.totalRecords || 'records'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowDateFilterModal(true)}
          style={[
            styles.filterBtn,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <Filter size={wp('4%')} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Date Filter Bar */}
      <TouchableOpacity
        style={[
          styles.dateFilterBar,
          { backgroundColor: C.surface, borderColor: C.border },
        ]}
        onPress={() => setShowDateFilterModal(true)}
      >
        <Calendar size={wp('4%')} color={C.primary} />
        <Text style={[styles.dateFilterText, { color: C.textPrimary }]}>
          {getDateFilterLabel()}
        </Text>
        <ChevronDown size={wp('3.5%')} color={C.textSecondary} />
      </TouchableOpacity>

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
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: C.surface, borderColor: C.success + '50' },
            ]}
          >
            <CheckCircle2 size={wp('5%')} color={C.success} />
            <Text style={[styles.summaryNum, { color: C.textPrimary }]}>
              {stats.present}
            </Text>
            <Text style={[styles.summaryLbl, { color: C.textSecondary }]}>
              {t.reports?.present || 'Present'}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: C.surface, borderColor: C.error + '50' },
            ]}
          >
            <XCircle size={wp('5%')} color={C.error} />
            <Text style={[styles.summaryNum, { color: C.textPrimary }]}>
              {stats.absent}
            </Text>
            <Text style={[styles.summaryLbl, { color: C.textSecondary }]}>
              {t.reports?.absent || 'Absent'}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: C.surface, borderColor: C.warning + '50' },
            ]}
          >
            <AlertCircle size={wp('5%')} color={C.warning} />
            <Text style={[styles.summaryNum, { color: C.textPrimary }]}>
              {stats.halfDay}
            </Text>
            <Text style={[styles.summaryLbl, { color: C.textSecondary }]}>
              {t.reports?.halfDay || 'Half Day'}
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: C.surface, borderColor: C.warning + '50' },
            ]}
          >
            <Clock size={wp('5%')} color={C.warning} />
            <Text style={[styles.summaryNum, { color: C.textPrimary }]}>
              {stats.shortLeave}
            </Text>
            <Text style={[styles.summaryLbl, { color: C.textSecondary }]}>
              {t.reports?.shortLeave || 'Short Leave'}
            </Text>
          </View>
        </View>

        {/* Work Summary */}
        <View
          style={[
            styles.workStrip,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <View style={styles.workItem}>
            <TrendingUp size={wp('4%')} color={C.primary} />
            <View>
              <Text style={[styles.workValue, { color: C.primary }]}>
                {fmtDur(stats.totalWorked)}
              </Text>
              <Text style={[styles.workLbl, { color: C.textSecondary }]}>
                {t.reports?.totalWorked || 'Total Worked'}
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
                {t.reports?.totalBreak || 'Total Break'}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {statusFilters.map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterPill,
                {
                  backgroundColor:
                    activeStatusFilter === f ? C.primary : C.surface,
                  borderColor: activeStatusFilter === f ? C.primary : C.border,
                },
              ]}
              onPress={() => setActiveStatusFilter(f)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      activeStatusFilter === f ? C.textDark : C.textSecondary,
                  },
                ]}
              >
                {statusLabels[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Records List */}
        {historyLoading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>
              {t.reports?.loading || 'Loading...'}
            </Text>
          </View>
        ) : filteredHistory.length === 0 ? (
          <View style={styles.emptyWrap}>
            <CalendarDays size={wp('12%')} color={C.textSecondary} />
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
              {t.reports?.noRecords || 'No records found'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
              {activeStatusFilter === 'ALL'
                ? t.reports?.pullToRefresh || 'Pull to refresh'
                : `No ${statusLabels[activeStatusFilter]} records for this period`}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredHistory.map((record, i) => (
              <RecordCard
                key={record._id || record.date || i}
                record={record}
              />
            ))}
          </View>
        )}
        <View style={{ height: hp('4%') }} />
      </ScrollView>

      {/* Date Filter Modal */}
      <Modal
        visible={showDateFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateFilterModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: C.overlayBg }]}>
          <View
            style={[
              styles.dateFilterModal,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                Select Date Range
              </Text>
              <TouchableOpacity onPress={() => setShowDateFilterModal(false)}>
                <X size={wp('5%')} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            {dateFilters.map(filter => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.dateFilterOption,
                  { borderBottomColor: C.border },
                  dateFilter === filter.id && {
                    backgroundColor: C.primary + '20',
                  },
                ]}
                onPress={() => {
                  if (filter.id === 'CUSTOM') {
                    setShowDateFilterModal(false);
                    setShowCustomDateModal(true);
                  } else {
                    applyDateFilter(filter.id);
                  }
                }}
              >
                <Text
                  style={[
                    styles.dateFilterOptionText,
                    {
                      color:
                        dateFilter === filter.id ? C.primary : C.textPrimary,
                    },
                  ]}
                >
                  {filter.label}
                </Text>
                {dateFilter === filter.id && filter.id !== 'CUSTOM' && (
                  <CheckCircle2 size={wp('4%')} color={C.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Custom Date Modal */}
      <CustomDateModal
        visible={showCustomDateModal}
        onClose={() => setShowCustomDateModal(false)}
        onApply={dateRange => applyDateFilter('CUSTOM', dateRange)}
        theme={theme}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: hp('2%') },
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
  pageHeader: { flex: 1, paddingLeft: wp('3%') },
  pageTitle: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  pageSubtitle: { fontSize: wp('3%'), fontFamily: Fonts.regular, marginTop: 2 },
  filterBtn: {
    width: wp('9%'),
    height: wp('9%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: wp('4%'),
    marginTop: hp('1.5%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
  },
  dateFilterText: {
    flex: 1,
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
    marginLeft: wp('2%'),
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
  summaryNum: { fontSize: wp('5%'), fontFamily: Fonts.bold },
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
  workValue: { fontSize: wp('4%'), fontFamily: Fonts.bold },
  workLbl: { fontSize: wp('2.6%'), fontFamily: Fonts.regular },
  stripDivider: { width: 1, marginVertical: wp('3%') },
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
  filterPillText: { fontSize: wp('2.8%'), fontFamily: Fonts.regular },
  list: { paddingHorizontal: wp('5%') },
  loadingWrap: { alignItems: 'center', paddingTop: hp('8%'), gap: hp('1.5%') },
  loadingText: { fontSize: wp('3.5%'), fontFamily: Fonts.regular },
  emptyWrap: { alignItems: 'center', paddingTop: hp('8%'), gap: hp('1%') },
  emptyTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
    marginTop: hp('1%'),
  },
  emptySubtitle: { fontSize: wp('3.2%'), fontFamily: Fonts.regular },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateFilterModal: {
    width: wp('80%'),
    borderRadius: wp('4%'),
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalContent: {
    width: wp('80%'),
    borderRadius: wp('4%'),
    borderWidth: 1,
    overflow: 'hidden',
    padding: wp('4%'),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('4%'),
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  modalTitle: { fontSize: wp('4%'), fontFamily: Fonts.bold },
  dateFilterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('4%'),
    borderBottomWidth: 1,
  },
  dateFilterOptionText: { fontSize: wp('3.5%'), fontFamily: Fonts.regular },
  modalLabel: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
    marginBottom: hp('0.5%'),
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    fontSize: wp('3.5%'),
    fontFamily: Fonts.regular,
  },
  modalApplyBtn: {
    marginTop: hp('2%'),
    padding: wp('3%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
  },
  modalApplyText: { fontSize: wp('3.5%'), fontFamily: Fonts.medium },
});

export default ReportsScreen;
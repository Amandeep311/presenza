import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useDispatch, useSelector } from 'react-redux';
import {
  Clock,
  Timer,
  CalendarDays,
  SquareChartGantt,
  ChevronDown,
  Coffee,
  User,
  MapPin,
  LogIn,
  LogOut,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Paperclip,
  ReceiptText,
  CalendarClock,
  Key,
} from 'lucide-react-native';
import MainLayout from '../../components/layout/MainLayout';
import { setAlert } from '../../store/actions/authActions';
import {
  getAttendanceHistory,
  punchOut,
  breakIn,
  breakOut,
} from '../../store/actions/attendanceActions';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Fonts } from '../../utils/GlobalText';
import {
  formatDuration,
  formatAttendanceDuration,
  formatMinutesToHours,
} from '../../utils/utils';
import BreakReasonModal from '../../components/modals/BreakReasonModal';
import VisitModal from '../../components/modals/Visitmodal';
import ActiveTimeDisplay from '../../components/common/ActiveTimeDisplay';
import { getEmployeeProfile } from '../../store/actions/employeeActions';

// Import reusable components
import StatusPill from '../../components/common/StatusPill';
import QuickActionCard from '../../components/common/QuickActionCard';
import StatItem from '../../components/common/StatItem';
import BreakItem from '../../components/common/BreakItem';
import AttendanceTable from '../../components/common/AttendanceTable';
import AbsentCard from '../../components/common/AbsentCard';
import ProfileModal from '../../components/modals/ProfileModal';

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const { user } = useSelector(state => state.auth);
  const {
    history,
    historyLoading,
    punchOutLoading,
    breakLoading,
    activeBreak,
    currentStatus,
  } = useSelector(state => state.attendance);

  const [isProcessing, setIsProcessing] = useState(false);
  const [durationFormat, setDurationFormat] = useState('auto');
  const [showFormatOptions, setShowFormatOptions] = useState(false);
  const [breakModalVisible, setBreakModalVisible] = useState(false);
  const [visitModalVisible, setVisitModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const timerRef = useRef(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Profile data
  const { profile } = useSelector(state => state.employeeProfile);
  const fullName = profile?.[0]?.fullName || '';
  const firstName = fullName.split(' ')[0] || 'Guest';
  const department = profile?.[0]?.department || '';
  const reportingManager = profile?.[0]?.reportingTo;
  const managerName = reportingManager?.name || 'Manager';
  const managerEmail = reportingManager?.email || '';
  const managerPhone = reportingManager?.phone || '';

  const isSalesTeam = department.toLowerCase().includes('sales');

  // Attendance data
  const today = new Date().toISOString().split('T')[0];
  const todayRecord = history?.find(r => r.date.split('T')[0] === today);
  const sessions = todayRecord?.sessions || [];
  const lastSession = sessions[sessions.length - 1];
  const todaysPunchIn = lastSession?.punchIn;
  const todaysPunchOut = lastSession?.punchOut;
  const lastImage = lastSession?.punchInLocation?.imageUrl;

  const rawAttendanceStatus =
    todayRecord?.attendanceStatus || todayRecord?.status || 'ABSENT';
  const isPunchedIn = todayRecord?.isPunchedIn === true;
  const hasAnySessionToday = sessions.length > 0;

  const isAbsent = rawAttendanceStatus === 'ABSENT' && !isPunchedIn;

  const isOnBreak =
    !!activeBreak || lastSession?.breaks?.some(b => !b.breakOut);
  const currentBreak = isOnBreak
    ? activeBreak || lastSession?.breaks?.find(b => !b.breakOut)
    : null;

  const isUserLate = todayRecord?.isLate === true;
  const isHalfDay = todayRecord?.isHalfDay === true;
  const lateMinutes = todayRecord?.lateMinutes || 0;
  const earlyLeaveMinutes = todayRecord?.earlyLeaveMinutes || 0;
  const isEarlyLeave = todayRecord?.isEarlyLeave === true;
  const morningShortLeave =
    todayRecord?.morningShortLeave?.isShortLeave || false;
  const eveningShortLeave =
    todayRecord?.eveningShortLeave?.isShortLeave || false;
  const morningShortLeaveMinutes = todayRecord?.morningShortLeave?.minutes || 0;
  const eveningShortLeaveMinutes = todayRecord?.eveningShortLeave?.minutes || 0;
  const breakCount = todayRecord?.breakCount || 0;

  const totalMinutes = sessions.reduce(
    (acc, s) => acc + (s.durationMinutes || 0),
    0,
  );
  const totalBreakMinutes = sessions.reduce(
    (acc, s) =>
      acc +
      (s.breaks || []).reduce((bt, b) => bt + (b.durationMinutes || 0), 0),
    0,
  );

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    loadAttendanceHistory();
  }, []);

  const loadAttendanceHistory = async () => {
    try {
      await dispatch(getAttendanceHistory());
    } catch (e) {
      console.log('Error loading attendance:', e);
    }
  };

  const loadEmployeeProfile = async () => {
    try {
      await dispatch(getEmployeeProfile());
    } catch (e) {
      console.log('Error loading profile:', e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadAttendanceHistory(), loadEmployeeProfile()]);
    setRefreshing(false);
  }, []);

  const handleQuickActionPress = label => {
    if (isProcessing || breakLoading) return;

    if (label === t.home.dailyPunch) {
      if (isPunchedIn) {
        dispatch(
          setAlert(
            t.alerts.alreadyPunchedIn || 'You are already punched in',
            'error',
          ),
        );
        return;
      }
      navigation.navigate('DailyPuch');
      return;
    }

    if (label === t.home.idleTracking) {
      if (!isPunchedIn) {
        dispatch(setAlert(t.alerts.punchInFirst, 'error'));
        return;
      }
      if (isOnBreak) {
        dispatch(setAlert(t.alerts.alreadyOnBreak, 'error'));
        return;
      }
      setBreakModalVisible(true);
      return;
    }

    if (label === 'Visit') {
      if (!isPunchedIn) {
        dispatch(
          setAlert(t.alerts.punchInFirst || 'Please punch in first', 'error'),
        );
        return;
      }
      setVisitModalVisible(true);
      return;
    }

    if (label === t.home.reports) {
      navigation.navigate('Reports');
      return;
    }

    if (label === t.home.leaveManagement) {
      navigation.navigate('Leave');
      return;
    }

    if (label === t.home.reimbursement) {
      // navigation.navigate('Reimbursement');
      // return;
    }

    if (label === t.home.salarySlip) {
      // navigation.navigate('SalarySlip');
      // return;
    }

    if (label === t.home.meetings) {
      navigation.navigate('Meetings');
      return;
    }
    if (label === t.home.kra) {
      navigation.navigate('KRA');
      return;
    }

    dispatch(
      setAlert(`✨ ${label} ${t.buttons.comingSoon || 'Coming Soon!'}`, 'info'),
    );
  };

  const handleBreakIn = async (breakType, remarks) => {
    try {
      setIsProcessing(true);
      const result = await dispatch(breakIn(breakType, remarks));
      if (result?.success) {
        setBreakModalVisible(false);
        dispatch(setAlert(t.alerts.breakStarted, 'success'));
      } else if (!result?.message?.includes('already on a break')) {
        dispatch(
          setAlert(
            result?.message || t.breaks.confirm + ' ' + t.alerts.failed,
            'error',
          ),
        );
      }
    } catch {
      dispatch(setAlert(t.alerts.serverError, 'error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBreakOut = async () => {
    if (isProcessing || breakLoading) return;

    Alert.alert(t.breaks.endBreak, t.alerts.endBreakConfirm, [
      { text: t.buttons.cancel, style: 'cancel' },
      {
        text: t.alerts.yesEndBreak,
        style: 'destructive',
        onPress: async () => {
          try {
            setIsProcessing(true);
            const result = await dispatch(
              breakOut(currentBreak?.breakType || 'LUNCH', 'Break ended'),
            );
            if (result?.success) {
              dispatch(setAlert(t.alerts.breakEnded, 'success'));
            } else {
              dispatch(
                setAlert(
                  result?.message || t.breaks.endBreak + ' ' + t.alerts.failed,
                  'error',
                ),
              );
            }
          } catch {
            dispatch(setAlert(t.alerts.serverError, 'error'));
          } finally {
            setIsProcessing(false);
          }
        },
      },
    ]);
  };

  const handlePunchOut = async () => {
    if (isProcessing || punchOutLoading) return;

    if (isOnBreak) {
      Alert.alert(t.alerts.cannotPunchOut, t.alerts.endBreakFirst, [
        { text: t.buttons.ok || 'OK' },
      ]);
      return;
    }

    Alert.alert(t.attendance.punchOut, t.alerts.punchOutConfirm, [
      { text: t.buttons.cancel, style: 'cancel' },
      {
        text: t.alerts.yesPunchOut,
        style: 'destructive',
        onPress: async () => {
          try {
            setIsProcessing(true);
            const result = await dispatch(punchOut());
            if (result?.success) {
              dispatch(setAlert(t.alerts.punchOutSuccess, 'success'));
            } else {
              dispatch(
                setAlert(
                  result?.message ||
                    t.attendance.punchOut + ' ' + t.alerts.failed,
                  'error',
                ),
              );
            }
          } catch {
            dispatch(setAlert(t.alerts.serverError, 'error'));
          } finally {
            setIsProcessing(false);
          }
        },
      },
    ]);
  };

  const getFormattedDuration = minutes => {
    if (!minutes && minutes !== 0) return '---';
    if (minutes === 0) return '0 ' + (t.attendance.min || 'min');

    switch (durationFormat) {
      case 'hours':
        return formatAttendanceDuration(minutes);
      case 'days': {
        const d = (minutes / (24 * 60)).toFixed(1);
        return `${d} ${
          d === '1.0' ? t.attendance.day : t.attendance.days || 'days'
        }`;
      }
      case 'weeks': {
        const w = (minutes / (7 * 24 * 60)).toFixed(1);
        return `${w} ${
          w === '1.0' ? t.attendance.week : t.attendance.weeks || 'weeks'
        }`;
      }
      default:
        return formatDuration(minutes);
    }
  };

  const formatMinutes = minutes => {
    if (!minutes && minutes !== 0) return '---';
    if (minutes >= 60) return formatMinutesToHours(minutes);
    return `${minutes} ${t.attendance.min || 'min'}`;
  };

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

  const formatDate = ds => {
    if (!ds) return '';
    try {
      return new Date(ds).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const getGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return t.greeting.morning;
    if (h < 17) return t.greeting.afternoon;
    return t.greeting.evening;
  };

  const getStatusConfig = () => {
    if (isAbsent) {
      return {
        label: t.attendance.absent || 'ABSENT',
        color: C.error,
        icon: XCircle,
      };
    }
    if (isOnBreak) {
      return { label: t.breaks.onBreak, color: C.warning, icon: Coffee };
    }
    if (isPunchedIn) {
      if (isHalfDay) {
        return {
          label: t.attendance.halfDay || 'Half Day',
          color: C.warning,
          icon: CheckCircle2,
        };
      }
      if (isUserLate) {
        return {
          label: t.attendance.lateLogin || 'Late Login',
          color: C.warning,
          icon: CheckCircle2,
        };
      }
      return {
        label: t.attendance.present || 'PRESENT',
        color: C.success,
        icon: CheckCircle2,
      };
    }
    if (hasAnySessionToday) {
      return {
        label: t.attendance.punchedOut || 'PUNCHED OUT',
        color: C.textSecondary,
        icon: LogOut,
      };
    }
    return {
      label: t.attendance.notMarked || 'Not Marked',
      color: C.textSecondary,
      icon: AlertCircle,
    };
  };

  const statusConfig = getStatusConfig();
  const isLoading =
    historyLoading ||
    punchOutLoading ||
    breakLoading ||
    isProcessing ||
    refreshing;

  const quickActions = [
    { label: t.home.dailyPunch, icon: Timer, color: C.primary },
    { label: t.home.idleTracking, icon: Coffee, color: C.warning },
    { label: t.home.leaveManagement, icon: CalendarDays, color: C.success },
    { label: t.home.reports, icon: SquareChartGantt, color: C.info },
    { label: t.home.salarySlip, icon: ReceiptText, color: C.secondary },
    { label: t.home.reimbursement, icon: Paperclip, color: C.purple },
    { label: t.home.meetings, icon: CalendarClock, color: C.pink },
    { label: t.home.kra, icon: Key, color: C.rose },
  ];

  const formatOptions = [
    { label: t.attendance.auto || 'Auto', value: 'auto' },
    { label: t.attendance.hours || 'Hours', value: 'hours' },
    { label: t.attendance.days || 'Days', value: 'days' },
    { label: t.attendance.weeks || 'Weeks', value: 'weeks' },
  ];

  const renderShortLeaveInfo = () => {
    if (!morningShortLeave && !eveningShortLeave) return null;
    return (
      <View
        style={[
          styles.shortLeaveContainer,
          { backgroundColor: C.info + '08', borderColor: C.info + '30' },
        ]}
      >
        {morningShortLeave && (
          <Text style={[styles.shortLeaveText, { color: C.info }]}>
            {t.attendance.morningShortLeave || 'Morning Short Leave'}:{' '}
            {formatMinutes(morningShortLeaveMinutes)}
          </Text>
        )}
        {eveningShortLeave && (
          <Text style={[styles.shortLeaveText, { color: C.info }]}>
            {t.attendance.eveningShortLeave || 'Evening Short Leave'}:{' '}
            {formatMinutes(eveningShortLeaveMinutes)}
          </Text>
        )}
      </View>
    );
  };

  const handleContactManager = type => {
    if (type === 'email' && managerEmail) {
      Alert.alert('Contact Manager', `Email: ${managerEmail}`);
    } else if (type === 'phone' && managerPhone) {
      Alert.alert('Contact Manager', `Phone: ${managerPhone}`);
    } else {
      Alert.alert('Info', 'Manager contact information not available');
    }
  };

  const shouldShowPunchOut = () => isPunchedIn && !isOnBreak;

  const cardBorderColor = isAbsent
    ? C.error + '30'
    : isHalfDay || isUserLate
    ? C.warning + '30'
    : C.border;

  return (
    <>
      {isProcessing && (
        <View style={[styles.overlay, { backgroundColor: C.overlayBg }]}>
          <View
            style={[
              styles.overlayCard,
              { backgroundColor: C.surfaceSolid, borderColor: C.border },
            ]}
          >
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={[styles.overlayText, { color: C.textPrimary }]}>
              {t.attendance.processing}
            </Text>
          </View>
        </View>
      )}

      <MainLayout
        headerRightComponent={null}
        title={null}
        showBack={false}
        headerBackgroundColor={C.background}
        onMenuPress={null}
        userName={firstName}
        greeting={getGreeting()}
        date={currentTime.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
        showProfile={true}
        onProfilePress={() => setProfileModalVisible(true)}
      >
        <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />

        <BreakReasonModal
          visible={breakModalVisible}
          onClose={() => setBreakModalVisible(false)}
          onConfirm={handleBreakIn}
          loading={breakLoading || isProcessing}
        />

        <VisitModal
          visible={visitModalVisible}
          onClose={() => setVisitModalVisible(false)}
          // onSubmit={handleVisitSubmit}
          loading={isProcessing}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { backgroundColor: C.background },
          ]}
          scrollEnabled={!isProcessing}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.primary]}
              tintColor={C.primary}
            />
          }
        >
          {/* ActiveTimeDisplay */}
          {(isPunchedIn || isOnBreak || hasAnySessionToday) && (
            <ActiveTimeDisplay
              punchInTime={todaysPunchIn}
              isOnBreak={isOnBreak}
              breakStartTime={currentBreak?.breakIn}
              breakType={currentBreak?.breakType}
              onEndBreak={handleBreakOut}
              breakLoading={breakLoading || isProcessing}
              isAbsent={isAbsent}
              isPunchedIn={isPunchedIn}
              hasAnySessionToday={hasAnySessionToday}
              isUserLate={isUserLate}
              isHalfDay={isHalfDay}
              isEarlyLeave={isEarlyLeave}
              lateMinutes={lateMinutes}
              earlyLeaveMinutes={earlyLeaveMinutes}
              todaysPunchIn={todaysPunchIn}
              firstPunchIn={todayRecord?.firstPunchIn}
              lastSession={lastSession}
              statusConfig={statusConfig}
            />
          )}

          {/* Quick Actions */}
          <View style={[styles.sectionRow, { backgroundColor: C.background }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>
              {t.home.quickActions}
            </Text>
          </View>

          <View style={[styles.actionsGrid, { backgroundColor: C.background }]}>
            {quickActions.map((item, index) => {
              const isBreakAction = item.label === t.home.idleTracking;
              const isVisitAction = item.label === 'Visit';
              const showGreenDot = isBreakAction && isOnBreak;
              const disabled = isLoading;

              return (
                <View key={index} style={styles.actionCardWrapper}>
                  {showGreenDot && (
                    <View style={[styles.greenDot, { backgroundColor: C.success }]} />
                  )}
                  <QuickActionCard
                    icon={item.icon}
                    label={item.label}
                    color={item.color}
                    onPress={() => handleQuickActionPress(item.label)}
                    disabled={disabled}
                    isActive={false}
                    hint={
                      (isBreakAction || isVisitAction) &&
                      !isPunchedIn &&
                      !showGreenDot
                        ? t.attendance.needCheckIn || 'Need check-in'
                        : undefined
                    }
                    theme={theme}
                  />
                </View>
              );
            })}
          </View>

          {/* Today's Activity header */}
          <View style={[styles.sectionRow, { backgroundColor: C.background, marginTop: hp('4%') }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>
              {t.home.todaysActivity}
            </Text>
            {/* <TouchableOpacity
              style={[
                styles.formatPill,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
              onPress={() => setShowFormatOptions(!showFormatOptions)}
            >
              <Text style={[styles.formatPillText, { color: C.textSecondary }]}>
                {formatOptions.find(f => f.value === durationFormat)?.label ||
                  'Auto'}
              </Text>
              <ChevronDown size={wp('3.5%')} color={C.textSecondary} />
            </TouchableOpacity> */}
          </View>

          {showFormatOptions && (
            <View
              style={[
                styles.dropdown,
                { backgroundColor: C.surfaceSolid, borderColor: C.border },
              ]}
            >
              {formatOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: C.border },
                    durationFormat === opt.value && {
                      backgroundColor: C.primary + '18',
                    },
                  ]}
                  onPress={() => {
                    setDurationFormat(opt.value);
                    setShowFormatOptions(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      { color: C.textSecondary },
                      durationFormat === opt.value && {
                        color: C.primary,
                        fontFamily: Fonts.medium,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Attendance Card */}
          {historyLoading && !refreshing ? (
            <View
              style={[
                styles.loadingCard,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={[styles.loadingText, { color: C.textSecondary }]}>
                {t.reports.loading}
              </Text>
            </View>
          ) : todayRecord ? (
            <View
              style={[
                styles.card,
                { backgroundColor: C.surface, borderColor: cardBorderColor },
              ]}
            >
              {/* Card Header */}
              <View
                style={[styles.cardHeader, { borderBottomColor: C.border }]}
              >
                <View style={styles.cardUserRow}>
                  {lastImage ? (
                    <Image
                      source={{ uri: lastImage }}
                      style={[styles.cardAvatar, { borderColor: C.primary }]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.cardAvatar,
                        styles.cardAvatarPlaceholder,
                        {
                          backgroundColor: C.background,
                          borderColor: C.border,
                        },
                      ]}
                    >
                      <User size={wp('5%')} color={C.textSecondary} />
                    </View>
                  )}

                  <View style={styles.cardInfoCol}>
                    <StatusPill
                      status={statusConfig.label}
                      color={statusConfig.color}
                      icon={statusConfig.icon}
                      theme={theme}
                    />

                    {isPunchedIn && (
                      <>
                        <Text
                          style={[
                            styles.cardPunchTime,
                            { color: C.textPrimary },
                          ]}
                        >
                          {formatTime(todaysPunchIn)}
                        </Text>
                        <Text
                          style={[
                            styles.cardPunchDate,
                            { color: C.textSecondary },
                          ]}
                        >
                          {formatDate(todaysPunchIn)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                {shouldShowPunchOut() && (
                  <TouchableOpacity
                    style={[
                      styles.punchOutBtn,
                      { backgroundColor: C.error },
                      isLoading && { backgroundColor: C.disabled },
                    ]}
                    onPress={handlePunchOut}
                    disabled={isLoading}
                  >
                    <LogOut
                      size={wp('3.5%')}
                      color="#fff"
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[styles.punchOutBtnText, { color: '#fff' }]}
                      numberOfLines={1}
                    >
                      {punchOutLoading || isProcessing
                        ? t.attendance.processing
                        : t.attendance.punchOut}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Stats Row */}
              <View style={[styles.statsRow, { borderBottomColor: C.border }]}>
                <StatItem
                  icon={TrendingUp}
                  value={getFormattedDuration(totalMinutes)}
                  label={t.attendance.workingTime}
                  color={C.primary}
                  theme={theme}
                />

                <View
                  style={[styles.statDivider, { backgroundColor: C.border }]}
                />

                <StatItem
                  icon={Coffee}
                  value={getFormattedDuration(totalBreakMinutes)}
                  label={t.attendance.breakTime}
                  color={C.warning}
                  theme={theme}
                />

                {breakCount > 0 && (
                  <>
                    <View
                      style={[
                        styles.statDivider,
                        { backgroundColor: C.border },
                      ]}
                    />
                    <StatItem
                      icon={Clock}
                      value={breakCount}
                      label={t.attendance.breakCount || 'Breaks'}
                      color={C.info}
                      theme={theme}
                    />
                  </>
                )}
              </View>

              {/* Short Leave */}
              {renderShortLeaveInfo()}

              {/* Late / Early Leave / Half Day */}
              {(isUserLate || isEarlyLeave || isHalfDay) && (
                <View
                  style={[
                    styles.alertInfo,
                    {
                      backgroundColor: C.warning + '08',
                      borderColor: C.warning + '30',
                    },
                  ]}
                >
                  {isUserLate && (
                    <Text style={[styles.alertText, { color: C.warning }]}>
                      ⚠️ {t.attendance.lateBy || 'Late by'}{' '}
                      {formatMinutes(lateMinutes)}
                    </Text>
                  )}
                  {isHalfDay && (
                    <Text style={[styles.alertText, { color: C.warning }]}>
                      ⚠️ {t.attendance.halfDay || 'Half Day'}
                    </Text>
                  )}
                  {isEarlyLeave && (
                    <Text style={[styles.alertText, { color: C.warning }]}>
                      ⚠️ {t.attendance.earlyLeave || 'Early leave'}{' '}
                      {formatMinutes(earlyLeaveMinutes)}
                    </Text>
                  )}
                </View>
              )}

              {/* Breaks List */}
              {sessions.map(
                (session, si) =>
                  session.breaks?.length > 0 && (
                    <View
                      key={si}
                      style={[
                        styles.breaksSection,
                        {
                          backgroundColor: C.background + '80',
                          borderColor: C.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.breaksSectionTitle,
                          { color: C.primary },
                        ]}
                      >
                        {t.attendance.breaks || 'Breaks'}
                      </Text>
                      {session.breaks.map((b, bi) => (
                        <BreakItem
                          key={bi}
                          break={b}
                          formatTime={formatTime}
                          getFormattedDuration={getFormattedDuration}
                          theme={theme}
                        />
                      ))}
                    </View>
                  ),
              )}

              {/* Sessions Table */}
              {sessions.length > 0 && (
                <AttendanceTable
                  sessions={sessions}
                  formatTime={formatTime}
                  getFormattedDuration={getFormattedDuration}
                  theme={theme}
                />
              )}

              {/* Absent Block */}
              {isAbsent && (
                <AbsentCard
                  managerName={managerName}
                  managerEmail={managerEmail}
                  managerPhone={managerPhone}
                  onApplyLeave={() => navigation.navigate('Leave')}
                  onContactManager={handleContactManager}
                  theme={theme}
                  t={t}
                />
              )}

              {/* Location Row */}
              {lastSession?.punchInLocation ? (
                <View
                  style={[styles.locationRow, { borderTopColor: C.border }]}
                >
                  <MapPin size={wp('3.5%')} color={C.textSecondary} />
                  <Text
                    style={[styles.locationText, { color: C.textSecondary }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {lastSession.punchInLocation.address ||
                      t.attendance.locationRecorded ||
                      'Location recorded'}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            /* Empty state */
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <View
                style={[
                  styles.emptyIconWrap,
                  { backgroundColor: C.primary + '12' },
                ]}
              >
                <Clock size={wp('10%')} color={C.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
                {t.attendance.noAttendanceToday}
              </Text>
              <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
                {t.attendance.markAttendance}
              </Text>
              <TouchableOpacity
                style={[
                  styles.punchInBtn,
                  { backgroundColor: C.primary },
                  isLoading && { backgroundColor: C.disabled },
                ]}
                onPress={() => {
                  if (isLoading) return;
                  navigation.navigate('DailyPuch');
                }}
                disabled={isLoading}
              >
                <LogIn
                  size={wp('4%')}
                  color={C.textDark}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.punchInBtnText, { color: C.textDark }]}>
                  {t.attendance.punchInNow}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: hp('4%') }} />
        </ScrollView>
      </MainLayout>

      {/* Profile Modal */}
      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        profile={profile}
        theme={theme}
        t={t}
      />
    </>
  );
};

// Styles
const CARD_H_PAD = wp('4%');

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: wp('2%'),
    paddingBottom: hp('2%'),
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  overlayCard: {
    borderRadius: wp('4%'),
    padding: wp('8%'),
    alignItems: 'center',
    gap: hp('1.5%'),
    borderWidth: 1,
  },
  overlayText: { fontSize: wp('3.5%'), fontFamily: Fonts.medium },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp('2%'),
    marginBottom: hp('1.2%'),
  },
  sectionLabel: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom:hp('2%')
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2.5%'),
        alignItems:'baseline',
    justifyContent: 'space-between',
  },
  actionCardWrapper: {
    width: '21%',
    position: 'relative',
  },
  greenDot: {
    width: wp('2.5%'),
    height: wp('2.5%'),
    borderRadius: wp('1.25%'),
    position: 'absolute',
    top: -hp('0.8%'),
    right: wp('1%'),
    zIndex: 10,
  },
  formatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.6%'),
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  formatPillText: { fontSize: wp('2.8%'), fontFamily: Fonts.regular },
  dropdown: {
    marginBottom: hp('1%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  dropdownItem: {
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('4%'),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownText: { fontSize: wp('3.2%'), fontFamily: Fonts.regular },
  card: {
    borderRadius: wp('5%'),
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: CARD_H_PAD,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: wp('2%'),
    flexWrap: 'wrap',
  },
  cardUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('3%'),
    flex: 1,
    minWidth: 0,
  },
  cardAvatar: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('6%'),
    borderWidth: 2,
    flexShrink: 0,
  },
  cardAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  cardPunchTime: {
    fontSize: wp('4%'),
    fontFamily: Fonts.bold,
    lineHeight: wp('5.5%'),
  },
  cardPunchDate: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  punchOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.9%'),
    borderRadius: wp('2.5%'),
    flexShrink: 0,
    minWidth: wp('20%'),
  },
  punchOutBtnText: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CARD_H_PAD,
    paddingVertical: hp('1.4%'),
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: hp('4%'),
    marginHorizontal: wp('1.5%'),
    flexShrink: 0,
  },
  shortLeaveContainer: {
    margin: CARD_H_PAD,
    marginBottom: 0,
    padding: wp('3%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    gap: 4,
  },
  shortLeaveText: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },
  alertInfo: {
    margin: CARD_H_PAD,
    marginBottom: 0,
    padding: wp('3%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    gap: 4,
  },
  alertText: { fontSize: wp('3%'), fontFamily: Fonts.medium },
  breaksSection: {
    margin: CARD_H_PAD,
    marginBottom: 0,
    borderRadius: wp('3%'),
    padding: wp('3%'),
    borderWidth: 1,
  },
  breaksSectionTitle: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
    marginBottom: hp('0.8%'),
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    padding: CARD_H_PAD,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: CARD_H_PAD,
  },
  locationText: {
    flex: 1,
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
  },
  emptyCard: {
    borderRadius: wp('5%'),
    padding: hp('4%'),
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyIconWrap: {
    width: wp('20%'),
    height: wp('20%'),
    borderRadius: wp('10%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  emptyTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
    marginBottom: hp('0.5%'),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginBottom: hp('2.5%'),
  },
  punchInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('8%'),
    paddingVertical: hp('1.6%'),
    borderRadius: wp('5%'),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  punchInBtnText: { fontSize: wp('3.8%'), fontFamily: Fonts.medium },
  loadingCard: {
    borderRadius: wp('5%'),
    padding: hp('3%'),
    alignItems: 'center',
    gap: hp('1%'),
    borderWidth: 1,
  },
  loadingText: { fontSize: wp('3.2%'), fontFamily: Fonts.regular },
});

export default HomeScreen;
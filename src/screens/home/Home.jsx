import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  FlatList,
  LayoutAnimation,
  UIManager,
  Platform,
  Modal,
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
  ChevronUp,
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
  X,
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
import { showToast } from '../../components/common/ToastProvider';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============ ATTENDANCE CALCULATION RULES (Frontend) ============
// All times in minutes from midnight
const ATTENDANCE_RULES = {
  OFFICE_START: 9 * 60, // 9:00 AM
  LATE_THRESHOLD: 9 * 60 + 40, // 9:40 AM
  HALF_DAY_THRESHOLD: 11 * 60 + 30, // 11:30 AM
  ABSENT_THRESHOLD: 14 * 60, // 2:00 PM
};

const getAttendanceStatusFromPunchIn = punchInTime => {
  if (!punchInTime) {
    return {
      status: 'NOT_MARKED',
      label: 'Not Marked',
      type: 'notMarked',
      color: 'text',
      lateMinutes: 0,
      icon: 'AlertCircle',
    };
  }

  const punchInDate = new Date(punchInTime);
  const punchInTotalMinutes =
    punchInDate.getHours() * 60 + punchInDate.getMinutes();

  // Rule 1: Before 9:40 AM → Present
  if (punchInTotalMinutes <= ATTENDANCE_RULES.LATE_THRESHOLD) {
    return {
      status: 'PRESENT',
      label: 'Present',
      type: 'present',
      color: 'success',
      lateMinutes: 0,
      icon: 'CheckCircle2',
    };
  }
  // Rule 2: 9:40 AM to 11:30 AM → Late Login
  else if (
    punchInTotalMinutes > ATTENDANCE_RULES.LATE_THRESHOLD &&
    punchInTotalMinutes <= ATTENDANCE_RULES.HALF_DAY_THRESHOLD
  ) {
    const lateMins = punchInTotalMinutes - ATTENDANCE_RULES.OFFICE_START;
    return {
      status: 'LATE',
      label: `Late Login (${Math.floor(lateMins / 60)}h ${
        lateMins % 60
      }m late)`,
      type: 'late',
      color: 'warning',
      lateMinutes: lateMins,
      icon: 'CheckCircle2',
    };
  }
  // Rule 3: 11:30 AM to 2:00 PM → Half Day
  else if (
    punchInTotalMinutes > ATTENDANCE_RULES.HALF_DAY_THRESHOLD &&
    punchInTotalMinutes <= ATTENDANCE_RULES.ABSENT_THRESHOLD
  ) {
    return {
      status: 'HALF_DAY',
      label: 'Half Day',
      type: 'halfDay',
      color: 'warning',
      lateMinutes: 0,
      icon: 'AlertCircle',
    };
  }
  // Rule 4: After 2:00 PM → Absent
  else {
    return {
      status: 'ABSENT',
      label: 'Absent',
      type: 'absent',
      color: 'error',
      lateMinutes: 0,
      icon: 'XCircle',
    };
  }
};

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
  const [imagePopupVisible, setImagePopupVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  // Expand/Collapse states
  const [expandedSections, setExpandedSections] = useState({
    breaks: false,
    sessions: false,
  });

  // ✅ Track if data has been loaded on mount to prevent infinite loops
  const dataLoadedRef = useRef(false);
  const isInitialMountRef = useRef(true);

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

  // Get first punch in time for today
  const firstPunchIn = todayRecord?.firstPunchIn || sessions[0]?.punchIn;

  // 🔥 Calculate attendance status based on punch in time (Frontend logic)
  const calculatedAttendance = getAttendanceStatusFromPunchIn(firstPunchIn);

  const rawAttendanceStatus =
    todayRecord?.attendanceStatus || todayRecord?.status || 'ABSENT';
  const isPunchedIn = todayRecord?.isPunchedIn === true;
  const hasAnySessionToday = sessions.length > 0;

  // 🔥 Use calculated values instead of backend values
  const isAbsent =
    calculatedAttendance.type === 'absent' ||
    (rawAttendanceStatus === 'ABSENT' && !isPunchedIn && !firstPunchIn);
  const isUserLate = calculatedAttendance.type === 'late';
  const isHalfDay = calculatedAttendance.type === 'halfDay';
  const lateMinutes =
    calculatedAttendance.lateMinutes || todayRecord?.lateMinutes || 0;
  const earlyLeaveMinutes = todayRecord?.earlyLeaveMinutes || 0;
  const isEarlyLeave = todayRecord?.isEarlyLeave === true;
  const morningShortLeave =
    todayRecord?.morningShortLeave?.isShortLeave || false;
  const eveningShortLeave =
    todayRecord?.eveningShortLeave?.isShortLeave || false;
  const morningShortLeaveMinutes = todayRecord?.morningShortLeave?.minutes || 0;
  const eveningShortLeaveMinutes = todayRecord?.eveningShortLeave?.minutes || 0;
  const breakCount = todayRecord?.breakCount || 0;

  const isOnBreak =
    !!activeBreak || lastSession?.breaks?.some(b => !b.breakOut);
  const currentBreak = isOnBreak
    ? activeBreak || lastSession?.breaks?.find(b => !b.breakOut)
    : null;

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

  // ✅ Timer effect - runs every second to update current time
  useEffect(() => {
    timerRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ✅ INITIAL LOAD - Called ONCE when component mounts
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      console.log('🔄 HomeScreen: Initial mount - Loading data...');
      loadInitialData();
    }
  }, []);

  // ✅ FOCUS EFFECT - Called when user navigates back to this screen
  // This will refresh data without making the user manually pull-to-refresh
  useFocusEffect(
    useCallback(() => {
      // Only load if it's not the initial mount (to avoid double loading)
      if (!isInitialMountRef.current && dataLoadedRef.current) {
        console.log('🔄 HomeScreen: Screen focused - Refreshing data...');
        loadAttendanceHistory();
        loadEmployeeProfile();
      }
    }, []),
  );

  // ✅ Helper: Load all data on initial mount
  const loadInitialData = async () => {
    try {
      console.log('📊 Loading initial data...');
      await Promise.all([
        dispatch(getAttendanceHistory()),
        dispatch(getEmployeeProfile()),
      ]);
      dataLoadedRef.current = true;
      console.log('✅ Initial data loaded');
    } catch (e) {
      console.log('❌ Error loading initial data:', e);
      dataLoadedRef.current = true; // Mark as loaded even if error to prevent infinite attempts
    }
  };

  // ✅ Helper: Load attendance history only
  const loadAttendanceHistory = async () => {
    try {
      console.log('📊 Loading attendance history...');
      await dispatch(getAttendanceHistory());
      console.log('✅ Attendance history loaded');
    } catch (e) {
      console.log('❌ Error loading attendance:', e);
    }
  };

  // ✅ Helper: Load employee profile only
  const loadEmployeeProfile = async () => {
    try {
      console.log('👤 Loading employee profile...');
      await dispatch(getEmployeeProfile());
      console.log('✅ Employee profile loaded');
    } catch (e) {
      console.log('❌ Error loading profile:', e);
    }
  };

  // ✅ Pull-to-refresh handler - Called when user pulls down
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log('🔄 User pulled to refresh');
    try {
      await Promise.all([
        dispatch(getAttendanceHistory()),
        dispatch(getEmployeeProfile()),
      ]);
      console.log('✅ Refresh completed');
    } catch (e) {
      console.log('❌ Error during refresh:', e);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const toggleSection = section => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleImagePress = imageUrl => {
    setSelectedImage(imageUrl);
    setImagePopupVisible(true);
  };

  const handleQuickActionPress = label => {
    if (isProcessing || breakLoading) return;

    if (label === t.home.dailyPunch) {
      // if (isPunchedIn) {
      //   showToast(
      //     t.alerts.alreadyPunchedIn || 'You are already punched in',
      //     'error',
      //   );
      //   return;
      // }
      // 🔥 If already punched in, ask to punch out
      if (isPunchedIn) {
        Alert.alert(
          t.attendance.punchOut || 'Punch Out',
          t.alerts.punchOutConfirm || 'Are you sure you want to punch out?',
          [
            { text: t.buttons.cancel || 'Cancel', style: 'cancel' },
            {
              text: t.alerts.yesPunchOut || 'Yes, Punch Out',
              style: 'destructive',
              onPress: handlePunchOut,
            },
          ],
        );
        return;
      }
      navigation.navigate('DailyPuch');
      return;
    }

    if (label === t.home.idleTracking) {
      if (!isPunchedIn) {
        showToast(t.alerts.punchInFirst || 'Please punch in first', 'error');
        return;
      }
      if (isOnBreak) {
        Alert.alert(
          t.breaks.endBreak || 'End Break',
          t.alerts.endBreakConfirm ||
            'Are you sure you want to end your break?',
          [
            { text: t.buttons.cancel || 'Cancel', style: 'cancel' },
            {
              text: t.alerts.yesEndBreak || 'Yes, End Break',
              style: 'destructive',
              onPress: handleBreakOut,
            },
          ],
        );
        return;
      }
      setBreakModalVisible(true);
      return;
    }

    if (label === 'Visit') {
      if (!isPunchedIn) {
        showToast(t.alerts.punchInFirst || 'Please punch in first', 'error');
        return;
      }
      if (isOnBreak) {
        Alert.alert(
          t.breaks.endBreak || 'End Break',
          t.alerts.endBreakConfirm ||
            'Are you sure you want to end your break?',
          [
            { text: t.buttons.cancel || 'Cancel', style: 'cancel' },
            {
              text: t.alerts.yesEndBreak || 'Yes, End Break',
              style: 'destructive',
              onPress: handleBreakOut,
            },
          ],
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
      navigation.navigate('Reimbursement');
      return;
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
    showToast(
      '✨ ' + label + ' ' + (t.buttons.comingSoon || 'Coming Soon!'),
      'info',
    );
  };

  const handleBreakIn = async (breakType, remarks) => {
    try {
      setIsProcessing(true);
      const result = await dispatch(breakIn(breakType, remarks));
      if (result?.success) {
        setBreakModalVisible(false);
        // Refresh data after successful break in
        await loadAttendanceHistory();
      }
    } catch {
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
            // Refresh data after successful break out
            if (result?.success) {
              await loadAttendanceHistory();
            }
          } catch {
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

            // 🔥 Handle camera cancellation
            if (result?.cancelled) {
              console.log('📸 Punch out cancelled');
              setIsProcessing(false);
              return;
            }

            // Refresh data after successful punch out
            if (result?.success) {
              await loadAttendanceHistory();
              showToast('Punch out successful!', 'success');
            } else {
              showToast(result?.error || 'Punch out failed', 'error');
            }
          } catch (error) {
            console.log('Punch out error:', error);
            showToast('Punch out failed', 'error');
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

  // 🔥 Updated getStatusConfig using calculated attendance
  const getStatusConfig = () => {
    // If no punch in and not punched in
    if (!hasAnySessionToday && !isPunchedIn) {
      return {
        label: t.attendance.notMarked || 'Not Marked',
        color: C.textSecondary,
        icon: AlertCircle,
      };
    }

    // If on break
    if (isOnBreak) {
      return { label: t.breaks.onBreak, color: C.warning, icon: Coffee };
    }

    // If punched in or has sessions, use calculated status
    if (isPunchedIn || hasAnySessionToday) {
      // Present
      if (calculatedAttendance.type === 'present') {
        return {
          label: t.attendance.present || 'Present',
          color: C.success,
          icon: CheckCircle2,
        };
      }
      // Late Login
      if (calculatedAttendance.type === 'late') {
        return {
          label: calculatedAttendance.label,
          color: C.warning,
          icon: CheckCircle2,
        };
      }
      // Half Day
      if (calculatedAttendance.type === 'halfDay') {
        return {
          label: t.attendance.halfDay || 'Half Day',
          color: C.warning,
          icon: AlertCircle,
        };
      }
      // Absent
      if (calculatedAttendance.type === 'absent') {
        return {
          label: t.attendance.absent || 'Absent',
          color: C.error,
          icon: XCircle,
        };
      }
    }

    // Default present
    return {
      label: t.attendance.present || 'PRESENT',
      color: C.success,
      icon: CheckCircle2,
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
    { label: t.home.reimbursement, icon: Paperclip, color: C.purple },
    { label: t.home.meetings, icon: CalendarClock, color: C.pink },
    { label: t.home.kra, icon: Key, color: C.rose },
    // { label: t.home.salarySlip, icon: ReceiptText, color: C.secondary },
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

  const getAllBreaks = () => {
    const breaksList = [];
    sessions.forEach((session, si) => {
      if (session.breaks?.length > 0) {
        session.breaks.forEach((b, bi) => {
          breaksList.push({
            id: `session-${si}-break-${bi}`,
            sessionIndex: si,
            break: b,
          });
        });
      }
    });
    return breaksList;
  };

  const hasBreaks = getAllBreaks().length > 0;
  const hasSessions = sessions.length > 0;

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
          <View
            style={[
              styles.sectionRow,
              {
                backgroundColor: C.background,
                marginTop: hp('5%'),
                marginBottom: hp('0%'),
              },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>
              {t.home.quickActions}
            </Text>
          </View>

          <View style={[styles.actionsGrid, { backgroundColor: C.background }]}>
            {quickActions.map((item, index) => {
              const isBreakAction = item.label === t.home.idleTracking;
              const isPunchAction = item.label === t.home.dailyPunch;
              const showGreenDot = isBreakAction && isOnBreak;

              let disabled = isLoading;

              if (isPunchAction && isPunchedIn) {
                disabled = true;
              }

              if (isBreakAction && (isAbsent || !isPunchedIn)) {
                disabled = true;
              }

              let hint = undefined;
              if (isPunchAction && isPunchedIn) {
                hint = 'Already punched in';
              } else if (isBreakAction && isAbsent) {
                hint = 'Cannot take break when absent';
              } else if (isBreakAction && !isPunchedIn && !showGreenDot) {
                hint = t.attendance.needCheckIn || 'Need check-in';
              }

              return (
                <View key={index} style={styles.actionCardWrapper}>
                  {showGreenDot && (
                    <View
                      style={[styles.greenDot, { backgroundColor: C.success }]}
                    />
                  )}
                  <QuickActionCard
                    icon={item.icon}
                    label={item.label}
                    color={item.color}
                    onPress={() => handleQuickActionPress(item.label)}
                    disabled={disabled}
                    isActive={false}
                    hint={hint}
                    theme={theme}
                  />
                </View>
              );
            })}
          </View>

          {/* Today's Activity header */}
          <View
            style={[
              styles.sectionRow,
              { backgroundColor: C.background, marginTop: hp('4%') },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>
              {t.home.todaysActivity}
            </Text>
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
          ) : todayRecord || hasAnySessionToday ? (
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
                    <TouchableOpacity
                      onPress={() => handleImagePress(lastImage)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: lastImage }}
                        style={[styles.cardAvatar, { borderColor: C.primary }]}
                      />
                    </TouchableOpacity>
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

              {/* Late / Early Leave / Half Day - Show based on calculated values */}
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

              {/* BREAKS SECTION - Expand/Collapse */}
              {hasBreaks && (
                <View
                  style={[
                    styles.expandableSection,
                    {
                      borderColor: C.border,
                      backgroundColor: C.background + '40',
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.expandableHeader}
                    onPress={() => toggleSection('breaks')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.expandableHeaderLeft}>
                      <Coffee size={wp('4%')} color={C.warning} />
                      <Text
                        style={[
                          styles.expandableTitle,
                          { color: C.textPrimary },
                        ]}
                      >
                        {t.attendance.breaks || 'Breaks'} (
                        {getAllBreaks().length})
                      </Text>
                    </View>
                    {expandedSections.breaks ? (
                      <ChevronUp size={wp('4%')} color={C.textSecondary} />
                    ) : (
                      <ChevronDown size={wp('4%')} color={C.textSecondary} />
                    )}
                  </TouchableOpacity>

                  {expandedSections.breaks && (
                    <View style={styles.expandableContent}>
                      {getAllBreaks().map(item => (
                        <BreakItem
                          key={item.id}
                          break={item.break}
                          formatTime={formatTime}
                          getFormattedDuration={getFormattedDuration}
                          theme={theme}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* SESSIONS SECTION - Expand/Collapse */}
              {hasSessions && (
                <View
                  style={[
                    styles.expandableSection,
                    {
                      borderColor: C.border,
                      backgroundColor: C.background + '40',
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.expandableHeader}
                    onPress={() => toggleSection('sessions')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.expandableHeaderLeft}>
                      <Clock size={wp('4%')} color={C.primary} />
                      <Text
                        style={[
                          styles.expandableTitle,
                          { color: C.textPrimary },
                        ]}
                      >
                        {t.attendance.sessions || 'Sessions'} ({sessions.length}
                        )
                      </Text>
                    </View>
                    {expandedSections.sessions ? (
                      <ChevronUp size={wp('4%')} color={C.textSecondary} />
                    ) : (
                      <ChevronDown size={wp('4%')} color={C.textSecondary} />
                    )}
                  </TouchableOpacity>

                  {expandedSections.sessions && (
                    <View style={styles.expandableContent}>
                      {sessions.map((session, si) => (
                        <View key={si}>
                          <Text
                            style={[
                              styles.sessionSubtitle,
                              { color: C.primary, marginBottom: hp('0.8%') },
                            ]}
                          >
                            Session {si + 1}
                          </Text>
                          <AttendanceTable
                            sessions={[session]}
                            formatTime={formatTime}
                            getFormattedDuration={getFormattedDuration}
                            theme={theme}
                          />
                          {si < sessions.length - 1 && (
                            <View
                              style={{
                                height: 1,
                                marginVertical: hp('1.5%'),
                                backgroundColor: C.border,
                              }}
                            />
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Absent Block */}
              {isAbsent && !hasAnySessionToday && (
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
            /* Empty state - No attendance today */
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

          {/* Image Popup Modal */}
          <Modal
            visible={imagePopupVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setImagePopupVisible(false)}
          >
            <TouchableOpacity
              style={[
                styles.imagePopupOverlay,
                { backgroundColor: C.overlayBg },
              ]}
              activeOpacity={1}
              onPress={() => setImagePopupVisible(false)}
            >
              <View style={styles.imagePopupContainer}>
                <View
                  style={[
                    styles.imageCircleWrapper,
                    {
                      backgroundColor: C.surface,
                      borderColor: C.primary + '80',
                      shadowColor: C.primary,
                    },
                  ]}
                >
                  {selectedImage && (
                    <Image
                      source={{ uri: selectedImage }}
                      style={styles.imagePopup}
                      resizeMode="cover"
                    />
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.imagePopupClose,
                    { backgroundColor: C.surface, borderColor: C.border },
                  ]}
                  onPress={() => setImagePopupVisible(false)}
                >
                  <X size={wp('5%')} color={C.textSecondary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
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
    marginBottom: hp('2%'),
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2.5%'),
    alignItems: 'baseline',
    justifyContent: 'flex-start',
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
  expandableSection: {
    margin: CARD_H_PAD,
    marginBottom: 0,
    borderRadius: wp('3%'),
    borderWidth: 1,
    overflow: 'hidden',
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp('3%'),
    backgroundColor: 'transparent',
  },
  expandableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
  },
  expandableTitle: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  expandableContent: {
    padding: wp('3%'),
    paddingTop: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  sessionSubtitle: {
    fontSize: wp('2.4%'),
    fontFamily: Fonts.medium,
    marginBottom: hp('0.5%'),
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
  imagePopupOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
  },
  imagePopupContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCircleWrapper: {
    width: wp('70%'),
    height: wp('70%'),
    borderRadius: wp('35%'),
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  imagePopup: {
    width: '100%',
    height: '100%',
  },
  imagePopupClose: {
    position: 'absolute',
    top: -wp('5%'),
    right: -wp('5%'),
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

export default HomeScreen;

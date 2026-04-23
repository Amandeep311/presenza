import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Platform,
  Animated,
  Alert,
  TextInput,
  LayoutAnimation,
} from 'react-native';
import {} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { applyLeave, fetchLeaves } from '../../../store/actions/leaveActions';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {
  ChevronLeft,
  ChevronRight,
  X,
  CalendarDays,
  Info,
  Sunrise,
  Sunset,
  Building2,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Briefcase,
  MapPin,
  Send,
} from 'lucide-react-native';
import { Colors, Fonts } from '../../../utils/GlobalText';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { setAlert } from '../../../store/actions/authActions';
import { ReusableCalendar } from '../../../components/common/ReusableCalendar';
// ─── Constants ──────────────────────────────────────────────────────────────

const USER_BRANCH = 'CHD'; // Current user's branch

const ALL_BRANCHES = [
  'TELANGANA',
  'KERALA',
  'MP',
  'GUJ',
  'MAH',
  'CHD',
  'PB',
  'HR',
  'HP',
  'DELHI',
  'UP',
  'RAJ',
  'J&K',
  'UK',
];

const HOLIDAYS_2026 = [
  {
    date: '2026-01-14',
    name: 'Makar Sankranti / Pongal',
    branches: { TELANGANA: 'full', MP: 'full', GUJ: 'full' },
  },
  {
    date: '2026-01-26',
    name: 'Republic Day',
    branches: {
      TELANGANA: 'full',
      KERALA: 'full',
      MP: 'full',
      GUJ: 'full',
      MAH: 'full',
      CHD: 'full',
      PB: 'full',
      HR: 'full',
      HP: 'full',
      DELHI: 'full',
      UP: 'full',
      RAJ: 'full',
      'J&K': 'full',
      UK: 'full',
    },
  },
  {
    date: '2026-03-04',
    name: 'Holi',
    branches: {
      TELANGANA: 'half2',
      MP: 'full',
      GUJ: 'full',
      MAH: 'full',
      CHD: 'full',
      PB: 'full',
      HR: 'full',
      HP: 'full',
      DELHI: 'full',
      UP: 'full',
      RAJ: 'full',
      'J&K': 'full',
      UK: 'full',
    },
  },
  {
    date: '2026-03-19',
    name: 'Gudi Padwa / Ugadi',
    branches: { TELANGANA: 'full', MAH: 'half2' },
  },
  { date: '2026-04-03', name: 'Good Friday', branches: { KERALA: 'full' } },
  {
    date: '2026-04-14',
    name: 'Vishu / Vaisakhi',
    branches: {
      KERALA: 'full',
      CHD: 'full',
      PB: 'full',
      HR: 'full',
      HP: 'full',
      DELHI: 'full',
      UP: 'full',
      RAJ: 'full',
      'J&K': 'full',
      UK: 'full',
    },
  },
  {
    date: '2026-05-01',
    name: 'Maharashtra Day / May Day',
    branches: { KERALA: 'full', MAH: 'full' },
  },
  {
    date: '2026-08-15',
    name: 'Independence Day',
    branches: {
      TELANGANA: 'full',
      KERALA: 'full',
      MP: 'full',
      GUJ: 'full',
      MAH: 'full',
      CHD: 'full',
      PB: 'full',
      HR: 'full',
      HP: 'full',
      DELHI: 'full',
      UP: 'full',
      RAJ: 'full',
      'J&K': 'full',
      UK: 'full',
    },
  },
  { date: '2026-08-25', name: 'First Onam', branches: { KERALA: 'full' } },
  {
    date: '2026-08-28',
    name: 'Raksha Bandhan',
    branches: {
      TELANGANA: 'half1',
      MP: 'half1',
      GUJ: 'half1',
      MAH: 'half1',
      CHD: 'half1',
      PB: 'half1',
      HR: 'half1',
      HP: 'half1',
      DELHI: 'half1',
      UP: 'half1',
      RAJ: 'half1',
      'J&K': 'half1',
      UK: 'half1',
    },
  },
  {
    date: '2026-09-04',
    name: 'Janmashtami',
    branches: {
      TELANGANA: 'full',
      KERALA: 'full',
      MP: 'full',
      GUJ: 'full',
      MAH: 'full',
      CHD: 'full',
      PB: 'full',
      HR: 'full',
      HP: 'full',
      DELHI: 'full',
      UP: 'full',
      RAJ: 'full',
      'J&K': 'full',
      UK: 'full',
    },
  },
  {
    date: '2026-09-14',
    name: 'Ganesh Chaturthi',
    branches: { TELANGANA: 'full', MP: 'full', GUJ: 'half2', MAH: 'full' },
  },
  {
    date: '2026-10-02',
    name: 'Mahatma Gandhi Jayanti',
    branches: {
      TELANGANA: 'full',
      KERALA: 'full',
      MP: 'full',
      GUJ: 'full',
      MAH: 'full',
      CHD: 'full',
      PB: 'full',
      HR: 'full',
      HP: 'full',
      DELHI: 'full',
      UP: 'full',
      RAJ: 'full',
      'J&K': 'full',
      UK: 'full',
    },
  },
  {
    date: '2026-10-20',
    name: 'Dussehra',
    branches: {
      TELANGANA: 'full',
      KERALA: 'full',
      MP: 'full',
      GUJ: 'full',
      MAH: 'full',
      CHD: 'full',
      PB: 'full',
      HR: 'full',
      HP: 'full',
      DELHI: 'full',
      UP: 'full',
      RAJ: 'full',
      'J&K': 'full',
      UK: 'full',
    },
  },
  {
    date: '2026-10-29',
    name: 'Karwa Chauth',
    branches: {
      MP: 'half2',
      CHD: 'half2',
      PB: 'half2',
      HR: 'half2',
      HP: 'half2',
      DELHI: 'half2',
      UP: 'half2',
      RAJ: 'half2',
      'J&K': 'half2',
      UK: 'half2',
    },
  },
  {
    date: '2026-11-10',
    name: 'Vikram Samvat (Gujarati New Year)',
    branches: { GUJ: 'full' },
  },
  {
    date: '2026-11-24',
    name: 'Gurupurab – Guru Nanak Dev Ji Birthday',
    branches: {
      CHD: 'full',
      PB: 'full',
      HR: 'full',
      HP: 'full',
      DELHI: 'full',
      UP: 'full',
      RAJ: 'full',
      'J&K': 'full',
      UK: 'full',
    },
  },
  {
    date: '2026-12-25',
    name: 'Christmas',
    branches: {
      TELANGANA: 'full',
      KERALA: 'full',
      MP: 'full',
      GUJ: 'full',
      MAH: 'full',
      CHD: 'full',
      PB: 'full',
      HR: 'full',
      HP: 'full',
      DELHI: 'full',
      UP: 'full',
      RAJ: 'full',
      'J&K': 'full',
      UK: 'full',
    },
  },
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HOLIDAY_MAP = {};
HOLIDAYS_2026.forEach(h => {
  HOLIDAY_MAP[h.date] = h;
});

const toDateStr = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const getNthSaturday = (year, month, n) => {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) break;
    if (date.getDay() === 6) {
      count++;
      if (count === n) return d;
    }
  }
  return -1;
};

const isAllBranches = branches => ALL_BRANCHES.every(b => !!branches[b]);

const getDomType = branches => {
  const types = [...new Set(Object.values(branches))];
  if (types.includes('full')) return 'full';
  if (types.includes('half1')) return 'half1';
  return 'half2';
};

const isWeeklyOff = dateStr => {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const dow = d.getDay();
  if (dow === 0) return true;
  const secondSat = getNthSaturday(year, month, 2);
  const fourthSat = getNthSaturday(year, month, 4);
  return day === secondSat || day === fourthSat;
};

const isHolidayForBranch = (dateStr, branch) => {
  const h = HOLIDAY_MAP[dateStr];
  if (!h) return null;
  if (h.branches[branch]) return { holiday: h, type: h.branches[branch] };
  return null;
};

const isFreeDayForBranch = (dateStr, branch) => {
  if (isWeeklyOff(dateStr)) return true;
  const bh = isHolidayForBranch(dateStr, branch);
  return bh && bh.type === 'full';
};

const isSandwichCandidate = (dateStr, branch) => {
  if (isWeeklyOff(dateStr)) return true;
  const bh = isHolidayForBranch(dateStr, branch);
  return !!bh;
};

const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const calculateLeaveDays = (
  startDateStr,
  endDateStr,
  leaveType = 'full',
  halfDayType = 'half1',
) => {
  const isSingleDay = startDateStr === endDateStr;
  const shortLeaveCount = 0.5;

  let effectiveStart = startDateStr;
  let effectiveEnd = endDateStr;

  const breakdown = [];
  let days = 0;
  const cursor = new Date(effectiveStart);
  const end = new Date(effectiveEnd);

  const appliedDates = new Set();
  {
    const c = new Date(effectiveStart);
    while (c <= end) {
      appliedDates.add(c.toISOString().split('T')[0]);
      c.setDate(c.getDate() + 1);
    }
  }

  while (cursor <= end) {
    const ds = cursor.toISOString().split('T')[0];
    const off = isWeeklyOff(ds);
    const branchHoliday = isHolidayForBranch(ds, USER_BRANCH);
    const isFree = isFreeDayForBranch(ds, USER_BRANCH);

    let dayCount = 0;
    let label = '';
    let isSandwich = false;

    if (isFree) {
      let leftAnchor = false;
      let rightAnchor = false;
      {
        let check = addDays(ds, -1);
        let steps = 0;
        while (steps < 10) {
          if (!appliedDates.has(check)) break;
          if (!isFreeDayForBranch(check, USER_BRANCH)) {
            leftAnchor = true;
            break;
          }
          check = addDays(check, -1);
          steps++;
        }
      }
      {
        let check = addDays(ds, 1);
        let steps = 0;
        while (steps < 10) {
          if (!appliedDates.has(check)) break;
          if (!isFreeDayForBranch(check, USER_BRANCH)) {
            rightAnchor = true;
            break;
          }
          check = addDays(check, 1);
          steps++;
        }
      }

      if (leftAnchor && rightAnchor) {
        dayCount = 1;
        isSandwich = true;
        const name = branchHoliday
          ? branchHoliday.holiday.name
          : off
          ? 'Weekly Off'
          : 'Holiday';
        label = `🥪 Sandwich: ${name} counted as leave`;
      } else {
        dayCount = 0;
        const name = branchHoliday ? branchHoliday.holiday.name : 'Weekly Off';
        label = `${name} — Free (not counted)`;
      }
    } else if (
      branchHoliday &&
      (branchHoliday.type === 'half1' || branchHoliday.type === 'half2')
    ) {
      let leftAnchor = false;
      let rightAnchor = false;
      {
        let check = addDays(ds, -1);
        let steps = 0;
        while (steps < 10) {
          if (!appliedDates.has(check)) break;
          if (!isSandwichCandidate(check, USER_BRANCH)) {
            leftAnchor = true;
            break;
          }
          check = addDays(check, -1);
          steps++;
        }
      }
      {
        let check = addDays(ds, 1);
        let steps = 0;
        while (steps < 10) {
          if (!appliedDates.has(check)) break;
          if (!isSandwichCandidate(check, USER_BRANCH)) {
            rightAnchor = true;
            break;
          }
          check = addDays(check, 1);
          steps++;
        }
      }

      if (leftAnchor && rightAnchor && !isSingleDay) {
        dayCount = 1;
        isSandwich = true;
        label = `🥪 Sandwich: ${branchHoliday.holiday.name} (half day) counted as full leave`;
      } else if (leaveType === 'short') {
        dayCount = shortLeaveCount;
        label = `${branchHoliday.holiday.name} (Half Day Holiday — Short Leave)`;
      } else if (leaveType === 'half') {
        dayCount = 0.5;
        label = `${branchHoliday.holiday.name} (Half Day Holiday)`;
      } else {
        dayCount = 1;
        label = `${branchHoliday.holiday.name} (Half Day — Full day counted)`;
      }
    } else {
      if (leaveType === 'short' && isSingleDay) {
        dayCount = shortLeaveCount;
        label = 'Short Leave (0.5 day)';
      } else if (leaveType === 'half' && isSingleDay) {
        dayCount = 0.5;
        label = 'Half Day Leave';
      } else {
        dayCount = 1;
        label = 'Working Day';
      }
    }

    days += dayCount;
    breakdown.push({ date: ds, count: dayCount, label, isSandwich });
    cursor.setDate(cursor.getDate() + 1);
  }

  let sandwichWarning = null;
  if (leaveType === 'short' && isSingleDay) {
    const nextDay = addDays(startDateStr, 1);
    const dayAfter = addDays(startDateStr, 2);
    const nextIsFreeOrHalf = isSandwichCandidate(nextDay, USER_BRANCH);
    const dayAfterIsLeave = !isFreeDayForBranch(dayAfter, USER_BRANCH);
    if (nextIsFreeOrHalf && dayAfterIsLeave) {
      const bh = isHolidayForBranch(nextDay, USER_BRANCH);
      const name = bh ? bh.holiday.name : 'Weekly Off';
      const nextDate = new Date(nextDay).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
      sandwichWarning = {
        nextDay,
        name,
        message: `⚠️ Sandwich Alert: "${name}" on ${nextDate} falls between your short leave and the next working day. If you're also applying leave on ${new Date(
          dayAfter,
        ).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        })}, that holiday will be counted as leave too.`,
      };
    }
  }

  return { total: days, breakdown, sandwichWarning };
};

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

// ─── Main Component ──────────────────────────────────────────────────────────

const LeaveScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;
  const dispatch = useDispatch();
  const [leaveResponse, setLeaveResponse] = useState(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const year = 2026;
  const now = new Date();
  const todayDateStr = new Date().toISOString().split('T')[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Inside the component, add the getDayInfo function:
  const getDayInfoForCalendar = (day, dateStr) => {
    const dayOfWeek = new Date(year, currentMonth, day).getDay();
    const isSunday = dayOfWeek === 0;
    const isSecondSat = day === secondSat;
    const isFourthSat = day === fourthSat;
    const holiday = HOLIDAY_MAP[dateStr];
    const isPast = new Date(dateStr) < new Date(todayStr);

    const branchHoliday = holiday
      ? isHolidayForBranch(dateStr, USER_BRANCH)
      : null;
    const isHalf =
      branchHoliday &&
      (branchHoliday.type === 'half1' || branchHoliday.type === 'half2');
    const isFullHoliday = branchHoliday && branchHoliday.type === 'full';

    const isOff = isSunday || isSecondSat || isFourthSat;
    const inRange =
      startDate && endDate && dateStr >= startDate && dateStr <= endDate;
    const isStart = dateStr === startDate;
    const isEnd = dateStr === (endDate || startDate);
    const isSingleSelected = isStart && (!endDate || startDate === endDate);
    const isRangeMid = inRange && !isStart && !isEnd;
    const isRangeStart = isStart && startDate !== endDate && endDate;
    const isRangeEnd = isEnd && startDate !== endDate && endDate;

    let backgroundColor = 'transparent';
    let textColor = C.textPrimary;
    let fontFamily = Fonts.medium;
    let borderColor = 'transparent';
    let borderWidth = 0;
    let showDot = false;
    let dotColor = '';
    let showHalfIcon = false;
    let halfIconColor = '';
    let isHoliday = false;
    let holidayInfo = null;

    if (isPast) {
      textColor = C.disabled;
    }

    if (isOff && !holiday) {
      backgroundColor = C.error + '12';
      textColor = C.error;
      fontFamily = Fonts.bold;
      isHoliday = true;
    }

    if (isFullHoliday && branchHoliday) {
      backgroundColor = C.primary + '18';
      textColor = C.primary;
      fontFamily = Fonts.bold;
      showDot = true;
      dotColor = C.primary;
      isHoliday = true;
      holidayInfo = {
        name: holiday.name,
        type: 'full',
        color: C.primary,
        branches: Object.entries(holiday.branches).map(([b, t]) => ({
          name: b,
          color: t === 'full' ? C.primary : C.warning,
          isUser: b === USER_BRANCH,
        })),
      };
    }

    if (isHalf && branchHoliday) {
      backgroundColor = C.warning + '18';
      textColor = C.warning;
      fontFamily = Fonts.bold;
      showHalfIcon = true;
      halfIconColor = C.warning;
      isHoliday = true;
      holidayInfo = {
        name: holiday.name,
        type: branchHoliday.type,
        color: C.warning,
        branches: Object.entries(holiday.branches).map(([b, t]) => ({
          name: b,
          color: t === 'full' ? C.primary : C.warning,
          isUser: b === USER_BRANCH,
        })),
      };
    }

    if (isSingleSelected) {
      backgroundColor = C.primary;
      textColor = '#fff';
      borderColor = C.primary;
    }

    if (isRangeStart || isRangeEnd) {
      backgroundColor = C.primary;
      textColor = '#fff';
    }

    if (isRangeMid) {
      backgroundColor = C.primary + '28';
      textColor = C.primary;
    }

    return {
      backgroundColor,
      textColor,
      fontFamily,
      borderColor,
      borderWidth,
      showDot,
      dotColor,
      showHalfIcon,
      halfIconColor,
      isHoliday,
      holidayInfo,
      isWeeklyOff: isOff && !holiday,
      isSunday,
      isSecondSat,
      isFourthSat,
      holiday: holidayInfo,
      branches: holidayInfo?.branches || [],
      holidayColor: isFullHoliday ? C.primary : isHalf ? C.warning : null,
      holidayType: isFullHoliday ? 'full' : isHalf ? branchHoliday?.type : null,
    };
  };

  const { profile } = useSelector(state => state.employeeProfile);
  const userProfile = profile?.[0] || {};

  // ── Leave Balance ─────────────────────────────────────────────────────────
  const LEAVE_BALANCE = {
    total: {
      total: userProfile.totalLeaveRemaining || 0,
      used: userProfile.totalLeaveUsed || 0,
    },
    short: {
      totalPerMonth: 2, // Keep this as is - seems to be a monthly limit
      usedThisMonth: userProfile.totalShortLeaveUsed || 0,
    },
  };
  const totalRemaining = LEAVE_BALANCE.total.total;
  const shortRemaining =
    LEAVE_BALANCE.short.totalPerMonth - LEAVE_BALANCE.short.usedThisMonth;

  // Leave selection state
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectionMode, setSelectionMode] = useState('start');
  const [leaveType, setLeaveType] = useState('full');
  const [halfDayType, setHalfDayType] = useState('half1');
  const [shortHalfType, setShortHalfType] = useState('half1');
  const [leaveCalc, setLeaveCalc] = useState(null);

  // UI state
  const [legendExpanded, setLegendExpanded] = useState(false);
  const legendAnim = useRef(new Animated.Value(0)).current;
  const legendHeight = useRef(new Animated.Value(0)).current;

  // Day detail popup
  const [selectedDate, setSelectedDate] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  // Leave alert modal
  const [leaveAlertVisible, setLeaveAlertVisible] = useState(false);
  const [leaveAlertData, setLeaveAlertData] = useState(null);

  // Submit success modal
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const successScaleAnim = useRef(new Animated.Value(0)).current;

  // ── Time-based restrictions for today ────────────────────────────────────
  const isShortLeaveHalf1Blocked =
    startDate === todayDateStr && currentMinutes > 11 * 60 + 30;
  const isHalfDayHalf1Blocked =
    startDate === todayDateStr && currentMinutes > 12 * 60;
  const isAllLeaveBlocked =
    startDate === todayDateStr && currentMinutes >= 18 * 60 + 30;

  useEffect(() => {
    if (leaveType === 'half' && isHalfDayHalf1Blocked) {
      setHalfDayType('half2');
    }
  }, [leaveType, startDate]);

  useEffect(() => {
    fetchLeave();
  }, []);

  const fetchLeave = async () => {
    try {
      const result = await dispatch(fetchLeaves());
      console.log('Fetch leaves result: ', result);

      if (result?.success && result?.data) {
        setMyLeaves(result.data);
        console.log('✅ Leaves set successfully:', result.data.length);
      } else {
        console.log('❌ Failed to fetch leaves:', result?.error);
        setMyLeaves([]);
      }
    } catch (error) {
      console.log('❌ Error in fetchLeave:', error);
      setMyLeaves([]);
    }
  };
  const toggleLeaves = () => {
    const toValue = leavesExpanded ? 0 : 1;
    Animated.timing(leavesAnim, {
      toValue,
      duration: 280,
      useNativeDriver: false,
    }).start();
    setLeavesExpanded(v => !v);
  };

  const formatLeaveDate = dateStr => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getLeaveTypeDisplay = type => {
    switch (type) {
      case 'FULL_DAY':
        return { text: 'Full Day', color: C.primary };
      case 'FIRST_HALF':
        return { text: 'First Half', color: C.warning };
      case 'SECOND_HALF':
        return { text: 'Second Half', color: C.warning };
      case 'FIRST_HALF_SHORT_LEAVE':
        return { text: 'Short (1st Half)', color: C.info };
      case 'SECOND_HALF_SHORT_LEAVE':
        return { text: 'Short (2nd Half)', color: C.info };
      default:
        return { text: type || 'Full Day', color: C.textSecondary };
    }
  };

  const getStatusColor = status => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return C.warning;
      case 'APPROVED':
        return C.success;
      case 'REJECTED':
        return C.error;
      default:
        return C.textSecondary;
    }
  };

  useEffect(() => {
    if (leaveType === 'short' && isShortLeaveHalf1Blocked) {
      setShortHalfType('half2');
    }
  }, [leaveType, startDate]);

  const prevMonth = () => setCurrentMonth(m => Math.max(0, m - 1));
  const nextMonth = () => setCurrentMonth(m => Math.min(11, m + 1));

  const daysInMonth = getDaysInMonth(year, currentMonth);
  const firstDay = getFirstDayOfMonth(year, currentMonth);
  const secondSat = getNthSaturday(year, currentMonth, 2);
  const fourthSat = getNthSaturday(year, currentMonth, 4);

  const [myLeaves, setMyLeaves] = useState([]);
  const [leavesExpanded, setLeavesExpanded] = useState(false);
  const leavesAnim = useRef(new Animated.Value(0)).current;

  const monthHolidays = HOLIDAYS_2026.filter(h => {
    const d = new Date(h.date);
    return d.getMonth() === currentMonth;
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const toggleLegend = () => {
    const toValue = legendExpanded ? 0 : 1;
    Animated.parallel([
      Animated.timing(legendAnim, {
        toValue,
        duration: 280,
        useNativeDriver: false,
      }),
      Animated.timing(legendHeight, {
        toValue,
        duration: 280,
        useNativeDriver: false,
      }),
    ]).start();
    setLegendExpanded(v => !v);
  };

  useEffect(() => {
    if (startDate && endDate) {
      const result = calculateLeaveDays(
        startDate,
        endDate,
        leaveType,
        halfDayType,
      );
      setLeaveCalc(result);
    } else if (startDate && !endDate) {
      const result = calculateLeaveDays(
        startDate,
        startDate,
        leaveType,
        halfDayType,
      );
      setLeaveCalc(result);
    } else {
      setLeaveCalc(null);
    }
  }, [startDate, endDate, leaveType, halfDayType, shortHalfType]);

  const isMultiDay = !!(startDate && endDate && startDate !== endDate);

  useEffect(() => {
    if (isMultiDay && (leaveType === 'half' || leaveType === 'short')) {
      setLeaveType('full');
    }
  }, [isMultiDay]);

  const handleDayPress = day => {
    if (!day) return;
    const dateStr = toDateStr(year, currentMonth, day);
    const dateObj = new Date(dateStr);
    const todayOnly = new Date(todayStr);

    if (dateObj < todayOnly) {
      showHolidayInfo(day, dateStr);
      return;
    }

    if (
      selectionMode === 'end' &&
      dateStr === startDate &&
      leaveType !== 'half' &&
      leaveType !== 'short'
    ) {
      // Optionally show a message
      dispatch(setAlert('Please select a different date for end date', 'info'));
      return;
    }

    const branchHoliday = isHolidayForBranch(dateStr, USER_BRANCH);
    const off = isWeeklyOff(dateStr);

    if (branchHoliday && branchHoliday.type === 'full' && !off) {
      setLeaveAlertData({
        type: 'full_holiday',
        date: dateStr,
        holiday: branchHoliday.holiday,
        day,
      });
      setLeaveAlertVisible(true);
      return;
    }

    if (
      branchHoliday &&
      (branchHoliday.type === 'half1' || branchHoliday.type === 'half2')
    ) {
      setLeaveAlertData({
        type: 'half_holiday',
        date: dateStr,
        holiday: branchHoliday.holiday,
        halfType: branchHoliday.type,
        day,
        onProceed: () => proceedWithSelection(dateStr),
      });
      setLeaveAlertVisible(true);
      return;
    }

    if (off) {
      showHolidayInfo(day, dateStr);
      return;
    }

    proceedWithSelection(dateStr);
  };

  const proceedWithSelection = dateStr => {
    if (selectionMode === 'start') {
      setStartDate(dateStr);
      setEndDate(null);
      setSelectionMode('end');
      // Show notification to select end date
      // Alert.alert(
      //   'Select End Date',
      //   'Please select the end date for your leave.\n\nTap the same date for a single day leave.',
      //   [{ text: 'OK' }],
      // );
      // Scroll to end date field
      setTimeout(() => {
        scrollToSection(endDateRef);
      }, 300);
    } else {
      // For half day or short leave, end date should be same as start date
      if (leaveType === 'half' || leaveType === 'short') {
        setEndDate(startDate);
        setSelectionMode('start');
        // Alert.alert(
        //   'Date Selected',
        //   `${
        //     leaveType === 'half' ? 'Half Day' : 'Short Leave'
        //   } will be applied for a single day.`,
        //   [{ text: 'OK' }],
        // );
        // Scroll to leave type section
        setTimeout(() => {
          scrollToSection(leaveTypeRef);
        }, 300);
      } else {
        if (dateStr < startDate) {
          setEndDate(startDate);
          setStartDate(dateStr);
        } else {
          setEndDate(dateStr);
        }
        setSelectionMode('start');
        // Scroll to leave type section
        setTimeout(() => {
          scrollToSection(leaveTypeRef);
        }, 300);
      }
    }
  };

  const showHolidayInfo = (day, dateStr) => {
    const holiday = HOLIDAY_MAP[dateStr];
    const dayOfWeek = new Date(dateStr).getDay();
    const isSunday = dayOfWeek === 0;
    const d = new Date(year, currentMonth, day);
    const isSecondSat = day === secondSat;
    const isFourthSat = day === fourthSat;
    if (holiday || isSunday || isSecondSat || isFourthSat) {
      setSelectedDate({
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

  const clearSelection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStartDate(null);
    setEndDate(null);
    setSelectionMode('start');
    setLeaveCalc(null);
    setReason('');
    setReasonError('');
    setLeaveType('full');
  };

  const getDayInfo = day => {
    if (!day) return null;
    const dateStr = toDateStr(year, currentMonth, day);
    const dayOfWeek = new Date(year, currentMonth, day).getDay();
    const isSunday = dayOfWeek === 0;
    const isSecondSat = day === secondSat;
    const isFourthSat = day === fourthSat;
    const holiday = HOLIDAY_MAP[dateStr];
    const todayDate = new Date();
    const isToday =
      todayDate.getFullYear() === year &&
      todayDate.getMonth() === currentMonth &&
      todayDate.getDate() === day;
    const isPast = new Date(dateStr) < new Date(todayStr);

    // FIX: Properly determine if date is in range
    let inRange = false;
    let isStart = false;
    let isEnd = false;

    if (startDate && endDate) {
      // Both dates selected - proper range
      inRange = dateStr >= startDate && dateStr <= endDate;
      isStart = dateStr === startDate;
      isEnd = dateStr === endDate;
    } else if (startDate && !endDate) {
      // Only start date selected
      inRange = dateStr === startDate;
      isStart = dateStr === startDate;
      isEnd = false;
    }

    return {
      isSunday,
      isSecondSat,
      isFourthSat,
      holiday,
      isToday,
      isPast,
      inRange,
      isStart,
      isEnd,
      dateStr,
    };
  };

  const formatDate = dateStr => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShort = dateStr => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const validateLeaveTime = () => {
    if (!startDate) return true;
    if (startDate !== todayDateStr) return true;

    if (isAllLeaveBlocked) {
      // Alert.alert(
      //   'Leave Not Allowed',
      //   t?.leave?.blockedAfter630 ||
      //     'Leave cannot be applied for today after 6:30 PM',
      // );
      dispatch(
        setAlert(
          t?.leave?.blockedAfter630 ||
            'Leave cannot be applied for today after 6:30 PM',
          'warning',
        ),
      );
      return false;
    }

    if (leaveType === 'short' && shortHalfType === 'half1') {
      if (currentMinutes > 11 * 60 + 30) {
        // Alert.alert(
        //   'Short Leave Not Allowed',
        //   'First Half short leave can only be applied before 11:30 AM.',
        // );
        dispatch(
          setAlert(
            'First Half short leave can only be applied before 11:30 AM',
            'warning',
          ),
        );
        return false;
      }
    }

    if (leaveType === 'half' && halfDayType === 'half1') {
      if (currentMinutes > 12 * 60) {
        // Alert.alert(
        //   'Half Day Leave Not Allowed',
        //   'First Half half-day leave must be applied before 12:00 PM.',
        // );
        dispatch(
          setAlert(
            'First Half half-day leave must be applied before 12:00 PM.',
            'warning',
          ),
        );
        return false;
      }
    }

    return true;
  };

  // Refs for scrolling
  const scrollViewRef = useRef(null);
  const endDateRef = useRef(null);
  const leaveTypeRef = useRef(null);
  const reasonRef = useRef(null);

  const scrollToSection = ref => {
    if (ref?.current) {
      setTimeout(() => {
        ref.current?.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
          },
          () => {},
        );
      }, 100);
    }
  };

  const getLeaveTypePayload = () => {
    if (leaveType === 'full') return 'FULL_DAY';
    if (leaveType === 'half') {
      return halfDayType === 'half1' ? 'FIRST_HALF' : 'SECOND_HALF';
    }
    if (leaveType === 'short') {
      return shortHalfType === 'half1'
        ? 'FIRST_HALF_SHORT_LEAVE'
        : 'SECOND_HALF_SHORT_LEAVE';
    }
    return 'FULL_DAY';
  };

  const handleLeaveTypeSelect = type => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLeaveType(type);

    // For half day or short leave, set end date to start date if not set
    if ((type === 'half' || type === 'short') && startDate && !endDate) {
      setEndDate(startDate);
    }

    // Scroll to reason section after selection
    setTimeout(() => {
      scrollToSection(reasonRef);
    }, 300);
  };

  const handleApplyLeave = async () => {
    if (!startDate || !leaveCalc) return;
    if (!validateLeaveTime()) return;

    if (!reason.trim()) {
      setReasonError(t?.leave?.reasonRequired || 'Reason is required');
      setTimeout(() => {
        scrollToSection(reasonRef);
      }, 100);
      return;
    }

    const payload = {
      leaveType: getLeaveTypePayload(),
      startDate: startDate,
      endDate: endDate || startDate,
      reason: reason.trim(),
      totalDays: leaveCalc.total,
    };

    try {
      setIsSubmitting(true);

      const result = await dispatch(applyLeave(payload));

      if (result?.success) {
        setLeaveResponse(result.data);
        setSuccessModalVisible(true);
        successScaleAnim.setValue(0);
        Animated.spring(successScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 7,
        }).start();
        setReason('');
        // Refresh leaves after applying
        await fetchLeave();
      } else {
        // Alert.alert(
        //   'Leave Application Failed',
        //   result?.error || 'Something went wrong',
        // );
        dispatch(setAlert(result?.error || 'Something went wrong', 'warning'));
      }
    } catch (err) {
      // Alert.alert('Error', 'Unable to submit leave');
      dispatch(setAlert('Unable to submit leave', 'warning'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />

      {/* ── Header ── */}
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
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
            {t?.leave?.title || 'Leave Calendar'}
          </Text>
          <View
            style={[styles.branchBadge, { backgroundColor: C.primary + '20' }]}
          >
            <MapPin size={wp('2.5%')} color={C.primary} />
            <Text style={[styles.branchBadgeText, { color: C.primary }]}>
              {USER_BRANCH} {t?.leave?.yourBranchLabel || 'Your Branch'}
            </Text>
          </View>
        </View>
        {/* <View
          style={[styles.headerIcon, { backgroundColor: C.primary + '20' }]}
        >
         
        </View> */}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Month Navigator ── */}
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
            <ChevronLeft
              size={wp('5%')}
              color={currentMonth === 0 ? C.disabled : C.textPrimary}
            />
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
            <ChevronRight
              size={wp('5%')}
              color={currentMonth === 11 ? C.disabled : C.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statChip,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
          >
            <View style={[styles.statDot, { backgroundColor: C.primary }]} />
            <Text style={[styles.statChipText, { color: C.textSecondary }]}>
              {monthHolidays.length} Holiday
              {monthHolidays.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View
            style={[
              styles.statChip,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
          >
            <View style={[styles.statDot, { backgroundColor: C.error }]} />
            <Text style={[styles.statChipText, { color: C.textSecondary }]}>
              Sun + 2nd/4th Sat Off
            </Text>
          </View>
        </View>

        {/* ── Calendar Card ── */}
        <View
          style={[
            styles.calCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
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

          <View style={styles.grid}>
            {cells.map((day, idx) => {
              const info = getDayInfo(day);
              if (!day) return <View key={idx} style={styles.dayCell} />;

              const isOff =
                info.isSunday || info.isSecondSat || info.isFourthSat;
              const hasHoliday = !!info.holiday;
              const branchHoliday = isHolidayForBranch(
                info.dateStr,
                USER_BRANCH,
              );
              const domType = hasHoliday
                ? getDomType(info.holiday.branches)
                : null;
              const isHalf = domType === 'half1' || domType === 'half2';

              const isRangeStart =
                info.isStart && startDate !== endDate && endDate;
              const isRangeEnd = info.isEnd && startDate !== endDate && endDate;
              const isRangeMid = info.inRange && !info.isStart && !info.isEnd;
              const isSingleSelected =
                info.isStart && (!endDate || startDate === endDate);

              let cellBg = 'transparent';
              let numColor = C.textPrimary;
              let fontFam = Fonts.medium;
              let borderColor = 'transparent';
              let borderW = 1;

              if (info.isPast) {
                numColor = C.disabled;
              }
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
              if (info.isToday) {
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
                  <Text
                    style={[
                      styles.dayNum,
                      { color: numColor, fontFamily: fontFam },
                    ]}
                  >
                    {day}
                  </Text>
                  {hasHoliday &&
                    !isSingleSelected &&
                    !isRangeStart &&
                    !isRangeEnd && (
                      <View
                        style={[
                          styles.holidayDot,
                          {
                            backgroundColor: isOff
                              ? C.error
                              : isHalf
                              ? C.warning
                              : C.primary,
                          },
                        ]}
                      />
                    )}
                  {isHalf &&
                    !isOff &&
                    !isSingleSelected &&
                    !isRangeStart &&
                    !isRangeEnd &&
                    branchHoliday && (
                      <Text style={[styles.halfText, { color: C.warning }]}>
                        ½
                      </Text>
                    )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Leave Selector Panel ── */}
        <View
          style={[
            styles.leavePanel,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          {/* ── Leave Balance Strip ── */}
          <View style={styles.balanceStripWrap}>
            <Text
              style={[styles.balanceStripTitle, { color: C.textSecondary }]}
            >
              {t?.leave?.leaveBalance || 'LEAVE BALANCE'}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.balanceStrip}
            >
              {/* Total Leave */}
              <View
                style={[
                  styles.balanceCard,
                  {
                    backgroundColor: C.background,
                    borderColor: C.primary + '40',
                  },
                ]}
              >
                <View
                  style={[
                    styles.balanceCardTop,
                    { backgroundColor: C.primary + '15' },
                  ]}
                >
                  <Text
                    style={[styles.balanceCardRemaining, { color: C.primary }]}
                  >
                    {totalRemaining}
                  </Text>
                  <Text
                    style={[
                      styles.balanceCardTotal,
                      { color: C.primary + '80' },
                    ]}
                  >
                    / {LEAVE_BALANCE.total.total}
                  </Text>
                </View>
                <Text
                  style={[styles.balanceCardLabel, { color: C.textSecondary }]}
                >
                  {t?.leave?.total || 'Total'}
                </Text>
                <View
                  style={[styles.balanceBar, { backgroundColor: C.border }]}
                >
                  <View
                    style={[
                      styles.balanceBarFill,
                      {
                        width: `${
                          (totalRemaining / LEAVE_BALANCE.total.total) * 100
                        }%`,
                        backgroundColor:
                          totalRemaining <= 2
                            ? C.error
                            : totalRemaining <= 5
                            ? C.warning
                            : C.primary,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.balanceUsedText, { color: C.textSecondary }]}
                >
                  {LEAVE_BALANCE.total.used} {t?.leave?.usedLabel || 'used'}
                </Text>
              </View>

              {/* Sick Leave */}
              {/* <View
                style={[
                  styles.balanceCard,
                  { backgroundColor: C.background, borderColor: C.info + '50' },
                ]}
              >
                <View
                  style={[
                    styles.balanceCardTop,
                    { backgroundColor: C.info + '18' },
                  ]}
                >
                  <Text
                    style={[styles.balanceCardRemaining, { color: C.info }]}
                  >
                    {sickRemaining}
                  </Text>
                  <Text
                    style={[styles.balanceCardTotal, { color: C.info + '90' }]}
                  >
                    / {LEAVE_BALANCE.sick.total}
                  </Text>
                </View>
                <Text
                  style={[styles.balanceCardLabel, { color: C.textSecondary }]}
                >
                  {t?.leave?.sick || 'Sick'}
                </Text>
                <View
                  style={[styles.balanceBar, { backgroundColor: C.border }]}
                >
                  <View
                    style={[
                      styles.balanceBarFill,
                      {
                        width: `${
                          (sickRemaining / LEAVE_BALANCE.sick.total) * 100
                        }%`,
                        backgroundColor:
                          sickRemaining <= 2
                            ? C.error
                            : sickRemaining <= 5
                            ? C.warning
                            : C.info,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.balanceUsedText, { color: C.textSecondary }]}
                >
                  {LEAVE_BALANCE.sick.used} {t?.leave?.usedLabel || 'used'}
                </Text>
              </View> */}

              {/* Earned Leave */}
              {/* <View
                style={[
                  styles.balanceCard,
                  {
                    backgroundColor: C.background,
                    borderColor: C.success + '40',
                  },
                ]}
              >
                <View
                  style={[
                    styles.balanceCardTop,
                    { backgroundColor: C.success + '12' },
                  ]}
                >
                  <Text
                    style={[styles.balanceCardRemaining, { color: C.success }]}
                  >
                    {earnedRemaining}
                  </Text>
                  <Text
                    style={[
                      styles.balanceCardTotal,
                      { color: C.success + '80' },
                    ]}
                  >
                    / {LEAVE_BALANCE.earned.total}
                  </Text>
                </View>
                <Text
                  style={[styles.balanceCardLabel, { color: C.textSecondary }]}
                >
                  {t?.leave?.earned || 'Earned'}
                </Text>
                <View
                  style={[styles.balanceBar, { backgroundColor: C.border }]}
                >
                  <View
                    style={[
                      styles.balanceBarFill,
                      {
                        width: `${
                          (earnedRemaining / LEAVE_BALANCE.earned.total) * 100
                        }%`,
                        backgroundColor:
                          earnedRemaining <= 2
                            ? C.error
                            : earnedRemaining <= 5
                            ? C.warning
                            : C.success,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.balanceUsedText, { color: C.textSecondary }]}
                >
                  {LEAVE_BALANCE.earned.used} {t?.leave?.usedLabel || 'used'}
                </Text>
              </View> */}

              {/* Short Leave — monthly */}
              <View
                style={[
                  styles.balanceCard,
                  // styles.balanceCardShort,
                  {
                    backgroundColor: C.background,
                    borderColor: C.warning + '40',
                  },
                ]}
              >
                <View
                  style={[
                    styles.balanceCardTop,
                    { backgroundColor: C.warning + '12' },
                  ]}
                >
                  <Text
                    style={[styles.balanceCardRemaining, { color: C.warning }]}
                  >
                    {shortRemaining}
                  </Text>
                  <Text
                    style={[
                      styles.balanceCardTotal,
                      { color: C.warning + '80' },
                    ]}
                  >
                    / {LEAVE_BALANCE.short.totalPerMonth}
                  </Text>
                </View>
                <Text
                  style={[styles.balanceCardLabel, { color: C.textSecondary }]}
                >
                  {t?.leave?.shortLeaveLabel || 'Short'}
                </Text>
                <View
                  style={[styles.balanceBar, { backgroundColor: C.border }]}
                >
                  <View
                    style={[
                      styles.balanceBarFill,
                      {
                        width: `${
                          (shortRemaining / LEAVE_BALANCE.short.totalPerMonth) *
                          100
                        }%`,
                        backgroundColor:
                          shortRemaining === 0 ? C.error : C.warning,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.balanceUsedText, { color: C.textSecondary }]}
                >
                  {t?.leave?.thisMonthLabel || 'This month'}
                </Text>
              </View>
            </ScrollView>
          </View>

          {/* Divider */}
          <View
            style={[styles.panelSectionDivider, { backgroundColor: C.border }]}
          />

          {/* Panel header */}
          <View style={styles.leavePanelHeader}>
            <View
              style={[
                styles.leavePanelIconWrap,
                { backgroundColor: C.primary + '18' },
              ]}
            >
              <Briefcase size={wp('4%')} color={C.primary} />
            </View>
            <Text style={[styles.leavePanelTitle, { color: C.textPrimary }]}>
              {t?.leave?.applyLeaveTitle || 'Apply Leave'}
            </Text>
            {(startDate || endDate) && (
              <TouchableOpacity
                onPress={clearSelection}
                style={[styles.clearBtn, { borderColor: C.border }]}
              >
                <X size={wp('3.5%')} color={C.textSecondary} />
                <Text style={[styles.clearBtnText, { color: C.textSecondary }]}>
                  {t?.leave?.clearBtn || 'Clear'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Instruction */}
          {/* <View
            style={[
              styles.instructionBanner,
              {
                backgroundColor:
                  selectionMode === 'start'
                    ? C.primary + '12'
                    : C.success + '12',
                borderColor:
                  selectionMode === 'start'
                    ? C.primary + '40'
                    : C.success + '40',
              },
            ]}
          >
            <View
              style={[
                styles.instructionDot,
                {
                  backgroundColor:
                    selectionMode === 'start' ? C.primary : C.success,
                },
              ]}
            />
            <Text
              style={[
                styles.instructionText,
                { color: selectionMode === 'start' ? C.primary : C.success },
              ]}
            >
              {selectionMode === 'start'
                ? t?.leave?.tapStartDate ||
                  '📅 Tap a date on calendar to set Start Date'
                : t?.leave?.tapEndDate ||
                  '📅 Tap another date to set End Date (or same date for single day)'}
            </Text>
          </View> */}

          {/* Date row */}
          <View style={styles.datePickerRow}>
            <TouchableOpacity
              style={[
                styles.datePickerBox,
                {
                  backgroundColor: C.background,
                  borderColor: selectionMode === 'start' ? C.primary : C.border,
                  borderWidth: selectionMode === 'start' ? 1.5 : 1,
                },
              ]}
              onPress={() => setSelectionMode('start')}
            >
              <View style={styles.datePickerTop}>
                <Calendar
                  size={wp('3.5%')}
                  color={
                    selectionMode === 'start' ? C.primary : C.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.datePickerLabel,
                    {
                      color:
                        selectionMode === 'start' ? C.primary : C.textSecondary,
                    },
                  ]}
                >
                  {t?.leave?.fromLabel || 'From'}
                </Text>
              </View>
              <Text
                style={[
                  styles.datePickerValue,
                  { color: startDate ? C.textPrimary : C.disabled },
                ]}
              >
                {startDate
                  ? formatShort(startDate)
                  : t?.leave?.selectDate || 'Select Date'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.dateArrow, { backgroundColor: C.border }]}>
              <ChevronRight size={wp('4%')} color={C.textSecondary} />
            </View>

            <TouchableOpacity
              style={[
                styles.datePickerBox,
                {
                  backgroundColor: C.background,
                  borderColor:
                    selectionMode === 'end' && startDate ? C.success : C.border,
                  borderWidth: selectionMode === 'end' && startDate ? 1.5 : 1,
                  opacity: !startDate ? 0.5 : 1,
                },
              ]}
              onPress={() => startDate && setSelectionMode('end')}
            >
              <View style={styles.datePickerTop}>
                <Calendar
                  size={wp('3.5%')}
                  color={
                    selectionMode === 'end' && startDate
                      ? C.success
                      : C.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.datePickerLabel,
                    {
                      color:
                        selectionMode === 'end' && startDate
                          ? C.success
                          : C.textSecondary,
                    },
                  ]}
                >
                  {t?.leave?.toLabel || 'To'}
                </Text>
              </View>
              <Text
                style={[
                  styles.datePickerValue,
                  { color: endDate ? C.textPrimary : C.disabled },
                ]}
              >
                {endDate
                  ? formatShort(endDate)
                  : t?.leave?.selectDate || 'Select Date'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Leave type toggle */}
          <View style={styles.leaveTypeRow}>
            <Text style={[styles.leaveTypeLabel, { color: C.textSecondary }]}>
              {t?.leave?.leaveTypeLabel || 'Leave Type:'}
            </Text>
            <View
              style={[
                styles.leaveTypeToggle,
                { backgroundColor: C.background, borderColor: C.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.leaveTypeOption,
                  leaveType === 'full' && { backgroundColor: C.primary },
                ]}
                onPress={() => setLeaveType('full')}
              >
                <Text
                  style={[
                    styles.leaveTypeText,
                    {
                      color:
                        leaveType === 'full' ? C.textDark : C.textSecondary,
                    },
                  ]}
                >
                  {t?.leave?.fullDay || 'Full Day'}
                </Text>
              </TouchableOpacity>

              {/* Half Day */}
              <TouchableOpacity
                style={[
                  styles.leaveTypeOption,
                  leaveType === 'half' && { backgroundColor: C.warning },
                  isMultiDay && { opacity: 0.35 },
                ]}
                onPress={() => !isMultiDay && setLeaveType('half')}
                disabled={isMultiDay}
              >
                <Text
                  style={[
                    styles.leaveTypeText,
                    { color: leaveType === 'half' ? '#fff' : C.textSecondary },
                  ]}
                >
                  {t?.leave?.halfDayLabel || 'Half Day'}
                </Text>
                {isMultiDay && (
                  <Text
                    style={[styles.leaveTypeDisabledTag, { color: C.disabled }]}
                  >
                    {t?.leave?.multiDisabledTag || 'Multi'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Short */}
              <TouchableOpacity
                style={[
                  styles.leaveTypeOption,
                  leaveType === 'short' && { backgroundColor: C.info },
                  isMultiDay && { opacity: 0.35 },
                ]}
                onPress={() => !isMultiDay && setLeaveType('short')}
                disabled={isMultiDay}
              >
                <Text
                  style={[
                    styles.leaveTypeText,
                    { color: leaveType === 'short' ? '#fff' : C.textSecondary },
                  ]}
                >
                  {t?.leave?.shortLabel || 'Short'}
                </Text>
                {isMultiDay && (
                  <Text
                    style={[styles.leaveTypeDisabledTag, { color: C.disabled }]}
                  >
                    {t?.leave?.oneDayTag || '1-day'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Multi-day restriction hint */}
          {isMultiDay && (
            <View
              style={[
                styles.multiDayHint,
                {
                  backgroundColor: C.primary + '10',
                  borderColor: C.primary + '25',
                },
              ]}
            >
              <Info size={wp('3%')} color={C.primary} />
              <Text style={[styles.multiDayHintText, { color: C.primary }]}>
                {t?.leave?.multiDayHint ||
                  'Half Day & Short Leave are only available for single-day selection'}
              </Text>
            </View>
          )}

          {/* Half day sub-selector */}
          {leaveType === 'half' && (
            <View
              style={[
                styles.halfDaySection,
                {
                  borderColor: C.warning + '40',
                  backgroundColor: C.warning + '08',
                },
              ]}
            >
              <Text
                style={[styles.halfDaySectionLabel, { color: C.textSecondary }]}
              >
                {t?.leave?.whichHalfOff || 'Which half are you taking off?'}
              </Text>
              <View style={styles.halfDayOptions}>
                {/* First Half */}
                <TouchableOpacity
                  style={[
                    styles.halfDayOption,
                    {
                      borderColor:
                        halfDayType === 'half1' ? C.warning : C.border,
                      backgroundColor: C.background,
                    },
                    halfDayType === 'half1' && {
                      backgroundColor: C.warning + '15',
                      borderWidth: 1.5,
                    },
                    isHalfDayHalf1Blocked && { opacity: 0.4 },
                  ]}
                  onPress={() => {
                    if (isHalfDayHalf1Blocked) {
                      // Alert.alert(
                      //   'Not Allowed',
                      //   'First Half leave must be applied before 12:00 PM.',
                      // );
                      dispatch(
                        setAlert(
                          'First Half leave must be applied before 12:00 PM.',
                          'warning',
                        ),
                      );

                      return;
                    }
                    setHalfDayType('half1');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.halfDayOptionTop}>
                    <View
                      style={[
                        styles.halfDayRadio,
                        {
                          borderColor:
                            halfDayType === 'half1' ? C.warning : C.border,
                        },
                      ]}
                    >
                      {halfDayType === 'half1' && (
                        <View
                          style={[
                            styles.halfDayRadioInner,
                            { backgroundColor: C.warning },
                          ]}
                        />
                      )}
                    </View>
                    <Sunrise
                      size={wp('4%')}
                      color={
                        halfDayType === 'half1' ? C.warning : C.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.halfDayOptionTitle,
                        {
                          color:
                            halfDayType === 'half1' ? C.warning : C.textPrimary,
                        },
                      ]}
                    >
                      {t?.leave?.firstHalf || 'First Half'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.halfDayLeaveTime,
                      { color: C.warning + 'BB' },
                    ]}
                  >
                    {t?.leave?.halfLeaveTime1 || '🚫 Leave: 9:30 AM – 12:00 PM'}
                  </Text>
                  {isHalfDayHalf1Blocked ? (
                    <View
                      style={[
                        styles.halfDayWorkBanner,
                        {
                          backgroundColor: C.error + '18',
                          borderColor: C.error + '30',
                        },
                      ]}
                    >
                      <Info size={wp('3%')} color={C.error} />
                      <Text
                        style={[styles.halfDayWorkTime, { color: C.error }]}
                      >
                        {t?.leave?.notAfter12 || 'Not available after 12:00 PM'}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.halfDayWorkBanner,
                        {
                          backgroundColor: C.success + '18',
                          borderColor: C.success + '30',
                        },
                      ]}
                    >
                      <Clock size={wp('3%')} color={C.success} />
                      <Text
                        style={[styles.halfDayWorkTime, { color: C.success }]}
                      >
                        {t?.leave?.halfWorkTime1 ||
                          'Working: 12:00 PM – 6:30 PM'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Second Half */}
                <TouchableOpacity
                  style={[
                    styles.halfDayOption,
                    {
                      borderColor:
                        halfDayType === 'half2' ? C.warning : C.border,
                      backgroundColor: C.background,
                    },
                    halfDayType === 'half2' && {
                      backgroundColor: C.warning + '15',
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => setHalfDayType('half2')}
                  activeOpacity={0.7}
                >
                  <View style={styles.halfDayOptionTop}>
                    <View
                      style={[
                        styles.halfDayRadio,
                        {
                          borderColor:
                            halfDayType === 'half2' ? C.warning : C.border,
                        },
                      ]}
                    >
                      {halfDayType === 'half2' && (
                        <View
                          style={[
                            styles.halfDayRadioInner,
                            { backgroundColor: C.warning },
                          ]}
                        />
                      )}
                    </View>
                    <Sunset
                      size={wp('4%')}
                      color={
                        halfDayType === 'half2' ? C.warning : C.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.halfDayOptionTitle,
                        {
                          color:
                            halfDayType === 'half2' ? C.warning : C.textPrimary,
                        },
                      ]}
                    >
                      {t?.leave?.secondHalf || 'Second Half'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.halfDayLeaveTime,
                      { color: C.warning + 'BB' },
                    ]}
                  >
                    {t?.leave?.halfLeaveTime2 || '🚫 Leave: 2:00 PM – 6:30 PM'}
                  </Text>
                  <View
                    style={[
                      styles.halfDayWorkBanner,
                      {
                        backgroundColor: C.success + '18',
                        borderColor: C.success + '30',
                      },
                    ]}
                  >
                    <Clock size={wp('3%')} color={C.success} />
                    <Text
                      style={[styles.halfDayWorkTime, { color: C.success }]}
                    >
                      {t?.leave?.halfWorkTime2 || 'Working: 9:30 AM – 2:00 PM'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Short leave sub-selector */}
          {leaveType === 'short' && (
            <View
              style={[
                styles.halfDaySection,
                { borderColor: C.info + '40', backgroundColor: C.info + '06' },
              ]}
            >
              <Text
                style={[styles.halfDaySectionLabel, { color: C.textSecondary }]}
              >
                {t?.leave?.whichPartDay ||
                  'Which part of the day are you leaving early / arriving late?'}
              </Text>
              <View style={styles.halfDayOptions}>
                {/* First Half */}
                <TouchableOpacity
                  style={[
                    styles.halfDayOption,
                    {
                      borderColor:
                        shortHalfType === 'half1' ? C.info : C.border,
                      backgroundColor: C.background,
                    },
                    shortHalfType === 'half1' && {
                      backgroundColor: C.info + '12',
                      borderWidth: 1.5,
                    },
                    isShortLeaveHalf1Blocked && { opacity: 0.4 },
                  ]}
                  onPress={() => {
                    if (isShortLeaveHalf1Blocked) {
                      // Alert.alert(
                      //   'Not Allowed',
                      //   'First Half short leave must be applied before 11:30 AM.',
                      // );
                      dispatch(
                        setAlert(
                          'First Half short leave must be applied before 11:30 AM.',
                          'warning',
                        ),
                      );

                      return;
                    }
                    setShortHalfType('half1');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.halfDayOptionTop}>
                    <View
                      style={[
                        styles.halfDayRadio,
                        {
                          borderColor:
                            shortHalfType === 'half1' ? C.info : C.border,
                        },
                      ]}
                    >
                      {shortHalfType === 'half1' && (
                        <View
                          style={[
                            styles.halfDayRadioInner,
                            { backgroundColor: C.info },
                          ]}
                        />
                      )}
                    </View>
                    <Sunrise
                      size={wp('4%')}
                      color={
                        shortHalfType === 'half1' ? C.info : C.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.halfDayOptionTitle,
                        {
                          color:
                            shortHalfType === 'half1' ? C.info : C.textPrimary,
                        },
                      ]}
                    >
                      {t?.leave?.firstHalf || 'First Half'}
                    </Text>
                  </View>
                  <Text
                    style={[styles.halfDayLeaveTime, { color: C.info + 'BB' }]}
                  >
                    {t?.leave?.shortLateArrival ||
                      '🚫 Late arrival: till ~11:30 AM'}
                  </Text>
                  {isShortLeaveHalf1Blocked ? (
                    <View
                      style={[
                        styles.halfDayWorkBanner,
                        {
                          backgroundColor: C.error + '18',
                          borderColor: C.error + '30',
                        },
                      ]}
                    >
                      <Info size={wp('3%')} color={C.error} />
                      <Text
                        style={[styles.halfDayWorkTime, { color: C.error }]}
                      >
                        {t?.leave?.notAfter1130 ||
                          'Not available after 11:30 AM'}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.halfDayWorkBanner,
                        {
                          backgroundColor: C.success + '18',
                          borderColor: C.success + '30',
                        },
                      ]}
                    >
                      <Clock size={wp('3%')} color={C.success} />
                      <Text
                        style={[styles.halfDayWorkTime, { color: C.success }]}
                      >
                        {t?.leave?.shortWorkTime1 ||
                          'Working: 11:30 AM – 6:30 PM'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Second Half */}
                <TouchableOpacity
                  style={[
                    styles.halfDayOption,
                    {
                      borderColor:
                        shortHalfType === 'half2' ? C.info : C.border,
                      backgroundColor: C.background,
                    },
                    shortHalfType === 'half2' && {
                      backgroundColor: C.info + '12',
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => setShortHalfType('half2')}
                  activeOpacity={0.7}
                >
                  <View style={styles.halfDayOptionTop}>
                    <View
                      style={[
                        styles.halfDayRadio,
                        {
                          borderColor:
                            shortHalfType === 'half2' ? C.info : C.border,
                        },
                      ]}
                    >
                      {shortHalfType === 'half2' && (
                        <View
                          style={[
                            styles.halfDayRadioInner,
                            { backgroundColor: C.info },
                          ]}
                        />
                      )}
                    </View>
                    <Sunset
                      size={wp('4%')}
                      color={
                        shortHalfType === 'half2' ? C.info : C.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.halfDayOptionTitle,
                        {
                          color:
                            shortHalfType === 'half2' ? C.info : C.textPrimary,
                        },
                      ]}
                    >
                      {t?.leave?.secondHalf || 'Second Half'}
                    </Text>
                  </View>
                  <Text
                    style={[styles.halfDayLeaveTime, { color: C.info + 'BB' }]}
                  >
                    {t?.leave?.shortEarlyExit || '🚫 Early exit: from ~4:30 PM'}
                  </Text>
                  <View
                    style={[
                      styles.halfDayWorkBanner,
                      {
                        backgroundColor: C.success + '18',
                        borderColor: C.success + '30',
                      },
                    ]}
                  >
                    <Clock size={wp('3%')} color={C.success} />
                    <Text
                      style={[styles.halfDayWorkTime, { color: C.success }]}
                    >
                      {t?.leave?.shortWorkTime2 || 'Working: 9:30 AM – 4:30 PM'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Short leave deduction note */}
              <View
                style={[
                  styles.shortLeaveNote,
                  {
                    backgroundColor: C.info + '10',
                    borderColor: C.info + '30',
                  },
                ]}
              >
                <Info size={wp('3%')} color={C.info} />
                <Text style={[styles.shortLeaveNoteText, { color: C.info }]}>
                  {t?.leave?.shortLeaveNote ||
                    'Short leave counts as 0.5 day deduction. Only valid for single-day selection.'}
                </Text>
              </View>
            </View>
          )}

          {/* Leave calculation result */}
          {leaveCalc && startDate && (
            <View
              style={[
                styles.leaveResult,
                {
                  backgroundColor: C.primary + '10',
                  borderColor: C.primary + '30',
                },
              ]}
            >
              <View style={styles.leaveResultMain}>
                <View style={styles.leaveResultCountWrap}>
                  <Text style={[styles.leaveResultCount, { color: C.primary }]}>
                    {leaveCalc.total % 1 === 0
                      ? leaveCalc.total
                      : leaveCalc.total.toFixed(1)}
                  </Text>
                  <Text
                    style={[styles.leaveResultUnit, { color: C.textSecondary }]}
                  >
                    {leaveCalc.total <= 1
                      ? t?.leave?.dayLabel || 'Day'
                      : t?.leave?.daysLabel || 'Days'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.leaveResultDivider,
                    { backgroundColor: C.border },
                  ]}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.leaveResultTypeRow}>
                    <View
                      style={[
                        styles.leaveResultTypePill,
                        {
                          backgroundColor:
                            leaveType === 'full'
                              ? C.primary + '20'
                              : leaveType === 'half'
                              ? C.warning + '20'
                              : C.info + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.leaveResultTypeText,
                          {
                            color:
                              leaveType === 'full'
                                ? C.primary
                                : leaveType === 'half'
                                ? C.warning
                                : C.info,
                          },
                        ]}
                      >
                        {leaveType === 'full'
                          ? '☀️ Full Day'
                          : leaveType === 'half'
                          ? `🌓 ${
                              halfDayType === 'half1' ? 'First' : 'Second'
                            } Half`
                          : `⏱ Short (${
                              shortHalfType === 'half1' ? '1st' : '2nd'
                            } Half)`}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[styles.leaveResultRange, { color: C.textPrimary }]}
                  >
                    {formatDate(startDate)}
                  </Text>
                  {endDate && endDate !== startDate && (
                    <>
                      <Text
                        style={[
                          styles.leaveResultArrow,
                          { color: C.textSecondary },
                        ]}
                      >
                        ↓
                      </Text>
                      <Text
                        style={[
                          styles.leaveResultRange,
                          { color: C.textPrimary },
                        ]}
                      >
                        {formatDate(endDate)}
                      </Text>
                    </>
                  )}
                </View>
              </View>

              {/* Sandwich Warning */}
              {leaveCalc.sandwichWarning && (
                <View
                  style={[
                    styles.sandwichWarningRow,
                    {
                      borderTopColor: C.warning + '30',
                      backgroundColor: C.warning + '10',
                    },
                  ]}
                >
                  <AlertTriangle size={wp('3.5%')} color={C.warning} />
                  <Text
                    style={[styles.sandwichWarningText, { color: C.warning }]}
                  >
                    {leaveCalc.sandwichWarning.message}
                  </Text>
                </View>
              )}

              {/* Sandwich counted days */}
              {leaveCalc.breakdown.some(b => b.isSandwich) && (
                <View
                  style={[
                    styles.freeNoteRow,
                    {
                      borderTopColor: C.warning + '30',
                      backgroundColor: C.warning + '08',
                    },
                  ]}
                >
                  <AlertTriangle size={wp('3%')} color={C.warning} />
                  <Text style={[styles.freeNoteText, { color: C.warning }]}>
                    🥪 {leaveCalc.breakdown.filter(b => b.isSandwich).length}{' '}
                    {t?.leave?.sandwichCounted ||
                      'sandwich day(s) counted — holiday between leave days'}
                  </Text>
                </View>
              )}

              {/* Free days note */}
              {leaveCalc.breakdown.some(b => b.count === 0) && (
                <View
                  style={[
                    styles.freeNoteRow,
                    {
                      borderTopColor: C.success + '20',
                      backgroundColor: C.success + '08',
                    },
                  ]}
                >
                  <CheckCircle size={wp('3%')} color={C.success} />
                  <Text style={[styles.freeNoteText, { color: C.success }]}>
                    {leaveCalc.breakdown.filter(b => b.count === 0).length}{' '}
                    {t?.leave?.freeDaysNote ||
                      'day(s) are holidays/weekly off — not counted'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Leave Reason ── */}
          <View style={styles.reasonSection}>
            <Text style={[styles.reasonLabel, { color: C.textSecondary }]}>
              {t?.leave?.reasonForLeave || 'Reason for Leave *'}
            </Text>

            <TextInput
              style={[
                styles.reasonInput,
                {
                  borderColor: reasonError ? C.error : C.border,
                  backgroundColor: C.background,
                  color: C.textPrimary,
                },
              ]}
              onFocus={() => {
                setTimeout(() => {
                  scrollToSection(reasonRef);
                }, 100);
              }}
              placeholder={
                t?.leave?.reasonPlaceholder || 'Enter reason for leave...'
              }
              placeholderTextColor={C.disabled}
              value={reason}
              onChangeText={text => {
                setReason(text);
                if (reasonError) setReasonError('');
              }}
              multiline
              numberOfLines={3}
            />

            {reasonError ? (
              <Text style={[styles.reasonError, { color: C.error }]}>
                {reasonError}
              </Text>
            ) : null}
          </View>

          {/* Rule 3: After 6:30 PM — show banner warning for today */}
          {isAllLeaveBlocked && (
            <View
              style={[
                styles.multiDayHint,
                {
                  backgroundColor: C.error + '12',
                  borderColor: C.error + '30',
                },
              ]}
            >
              <Info size={wp('3%')} color={C.error} />
              <Text style={[styles.multiDayHintText, { color: C.error }]}>
                {t?.leave?.blockedAfter630 ||
                  'Leave cannot be applied for today after 6:30 PM'}
              </Text>
            </View>
          )}

          {/* ── Apply Leave Button ── */}
          <TouchableOpacity
            style={[
              styles.applyBtn,
              {
                backgroundColor:
                  !startDate || isSubmitting || isAllLeaveBlocked
                    ? C.border
                    : C.primary,
                opacity: !startDate || isAllLeaveBlocked ? 0.5 : 1,
              },
            ]}
            onPress={handleApplyLeave}
            disabled={!startDate || isSubmitting || isAllLeaveBlocked}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <View style={styles.applyBtnInner}>
                <Animated.View style={{ transform: [{ rotate: '0deg' }] }}>
                  <Clock size={wp('4.5%')} color={C.textDark} />
                </Animated.View>
                <Text style={[styles.applyBtnText, { color: C.textDark }]}>
                  {t?.leave?.submittingBtn || 'Submitting...'}
                </Text>
              </View>
            ) : (
              <View style={styles.applyBtnInner}>
                <Send
                  size={wp('4.5%')}
                  color={
                    startDate && !isAllLeaveBlocked
                      ? C.textDark
                      : C.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.applyBtnText,
                    {
                      color:
                        startDate && !isAllLeaveBlocked
                          ? C.textDark
                          : C.textSecondary,
                    },
                  ]}
                >
                  {`${t?.leave?.applyBtn || 'Apply Leave'}${
                    leaveCalc
                      ? ` · ${
                          leaveCalc.total % 1 === 0
                            ? leaveCalc.total
                            : leaveCalc.total.toFixed(1)
                        } ${
                          leaveCalc.total > 1
                            ? t?.leave?.daysLabel || 'Days'
                            : t?.leave?.dayLabel || 'Day'
                        }`
                      : ''
                  }`}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── My Leaves Section ── */}
        <View
          style={[
            styles.leavesCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <TouchableOpacity
            style={styles.leavesToggleBtn}
            onPress={toggleLeaves}
            activeOpacity={0.7}
          >
            <View style={styles.leavesToggleLeft}>
              <View
                style={[
                  styles.leavesToggleIcon,
                  { backgroundColor: C.info + '18' },
                ]}
              >
                <Briefcase size={wp('3.5%')} color={C.info} />
              </View>
              <Text
                style={[styles.leavesToggleTitle, { color: C.textPrimary }]}
              >
                My Leave Applications
              </Text>
              <View
                style={[
                  styles.leaveCountBadge,
                  { backgroundColor: C.info + '20' },
                ]}
              >
                <Text style={[styles.leaveCountText, { color: C.info }]}>
                  {myLeaves.length}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.legendChevronWrap,
                { backgroundColor: C.background, borderColor: C.border },
              ]}
            >
              {leavesExpanded ? (
                <ChevronUp size={wp('4%')} color={C.textSecondary} />
              ) : (
                <ChevronDown size={wp('4%')} color={C.textSecondary} />
              )}
            </View>
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.leavesContent,
              {
                maxHeight: leavesAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 500],
                }),
                opacity: leavesAnim,
                overflow: 'hidden',
              },
            ]}
          >
            <View
              style={[styles.legendDivider, { backgroundColor: C.border }]}
            />

            {myLeaves.length === 0 ? (
              <View style={styles.emptyLeaves}>
                <CalendarDays size={wp('8%')} color={C.disabled} />
                <Text
                  style={[styles.emptyLeavesText, { color: C.textSecondary }]}
                >
                  No leave applications found
                </Text>
              </View>
            ) : (
              myLeaves.map((leave, index) => {
                const leaveTypeInfo = getLeaveTypeDisplay(leave.leaveType);
                const startDateFormatted = formatLeaveDate(leave.startDate);
                const endDateFormatted = formatLeaveDate(leave.endDate);
                const isMultiDay = startDateFormatted !== endDateFormatted;

                return (
                  <View
                    key={leave._id || index}
                    style={[
                      styles.leaveItem,
                      {
                        borderBottomColor: C.border,
                        backgroundColor:
                          index % 2 === 0 ? C.background : 'transparent',
                      },
                    ]}
                  >
                    <View style={styles.leaveItemHeader}>
                      <View style={styles.leaveDates}>
                        <Calendar size={wp('3%')} color={C.primary} />
                        <Text
                          style={[
                            styles.leaveDateText,
                            { color: C.textPrimary },
                          ]}
                        >
                          {startDateFormatted}
                          {isMultiDay && ` → ${endDateFormatted}`}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              getStatusColor(leave.status) + '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(leave.status) },
                          ]}
                        >
                          {leave.status || 'PENDING'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.leaveItemDetails}>
                      <View
                        style={[
                          styles.leaveTypeBadge,
                          { backgroundColor: leaveTypeInfo.color + '15' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.leaveTypeBadgeText,
                            { color: leaveTypeInfo.color },
                          ]}
                        >
                          {leaveTypeInfo.text}
                        </Text>
                      </View>
                      <Text
                        style={[styles.leaveReason, { color: C.textSecondary }]}
                        numberOfLines={2}
                      >
                        {leave.reason}
                      </Text>
                    </View>

                    {leave.totalDays && (
                      <View style={styles.leaveDaysBadge}>
                        <Clock size={wp('2.5%')} color={C.success} />
                        <Text
                          style={[styles.leaveDaysText, { color: C.success }]}
                        >
                          {leave.totalDays}{' '}
                          {leave.totalDays > 1 ? 'days' : 'day'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </Animated.View>
        </View>

        {/* ── Legend (Collapsible) ── */}
        <View
          style={[
            styles.legendCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <TouchableOpacity
            style={styles.legendToggleBtn}
            onPress={toggleLegend}
            activeOpacity={0.7}
          >
            <View style={styles.legendToggleLeft}>
              <View
                style={[
                  styles.legendToggleIcon,
                  { backgroundColor: C.primary + '18' },
                ]}
              >
                <Info size={wp('3.5%')} color={C.primary} />
              </View>
              <Text
                style={[styles.legendToggleTitle, { color: C.textPrimary }]}
              >
                Calendar Legend
              </Text>
            </View>
            <View
              style={[
                styles.legendChevronWrap,
                { backgroundColor: C.background, borderColor: C.border },
              ]}
            >
              {legendExpanded ? (
                <ChevronUp size={wp('4%')} color={C.textSecondary} />
              ) : (
                <ChevronDown size={wp('4%')} color={C.textSecondary} />
              )}
            </View>
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.legendContent,
              {
                maxHeight: legendAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 300],
                }),
                opacity: legendAnim,
                overflow: 'hidden',
              },
            ]}
          >
            <View
              style={[styles.legendDivider, { backgroundColor: C.border }]}
            />
            <View style={styles.legendGrid}>
              {[
                {
                  bg: C.error + '30',
                  border: C.error + '60',
                  num: '7',
                  numColor: C.error,
                  label: 'Sunday Off',
                },
                {
                  bg: C.error + '20',
                  border: C.error + '40',
                  num: 'Sat',
                  numColor: C.error,
                  label: '2nd & 4th Saturday',
                },
                {
                  bg: C.primary + '25',
                  border: C.primary + '60',
                  num: '15',
                  numColor: C.primary,
                  label: 'Full Day Holiday',
                },
                {
                  bg: C.warning + '25',
                  border: C.warning + '60',
                  num: '28',
                  numColor: C.warning,
                  half: true,
                  label: 'Half Day Holiday',
                },
                {
                  bg: C.success + '15',
                  border: C.success + '80',
                  num: '3',
                  numColor: C.success,
                  label: "Today's Date",
                },
                {
                  bg: C.primary,
                  border: C.primary,
                  num: '·',
                  numColor: '#fff',
                  label: 'Selected Leave Date',
                },
                {
                  bg: C.primary + '28',
                  border: C.primary + '40',
                  num: '·',
                  numColor: C.primary,
                  label: 'Leave Range',
                },
              ].map((item, i) => (
                <View key={i} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendBox,
                      { backgroundColor: item.bg, borderColor: item.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.legendBoxNum,
                        {
                          color: item.numColor,
                          fontSize: item.num === 'Sat' ? wp('2%') : wp('3%'),
                        },
                      ]}
                    >
                      {item.num}
                    </Text>
                    {item.half && (
                      <Text
                        style={[styles.halfLegend, { color: item.numColor }]}
                      >
                        ½
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.legendText, { color: C.textSecondary }]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* ── Holiday List this month ── */}
        {monthHolidays.length > 0 && (
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
              const isForUserBranch = !!h.branches[USER_BRANCH];

              return (
                <View
                  key={i}
                  style={[
                    styles.holidayListItem,
                    {
                      backgroundColor: C.surface,
                      borderColor: isForUserBranch
                        ? isHalf
                          ? C.warning + '60'
                          : C.primary + '60'
                        : C.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.holidayDateBox,
                      {
                        backgroundColor:
                          domType === 'full'
                            ? C.primary + '20'
                            : C.warning + '20',
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

                  <View style={styles.holidayListInfo}>
                    <View style={styles.holidayNameRow}>
                      <Text
                        style={[
                          styles.holidayListName,
                          { color: C.textPrimary },
                        ]}
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
                            style={[
                              styles.yourBranchText,
                              { color: C.success },
                            ]}
                          >
                            {t?.leave?.yourBranchLabel || 'Your Branch'}
                          </Text>
                        </View>
                      )}
                    </View>

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
                            style={[
                              styles.branchPillText,
                              { color: C.success },
                            ]}
                          >
                            All Branches
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.branchPillsWrap}>
                          {branchEntries.map(([branch, type], bi) => {
                            const isHalfB =
                              type === 'half1' || type === 'half2';
                            const color = isHalfB ? C.warning : C.primary;
                            const isUser = branch === USER_BRANCH;
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
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Half day note ── */}
        <View
          style={[
            styles.noteCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <Info size={wp('3.5%')} color={C.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.noteText, { color: C.textSecondary }]}>
              <Text style={{ color: C.warning, fontFamily: Fonts.medium }}>
                ½ First Half
              </Text>{' '}
              — Office from 12:00 Noon to 6:30 PM{'\n'}
              <Text style={{ color: C.warning, fontFamily: Fonts.medium }}>
                ½ Second Half
              </Text>{' '}
              — Office from 9:30 AM to 2:00 PM
            </Text>
          </View>
        </View>

        <View style={{ height: hp('4%') }} />
      </ScrollView>

      {/* ── Day Detail Popup ── */}
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
          <View
            style={[
              styles.popupCard,
              { backgroundColor: C.surfaceSolid, borderColor: C.border },
            ]}
          >
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
                style={[
                  styles.popupClose,
                  { backgroundColor: C.background, borderColor: C.border },
                ]}
              >
                <X size={wp('4%')} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {(selectedDate?.isSunday ||
              selectedDate?.isSecondSat ||
              selectedDate?.isFourthSat) && (
              <View
                style={[
                  styles.popupHolidayRow,
                  { backgroundColor: C.error + '15' },
                ]}
              >
                <CalendarDays size={wp('5%')} color={C.error} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.popupHolidayName, { color: C.textPrimary }]}
                  >
                    {selectedDate.isSunday
                      ? 'Sunday'
                      : selectedDate.isSecondSat
                      ? '2nd Saturday'
                      : '4th Saturday'}
                  </Text>
                  <Text style={[styles.popupHolidayType, { color: C.error }]}>
                    Weekly Off
                  </Text>
                </View>
              </View>
            )}

            {selectedDate?.holiday &&
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
                        styles.popupHolidayRow,
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
                          style={[
                            styles.popupHolidayName,
                            { color: C.textPrimary },
                          ]}
                        >
                          {h.name}
                        </Text>
                        <Text
                          style={[
                            styles.popupHolidayType,
                            {
                              color: domType === 'full' ? C.success : C.warning,
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
                    <View style={styles.popupBranchWrap}>
                      <Building2 size={wp('3%')} color={C.textSecondary} />
                      <Text
                        style={[
                          styles.popupBranchLabel,
                          { color: C.textSecondary },
                        ]}
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
                            style={[
                              styles.branchPillText,
                              { color: C.success },
                            ]}
                          >
                            All
                          </Text>
                        </View>
                      ) : (
                        branchEntries.map(([branch, type], bi) => {
                          const isHalfB = type === 'half1' || type === 'half2';
                          const bc = isHalfB ? C.warning : C.primary;
                          const isUser = branch === USER_BRANCH;
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

      {/* ── Leave Alert Modal ── */}
      <Modal
        visible={leaveAlertVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLeaveAlertVisible(false)}
      >
        <View style={[styles.popupOverlay, { backgroundColor: C.overlayBg }]}>
          <View
            style={[
              styles.alertCard,
              { backgroundColor: C.surfaceSolid, borderColor: C.border },
            ]}
          >
            {leaveAlertData?.type === 'full_holiday' && (
              <>
                <View
                  style={[
                    styles.alertIconWrap,
                    { backgroundColor: C.primary + '18' },
                  ]}
                >
                  <CalendarDays size={wp('8%')} color={C.primary} />
                </View>
                <Text style={[styles.alertTitle, { color: C.textPrimary }]}>
                  {t?.leave?.itsHoliday || "It's a Holiday! 🎉"}
                </Text>
                <Text
                  style={[styles.alertSubtitle, { color: C.textSecondary }]}
                >
                  <Text style={{ color: C.primary, fontFamily: Fonts.bold }}>
                    {leaveAlertData?.holiday?.name}
                  </Text>{' '}
                  {t?.leave?.holidayFor || 'is a full day holiday for'}{' '}
                  {USER_BRANCH} {t?.leave?.branchWord || 'branch.'}
                  {'\n\n'}
                  {t?.leave?.noLeaveNeeded ||
                    'No need to apply leave — office is already closed!'}
                </Text>
                <TouchableOpacity
                  style={[styles.alertBtn, { backgroundColor: C.primary }]}
                  onPress={() => setLeaveAlertVisible(false)}
                >
                  <Text style={styles.alertBtnText}>
                    {t?.leave?.gotIt || 'Got it!'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {leaveAlertData?.type === 'half_holiday' && (
              <>
                <View
                  style={[
                    styles.alertIconWrap,
                    { backgroundColor: C.warning + '18' },
                  ]}
                >
                  {leaveAlertData?.halfType === 'half1' ? (
                    <Sunrise size={wp('8%')} color={C.warning} />
                  ) : (
                    <Sunset size={wp('8%')} color={C.warning} />
                  )}
                </View>
                <Text style={[styles.alertTitle, { color: C.textPrimary }]}>
                  {t?.leave?.halfDayHolidayTitle || 'Half Day Holiday ⚠️'}
                </Text>
                <Text
                  style={[styles.alertSubtitle, { color: C.textSecondary }]}
                >
                  <Text style={{ color: C.warning, fontFamily: Fonts.bold }}>
                    {leaveAlertData?.holiday?.name}
                  </Text>{' '}
                  is a{' '}
                  {leaveAlertData?.halfType === 'half1'
                    ? t?.leave?.firstHalf || 'First Half'
                    : t?.leave?.secondHalf || 'Second Half'}{' '}
                  holiday for {USER_BRANCH} branch.{'\n\n'}
                  {leaveType === 'half'
                    ? '• Half Day leave = Full day counted\n  (holiday + your leave = full working day absence)'
                    : '• Full Day leave will be counted for this date even though half day is a holiday.'}
                </Text>
                <View style={styles.alertBtnRow}>
                  <TouchableOpacity
                    style={[styles.alertBtnOutline, { borderColor: C.border }]}
                    onPress={() => setLeaveAlertVisible(false)}
                  >
                    <Text
                      style={[
                        styles.alertBtnOutlineText,
                        { color: C.textSecondary },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.alertBtn,
                      { backgroundColor: C.warning, flex: 1 },
                    ]}
                    onPress={() => {
                      setLeaveAlertVisible(false);
                      leaveAlertData?.onProceed?.();
                    }}
                  >
                    <Text style={styles.alertBtnText}>
                      {t?.leave?.proceedAnyway || 'Proceed Anyway'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Leave Submitted Success Modal ── */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={[styles.popupOverlay, { backgroundColor: C.overlayBg }]}>
          <Animated.View
            style={[
              styles.successCard,
              {
                backgroundColor: C.surfaceSolid,
                borderColor: C.success + '50',
                transform: [{ scale: successScaleAnim }],
              },
            ]}
          >
            <View
              style={[styles.successTopBar, { backgroundColor: C.success }]}
            />

            <View
              style={[
                styles.successIconWrap,
                {
                  backgroundColor: C.success + '18',
                  borderColor: C.success + '40',
                },
              ]}
            >
              <CheckCircle size={wp('12%')} color={C.success} />
            </View>

            <Text style={[styles.successTitle, { color: C.textPrimary }]}>
              {t?.leave?.leaveApplied || 'Leave Applied! 🎉'}
            </Text>
            <Text style={[styles.successSubtitle, { color: C.textSecondary }]}>
              {t?.leave?.leaveSuccessMsg ||
                'Your leave request has been submitted successfully and is pending approval.'}
            </Text>

            {/* Summary pill row */}
            <View style={styles.successSummaryRow}>
              <View
                style={[
                  styles.successSummaryPill,
                  {
                    backgroundColor: C.primary + '18',
                    borderColor: C.primary + '40',
                  },
                ]}
              >
                <CalendarDays size={wp('3.5%')} color={C.primary} />
                <Text style={[styles.successSummaryText, { color: C.primary }]}>
                  {formatDate(startDate)}
                  {endDate && endDate !== startDate
                    ? `  →  ${formatDate(endDate)}`
                    : ''}
                </Text>
              </View>
              {leaveCalc && (
                <View
                  style={[
                    styles.successSummaryPill,
                    {
                      backgroundColor: C.success + '15',
                      borderColor: C.success + '35',
                    },
                  ]}
                >
                  <CheckCircle size={wp('3.5%')} color={C.success} />
                  <Text
                    style={[styles.successSummaryText, { color: C.success }]}
                  >
                    {leaveCalc.total % 1 === 0
                      ? leaveCalc.total
                      : leaveCalc.total.toFixed(1)}{' '}
                    {leaveCalc.total > 1
                      ? t?.leave?.daysLabel || 'Days'
                      : t?.leave?.dayLabel || 'Day'}{' '}
                    ·{' '}
                    {leaveType === 'full'
                      ? t?.leave?.fullDay || 'Full Day'
                      : leaveType === 'half'
                      ? t?.leave?.halfDayLabel || 'Half Day'
                      : t?.leave?.shortLabel || 'Short Leave'}
                  </Text>
                </View>
              )}
            </View>

            {/* Leave Status from API */}
            {leaveResponse?.status && (
              <View
                style={[
                  styles.leaveStatusBadge,
                  {
                    backgroundColor:
                      leaveResponse.status === 'PENDING'
                        ? C.warning + '20'
                        : C.success + '20',
                    borderColor:
                      leaveResponse.status === 'PENDING'
                        ? C.warning
                        : C.success,
                  },
                ]}
              >
                <Clock
                  size={wp('3.5%')}
                  color={
                    leaveResponse.status === 'PENDING' ? C.warning : C.success
                  }
                />
                <Text
                  style={[
                    styles.leaveStatusText,
                    {
                      color:
                        leaveResponse.status === 'PENDING'
                          ? C.warning
                          : C.success,
                    },
                  ]}
                >
                  {leaveResponse.status}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.successBtn, { backgroundColor: C.success }]}
              onPress={() => {
                setSuccessModalVisible(false);
                clearSelection();
                try {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Home');
                  }
                } catch (error) {
                  console.log('Navigation error:', error);
                  // Fallback: reset navigation stack
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Home' }],
                  });
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.successBtnText, { color: '#fff' }]}>
                {t?.leave?.goToHome || 'Go to Home'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSuccessModalVisible(false);
                clearSelection();
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.successLinkText, { color: C.textSecondary }]}
              >
                {t?.leave?.applyAnother || 'Apply another leave'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: hp('3%') },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    paddingTop: Platform.OS === 'ios' ? hp('6%') : hp('5%'),
    paddingBottom: hp('1%'),
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: wp('4.5%'), fontFamily: Fonts.bold },
  branchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: wp('2.5%'),
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 3,
  },
  branchBadgeText: { fontSize: wp('2.6%'), fontFamily: Fonts.medium },
  headerIcon: {
    width: wp('9%'),
    height: wp('9%'),
    borderRadius: wp('2.5%'),
    justifyContent: 'center',
    alignItems: 'center',
  },

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

  leavePanel: {
    marginHorizontal: wp('4%'),
    marginTop: hp('2%'),
    borderRadius: wp('4%'),
    borderWidth: 1,
    padding: wp('4%'),
    gap: hp('1.5%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  leavePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
  },
  leavePanelIconWrap: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  leavePanelTitle: { fontSize: wp('4%'), fontFamily: Fonts.bold, flex: 1 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: wp('2.5%'),
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  clearBtnText: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },

  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
  },
  instructionDot: { width: 7, height: 7, borderRadius: 4 },
  instructionText: { fontSize: wp('2.8%'), fontFamily: Fonts.medium, flex: 1 },

  datePickerRow: { flexDirection: 'row', alignItems: 'center', gap: wp('2%') },
  datePickerBox: {
    flex: 1,
    borderRadius: wp('3%'),
    borderWidth: 1,
    padding: wp('3%'),
    gap: 4,
  },
  datePickerTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  datePickerLabel: { fontSize: wp('2.6%'), fontFamily: Fonts.medium },
  datePickerValue: { fontSize: wp('3.4%'), fontFamily: Fonts.bold },
  dateArrow: {
    width: wp('7%'),
    height: wp('7%'),
    borderRadius: wp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
  },

  leaveTypeRow: { flexDirection: 'row', alignItems: 'center', gap: wp('3%') },
  leaveTypeLabel: { fontSize: wp('3%'), fontFamily: Fonts.medium },
  leaveTypeToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
  },

  // Add to styles object
  leavesCard: {
    marginHorizontal: wp('4%'),
    marginTop: hp('2%'),
    borderRadius: wp('4%'),
    borderWidth: 1,
    overflow: 'hidden',
  },
  leavesToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp('4%'),
  },
  leavesToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2.5%'),
  },
  leavesToggleIcon: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  leavesToggleTitle: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.bold,
  },
  leaveCountBadge: {
    paddingHorizontal: wp('2%'),
    paddingVertical: 2,
    borderRadius: 20,
    marginLeft: wp('1%'),
  },
  leaveCountText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.bold,
  },
  leavesContent: {
    paddingHorizontal: wp('4%'),
    paddingBottom: wp('4%'),
  },
  emptyLeaves: {
    alignItems: 'center',
    paddingVertical: hp('3%'),
    gap: hp('1%'),
  },
  emptyLeavesText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
  },
  leaveItem: {
    padding: hp('1.5%'),
    borderBottomWidth: 1,
    gap: hp('0.8%'),
    borderRadius: 12,
  },
  leaveItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaveDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
  },
  leaveDateText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  statusBadge: {
    paddingHorizontal: wp('2.5%'),
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.bold,
  },
  leaveItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    flexWrap: 'wrap',
  },
  leaveTypeBadge: {
    paddingHorizontal: wp('2%'),
    paddingVertical: 3,
    borderRadius: 20,
  },
  leaveTypeBadgeText: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.medium,
  },
  leaveReason: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
    flex: 1,
  },
  leaveDaysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: wp('2%'),
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
  },
  leaveDaysText: {
    fontSize: wp('2.2%'),
    fontFamily: Fonts.medium,
  },
  leaveTypeOption: {
    flex: 1,
    paddingVertical: hp('0.8%'),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  leaveTypeText: { fontSize: wp('3%'), fontFamily: Fonts.medium },
  leaveTypeDisabledTag: {
    fontSize: wp('2%'),
    fontFamily: Fonts.medium,
    marginTop: 1,
  },
  multiDayHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.8%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
  },
  multiDayHintText: { fontSize: wp('2.6%'), fontFamily: Fonts.medium, flex: 1 },

  leaveResult: {
    borderRadius: wp('3%'),
    borderWidth: 1,
    overflow: 'hidden',
  },
  leaveResultMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('3%'),
    padding: wp('3.5%'),
  },
  leaveResultCount: {
    fontSize: wp('8%'),
    fontFamily: Fonts.bold,
    lineHeight: wp('8%'),
  },
  leaveResultUnit: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  leaveResultDivider: { width: 1, height: hp('6%'), backgroundColor: '#0002' },
  leaveResultRange: { fontSize: wp('3%'), fontFamily: Fonts.medium },
  leaveResultArrow: { fontSize: wp('2.8%'), fontFamily: Fonts.regular },
  freeNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: wp('3.5%'),
    paddingVertical: hp('1%'),
    borderTopWidth: 1,
  },
  freeNoteText: { fontSize: wp('2.8%'), fontFamily: Fonts.medium, flex: 1 },

  legendCard: {
    marginHorizontal: wp('4%'),
    marginTop: hp('2%'),
    borderRadius: wp('4%'),
    borderWidth: 1,
    overflow: 'hidden',
  },
  legendToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp('4%'),
  },
  legendToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2.5%'),
  },
  legendToggleIcon: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendToggleTitle: { fontSize: wp('3.5%'), fontFamily: Fonts.bold },
  legendChevronWrap: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('2.5%'),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  legendContent: { paddingHorizontal: wp('4%'), paddingBottom: wp('4%') },
  legendDivider: { height: 1, marginBottom: wp('3%') },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: wp('2%') },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    width: '47%',
  },
  legendBox: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  legendBoxNum: { fontFamily: Fonts.bold },
  halfLegend: {
    position: 'absolute',
    top: 0,
    right: 1,
    fontSize: wp('2%'),
    fontFamily: Fonts.bold,
  },
  legendText: { fontSize: wp('2.8%'), fontFamily: Fonts.regular, flex: 1 },

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

  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: wp('4%'),
    marginTop: hp('1.5%'),
    padding: wp('4%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    gap: wp('2.5%'),
  },
  noteText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
    lineHeight: hp('2.5%'),
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

  alertCard: {
    borderRadius: wp('5%'),
    padding: wp('6%'),
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    gap: hp('1.5%'),
  },
  alertIconWrap: {
    width: wp('16%'),
    height: wp('16%'),
    borderRadius: wp('4%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('0.5%'),
  },
  alertTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  alertSubtitle: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: hp('2.6%'),
  },
  alertBtn: {
    width: '100%',
    paddingVertical: hp('1.6%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
    marginTop: hp('0.5%'),
  },
  alertBtnText: { fontSize: wp('3.5%'), fontFamily: Fonts.bold, color: '#fff' },
  alertBtnRow: {
    flexDirection: 'row',
    gap: wp('3%'),
    width: '100%',
    marginTop: hp('0.5%'),
  },
  alertBtnOutline: {
    flex: 1,
    paddingVertical: hp('1.6%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
    borderWidth: 1,
  },
  alertBtnOutlineText: { fontSize: wp('3.5%'), fontFamily: Fonts.medium },

  balanceStripWrap: { gap: hp('1%') },
  balanceStripTitle: {
    fontSize: wp('2.4%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.8,
    paddingHorizontal: wp('0.5%'),
  },
  balanceStrip: {
    flexDirection: 'row',
    gap: wp('2.5%'),
    paddingHorizontal: wp('0.5%'),
    paddingBottom: 2,
  },
  balanceCard: {
    width: wp('22%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    padding: wp('2.5%'),
    gap: hp('0.4%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  balanceCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    paddingHorizontal: wp('1.5%'),
    paddingVertical: hp('0.5%'),
    borderRadius: wp('2%'),
  },
  balanceCardRemaining: {
    fontSize: wp('5.5%'),
    fontFamily: Fonts.bold,
    lineHeight: wp('6%'),
  },
  balanceCardTotal: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
    paddingBottom: wp('0.5%'),
  },
  balanceCardLabel: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  balanceBar: { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  balanceBarFill: { height: '100%', borderRadius: 2 },
  balanceUsedText: {
    fontSize: wp('2.2%'),
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  panelSectionDivider: { height: 1, marginVertical: hp('0.5%') },

  halfDaySection: {
    borderRadius: wp('3%'),
    borderWidth: 1,
    padding: wp('3%'),
    gap: hp('1.2%'),
  },
  halfDaySectionLabel: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    marginBottom: 2,
  },
  halfDayOptions: { flexDirection: 'row', gap: wp('2.5%') },
  halfDayOption: {
    flex: 1,
    borderRadius: wp('3%'),
    borderWidth: 1,
    padding: wp('3%'),
    gap: hp('0.8%'),
  },
  halfDayOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1.5%'),
  },
  halfDayRadio: {
    width: wp('4%'),
    height: wp('4%'),
    borderRadius: wp('2%'),
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  halfDayRadioInner: {
    width: wp('2%'),
    height: wp('2%'),
    borderRadius: wp('1%'),
  },
  halfDayOptionTitle: {
    fontSize: wp('3%'),
    fontFamily: Fonts.bold,
    flex: 1,
  },
  halfDayLeaveTime: {
    fontSize: wp('2.4%'),
    fontFamily: Fonts.regular,
  },
  halfDayWorkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('0.6%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
  },
  halfDayWorkTime: {
    fontSize: wp('2.4%'),
    fontFamily: Fonts.medium,
    flex: 1,
  },

  shortLeaveNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.8%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
  },
  shortLeaveNoteText: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.regular,
    flex: 1,
    lineHeight: hp('2.2%'),
  },

  sandwichWarningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: wp('3.5%'),
    paddingVertical: hp('1.2%'),
    borderTopWidth: 1,
  },
  sandwichWarningText: {
    fontSize: wp('2.7%'),
    fontFamily: Fonts.medium,
    flex: 1,
    lineHeight: hp('2.2%'),
  },

  applyBtn: {
    borderRadius: wp('3.5%'),
    paddingVertical: hp('1.8%'),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp('0.5%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  applyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2.5%'),
  },
  applyBtnText: {
    fontSize: wp('4%'),
    fontFamily: Fonts.bold,
    letterSpacing: 0.2,
  },

  leaveResultCountWrap: { alignItems: 'center' },
  leaveResultTypeRow: { marginBottom: 4 },
  leaveResultTypePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: wp('2.5%'),
    paddingVertical: 3,
    borderRadius: 20,
  },
  leaveResultTypeText: { fontSize: wp('2.6%'), fontFamily: Fonts.bold },

  successCard: {
    borderRadius: wp('5%'),
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
    overflow: 'hidden',
    paddingBottom: hp('3%'),
    gap: hp('1.5%'),
  },
  successTopBar: {
    width: '100%',
    height: hp('0.6%'),
    marginBottom: hp('1%'),
  },
  successIconWrap: {
    width: wp('22%'),
    height: wp('22%'),
    borderRadius: wp('11%'),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: hp('1%'),
  },
  successTitle: {
    fontSize: wp('5.5%'),
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: hp('2.5%'),
    paddingHorizontal: wp('6%'),
  },
  successSummaryRow: {
    width: '100%',
    paddingHorizontal: wp('5%'),
    gap: hp('0.8%'),
    alignItems: 'center',
  },
  successSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    paddingHorizontal: wp('3.5%'),
    paddingVertical: hp('0.8%'),
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  successSummaryText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
    flexShrink: 1,
  },
  successBtn: {
    marginTop: hp('1%'),
    marginHorizontal: wp('5%'),
    width: wp('76%'),
    paddingVertical: hp('1.7%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
  },
  successBtnText: { fontSize: wp('3.8%'), fontFamily: Fonts.bold },
  successLinkText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
    textDecorationLine: 'underline',
    marginTop: hp('0.5%'),
  },

  reasonSection: {
    gap: hp('0.8%'),
    marginTop: hp('0.5%'),
  },
  reasonLabel: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: wp('3%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1.2%'),
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    minHeight: hp('8%'),
    textAlignVertical: 'top',
  },
  reasonError: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
  },

  leaveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('0.8%'),
    borderRadius: 20,
    borderWidth: 1,
    marginTop: hp('1%'),
  },
  leaveStatusText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
});

export default LeaveScreen;

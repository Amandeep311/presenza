// src/screens/home/reports/ReportsScreen.jsx - WITH PREVIEW & REGULARIZATION
import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  Image,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
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
  Briefcase,
  User,
  Navigation,
  FileText,
  LogIn,
  LogOut,
  Send,
  Clock as ClockIcon,
  Shield,
  Check,
} from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Fonts } from '../../../utils/GlobalText';
import { getAttendanceHistory } from '../../../store/actions/attendanceActions';
import { formatMinutesToHours } from '../../../utils/utils';
import apiService from '../../../services/apiService';

const arrowIcon = require('../../../assets/arrow_right.png');

// ── Visit Type Icons ──
const getVisitTypeIcon = (type, color, size) => {
  const props = { size: size || wp('3.5%'), color: color || '#666' };
  switch (type) {
    case 'CLIENT_VISIT':
      return <User {...props} />;
    case 'SITE_VISIT':
      return <Navigation {...props} />;
    case 'DELIVERY':
      return <MapPin {...props} />;
    case 'INSPECTION':
      return <FileText {...props} />;
    default:
      return <Briefcase {...props} />;
  }
};

const getVisitTypeLabel = (type) => {
  switch (type) {
    case 'CLIENT_VISIT': return 'Client Visit';
    case 'SITE_VISIT': return 'Site Visit';
    case 'DELIVERY': return 'Delivery';
    case 'INSPECTION': return 'Inspection';
    default: return type || 'Visit';
  }
};

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
  return `${h}h ${m}h`;
};

const formatMinutes = minutes => {
  if (!minutes && minutes !== 0) return '---';
  if (minutes >= 60) return formatMinutesToHours(minutes);
  return `${minutes} min`;
};

// ── Attendance Calculation Engine ──────────────────────────────────
// Office Timings
const OFFICE_START = 9 * 60 + 30; // 09:30 AM in minutes
const OFFICE_END = 18 * 60 + 30; // 06:30 PM in minutes
const GRACE_END = 9 * 60 + 46; // 09:46 AM
const MORNING_SHORT_LEAVE_END = 11 * 60 + 30; // 11:30 AM
const SECOND_HALF_START = 14 * 60 + 0; // 02:00 PM
const SECOND_HALF_GRACE_END = 14 * 60 + 16; // 02:16 PM
const EVENING_SHORT_LEAVE_START = 16 * 60 + 30; // 04:30 PM
const FULL_DAY_HOURS = 9 * 60; // 9 hours (09:30 to 18:30)
const HALF_DAY_HOURS = 4 * 60 + 30; // 4.5 hours (09:30 to 14:00 or 14:00 to 18:30)
const SHORT_LEAVE_HOURS = 2 * 60; // 2 hours (09:30 to 11:30 or 16:30 to 18:30)

const convertToMinutes = (timeStr, ampm) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  
  let hour24 = hours;
  if (ampm === 'PM' && hours !== 12) {
    hour24 = hours + 12;
  } else if (ampm === 'AM' && hours === 12) {
    hour24 = 0;
  }
  return hour24 * 60 + minutes;
};

const calculateAttendance = (punchIn, punchInAmPm, punchOut, punchOutAmPm) => {
  const inMinutes = convertToMinutes(punchIn, punchInAmPm);
  const outMinutes = convertToMinutes(punchOut, punchOutAmPm);
  
  if (inMinutes === null || outMinutes === null || outMinutes <= inMinutes) {
    return null;
  }

  const workingMinutes = outMinutes - inMinutes;
  let coreStatus = '';
  let finalStatus = '';
  let halfDayType = '';
  let deduction = 'None';
  let lateMinutes = 0;
  let statusDetails = '';

  // Check if punch in is within office hours
  const isWithinOfficeHours = inMinutes >= OFFICE_START && outMinutes <= OFFICE_END;
  const isPartialDay = outMinutes < OFFICE_END;

  // Determine if it's a morning or evening shift
  const isMorningShift = inMinutes >= OFFICE_START && outMinutes <= SECOND_HALF_START;
  const isEveningShift = inMinutes >= SECOND_HALF_START && outMinutes <= OFFICE_END;

  // Check for early departure
  const earlyDeparture = outMinutes < OFFICE_END;

  // Calculate based on total working hours
  if (workingMinutes >= FULL_DAY_HOURS - 15) { // Full day (at least 8.75 hours)
    coreStatus = 'PRESENT';
    finalStatus = 'PRESENT (Full Day)';
    statusDetails = 'Full Day (9:30 AM - 6:30 PM)';
    if (inMinutes > OFFICE_START && inMinutes <= GRACE_END) {
      lateMinutes = 0;
      finalStatus = 'PRESENT (Grace)';
    } else if (inMinutes > GRACE_END) {
      lateMinutes = inMinutes - OFFICE_START;
      finalStatus = `PRESENT (Late by ${formatMinutes(lateMinutes)})`;
    }
    if (earlyDeparture && outMinutes < OFFICE_END - 15) {
      const earlyMins = OFFICE_END - outMinutes;
      deduction = `Early Logout: ${formatMinutes(earlyMins)}`;
    }
  } 
  else if (workingMinutes >= HALF_DAY_HOURS - 15 && workingMinutes < FULL_DAY_HOURS - 15) {
    // Half day logic
    if (isMorningShift && inMinutes >= OFFICE_START && outMinutes <= SECOND_HALF_START) {
      coreStatus = 'HALF_DAY';
      finalStatus = 'HALF_DAY (First Half)';
      halfDayType = 'MORNING';
      statusDetails = 'First Half (9:30 AM - 2:00 PM)';
      if (inMinutes > OFFICE_START && inMinutes <= GRACE_END) {
        lateMinutes = 0;
        finalStatus = 'HALF_DAY (First Half - Grace)';
      } else if (inMinutes > GRACE_END) {
        lateMinutes = inMinutes - OFFICE_START;
        finalStatus = `HALF_DAY (First Half - Late by ${formatMinutes(lateMinutes)})`;
      }
    } else if (isEveningShift && inMinutes >= SECOND_HALF_START && outMinutes <= OFFICE_END) {
      coreStatus = 'HALF_DAY';
      finalStatus = 'HALF_DAY (Second Half)';
      halfDayType = 'EVENING';
      statusDetails = 'Second Half (2:00 PM - 6:30 PM)';
      if (inMinutes > SECOND_HALF_START && inMinutes <= SECOND_HALF_GRACE_END) {
        lateMinutes = 0;
        finalStatus = 'HALF_DAY (Second Half - Grace)';
      } else if (inMinutes > SECOND_HALF_GRACE_END) {
        lateMinutes = inMinutes - SECOND_HALF_START;
        finalStatus = `HALF_DAY (Second Half - Late by ${formatMinutes(lateMinutes)})`;
      }
    } else {
      // Fallback: determine half day based on time
      if (inMinutes < SECOND_HALF_START && outMinutes > SECOND_HALF_START) {
        coreStatus = 'HALF_DAY';
        finalStatus = 'HALF_DAY (First Half)';
        halfDayType = 'MORNING';
        statusDetails = 'First Half (9:30 AM - 2:00 PM)';
      } else {
        coreStatus = 'HALF_DAY';
        finalStatus = 'HALF_DAY (Second Half)';
        halfDayType = 'EVENING';
        statusDetails = 'Second Half (2:00 PM - 6:30 PM)';
      }
    }
  } 
  else if (workingMinutes >= SHORT_LEAVE_HOURS - 15 && workingMinutes < HALF_DAY_HOURS - 15) {
    // Short leave logic
    if (inMinutes >= OFFICE_START && outMinutes <= MORNING_SHORT_LEAVE_END) {
      coreStatus = 'SHORT_LEAVE';
      finalStatus = 'SHORT_LEAVE (Morning)';
      statusDetails = 'Morning Short Leave (9:30 AM - 11:30 AM)';
      if (inMinutes > OFFICE_START && inMinutes <= GRACE_END) {
        lateMinutes = 0;
        finalStatus = 'SHORT_LEAVE (Morning - Grace)';
      } else if (inMinutes > GRACE_END) {
        lateMinutes = inMinutes - OFFICE_START;
        finalStatus = `SHORT_LEAVE (Morning - Late by ${formatMinutes(lateMinutes)})`;
      }
    } else if (inMinutes >= EVENING_SHORT_LEAVE_START && outMinutes <= OFFICE_END) {
      coreStatus = 'SHORT_LEAVE';
      finalStatus = 'SHORT_LEAVE (Evening)';
      statusDetails = 'Evening Short Leave (4:30 PM - 6:30 PM)';
    } else if (inMinutes >= OFFICE_START && outMinutes >= MORNING_SHORT_LEAVE_END && outMinutes < SECOND_HALF_START) {
      coreStatus = 'PRESENT';
      finalStatus = 'PRESENT (Morning Short Leave)';
      statusDetails = 'Present with Morning Short Leave';
      if (inMinutes > OFFICE_START && inMinutes <= GRACE_END) {
        lateMinutes = 0;
        finalStatus = 'PRESENT (Morning Short Leave - Grace)';
      } else if (inMinutes > GRACE_END) {
        lateMinutes = inMinutes - OFFICE_START;
        finalStatus = `PRESENT (Morning Short Leave - Late by ${formatMinutes(lateMinutes)})`;
      }
    } else if (inMinutes >= SECOND_HALF_START && outMinutes < EVENING_SHORT_LEAVE_START) {
      coreStatus = 'PRESENT';
      finalStatus = 'PRESENT (Evening Short Leave)';
      statusDetails = 'Present with Evening Short Leave';
    } else if (inMinutes >= OFFICE_START && outMinutes < EVENING_SHORT_LEAVE_START) {
      coreStatus = 'ABSENT';
      finalStatus = 'ABSENT';
      statusDetails = 'Absent';
    } else {
      coreStatus = 'ABSENT';
      finalStatus = 'ABSENT';
      statusDetails = 'Absent';
    }
  } 
  else if (workingMinutes < SHORT_LEAVE_HOURS - 15) {
    // Less than 2 hours - considered absent
    if (inMinutes >= OFFICE_START && outMinutes >= OFFICE_START + 30) {
      coreStatus = 'PRESENT';
      finalStatus = 'PRESENT (Short Duration)';
      statusDetails = 'Present (Short Duration)';
    } else {
      coreStatus = 'ABSENT';
      finalStatus = 'ABSENT';
      statusDetails = 'Absent';
    }
  } else {
    coreStatus = 'ABSENT';
    finalStatus = 'ABSENT';
    statusDetails = 'Absent';
  }

  // Special case: 9:30 to 11:30 - Absent (as per your requirement)
  if (inMinutes === OFFICE_START && outMinutes <= MORNING_SHORT_LEAVE_END && workingMinutes < SHORT_LEAVE_HOURS) {
    coreStatus = 'ABSENT';
    finalStatus = 'ABSENT';
    statusDetails = 'Absent';
  }

  // Special case: 9:30 to 2:00 - First Half Half Day
  if (inMinutes === OFFICE_START && outMinutes <= SECOND_HALF_START && workingMinutes >= HALF_DAY_HOURS - 15) {
    coreStatus = 'HALF_DAY';
    finalStatus = 'HALF_DAY (First Half)';
    halfDayType = 'MORNING';
    statusDetails = 'First Half (9:30 AM - 2:00 PM)';
  }

  // Special case: 2:00 to 6:30 - Second Half Half Day
  if (inMinutes >= SECOND_HALF_START && outMinutes === OFFICE_END && workingMinutes >= HALF_DAY_HOURS - 15) {
    coreStatus = 'HALF_DAY';
    finalStatus = 'HALF_DAY (Second Half)';
    halfDayType = 'EVENING';
    statusDetails = 'Second Half (2:00 PM - 6:30 PM)';
  }

  // Special case: 11:45 to 6:30 - Present with Morning Short Leave
  if (inMinutes === 11 * 60 + 45 && outMinutes === OFFICE_END) {
    coreStatus = 'PRESENT';
    finalStatus = 'PRESENT (Morning Short Leave)';
    statusDetails = 'Present with Morning Short Leave';
  }

  // Special case: 9:30 to 4:30 - Present with Evening Short Leave
  if (inMinutes === OFFICE_START && outMinutes === EVENING_SHORT_LEAVE_START) {
    coreStatus = 'PRESENT';
    finalStatus = 'PRESENT (Evening Short Leave)';
    statusDetails = 'Present with Evening Short Leave';
  }

  // If still absent but working hours > 0, mark as present
  if (coreStatus === 'ABSENT' && workingMinutes > 30) {
    coreStatus = 'PRESENT';
    finalStatus = 'PRESENT';
    statusDetails = 'Present';
  }

  // Check for late login
  if (inMinutes > GRACE_END && (coreStatus === 'PRESENT' || coreStatus === 'HALF_DAY' || coreStatus === 'SHORT_LEAVE')) {
    lateMinutes = inMinutes - OFFICE_START;
  }

  // Check for early logout deduction
  if (outMinutes < OFFICE_END && (coreStatus === 'PRESENT' || coreStatus === 'HALF_DAY' || coreStatus === 'SHORT_LEAVE')) {
    const earlyMins = OFFICE_END - outMinutes;
    if (earlyMins > 15) {
      deduction = `Early Logout: ${formatMinutes(earlyMins)}`;
    }
  }

  return {
    punchIn: `${punchIn} ${punchInAmPm}`,
    punchOut: `${punchOut} ${punchOutAmPm}`,
    workingHours: formatMinutes(workingMinutes),
    workingMinutes: workingMinutes,
    coreStatus,
    finalStatus,
    halfDayType,
    deduction: deduction || 'None',
    lateMinutes: lateMinutes > 0 ? formatMinutes(lateMinutes) : '0',
    status: coreStatus,
    isLate: lateMinutes > 0,
    fullStatus: finalStatus,
    statusDetails: statusDetails || finalStatus,
  };
};

// ── Preview Modal Component ──────────────────────────────────────
const PreviewModal = ({ 
  visible, 
  onClose, 
  previewData, 
  onSubmit,
  loading,
  theme 
}) => {
  const C = theme.colors;

  if (!previewData) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT': return C.success;
      case 'HALF_DAY': return C.warning;
      case 'SHORT_LEAVE': return C.warning;
      case 'ABSENT': return C.error;
      default: return C.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PRESENT': return CheckCircle2;
      case 'HALF_DAY': return AlertCircle;
      case 'SHORT_LEAVE': return ClockIcon;
      case 'ABSENT': return XCircle;
      default: return AlertCircle;
    }
  };

  const StatusIcon = getStatusIcon(previewData.coreStatus);
  const statusColor = getStatusColor(previewData.coreStatus);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[previewStyles.modalOverlay, { backgroundColor: C.overlayBg }]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                previewStyles.modalContent,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <View style={previewStyles.modalHeader}>
                <Text style={[previewStyles.modalTitle, { color: C.textPrimary }]}>
                  Attendance Preview
                </Text>
                <TouchableOpacity onPress={onClose} disabled={loading}>
                  <X size={wp('5%')} color={C.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Status Badge */}
                <View style={[previewStyles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                  <StatusIcon size={wp('5%')} color={statusColor} />
                  <Text style={[previewStyles.statusText, { color: statusColor }]}>
                    {previewData.finalStatus}
                  </Text>
                </View>

                {/* Status Details */}
                {previewData.statusDetails && (
                  <View style={[previewStyles.detailItem, { 
                    marginHorizontal: wp('4%'), 
                    marginTop: hp('0.5%'),
                    padding: wp('2%'),
                    borderRadius: wp('2%'),
                    borderWidth: 1,
                    borderColor: C.border,
                    backgroundColor: C.background,
                    alignItems: 'center',
                  }]}>
                    <Text style={[previewStyles.detailLabel, { color: C.textSecondary, textAlign: 'center' }]}>
                      {previewData.statusDetails}
                    </Text>
                  </View>
                )}

                {/* Punch Times */}
                <View style={previewStyles.infoGrid}>
                  <View style={[previewStyles.infoCard, { backgroundColor: C.background, borderColor: C.border }]}>
                    <Text style={[previewStyles.infoLabel, { color: C.textSecondary }]}>Punch In</Text>
                    <Text style={[previewStyles.infoValue, { color: C.textPrimary }]}>
                      {previewData.punchIn}
                    </Text>
                  </View>

                  <View style={[previewStyles.infoCard, { backgroundColor: C.background, borderColor: C.border }]}>
                    <Text style={[previewStyles.infoLabel, { color: C.textSecondary }]}>Punch Out</Text>
                    <Text style={[previewStyles.infoValue, { color: C.textPrimary }]}>
                      {previewData.punchOut}
                    </Text>
                  </View>
                </View>

                {/* Working Hours */}
                <View style={[previewStyles.infoCard, { backgroundColor: C.background, borderColor: C.border, marginHorizontal: wp('4%'), marginTop: hp('1%') }]}>
                  <View style={previewStyles.workingHoursRow}>
                    <Clock size={wp('4%')} color={C.primary} />
                    <Text style={[previewStyles.workingHoursLabel, { color: C.textSecondary }]}>
                      Working Hours
                    </Text>
                    <Text style={[previewStyles.workingHoursValue, { color: C.primary }]}>
                      {previewData.workingHours}
                    </Text>
                  </View>
                </View>

                {/* Time Range Info */}
                <View style={[previewStyles.timeRangeBox, { backgroundColor: C.primary + '10', borderColor: C.primary + '30' }]}>
                  <Text style={[previewStyles.timeRangeTitle, { color: C.primary }]}>
                    Office Timings & Rules
                  </Text>
                  <Text style={[previewStyles.timeRangeText, { color: C.textSecondary }]}>
                    Office: 09:30 AM - 06:30 PM
                  </Text>
                  <Text style={[previewStyles.timeRangeText, { color: C.textSecondary }]}>
                    Grace: 09:30 AM - 09:46 AM
                  </Text>
                  <Text style={[previewStyles.timeRangeText, { color: C.textSecondary }]}>
                    Morning Short Leave: 09:30 AM - 11:30 AM
                  </Text>
                  <Text style={[previewStyles.timeRangeText, { color: C.textSecondary }]}>
                    First Half: 09:30 AM - 02:00 PM
                  </Text>
                  <Text style={[previewStyles.timeRangeText, { color: C.textSecondary }]}>
                    Second Half: 02:00 PM - 06:30 PM
                  </Text>
                  <Text style={[previewStyles.timeRangeText, { color: C.textSecondary }]}>
                    Evening Short Leave: 04:30 PM - 06:30 PM
                  </Text>
                  <Text style={[previewStyles.timeRangeText, { color: C.primary, fontFamily: Fonts.bold }]}>
                    Status Based on Total Working Hours
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    previewStyles.submitBtn, 
                    { backgroundColor: C.primary },
                    loading && { opacity: 0.7 }
                  ]}
                  onPress={onSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={C.textDark} />
                  ) : (
                    <>
                      <Send size={wp('4%')} color={C.textDark} />
                      <Text style={[previewStyles.submitText, { color: C.textDark }]}>
                        Submit Request
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={{ height: hp('2%') }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ── Preview Styles ──────────────────────────────────
const previewStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    maxHeight: hp('90%'),
    borderTopLeftRadius: wp('5%'),
    borderTopRightRadius: wp('5%'),
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: hp('2%'),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('4%'),
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  modalTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp('2%'),
    marginHorizontal: wp('4%'),
    marginTop: hp('1%'),
    padding: wp('3%'),
    borderRadius: wp('3%'),
  },
  statusText: {
    fontSize: wp('4%'),
    fontFamily: Fonts.bold,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: wp('3%'),
    paddingHorizontal: wp('4%'),
    marginTop: hp('1.5%'),
  },
  infoCard: {
    flex: 1,
    padding: wp('3%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
    marginBottom: hp('0.3%'),
  },
  infoValue: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.bold,
  },
  workingHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
  },
  workingHoursLabel: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
  },
  workingHoursValue: {
    fontSize: wp('4%'),
    fontFamily: Fonts.bold,
    marginLeft: 'auto',
  },
  detailItem: {
    padding: wp('2.5%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
  },
  detailLabel: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
  },
  timeRangeBox: {
    marginHorizontal: wp('4%'),
    marginTop: hp('1.5%'),
    padding: wp('3%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
  },
  timeRangeTitle: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.bold,
    marginBottom: hp('0.5%'),
  },
  timeRangeText: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.regular,
    marginVertical: hp('0.2%'),
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp('2%'),
    marginHorizontal: wp('4%'),
    marginTop: hp('2%'),
    padding: wp('3.5%'),
    borderRadius: wp('3%'),
  },
  submitText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.bold,
  },
});

// ── Visit Record Card ────────────────────────────
const VisitRecordCard = ({ visit, sessionIndex, visitIndex }) => {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const isCompleted = visit.status === 'COMPLETED';
  const isInProgress = visit.status === 'IN_PROGRESS';
  const statusColor = isCompleted ? C.success : isInProgress ? C.primary : C.textSecondary;
  const statusLabel = isCompleted ? 'Completed' : isInProgress ? 'In Progress' : visit.status;

  const visitInTime = visit.visitIn ? formatTime(visit.visitIn) : '--:--';
  const visitOutTime = visit.visitOut ? formatTime(visit.visitOut) : isInProgress ? 'Ongoing' : '--:--';
  const duration = visit.durationMinutes || 0;

  return (
    <View
      style={[
        visitStyles.wrapper,
        { backgroundColor: C.surface, borderColor: C.border },
      ]}
    >
      <TouchableOpacity
        style={visitStyles.cardHeader}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.7}
      >
        <View style={visitStyles.leftBlock}>
          <View style={visitStyles.iconContainer}>
            {getVisitTypeIcon(visit.visitType, C.primary, wp('4.5%'))}
          </View>
          <View style={visitStyles.infoBlock}>
            <Text style={[visitStyles.customerName, { color: C.textPrimary }]}>
              {visit.customerName || 'Unknown Customer'}
            </Text>
            <Text style={[visitStyles.visitTypeText, { color: C.textSecondary }]}>
              {getVisitTypeLabel(visit.visitType)}
            </Text>
          </View>
        </View>

        <View style={visitStyles.rightBlock}>
          <View
            style={[
              visitStyles.statusBadge,
              { backgroundColor: statusColor + '20' },
            ]}
          >
            <Text style={[visitStyles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
          {expanded ? (
            <ChevronUp size={wp('3.5%')} color={C.textSecondary} />
          ) : (
            <ChevronDown size={wp('3.5%')} color={C.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View
          style={[
            visitStyles.detail,
            { borderTopColor: C.border, backgroundColor: C.background },
          ]}
        >
          <View style={visitStyles.timeRow}>
            <View style={visitStyles.timeItem}>
              <View style={[visitStyles.timeDot, { backgroundColor: C.success }]} />
              <Text style={[visitStyles.timeLabel, { color: C.textSecondary }]}>
                Visit In
              </Text>
              <Text style={[visitStyles.timeValue, { color: C.success }]}>
                {visitInTime}
              </Text>
            </View>

            <View style={visitStyles.timeArrow}>
              <Image
                source={arrowIcon}
                style={{
                  width: 8,
                  height: 14,
                  tintColor: C.textSecondary,
                }}
                resizeMode="contain"
              />
            </View>

            <View style={visitStyles.timeItem}>
              <View style={[visitStyles.timeDot, { backgroundColor: isCompleted ? C.error : C.primary }]} />
              <Text style={[visitStyles.timeLabel, { color: C.textSecondary }]}>
                Visit Out
              </Text>
              <Text style={[visitStyles.timeValue, { color: isCompleted ? C.error : C.primary }]}>
                {visitOutTime}
              </Text>
            </View>
          </View>

          {duration > 0 && (
            <View style={visitStyles.durationRow}>
              <Clock size={wp('3.5%')} color={C.primary} />
              <Text style={[visitStyles.durationText, { color: C.primary }]}>
                Duration: {fmtDur(duration)}
              </Text>
            </View>
          )}

          {visit.purpose && (
            <View style={visitStyles.purposeRow}>
              <Text style={[visitStyles.purposeLabel, { color: C.textSecondary }]}>
                Purpose:
              </Text>
              <Text style={[visitStyles.purposeText, { color: C.textPrimary }]}>
                {visit.purpose}
              </Text>
            </View>
          )}

          {visit.remarks && (
            <View style={visitStyles.remarksRow}>
              <Text style={[visitStyles.remarksLabel, { color: C.textSecondary }]}>
                Remarks:
              </Text>
              <Text style={[visitStyles.remarksText, { color: C.textPrimary }]}>
                {visit.remarks}
              </Text>
            </View>
          )}

          {visit.punchInLocation?.address && (
            <View style={visitStyles.locationRow}>
              <MapPin size={wp('3%')} color={C.textSecondary} />
              <Text
                style={[visitStyles.locationText, { color: C.textSecondary }]}
                numberOfLines={2}
              >
                {visit.punchInLocation.address}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ── Visit Card Styles ───────────────────────────────────
const visitStyles = StyleSheet.create({
  wrapper: {
    borderRadius: wp('3%'),
    marginBottom: hp('0.8%'),
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('3%'),
  },
  leftBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: wp('2.5%'),
  },
  iconContainer: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('2%'),
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBlock: {
    flex: 1,
  },
  customerName: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
  },
  visitTypeText: {
    fontSize: wp('2.4%'),
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  rightBlock: {
    alignItems: 'flex-end',
    gap: hp('0.3%'),
  },
  statusBadge: {
    paddingHorizontal: wp('2.5%'),
    paddingVertical: hp('0.3%'),
    borderRadius: wp('2%'),
  },
  statusText: {
    fontSize: wp('2.2%'),
    fontFamily: Fonts.medium,
  },
  detail: {
    padding: wp('3%'),
    borderTopWidth: 1,
    gap: hp('0.8%'),
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp('0.5%'),
  },
  timeItem: {
    alignItems: 'center',
    flex: 1,
  },
  timeDot: {
    width: wp('1.5%'),
    height: wp('1.5%'),
    borderRadius: wp('0.75%'),
    marginBottom: 2,
  },
  timeLabel: {
    fontSize: wp('2.2%'),
    fontFamily: Fonts.regular,
  },
  timeValue: {
    fontSize: wp('3%'),
    fontFamily: Fonts.bold,
  },
  timeArrow: {
    paddingHorizontal: wp('2%'),
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    paddingVertical: hp('0.3%'),
  },
  durationText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
  },
  purposeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp('2%'),
    paddingVertical: hp('0.2%'),
  },
  purposeLabel: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
    minWidth: wp('12%'),
  },
  purposeText: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.regular,
    flex: 1,
  },
  remarksRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp('2%'),
    paddingVertical: hp('0.2%'),
  },
  remarksLabel: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
    minWidth: wp('12%'),
  },
  remarksText: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.regular,
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1.5%'),
    paddingTop: hp('0.5%'),
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  locationText: {
    flex: 1,
    fontSize: wp('2.4%'),
    fontFamily: Fonts.regular,
  },
});

// ── Regularization Modal ──────────────────────────
const RegularizationModal = ({ visible, onClose, record, theme, onShowPreview }) => {
  const C = theme.colors;
  const { t } = useLanguage();
  const [requestType, setRequestType] = useState('MISSING_BOTH');
  const [punchInTime, setPunchInTime] = useState('');
  const [punchOutTime, setPunchOutTime] = useState('');
  const [punchInAmPm, setPunchInAmPm] = useState('AM');
  const [punchOutAmPm, setPunchOutAmPm] = useState('PM');
  const [reason, setReason] = useState('');
  const [hasRegularizationRequest, setHasRegularizationRequest] = useState(false);
  const [regularizationStatus, setRegularizationStatus] = useState(null);
  const scrollViewRef = useRef();

  // Get status from record
  const status = record?.attendanceStatus || 'UNKNOWN';
  
  // Check if it's a late record
  const isLateRecord = status === 'PRESENT' && record?.isLate === true;
  const effectiveStatus = isLateRecord ? 'LATE' : status;

  // Check if there's already a regularization request in the regularizations array
  useEffect(() => {
    if (record && record.regularizations && Array.isArray(record.regularizations)) {
      // Check if any regularization exists with status APPROVED or PENDING
      const hasActiveRequest = record.regularizations.some(
        reg => reg.status === 'APPROVED' || reg.status === 'PENDING'
      );
      
      // Get the first active regularization status
      const activeReg = record.regularizations.find(
        reg => reg.status === 'APPROVED' || reg.status === 'PENDING'
      );
      
      setHasRegularizationRequest(hasActiveRequest);
      setRegularizationStatus(activeReg?.status || null);
    } else {
      setHasRegularizationRequest(false);
      setRegularizationStatus(null);
    }
  }, [record]);

  // Clear form fields when modal opens
  useEffect(() => {
    if (visible) {
      setPunchInTime('');
      setPunchOutTime('');
      setPunchInAmPm('AM');
      setPunchOutAmPm('PM');
      setReason('');
      // Set default request type based on status
      const types = getRequestTypes();
      if (types.length > 0) {
        setRequestType(types[0].id);
      }
    }
  }, [visible]);

  // ✅ DYNAMIC REQUEST TYPES BASED ON STATUS
  const getRequestTypes = () => {
    switch (effectiveStatus) {
      case 'ABSENT':
        return [
          { id: 'MISSING_BOTH', label: 'Missing Both Punches' },
        ];
      case 'HALF_DAY':
        return [
          { id: 'WRONG_PUNCH_TIME', label: 'Wrong Punch Time' },
        ];
      case 'SHORT_LEAVE':
        return [
          { id: 'WRONG_PUNCH_TIME', label: 'Wrong Punch Time' },
        ];
      case 'LATE':
        return [
          { id: 'WRONG_PUNCH_TIME', label: 'Wrong Punch Time' },
          { id: 'MISSING_PUNCH_IN', label: 'Missing Punch In' },
        ];
      default:
        return [
          { id: 'MISSING_PUNCH_IN', label: 'Missing Punch In' },
          { id: 'MISSING_PUNCH_OUT', label: 'Missing Punch Out' },
          { id: 'MISSING_BOTH', label: 'Missing Both Punches' },
          { id: 'WRONG_PUNCH_TIME', label: 'Wrong Punch Time' },
        ];
    }
  };

  const requestTypes = getRequestTypes();

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Get the status display
  const getStatusDisplay = () => {
    if (isLateRecord) {
      return 'Present / Late';
    }
    const statusMap = {
      'ABSENT': 'Absent',
      'HALF_DAY': 'Half Day',
      'SHORT_LEAVE': 'Short Leave',
      'LATE': 'Present / Late',
      'PRESENT': 'Present',
      'WEEK_OFF': 'Week Off',
      'ON_LEAVE': 'On Leave',
    };
    return statusMap[status] || status;
  };

  // Get status color
  const getStatusColor = () => {
    if (isLateRecord) {
      return C.warning;
    }
    const colorMap = {
      'ABSENT': C.error,
      'HALF_DAY': C.warning,
      'SHORT_LEAVE': C.warning,
      'LATE': C.warning,
      'PRESENT': C.success,
      'WEEK_OFF': C.textSecondary,
      'ON_LEAVE': C.textSecondary,
    };
    return colorMap[status] || C.textSecondary;
  };

  // Handle Preview
  const handlePreview = () => {
    dismissKeyboard();

    const needsPunchIn = ['MISSING_PUNCH_IN', 'MISSING_BOTH', 'WRONG_PUNCH_TIME', 'ABSENT_MARKED'].includes(requestType);
    const needsPunchOut = ['MISSING_PUNCH_OUT', 'MISSING_BOTH', 'WRONG_PUNCH_TIME', 'ABSENT_MARKED'].includes(requestType);

    if (needsPunchIn && !punchInTime) {
      Alert.alert('Error', 'Please enter punch in time');
      return;
    }

    if (needsPunchOut && !punchOutTime) {
      Alert.alert('Error', 'Please enter punch out time');
      return;
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (needsPunchIn && punchInTime && !timeRegex.test(punchInTime)) {
      Alert.alert('Error', 'Please enter valid punch in time (HH:MM)');
      return;
    }

    if (needsPunchOut && punchOutTime && !timeRegex.test(punchOutTime)) {
      Alert.alert('Error', 'Please enter valid punch out time (HH:MM)');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for regularization');
      return;
    }

    const result = calculateAttendance(punchInTime, punchInAmPm, punchOutTime, punchOutAmPm);
    
    if (!result) {
      Alert.alert('Error', 'Punch out time must be later than punch in time');
      return;
    }

    const previewData = {
      ...result,
      requestType,
      punchInTime,
      punchOutTime,
      punchInAmPm,
      punchOutAmPm,
      reason: reason.trim(),
      recordId: record?._id || record?.id || record?.attendanceId || null,
      date: record?.date,
    };

    onClose();
    onShowPreview(previewData);
  };

  // AM/PM Toggle Button Component
  const AmPmToggle = ({ value, onToggle }) => (
    <View style={regStyles.amPmContainer}>
      <TouchableOpacity
        style={[
          regStyles.amPmButton,
          { backgroundColor: value === 'AM' ? C.primary : C.background },
          { borderColor: value === 'AM' ? C.primary : C.border },
        ]}
        onPress={() => onToggle('AM')}
      >
        <Text
          style={[
            regStyles.amPmText,
            { color: value === 'AM' ? C.textDark : C.textSecondary },
          ]}
        >
          AM
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          regStyles.amPmButton,
          { backgroundColor: value === 'PM' ? C.primary : C.background },
          { borderColor: value === 'PM' ? C.primary : C.border },
        ]}
        onPress={() => onToggle('PM')}
      >
        <Text
          style={[
            regStyles.amPmText,
            { color: value === 'PM' ? C.textDark : C.textSecondary },
          ]}
        >
          PM
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTimeInputs = () => {
    const needsPunchIn = ['MISSING_PUNCH_IN', 'MISSING_BOTH', 'WRONG_PUNCH_TIME', 'ABSENT_MARKED'].includes(requestType);
    const needsPunchOut = ['MISSING_PUNCH_OUT', 'MISSING_BOTH', 'WRONG_PUNCH_TIME', 'ABSENT_MARKED'].includes(requestType);

    if (!needsPunchIn && !needsPunchOut) {
      return null;
    }

    return (
      <View style={regStyles.timeInputs}>
        {needsPunchIn && (
          <View style={regStyles.timeInputGroup}>
            <Text style={[regStyles.inputLabel, { color: C.textSecondary }]}>
              Punch In Time (HH:MM) *
            </Text>
            <View style={regStyles.timeInputRow}>
              <TextInput
                style={[
                  regStyles.timeInput,
                  {
                    backgroundColor: C.background,
                    borderColor: C.border,
                    color: C.textPrimary,
                    flex: 1,
                  },
                ]}
                placeholder="09:30"
                placeholderTextColor={C.textSecondary}
                value={punchInTime}
                onChangeText={setPunchInTime}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                returnKeyType="done"
                onSubmitEditing={dismissKeyboard}
              />
              <AmPmToggle value={punchInAmPm} onToggle={setPunchInAmPm} />
            </View>
          </View>
        )}

        {needsPunchOut && (
          <View style={regStyles.timeInputGroup}>
            <Text style={[regStyles.inputLabel, { color: C.textSecondary }]}>
              Punch Out Time (HH:MM) *
            </Text>
            <View style={regStyles.timeInputRow}>
              <TextInput
                style={[
                  regStyles.timeInput,
                  {
                    backgroundColor: C.background,
                    borderColor: C.border,
                    color: C.textPrimary,
                    flex: 1,
                  },
                ]}
                placeholder="06:30"
                placeholderTextColor={C.textSecondary}
                value={punchOutTime}
                onChangeText={setPunchOutTime}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                returnKeyType="done"
                onSubmitEditing={dismissKeyboard}
              />
              <AmPmToggle value={punchOutAmPm} onToggle={setPunchOutAmPm} />
            </View>
          </View>
        )}
      </View>
    );
  };

  // Get status message
  const getStatusMessage = () => {
    if (regularizationStatus === 'APPROVED') {
      return '✅ Your regularization request has been approved.';
    } else if (regularizationStatus === 'PENDING') {
      return '⏳ Your regularization request is pending review.';
    }
    return 'Your regularization request has been submitted and is being reviewed.';
  };

  const getMessageColor = () => {
    if (regularizationStatus === 'APPROVED') {
      return C.success;
    } else if (regularizationStatus === 'PENDING') {
      return C.warning;
    }
    return C.info;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={[regStyles.modalOverlay, { backgroundColor: C.overlayBg }]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                regStyles.modalContent,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <View style={regStyles.modalHeader}>
                <Text style={[regStyles.modalTitle, { color: C.textPrimary }]}>
                  Regularize Attendance
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <X size={wp('5%')} color={C.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={regStyles.recordInfo}>
                  <Text style={[regStyles.recordDate, { color: C.textSecondary }]}>
                    Date: {formatFullDate(record?.date)}
                  </Text>
                  <Text style={[regStyles.recordStatus, { color: getStatusColor() }]}>
                    Status: {getStatusDisplay()}
                  </Text>
                </View>

                {hasRegularizationRequest ? (
                  // Show status message when request exists
                  <View style={[regStyles.statusContainer, { 
                    backgroundColor: getMessageColor() + '10', 
                    borderColor: getMessageColor() + '30',
                  }]}>
                    {regularizationStatus === 'APPROVED' ? (
                      <Check size={wp('6%')} color={C.success} />
                    ) : (
                      <Shield size={wp('6%')} color={getMessageColor()} />
                    )}
                    <Text style={[regStyles.statusMessage, { 
                      color: getMessageColor(),
                    }]}>
                      {getStatusMessage()}
                    </Text>
                    {regularizationStatus === 'APPROVED' && (
                      <Text style={[regStyles.statusSubMessage, { 
                        color: C.textSecondary,
                      }]}>
                        Your attendance has been regularized successfully.
                      </Text>
                    )}
                  </View>
                ) : (
                  // Show form when no request exists
                  <>
                    <Text style={[regStyles.sectionLabel, { color: C.textSecondary }]}>
                      Request Type
                    </Text>
                    {requestTypes.map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          regStyles.requestTypeOption,
                          { borderBottomColor: C.border },
                          requestType === type.id && {
                            backgroundColor: C.primary + '20',
                            borderColor: C.primary,
                          },
                        ]}
                        onPress={() => {
                          dismissKeyboard();
                          setRequestType(type.id);
                          setPunchInTime('');
                          setPunchOutTime('');
                          setPunchInAmPm('AM');
                          setPunchOutAmPm('PM');
                        }}
                      >
                        <Text
                          style={[
                            regStyles.requestTypeText,
                            {
                              color: requestType === type.id ? C.primary : C.textPrimary,
                            },
                          ]}
                        >
                          {type.label}
                        </Text>
                        {requestType === type.id && (
                          <CheckCircle2 size={wp('4%')} color={C.primary} />
                        )}
                      </TouchableOpacity>
                    ))}

                    {renderTimeInputs()}

                    <View style={regStyles.reasonGroup}>
                      <Text style={[regStyles.inputLabel, { color: C.textSecondary }]}>
                        Reason for Regularization *
                      </Text>
                      <TextInput
                        style={[
                          regStyles.reasonInput,
                          {
                            backgroundColor: C.background,
                            borderColor: C.border,
                            color: C.textPrimary,
                          },
                        ]}
                        placeholder="Please provide a detailed reason..."
                        placeholderTextColor={C.textSecondary}
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        returnKeyType="done"
                        onSubmitEditing={dismissKeyboard}
                      />
                    </View>

                    {/* Preview Button */}
                    <TouchableOpacity
                      style={[
                        regStyles.previewBtn,
                        { 
                          backgroundColor: C.primary + '20',
                          borderColor: C.primary,
                        },
                      ]}
                      onPress={handlePreview}
                      activeOpacity={0.7}
                    >
                      <Text style={[regStyles.previewBtnText, { color: C.primary }]}>
                        👁️ Preview Attendance
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <View style={{ height: hp('2%') }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ── Regularization Styles ──────────────────────────
const regStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    maxHeight: hp('85%'),
    borderTopLeftRadius: wp('5%'),
    borderTopRightRadius: wp('5%'),
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: hp('3%'),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('4%'),
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  modalTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
  },
  recordInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp('4%'),
    paddingBottom: hp('1%'),
  },
  recordDate: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
  },
  recordStatus: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.bold,
  },
  sectionLabel: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
    paddingHorizontal: wp('4%'),
    paddingTop: hp('1%'),
    paddingBottom: hp('0.5%'),
  },
  requestTypeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.2%'),
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  requestTypeText: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
  },
  timeInputs: {
    paddingHorizontal: wp('4%'),
    paddingTop: hp('1%'),
  },
  timeInputGroup: {
    marginBottom: hp('1%'),
  },
  inputLabel: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
    marginBottom: hp('0.3%'),
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    fontSize: wp('3.5%'),
    fontFamily: Fonts.regular,
  },
  amPmContainer: {
    flexDirection: 'row',
    borderRadius: wp('2%'),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  amPmButton: {
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.8%'),
    borderWidth: 0,
  },
  amPmText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  reasonGroup: {
    paddingHorizontal: wp('4%'),
    paddingTop: hp('1%'),
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    minHeight: hp('10%'),
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp('2%'),
    marginHorizontal: wp('4%'),
    marginTop: hp('1.5%'),
    padding: wp('3.5%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
  },
  previewBtnText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.bold,
  },
  statusContainer: {
    alignItems: 'center',
    padding: wp('4%'),
    marginHorizontal: wp('4%'),
    marginTop: hp('1%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
  },
  statusMessage: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginTop: hp('0.5%'),
  },
  statusSubMessage: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: hp('0.3%'),
  },
});

// ── Get API Status Config ──
const getApiStatusConfig = (status, C, t, isLate) => {
  if (status === 'PRESENT' && isLate === true) {
    return {
      label: 'Present / Late',
      color: C.warning,
      icon: ClockIcon,
      isLate: true,
      primaryLabel: 'Present',
      primaryColor: C.success,
      secondaryLabel: '/Late',
      secondaryColor: C.warning,
    };
  }
  
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
    case 'LATE':
      return {
        label: 'Present / Late',
        color: C.warning,
        icon: ClockIcon,
        isLate: true,
        primaryLabel: 'Present',
        primaryColor: C.success,
        secondaryLabel: '/Late',
        secondaryColor: C.warning,
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

// ── Get Extra Details ──
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
const RecordCard = ({ record, onRegularize }) => {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const sessions = record.sessions || [];
  const isSalesTeam = record.employee?.departmentName?.toLowerCase().includes('sales') || false;

  const isLateRecord = record.attendanceStatus === 'PRESENT' && record.isLate === true;
  const apiStatusConfig = getApiStatusConfig(record.attendanceStatus, C, t, record.isLate);
  const ApiStatusIcon = apiStatusConfig.icon;
  
  const isToday = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recordDate = new Date(dateString);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime();
  };

  // Check if there's an approved or pending regularization in the regularizations array
  const hasActiveRegularization = (() => {
    if (!record || !record.regularizations || !Array.isArray(record.regularizations)) {
      return false;
    }
    return record.regularizations.some(
      reg => reg.status === 'APPROVED' || reg.status === 'PENDING'
    );
  })();

  // Check if there's an approved regularization specifically
  const hasApprovedRegularization = (() => {
    if (!record || !record.regularizations || !Array.isArray(record.regularizations)) {
      return false;
    }
    return record.regularizations.some(
      reg => reg.status === 'APPROVED'
    );
  })();

  // Show Regularize button only if:
  // 1. Record date is NOT today
  // 2. Status qualifies (ABSENT, HALF_DAY, SHORT_LEAVE, LATE, or PRESENT with isLate)
  // 3. No active regularization (PENDING or APPROVED)
  const shouldShowRegularize = 
    !isToday(record.date) &&
    !hasActiveRegularization &&
    (record.attendanceStatus === 'ABSENT' ||
    record.attendanceStatus === 'HALF_DAY' ||
    record.attendanceStatus === 'SHORT_LEAVE' ||
    record.attendanceStatus === 'LATE' ||
    (record.attendanceStatus === 'PRESENT' && record.isLate === true));

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
  const autoPunch = sessions[0]?.autoPunchedOut;
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
              { backgroundColor: isLateRecord ? C.warning : apiStatusConfig.color },
            ]}
          />
          <View>
            <Text style={[cardStyles.dateText, { color: C.textPrimary }]}>
              {formatFullDate(record.date)}
            </Text>
            <View
              style={[
                cardStyles.statusBadge,
                { backgroundColor: isLateRecord ? C.warning + '15' : apiStatusConfig.color + '22' },
              ]}
            >
              <ApiStatusIcon size={wp('2.8%')} color={isLateRecord ? C.warning : apiStatusConfig.color} />
              
              {isLateRecord ? (
                <Text style={cardStyles.dualStatusText}>
                  <Text style={[cardStyles.statusText, { color: C.success }]}>
                    Present
                  </Text>
                  <Text style={[cardStyles.statusText, { color: C.textSecondary }]}>
                    {' '}/ 
                  </Text>
                  <Text style={[cardStyles.statusText, { color: C.warning }]}>
                    Late
                  </Text>
                </Text>
              ) : (
                <Text
                  style={[
                    cardStyles.statusText,
                    { color: apiStatusConfig.color },
                  ]}
                >
                  {apiStatusConfig.label}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={cardStyles.rightBlock}>
          <View style={cardStyles.timeRow}>
            <Text style={[cardStyles.timeIn, { color: C.success }]}>
              {formatTime(firstPunchIn)}
            </Text>
            <Image
              source={arrowIcon}
              style={{
                width: 8,
                height: 14,
                marginHorizontal: 2,
                tintColor: C.textSecondary,
              }}
              resizeMode="contain"
            />
            <Text
              style={[
                cardStyles.timeOut,
                { color: lastPunchOut ? C.error : C.textSecondary },
              ]}
            >
              {autoPunch ? '---' : lastPunchOut ? formatTime(lastPunchOut) : '---'}
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
          {shouldShowRegularize ? (
            <TouchableOpacity
              style={[
                cardStyles.regularizeBtn,
                { backgroundColor: C.primary + '15', borderColor: C.primary },
              ]}
              onPress={() => onRegularize(record)}
            >
              <Send size={wp('4%')} color={C.primary} />
              <Text style={[cardStyles.regularizeBtnText, { color: C.primary }]}>
                Regularize Your Attendance
              </Text>
            </TouchableOpacity>
          ) : hasApprovedRegularization ? (
            <View
              style={[
                cardStyles.regularizedBadge,
                { backgroundColor: C.success + '15', borderColor: C.success },
              ]}
            >
              <Check size={wp('4%')} color={C.success} />
              <Text style={[cardStyles.regularizedText, { color: C.success }]}>
                ✅ Attendance Regularized
              </Text>
            </View>
          ) : hasActiveRegularization ? (
            <View
              style={[
                cardStyles.regularizedBadge,
                { backgroundColor: C.warning + '15', borderColor: C.warning },
              ]}
            >
              <Shield size={wp('4%')} color={C.warning} />
              <Text style={[cardStyles.regularizedText, { color: C.warning }]}>
                ⏳ Request Pending
              </Text>
            </View>
          ) : null}

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
                    {autoPunch
                      ? '---'
                      : session.punchOut
                        ? formatTime(session.punchOut)
                        : t.reports?.ongoing || 'Ongoing'}
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

              {isSalesTeam && session.visits && session.visits.length > 0 && (
                <View style={cardStyles.visitsSection}>
                  <View style={cardStyles.visitsHeader}>
                    <Briefcase size={wp('3.5%')} color={C.primary} />
                    <Text style={[cardStyles.visitsTitle, { color: C.primary }]}>
                      Visits ({session.visits.length})
                    </Text>
                  </View>
                  {session.visits.map((visit, vi) => (
                    <VisitRecordCard
                      key={vi}
                      visit={visit}
                      sessionIndex={si}
                      visitIndex={vi}
                    />
                  ))}
                </View>
              )}

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
  dualStatusText: {
    flexDirection: 'row',
    alignItems: 'center',
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
  regularizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp('2%'),
    margin: wp('4%'),
    marginBottom: 0,
    padding: wp('3%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
  },
  regularizeBtnText: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
  },
  regularizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp('2%'),
    margin: wp('4%'),
    marginBottom: 0,
    padding: wp('3%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
  },
  regularizedText: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
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
  visitsSection: {
    marginTop: hp('1%'),
    paddingTop: hp('1%'),
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  visitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    marginBottom: hp('0.8%'),
  },
  visitsTitle: {
    fontSize: wp('2.8%'),
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

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleApply = () => {
    dismissKeyboard();
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
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={[styles.modalOverlay, { backgroundColor: C.overlayBg }]}>
          <TouchableWithoutFeedback>
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
                returnKeyType="done"
                onSubmitEditing={dismissKeyboard}
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
                returnKeyType="done"
                onSubmitEditing={dismissKeyboard}
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
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  const [showRegularizeModal, setShowRegularizeModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Preview modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [tempRecord, setTempRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  const getFilteredHistory = () => {
    if (!history || history.length === 0) return [];

    const { start, end } = getDateRange(dateFilter, customDate);

    let filtered = [...history];

    if (start && end) {
      filtered = filtered.filter(record =>
        isDateInRange(record.date, start, end),
      );
    }

    if (activeStatusFilter !== 'ALL') {
      filtered = filtered.filter(
        record => {
          if (activeStatusFilter === 'LATE') {
            return record.attendanceStatus === 'LATE' || 
                   (record.attendanceStatus === 'PRESENT' && record.isLate === true);
          }
          return record.attendanceStatus === activeStatusFilter;
        }
      );
    }

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const filteredHistory = getFilteredHistory();

  const countByStatus = (status) => {
    if (status === 'LATE') {
      return filteredHistory.filter(r => 
        r.attendanceStatus === 'LATE' || 
        (r.attendanceStatus === 'PRESENT' && r.isLate === true)
      ).length;
    }
    return filteredHistory.filter(r => r.attendanceStatus === status).length;
  };

  const stats = {
    present: countByStatus('PRESENT'),
    late: countByStatus('LATE'),
    absent: countByStatus('ABSENT'),
    halfDay: countByStatus('HALF_DAY'),
    shortLeave: countByStatus('SHORT_LEAVE'),
    totalWorked: filteredHistory.reduce(
      (sum, r) => sum + (r.totalWorkingMinutes || 0),
      0,
    ),
    totalBreak: filteredHistory.reduce(
      (sum, r) => sum + (r.totalBreakMinutes || 0),
      0,
    ),
  };

  const statusFilters = ['ALL', 'PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'SHORT_LEAVE'];
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
    LATE: 'Present / Late',
    ABSENT: t.reports?.absent || 'Absent',
    HALF_DAY: t.reports?.halfDay || 'Half Day',
    SHORT_LEAVE: t.reports?.shortLeave || 'Short Leave',
  };

  const handleRegularize = (record) => {
    setSelectedRecord(record);
    setTempRecord(record);
    setShowRegularizeModal(true);
  };

  const handleRegularizeSuccess = () => {
    setShowRegularizeModal(false);
    setSelectedRecord(null);
    setTempRecord(null);
    dispatch(getAttendanceHistory());
  };

  const handleShowPreview = (data) => {
    setTempRecord(selectedRecord);
    setPreviewData(data);
    setShowPreviewModal(true);
  };

  const handlePreviewClose = () => {
    setShowPreviewModal(false);
    setPreviewData(null);
    setSubmitting(false);
    if (tempRecord) {
      setSelectedRecord(tempRecord);
      setShowRegularizeModal(true);
    }
  };

  const handleSubmitFromPreview = async () => {
    if (!previewData) return;
    
    setSubmitting(true);

    try {
      const recordId = previewData.recordId;

      if (!recordId) {
        Alert.alert('Error', 'Attendance record not found');
        setSubmitting(false);
        return;
      }

      const convertTo24Hour = (timeStr, ampm) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return '';
        
        let hour24 = hours;
        if (ampm === 'PM' && hours !== 12) {
          hour24 = hours + 12;
        } else if (ampm === 'AM' && hours === 12) {
          hour24 = 0;
        }
        return `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      };

      const payload = {
        attendanceId: recordId,
        requestType: previewData.requestType,
        attendanceDate: new Date(previewData.date).toISOString(),
        reason: previewData.reason || 'Requesting attendance regularization',
      };

      const needsPunchInForPayload = ['MISSING_PUNCH_IN', 'MISSING_BOTH', 'WRONG_PUNCH_TIME', 'ABSENT_MARKED'].includes(previewData.requestType);
      const needsPunchOutForPayload = ['MISSING_PUNCH_OUT', 'MISSING_BOTH', 'WRONG_PUNCH_TIME', 'ABSENT_MARKED'].includes(previewData.requestType);

      if (needsPunchInForPayload && previewData.punchInTime) {
        const date = new Date(previewData.date).toISOString().split('T')[0];
        const punchIn24Hour = convertTo24Hour(previewData.punchInTime, previewData.punchInAmPm);
        if (!punchIn24Hour) {
          throw new Error('Invalid punch in time format');
        }
        const punchInDateTime = new Date(`${date}T${punchIn24Hour}:00.000Z`);
        payload.requestedPunchIn = punchInDateTime.toISOString();
      }

      if (needsPunchOutForPayload && previewData.punchOutTime) {
        const date = new Date(previewData.date).toISOString().split('T')[0];
        const punchOut24Hour = convertTo24Hour(previewData.punchOutTime, previewData.punchOutAmPm);
        if (!punchOut24Hour) {
          throw new Error('Invalid punch out time format');
        }
        const punchOutDateTime = new Date(`${date}T${punchOut24Hour}:00.000Z`);
        payload.requestedPunchOut = punchOutDateTime.toISOString();
      }

      const response = await apiService.post('/attendance/regularize-attendance', payload);
      
      const isSuccess = response.data?.success === true && response.data?.data?.success !== false;
      
      if (isSuccess) {
        Alert.alert(
          '✅ Request Submitted Successfully',
          'Your regularization request has been submitted and will be reviewed by the HR team.',
          [{ text: 'OK', onPress: () => {
            setShowPreviewModal(false);
            setPreviewData(null);
            setSubmitting(false);
            handleRegularizeSuccess();
          }}]
        );
      } else {
        const errorMessage = response.data?.data?.message || 
                            response.data?.message || 
                            'Failed to submit regularization request';
        Alert.alert('Error', errorMessage);
        setSubmitting(false);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.data?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to submit regularization request';
      Alert.alert('Error', errorMessage);
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />

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
        <View style={styles.summaryGrid}>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: C.surface, borderColor: C.success + '50' },
            ]}
          >
            <CheckCircle2 size={wp('4%')} color={C.success} />
            <Text style={[styles.summaryNum, { color: C.textPrimary }]}>
              {stats.present}
            </Text>
            <Text style={[styles.summaryLbl, { color: C.textSecondary }]}>
              Present
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: C.surface, borderColor: C.warning + '50' },
            ]}
          >
            <ClockIcon size={wp('4%')} color={C.warning} />
            <Text style={[styles.summaryNum, { color: C.textPrimary }]}>
              {stats.late}
            </Text>
            <Text style={[styles.summaryLbl, { color: C.textSecondary }]}>
              Present / Late
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: C.surface, borderColor: C.error + '50' },
            ]}
          >
            <XCircle size={wp('4%')} color={C.error} />
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
            <AlertCircle size={wp('4%')} color={C.warning} />
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
            <Clock size={wp('4%')} color={C.warning} />
            <Text style={[styles.summaryNum, { color: C.textPrimary }]}>
              {stats.shortLeave}
            </Text>
            <Text style={[styles.summaryLbl, { color: C.textSecondary }]}>
              {t.reports?.shortLeave || 'Short Leave'}
            </Text>
          </View>
        </View>

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
                key={record._id || record.id || record.date || i}
                record={record}
                onRegularize={handleRegularize}
              />
            ))}
          </View>
        )}
        <View style={{ height: hp('4%') }} />
      </ScrollView>

      <Modal
        visible={showDateFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateFilterModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.modalOverlay, { backgroundColor: C.overlayBg }]}>
            <TouchableWithoutFeedback>
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <CustomDateModal
        visible={showCustomDateModal}
        onClose={() => setShowCustomDateModal(false)}
        onApply={dateRange => applyDateFilter('CUSTOM', dateRange)}
        theme={theme}
      />

      <RegularizationModal
        visible={showRegularizeModal}
        onClose={() => {
          setShowRegularizeModal(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
        theme={theme}
        onShowPreview={handleShowPreview}
      />

      <PreviewModal
        visible={showPreviewModal}
        onClose={handlePreviewClose}
        previewData={previewData}
        onSubmit={handleSubmitFromPreview}
        loading={submitting}
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
    flexWrap: 'nowrap',
    paddingHorizontal: wp('4%'),
    paddingTop: hp('2%'),
    gap: wp('2%'),
  },
  summaryCard: {
    flex: 1,
    borderRadius: wp('3.5%'),
    paddingVertical: wp('2%'),
    paddingHorizontal: wp('1%'),
    alignItems: 'center',
    gap: hp('0.3%'),
    borderWidth: 1,
    minWidth: 0,
  },
  summaryNum: { 
    fontSize: wp('4.5%'), 
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
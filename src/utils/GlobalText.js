// GlobalText.js — Single source of truth for colors, fonts, and base URL
// Theme colors are now driven by ThemeContext — import useTheme() in components
// Language strings are driven by LanguageContext — import useLanguage() in components

export const BASE_URL = 'https://api-presenza.paulmerchants.net/api/v1';
// export const GOOGLE_API_KEY = 'AIzaSyDNY5oQOOYz1dtYXZUn4WNbJPwiOE9OENE';   //old key
export const GOOGLE_API_KEY = 'AIzaSyA2aty_E8JFBJIIDS4hN2tIAvQCwy_yskk';


// ══════════════════════════════════════════════════════════
// STATIC FONTS (unchanged regardless of theme)
// ══════════════════════════════════════════════════════════
export const Fonts = {
  medium: 'GothamMedium',
  light: 'GothamLight',
  regular: 'GothamBook',
  bold: 'GothamBold',
};

// ══════════════════════════════════════════════════════════
// DEFAULT COLORS (Dark Theme — used as fallback before context loads)
// These are replaced at runtime by ThemeContext
// ══════════════════════════════════════════════════════════
export const Colors = {
  primary: '#FACC15',
  otpBorder: '#68644e',
  secondary: '#FEE440',
  background: '#0A1128',
  surface: 'rgba(38, 50, 86, 0.66)',
  surfaceSolid: '#1C2541',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textDark: '#0A1128',
  disabled: '#69778a',
  success: '#10B981',
  error: '#ff5656',
  warning: '#F59E0B',
  info: '#3B82F6',
  border: '#ffffff1f',
  shadow: '#000000',
  icon: '#FEE440',
  iconTitle: '#CBD5E1',
  cardBg: 'rgba(38, 50, 86, 0.66)',
  headerBg: '#1C2541',
  bottomNavBg: '#111827',
  inputBg: '#0A1128',
  inputBorder: '#ffffff1f',
  statusBar: 'light-content',
  overlayBg: 'rgba(0,0,0,0.7)',
  topShadow: '#0b1425',
  bottomShadow: '#FACC15',
};

// ══════════════════════════════════════════════════════════
// STATIC TEXT (English fallback — replaced by LanguageContext at runtime)
// ══════════════════════════════════════════════════════════
export const GlobalText = {
  login: {
    title: 'Welcome Back',
    subtitle: 'Enter your credentials to manage attendance',
    emailLabel: 'Employee Email',
    emailPlaceholder: 'Enter your email',
    sendOtpButton: 'Send OTP',
  },
  otp: {
    title: 'Verify Your Account',
    subtitle: 'Enter the OTP sent to your email',
    otpLabel: 'Enter OTP',
    otpPlaceholder: 'Enter 6-digit OTP',
    verifyButton: 'Verify OTP',
    resendButton: 'Resend OTP',
  },
  home: {
    welcomeBack: 'Welcome back,',
    currentTime: 'CURRENT TIME',
    quickActions: 'QUICK ACTIONS',
    todaysActivity: "TODAY'S ACTIVITY",
    noActivity: 'No activity recorded today',
    dailyPunch: 'Daily Punch',
    idleTracking: 'Break Time',
    leaveManagement: 'Leave',
    reports: 'Reports',
  },
  attendance: {
    currentStatus: 'CURRENT STATUS',
    notPunched: 'Not Punched In',
    punchedIn: 'Punched In',
    punchedOut: 'Punched Out',
    punchIn: 'Punch In',
    punchOut: 'Punch Out',
    readyToSync: 'Ready To Sync',
    active: 'ACTIVE',
    verificationSteps: 'VERIFICATION STEPS',
    locationStep: 'Location',
    selfieStep: 'Selfie',
    uploadStep: 'Upload',
    defaultLocation: 'HO - Chandigarh',
  },
  alerts: {
    invalidEmail: 'Please enter a valid email address.',
    otpSent: 'OTP has been sent to your email.',
    otpVerified: 'OTP verified successfully!',
    otpError: 'Invalid OTP. Please try again.',
    networkError: 'Network error. Please check your connection.',
    serverError: 'Server error. Please try again later.',
    sessionExpired: 'Session expired. Please login again.',
    logoutConfirm: 'Are you sure you want to logout?',
    logoutSuccess: 'Logged out successfully',
    logoutError: 'Logout failed. Please try again.',
  },
  buttons: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    logout: 'Logout',
    verify: 'Verify',
    send: 'Send',
  },
};
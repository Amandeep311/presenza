export const SEND_OTP_REQUEST = 'SEND_OTP_REQUEST';
export const SEND_OTP_SUCCESS = 'SEND_OTP_SUCCESS';
export const SEND_OTP_FAIL = 'SEND_OTP_FAIL';
export const RESET_SEND_OTP = 'RESET_SEND_OTP'; // ✅ NEW

export const VERIFY_OTP_REQUEST = 'VERIFY_OTP_REQUEST';
export const VERIFY_OTP_SUCCESS = 'VERIFY_OTP_SUCCESS';
export const VERIFY_OTP_FAIL = 'VERIFY_OTP_FAIL';

export const BIOMETRIC_LOGIN_REQUEST = 'BIOMETRIC_LOGIN_REQUEST';
export const BIOMETRIC_LOGIN_SUCCESS = 'BIOMETRIC_LOGIN_SUCCESS';
export const BIOMETRIC_LOGIN_FAIL = 'BIOMETRIC_LOGIN_FAIL';

export const REFRESH_TOKEN_REQUEST = 'REFRESH_TOKEN_REQUEST';
export const REFRESH_TOKEN_SUCCESS = 'REFRESH_TOKEN_SUCCESS';
export const REFRESH_TOKEN_FAIL = 'REFRESH_TOKEN_FAIL';

export const LOGOUT = 'LOGOUT';
export const RESET_APP_STATE = 'RESET_APP_STATE';
export const SET_BIOMETRIC_AVAILABLE = 'SET_BIOMETRIC_AVAILABLE';
export const AUTH_LOADING = 'AUTH_LOADING';

const initialState = {
  loading: false,
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  user: null,
  biometricAvailable: false,
  sendOtpLoading: false,
  sendOtpSuccess: false,
  sendOtpError: null,
  sentEmail: null,
  verifyOtpLoading: false,
  verifyOtpSuccess: false,
  verifyOtpError: null,
  biometricLoginLoading: false,
  biometricLoginSuccess: false,
  biometricLoginError: null,
  refreshTokenLoading: false,
  refreshTokenError: null,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case AUTH_LOADING:
      return { ...state, loading: action.payload };

    case SEND_OTP_REQUEST:
      return {
        ...state,
        sendOtpLoading: true,
        sendOtpSuccess: false,
        sendOtpError: null,
      };

    case SEND_OTP_SUCCESS:
      return {
        ...state,
        sendOtpLoading: false,
        sendOtpSuccess: true,
        sendOtpError: null,
        sentEmail: action.payload.email,
      };

    case SEND_OTP_FAIL:
      return {
        ...state,
        sendOtpLoading: false,
        sendOtpSuccess: false,
        sendOtpError: action.payload,
      };

    // ✅ NEW: Reset karo jab OTP screen se wapas aao
    case RESET_SEND_OTP:
      return { ...state, sendOtpSuccess: false, sendOtpError: null };

    case VERIFY_OTP_REQUEST:
      return {
        ...state,
        verifyOtpLoading: true,
        verifyOtpSuccess: false,
        verifyOtpError: null,
      };

    case VERIFY_OTP_SUCCESS:
      return {
        ...state,
        loading: false,
        verifyOtpLoading: false,
        verifyOtpSuccess: true,
        verifyOtpError: null,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        user: action.payload.user,
        isAuthenticated: true,
      };

    case VERIFY_OTP_FAIL:
      return {
        ...state,
        loading: false,
        verifyOtpLoading: false,
        verifyOtpSuccess: false,
        verifyOtpError: action.payload,
        isAuthenticated: false,
      };

    case BIOMETRIC_LOGIN_REQUEST:
      return {
        ...state,
        biometricLoading: true,
        biometricSuccess: false,
        biometricError: null,
      };

    case BIOMETRIC_LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        biometricLoading: false,
        biometricSuccess: true,
        biometricError: null,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        user: action.payload.user,
        isAuthenticated: true,
      };

    case BIOMETRIC_LOGIN_FAIL:
      return {
        ...state,
        loading: false,
        biometricLoading: false,
        biometricSuccess: false,
        biometricError: action.payload,
        isAuthenticated: false,
      };

    case REFRESH_TOKEN_SUCCESS:
      return { ...state, accessToken: action.payload };

    case REFRESH_TOKEN_FAIL:
      return { ...state, isAuthenticated: false, loading: false };

    case SET_BIOMETRIC_AVAILABLE:
      return { ...state, biometricAvailable: action.payload };

    case LOGOUT:
    case RESET_APP_STATE:
      return {
        ...initialState,
        loading: false,
        isAuthenticated: false,
        biometricAvailable: state.biometricAvailable,
      };

    default:
      return state;
  }
};

export default authReducer;

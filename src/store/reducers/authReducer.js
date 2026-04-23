// Action Types
export const SEND_OTP_REQUEST = 'SEND_OTP_REQUEST';
export const SEND_OTP_SUCCESS = 'SEND_OTP_SUCCESS';
export const SEND_OTP_FAIL = 'SEND_OTP_FAIL';

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
  loading: true,
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
    // Loading case
    case AUTH_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    // Send OTP cases
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
      
    // Verify OTP cases
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
        loading: false, // ✅ IMPORTANT: Stop loading on success
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
        loading: false, // ✅ IMPORTANT: Stop loading on fail
        verifyOtpLoading: false,
        verifyOtpSuccess: false,
        verifyOtpError: action.payload,
        isAuthenticated: false,
      };
      
    // Biometric login cases
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
        loading: false, // ✅ IMPORTANT: Stop loading on success
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
        loading: false, // ✅ IMPORTANT: Stop loading on fail
        biometricLoading: false,
        biometricSuccess: false,
        biometricError: action.payload,
        isAuthenticated: false,
      };
      
    // Token refresh cases
    case REFRESH_TOKEN_SUCCESS:
      return {
        ...state,
        accessToken: action.payload,
      };
      
    case REFRESH_TOKEN_FAIL:
      return {
        ...state,
        isAuthenticated: false,
        loading: false,
      };
      
    // Biometric availability
    case SET_BIOMETRIC_AVAILABLE:
      return {
        ...state,
        biometricAvailable: action.payload,
      };
      
    // Logout cases
    case LOGOUT:
    case RESET_APP_STATE:
      return {
        ...initialState,
        loading: false, // ✅ IMPORTANT: Stop loading on logout
        isAuthenticated: false,
        biometricAvailable: state.biometricAvailable,
      };
      
    default:
      return state;
  }
};

export default authReducer;
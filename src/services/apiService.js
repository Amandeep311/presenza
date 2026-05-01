// apiService.js - Complete fixed version with proper token refresh

import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from '../utils/keychainHelper';

import { BASE_URL } from '../utils/GlobalText';
import { store } from '../store/store';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import axios from 'axios';

// Import the logout action
import { logout } from '../store/actions/authActions';

class ApiService {
  constructor() {
    this.isRefreshing = false;
    this.failedQueue = [];
    this.timeout = 60000;
    this.maxRetries = 3;
    this.baseURL = BASE_URL;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    this.initializeInterceptors();
  }

  async checkNetwork() {
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
      throw new Error('NO_INTERNET');
    }

    return true;
  }

  processQueue(error, token = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  async handleSessionExpiry() {
    console.log('🧹 Handling session expiry - clearing all tokens...');

    try {
      // Clear tokens from storage
      await clearTokens();
      console.log('✅ Tokens cleared successfully');
    } catch (error) {
      console.log('❌ Error clearing tokens:', error);
    }

    // IMPORTANT: Dispatch logout action to clear Redux state and trigger navigation
    if (store && store.dispatch) {
      console.log('🔄 Dispatching logout action...');

      // Dispatch the logout action which will clear Redux state and navigate
      await store.dispatch(logout());
    }
  }

  // Update the refreshToken() function - add 500 with "Invalid refresh token" check
  async refreshToken() {
    try {
      console.log('🔄 Refreshing token...');

      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        console.log('❌ No refresh token found');
        throw new Error('NO_REFRESH_TOKEN');
      }

      console.log('📡 Calling refresh token endpoint...');
      console.log(
        '📡 Refresh token being sent:',
        refreshToken.substring(0, 20) + '...',
      );

      const response = await axios.post(
        `${this.baseURL}/auth/refresh-token`,
        {
          refreshToken: refreshToken,
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data;
      console.log('📡 Refresh token response received');

      let accessToken;
      let newRefreshToken;
      let user;

      // Parse the response structure
      if (data.data?.tokens?.access?.token) {
        accessToken = data.data.tokens.access.token;
        newRefreshToken = data.data.tokens.refresh?.token;
        user = data.data.user || {};
        console.log('✅ Parsed from data.data.tokens.access.token');
      } else if (data.data?.access?.token) {
        accessToken = data.data.access.token;
        newRefreshToken = data.data.refresh?.token;
        user = data.data.user || {};
        console.log('✅ Parsed from data.data.access.token');
      } else if (data.access?.token) {
        accessToken = data.access.token;
        newRefreshToken = data.refresh?.token;
        user = data.user || {};
        console.log('✅ Parsed from data.access.token');
      } else if (data.data?.accessToken) {
        accessToken = data.data.accessToken;
        newRefreshToken = data.data.refreshToken;
        user = data.data.user || {};
        console.log('✅ Parsed from data.data.accessToken');
      } else if (data.accessToken) {
        accessToken = data.accessToken;
        newRefreshToken = data.refreshToken;
        user = data.user || {};
        console.log('✅ Parsed from data.accessToken');
      } else {
        console.log('❌ Unexpected token structure:', JSON.stringify(data));
        throw new Error('INVALID_TOKEN_STRUCTURE');
      }

      // If refresh token is not returned in response, keep the old one
      if (!newRefreshToken) {
        newRefreshToken = refreshToken;
        console.log('⚠️ No new refresh token returned, keeping old one');
      }

      // Save the new tokens
      await saveTokens(accessToken, newRefreshToken, user);
      console.log('✅ Token refreshed and saved successfully');

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user,
      };
    } catch (error) {
      console.log('❌ Refresh token failed:', error.message);

      if (error.response) {
        console.log('❌ Response status:', error.response.status);
        console.log('❌ Response data:', JSON.stringify(error.response.data));
      }

      // Extract error message from response
      const errorResponseData = error.response?.data;
      const errorMessage = errorResponseData?.message || error.message;
      const isInvalidRefreshToken =
        errorMessage === 'Invalid refresh token' ||
        errorMessage?.toLowerCase().includes('invalid refresh token');

      // 🔥 FIX: Treat 500 with "Invalid refresh token" as expired token
      if (
        error.response?.status === 401 ||
        error.response?.status === 400 ||
        error.response?.status === 403 ||
        (error.response?.status === 500 && isInvalidRefreshToken) || // 👈 Added this
        error.message === 'NO_REFRESH_TOKEN'
      ) {
        console.log('❌ Refresh token is invalid/expired, logging out...');
        await this.handleSessionExpiry();
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }

      // For network errors or server errors, don't logout immediately
      throw error;
    }
  }

  initializeInterceptors() {
    /**
     * REQUEST INTERCEPTOR
     */
    this.axiosInstance.interceptors.request.use(
      async config => {
        await this.checkNetwork();

        const token = await getAccessToken();

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        config.headers['X-Platform'] = Platform.OS;
        config.headers['X-Platform-Version'] = Platform.Version.toString();
        config.headers['X-Request-Time'] = new Date().toISOString();

        return config;
      },
      error => Promise.reject(error),
    );

    /**
     * RESPONSE INTERCEPTOR
     */
    this.axiosInstance.interceptors.response.use(
      response => response,

      async error => {
        const originalRequest = error.config;

        // No response means network/timeout error
        if (!error.response) {
          console.log('❌ No response received:', error.message);
          return Promise.reject(error);
        }

        const status = error.response.status;
        const responseData = error.response.data;
        const errorMessage = responseData?.message || error.message;

        console.log(`❌ API Error ${status}:`, errorMessage);

        // Handle token expired - TRY TO REFRESH FIRST, DON'T LOGOUT IMMEDIATELY
        if (
          (errorMessage === 'Token expired' || status === 401) &&
          !originalRequest._retry
        ) {
          console.log('🔐 Token expired, attempting to refresh...');

          // If already refreshing, queue the request
          if (this.isRefreshing) {
            console.log('🔄 Refresh already in progress, queuing request...');
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(token => {
                originalRequest.headers.Authorization = 'Bearer ' + token;
                return this.axiosInstance(originalRequest);
              })
              .catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            console.log('🔄 Attempting token refresh...');
            const { accessToken } = await this.refreshToken();

            // Resolve all queued requests with new token
            this.processQueue(null, accessToken);

            // Retry original request with new token
            originalRequest.headers.Authorization = 'Bearer ' + accessToken;
            console.log('🔁 Retrying original request with new token...');
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            console.log('❌ Token refresh failed:', refreshError.message);
            this.processQueue(refreshError, null);

            // Logout for refresh token expired
            if (refreshError.message === 'REFRESH_TOKEN_EXPIRED') {
              console.log('🔐 Refresh token expired/invalid, logging out...');
              const sessionError = new Error('SESSION_EXPIRED');
              sessionError.isSessionExpired = true;
              return Promise.reject(sessionError);
            }

            // For other refresh errors, just reject without logout
            console.log(
              '⚠️ Refresh failed but not logging out (network/server error)',
            );
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Don't automatically logout on other errors
        return Promise.reject(error);
      },
    );
  }

  async request(config) {
    return this.axiosInstance(config);
  }

  async get(endpoint, options = {}) {
    return this.request({
      url: endpoint,
      method: 'GET',
      ...options,
    });
  }

  async post(endpoint, body, options = {}) {
    return this.request({
      url: endpoint,
      method: 'POST',
      data: body,
      ...options,
    });
  }

  async put(endpoint, body, options = {}) {
    return this.request({
      url: endpoint,
      method: 'PUT',
      data: body,
      ...options,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request({
      url: endpoint,
      method: 'DELETE',
      ...options,
    });
  }

  async upload(endpoint, formData, options = {}) {
    return this.request({
      url: endpoint,
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...options,
    });
  }

  async healthCheck() {
    try {
      const res = await this.get('/health');
      return res.status === 200;
    } catch {
      return false;
    }
  }
}

const apiService = new ApiService();

export default apiService;
export { ApiService };

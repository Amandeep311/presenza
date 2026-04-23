// keychainHelper.js - Remove dangerous clears

import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVICE_ID = 'com.presenza.app.tokens';
const REFRESH_SERVICE_ID = 'com.presenza.app.refresh';

export const saveTokens = async (accessToken, refreshToken, user) => {
  try {
    console.log('💾 Saving tokens...');

    await AsyncStorage.setItem(SERVICE_ID, accessToken);
    await AsyncStorage.setItem(REFRESH_SERVICE_ID, refreshToken);
    await EncryptedStorage.setItem('user_data', JSON.stringify(user));
    await AsyncStorage.setItem('user', JSON.stringify(user));

    console.log('✅ Tokens saved');
    return true;
  } catch (error) {
    console.log('❌ Error saving tokens:', error);
    return false;
  }
};

export const getAccessToken = async () => {
  try {
    return await AsyncStorage.getItem(SERVICE_ID);
  } catch (error) {
    console.log('❌ Error getting access token:', error);
    return null;
  }
};

export const getRefreshToken = async () => {
  try {
    return await AsyncStorage.getItem(REFRESH_SERVICE_ID);
  } catch (error) {
    console.log('❌ Error getting refresh token:', error);
    return null;
  }
};

export const getUser = async () => {
  try {
    const userData = await EncryptedStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.log('❌ Error getting user:', error);
    return null;
  }
};

export const debugStorage = async () => {
  try {
    console.log('🔍 DEBUG: Checking AsyncStorage contents');

    const accessToken = await AsyncStorage.getItem(SERVICE_ID);
    const refreshToken = await AsyncStorage.getItem(REFRESH_SERVICE_ID);
    const user = await AsyncStorage.getItem('user');

    console.log('Access token exists:', !!accessToken);
    console.log('Refresh token exists:', !!refreshToken);
    console.log('User exists:', !!user);

    return true;
  } catch (error) {
    console.log('Debug error:', error);
    return false;
  }
};

export const clearTokens = async () => {
  try {
    console.log('🧹 Clearing tokens...');

    // Remove ONLY our specific keys
    await AsyncStorage.multiRemove([SERVICE_ID, REFRESH_SERVICE_ID, 'user']);
    await EncryptedStorage.removeItem('user_data');

    console.log('✅ Tokens cleared');
    return true;
  } catch (error) {
    console.log('❌ Error clearing tokens:', error);
    
    // Try one more time with individual removes
    try {
      await AsyncStorage.removeItem(SERVICE_ID);
      await AsyncStorage.removeItem(REFRESH_SERVICE_ID);
      await AsyncStorage.removeItem('user');
      await EncryptedStorage.removeItem('user_data');
      console.log('✅ Force clear successful');
      return true;
    } catch (e) {
      console.log('❌ Force clear failed:', e);
      return false;
    }
  }
};

// Remove resetEverything function as it's dangerous
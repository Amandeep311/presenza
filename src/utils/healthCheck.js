import apiService from '../services/apiService';
import NetInfo from '@react-native-community/netinfo';

export const checkApiHealth = async () => {
  try {
    // First check internet connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('📡 No internet connection');
      return {
        isHealthy: false,
        status: 'NO_INTERNET',
        error: 'No internet connection',
      };
    }

    console.log('📡 Checking API health...');
    const response = await apiService.get('/health', {
      timeout: 10000, // 10 second timeout
    });

    console.log('📡 Health check response:', response.status);

    if (response.status === 200) {
      return {
        isHealthy: true,
        status: response.status,
        data: response.data,
      };
    }

    return {
      isHealthy: false,
      status: response.status,
      error: `API returned status ${response.status}`,
    };
  } catch (error) {
    console.log('❌ Health check failed:', error.message);

    let errorMessage = 'Unknown error';
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out';
    } else if (error.response) {
      errorMessage = `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'No response from server';
    } else if (error.message === 'NO_INTERNET') {
      errorMessage = 'No internet connection';
    } else {
      errorMessage = error.message;
    }

    return {
      isHealthy: false,
      status: error.response?.status || 'ERROR',
      error: errorMessage,
    };
  }
};
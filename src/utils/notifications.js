// src/utils/notifications.js
import messaging from '@react-native-firebase/messaging';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/NotificationService';
import PushNotification from 'react-native-push-notification';

// 1. Request Permission (Required for Android 13+)
export async function requestUserPermission() {
  try {
    console.log('📱 Requesting notification permission...');
    
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'This app would like to send you notifications for punch reminders.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Notification permission granted.');
        // Get and log the FCM token after permission is granted
        await getFCMToken();
        // Initialize local notification reminders
        await NotificationService.scheduleWeekdayReminders();
      } else {
        console.log('❌ Notification permission denied.');
      }
    } else {
      // For Android versions below 33, permission is not required
      console.log('ℹ️ Notification permission not required for this Android version.');
      await getFCMToken();
      await NotificationService.scheduleWeekdayReminders();
    }
  } catch (error) {
    console.log('❌ Permission error:', error);
  }
}

// 2. Get the FCM Token
export const getFCMToken = async () => {
  try {
    console.log('📱 Getting FCM token...');
    const token = await messaging().getToken();
    console.log('📱 FCM Token:', token);
    // Save token to AsyncStorage
    await AsyncStorage.setItem('fcm_token', token);
    return token;
  } catch (error) {
    console.log('❌ Error getting FCM token:', error);
    return null;
  }
};

// 3. Foreground Message Handler
export const notificationListener = () => {
  console.log('📱 Setting up foreground notification listener...');
  
  // This listener will be triggered when a notification is received while the app is open
  try {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('📩 Foreground Notification:', remoteMessage);
      
      // Extract notification data
      const title = remoteMessage.notification?.title || 'New Notification';
      const body = remoteMessage.notification?.body || 'You have a new message.';
      
      // Show alert for foreground notifications
      Alert.alert(title, body);
      
      // Also show as local notification
      PushNotification.localNotification({
        channelId: 'general',
        title: title,
        message: body,
        playSound: true,
        vibrate: true,
        priority: 'high',
        importance: 'high',
      });
    });

    return unsubscribe;
  } catch (error) {
    console.log('❌ Error setting up notification listener:', error);
    return null;
  }
};

// 4. Background/Quit State Message Handler
export const setupBackgroundHandler = () => {
  try {
    console.log('📱 Setting up background notification handler...');
    // This handler runs when the app is in the background or terminated
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📩 Background/Quit Notification:', remoteMessage);
      // Notifications will appear in the system tray automatically.
      // You can perform background tasks here (like syncing data).
    });
  } catch (error) {
    console.log('❌ Error setting up background handler:', error);
  }
};

// 5. Initialize all notification systems
export const initializeNotifications = async () => {
  try {
    // Request permission
    await requestUserPermission();
    
    // Setup background handler
    setupBackgroundHandler();
    
    // Setup foreground listener
    const unsubscribe = notificationListener();
    
    // Schedule local notifications
    await NotificationService.scheduleWeekdayReminders();
    
    console.log('✅ All notification systems initialized');
    return unsubscribe;
  } catch (error) {
    console.log('❌ Error initializing notifications:', error);
    return null;
  }
};
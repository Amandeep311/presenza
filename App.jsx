// App.js
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import store from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ToastProvider } from './src/components/common/ToastProvider';
import { requestUserPermission, setupBackgroundHandler } from './src/utils/notifications';
import PushNotification from 'react-native-push-notification';
import NotificationService from './src/services/NotificationService';
import { Platform } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

const App = () => {
  // Disable logs in production
  if (!__DEV__) {
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
    console.debug = () => {};
  }

  // ✅ ADD THIS useEffect FOR PUSH NOTIFICATIONS
  useEffect(() => {
    // Initialize notifications
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        
        // 1. Request permission on app start
        await requestUserPermission();

        // 2. Set up the background message handler (runs in the background)
        setupBackgroundHandler();

        // 3. Configure PushNotification
        PushNotification.configure({
          onRegister: function(token) {
            console.log('📱 Push Notification Token:', token);
          },
          onNotification: function(notification) {
            console.log('📩 Notification Received:', notification);
            
            // Handle notification tap
            if (notification.userInteraction) {
              console.log('🖱️ User tapped the notification');
            }
            
            // Required for iOS
            if (Platform.OS === 'ios') {
              notification.finish(PushNotificationIOS.FetchResult.NoData);
            }
          },
          onAction: function(notification) {
            console.log('🎯 Notification Action:', notification.action);
          },
          onRegistrationError: function(err) {
            console.error('❌ Registration Error:', err.message);
          },
          permissions: {
            alert: true,
            badge: true,
            sound: true,
          },
          popInitialNotification: true,
          requestPermissions: Platform.OS === 'ios' ? true : false,
        });

        // 4. Create notification channels for Android
        PushNotification.createChannel(
          {
            channelId: 'punch_reminder',
            channelName: 'Punch Reminders',
            channelDescription: 'Reminders for punch in/out',
            soundName: 'default',
            importance: 4,
            vibrate: true,
          },
          created => console.log(`✅ Channel 'punch_reminder' created: ${created}`),
        );

        PushNotification.createChannel(
          {
            channelId: 'general',
            channelName: 'General Notifications',
            channelDescription: 'General app notifications',
            soundName: 'default',
            importance: 3,
            vibrate: true,
          },
          created => console.log(`✅ Channel 'general' created: ${created}`),
        );

        // 5. Initialize daily reminders
        await NotificationService.scheduleWeekdayReminders();
        
        console.log('✅ App initialization complete');
      } catch (error) {
        console.log('❌ App initialization error:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider>
        <LanguageProvider>
          <NavigationContainer>
            <ToastProvider>
              <AppNavigator />
            </ToastProvider>
          </NavigationContainer>
        </LanguageProvider>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
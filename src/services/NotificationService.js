// src/services/NotificationService.js
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  constructor() {
    this.isConfigured = false;
    this.configure();
  }

  configure() {
    try {
      PushNotification.configure({
        onRegister: function(token) {
          console.log('📱 Push Notification Token:', token);
          if (token?.token) {
            AsyncStorage.setItem('push_token', token.token);
          }
        },
        onNotification: function(notification) {
          console.log('📩 Notification Received:', notification);
          
          if (notification.userInteraction) {
            console.log('🖱️ User tapped the notification');
            if (notification.data?.type === 'PUNCH_IN_REMINDER') {
              console.log('📌 Navigate to Punch In screen');
            } else if (notification.data?.type === 'PUNCH_OUT_REMINDER') {
              console.log('📌 Navigate to Punch Out screen');
            }
          }
          
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
        requestPermissions: true,
      });

      // Create notification channel for Android
      this.createChannels();
      this.isConfigured = true;
      console.log('✅ NotificationService configured successfully');
    } catch (error) {
      console.log('❌ Error configuring NotificationService:', error);
      this.isConfigured = false;
    }
  }

  createChannels() {
    try {
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
    } catch (error) {
      console.log('❌ Error creating channels:', error);
    }
  }

  // Schedule a local notification
  scheduleLocalNotification = (date, title, message, data = {}) => {
    try {
      if (!this.isConfigured) {
        console.log('❌ NotificationService not configured');
        return null;
      }

      const notificationDate = new Date(date);
      
      if (notificationDate.getTime() <= Date.now()) {
        console.log('⏰ Notification date is in the past, scheduling for now');
        // If date is in past, schedule for 5 seconds from now
        notificationDate.setTime(Date.now() + 5000);
      }

      const notificationId = Date.now() + Math.floor(Math.random() * 1000);
      
      PushNotification.localNotificationSchedule({
        channelId: 'punch_reminder',
        id: notificationId,
        title: title || 'Reminder',
        message: message || 'You have a notification',
        date: notificationDate,
        allowWhileIdle: true,
        playSound: true,
        soundName: 'default',
        vibrate: true,
        userInfo: { ...data, notificationId },
        priority: 'high',
        importance: 'high',
      });

      console.log(`📅 Scheduled notification for: ${notificationDate.toLocaleString()}`);
      console.log(`📝 Title: ${title}`);
      console.log(`📝 Message: ${message}`);
      
      return { id: notificationId, date: notificationDate };
    } catch (error) {
      console.log('❌ Error scheduling notification:', error);
      return null;
    }
  };

  // Schedule punch-in reminder (5 minutes before 9:30 AM)
  schedulePunchInReminder = async () => {
    try {
      if (!this.isConfigured) {
        console.log('❌ NotificationService not configured');
        return null;
      }

      const now = new Date();
      const punchInTime = new Date(now);
      punchInTime.setHours(9, 30, 0, 0);
      
      if (punchInTime.getTime() <= now.getTime()) {
        punchInTime.setDate(punchInTime.getDate() + 1);
      }
      
      const reminderTime = new Date(punchInTime);
      reminderTime.setMinutes(reminderTime.getMinutes() - 5);
      
      const isPunchedIn = await this.getPunchStatus();
      if (isPunchedIn) {
        console.log('✅ Already punched in, skipping punch-in reminder');
        return null;
      }

      const title = '⏰ Punch In Reminder';
      const message = 'Your punch-in time is in 5 minutes! Please get ready to punch in.';
      
      return this.scheduleLocalNotification(reminderTime, title, message, { 
        type: 'PUNCH_IN_REMINDER',
        time: '9:30 AM',
      });
    } catch (error) {
      console.log('❌ Error scheduling punch-in reminder:', error);
      return null;
    }
  };

  // Schedule punch-out reminder (5 minutes before 6:30 PM)
  schedulePunchOutReminder = async () => {
    try {
      if (!this.isConfigured) {
        console.log('❌ NotificationService not configured');
        return null;
      }

      const now = new Date();
      const punchOutTime = new Date(now);
      punchOutTime.setHours(18, 30, 0, 0);
      
      if (punchOutTime.getTime() <= now.getTime()) {
        punchOutTime.setDate(punchOutTime.getDate() + 1);
      }
      
      const reminderTime = new Date(punchOutTime);
      reminderTime.setMinutes(reminderTime.getMinutes() - 5);
      
      const isPunchedIn = await this.getPunchStatus();
      if (!isPunchedIn) {
        console.log('✅ Already punched out, skipping punch-out reminder');
        return null;
      }

      const title = '⏰ Punch Out Reminder';
      const message = 'Your punch-out time is in 5 minutes! Please wrap up and punch out.';
      
      return this.scheduleLocalNotification(reminderTime, title, message, { 
        type: 'PUNCH_OUT_REMINDER',
        time: '6:30 PM',
      });
    } catch (error) {
      console.log('❌ Error scheduling punch-out reminder:', error);
      return null;
    }
  };

  // Get punch status from AsyncStorage
  getPunchStatus = async () => {
    try {
      const isPunchedIn = await AsyncStorage.getItem('isPunchedIn');
      return isPunchedIn === 'true';
    } catch (error) {
      console.log('❌ Error checking punch status:', error);
      return false;
    }
  };

  // Update punch status and reschedule notifications
  updatePunchStatus = async (isPunchedIn) => {
    try {
      await AsyncStorage.setItem('isPunchedIn', String(isPunchedIn));
      console.log('✅ Punch status updated:', isPunchedIn);
      
      this.cancelAllNotifications();
      
      if (isPunchedIn) {
        await this.schedulePunchOutReminder();
      } else {
        await this.schedulePunchInReminder();
      }
      
      return true;
    } catch (error) {
      console.log('❌ Error updating punch status:', error);
      return false;
    }
  };

  // Cancel all scheduled notifications
  cancelAllNotifications = () => {
    try {
      PushNotification.cancelAllLocalNotifications();
      console.log('🗑️ All local notifications cancelled');
    } catch (error) {
      console.log('❌ Error cancelling notifications:', error);
    }
  };

  // Cancel specific notification by ID
  cancelNotification = (id) => {
    try {
      PushNotification.cancelLocalNotification(id);
      console.log(`🗑️ Notification ${id} cancelled`);
    } catch (error) {
      console.log('❌ Error cancelling notification:', error);
    }
  };

  // ==================== TEST METHODS ====================

  // Test immediate notification
  sendTestNotification = () => {
    try {
      if (!this.isConfigured) {
        console.log('❌ NotificationService not configured');
        Alert.alert('Error', 'Notification service not configured');
        return;
      }

      PushNotification.localNotification({
        channelId: 'general',
        title: '🔔 Test Notification',
        message: 'This is a test notification from your app!',
        playSound: true,
        soundName: 'default',
        vibrate: true,
        priority: 'high',
      });
      console.log('📤 Test notification sent');
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      console.log('❌ Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  // Test scheduled notification (5 seconds from now)
  sendTestScheduledNotification = () => {
    try {
      if (!this.isConfigured) {
        console.log('❌ NotificationService not configured');
        Alert.alert('Error', 'Notification service not configured');
        return;
      }

      const date = new Date(Date.now() + 5000);
      const result = this.scheduleLocalNotification(
        date,
        '⏰ Test Scheduled',
        'This is a test notification scheduled for 5 seconds from now',
        { type: 'TEST' }
      );
      
      if (result) {
        console.log('⏰ Test scheduled notification set for 5 seconds');
        Alert.alert('Success', 'Test notification scheduled for 5 seconds!');
      } else {
        Alert.alert('Error', 'Failed to schedule test notification');
      }
    } catch (error) {
      console.log('❌ Error scheduling test notification:', error);
      Alert.alert('Error', 'Failed to schedule test notification');
    }
  };

  // Quick test - schedule notification in 2 minutes
  quickTest = async () => {
    try {
      if (!this.isConfigured) {
        console.log('❌ NotificationService not configured');
        Alert.alert('Error', 'Notification service not configured');
        return false;
      }

      const now = new Date();
      const testTime = new Date(now);
      testTime.setMinutes(testTime.getMinutes() + 2);
      
      const result = this.scheduleLocalNotification(
        testTime,
        '🧪 Quick Test Notification',
        'This is a test notification scheduled 2 minutes from now!',
        { type: 'QUICK_TEST' }
      );
      
      if (result) {
        console.log('✅ Quick test notification scheduled');
        Alert.alert(
          '✅ Test Scheduled',
          `Notification will appear at ${testTime.toLocaleTimeString()}\n\nMake sure app is in background or closed to see it!`,
          [{ text: 'OK' }]
        );
        return true;
      } else {
        Alert.alert('Error', 'Failed to schedule test notification');
        return false;
      }
    } catch (error) {
      console.log('❌ Error in quick test:', error);
      Alert.alert('Error', 'Failed to schedule test notification');
      return false;
    }
  };

  // Set test punch times
  setTestPunchTimes = (punchInHour, punchInMinute, punchOutHour, punchOutMinute) => {
    this._testPunchInTime = { hour: punchInHour, minute: punchInMinute };
    this._testPunchOutTime = { hour: punchOutHour, minute: punchOutMinute };
    console.log('🧪 Test times set:', {
      punchIn: `${punchInHour}:${punchInMinute}`,
      punchOut: `${punchOutHour}:${punchOutMinute}`
    });
  };

  // Reset to default times
  resetTestPunchTimes = () => {
    this._testPunchInTime = null;
    this._testPunchOutTime = null;
    console.log('🧪 Test times reset to default');
  };

  // Initialize daily reminders
  initializeDailyReminders = async () => {
    try {
      if (!this.isConfigured) {
        console.log('❌ NotificationService not configured');
        return;
      }

      console.log('🔄 Initializing daily reminders...');
      this.cancelAllNotifications();
      
      const now = new Date();
      const day = now.getDay();
      
      if (day === 0 || day === 6) {
        console.log('📅 Weekend detected, not scheduling reminders');
        return;
      }
      
      const isPunchedIn = await this.getPunchStatus();
      
      if (isPunchedIn) {
        await this.schedulePunchOutReminder();
      } else {
        await this.schedulePunchInReminder();
      }
      
      console.log('✅ Daily reminders initialized successfully');
    } catch (error) {
      console.log('❌ Error initializing reminders:', error);
    }
  };

  // Schedule for weekdays only
  scheduleWeekdayReminders = async () => {
    try {
      if (!this.isConfigured) {
        console.log('❌ NotificationService not configured');
        return;
      }

      const now = new Date();
      const day = now.getDay();
      
      if (day === 0 || day === 6) {
        console.log('📅 Weekend detected, not scheduling reminders');
        return;
      }
      
      await this.initializeDailyReminders();
    } catch (error) {
      console.log('❌ Error scheduling weekday reminders:', error);
    }
  };
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
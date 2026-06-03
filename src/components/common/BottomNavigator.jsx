// src/components/common/BottomNavigator.jsx
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Home, Clock, Settings } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Fonts } from '../../utils/GlobalText';
import { setAlert } from '../../store/actions/authActions';
import { showToast } from './ToastProvider';

const BottomNavigator = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;
  const insets = useSafeAreaInsets();
  
  // Add debounce refs
  const hasShownToastRef = useRef(false);
  const timeoutRef = useRef(null);
  const DEBOUNCE_DELAY = 3000; // 3 seconds - prevent any second toast
  
  // Get today's attendance status from Redux
  const { history } = useSelector(state => state.attendance);
  
  // Check if user is already punched in today
  const today = new Date().toISOString().split('T')[0];
  const todayRecord = history?.find(record => {
    const recordDate = record.date.split('T')[0];
    return recordDate === today;
  });
  
  const sessions = todayRecord?.sessions || [];
  const lastSession = sessions[sessions.length - 1];
  const isUserCheckedIn = todayRecord?.status === 'PRESENT' && !lastSession?.punchOut;

  const tabs = [
    {
      name: 'Home',
      icon: Home,
      label: t.nav.home,
      route: 'Home',
    },
    {
      name: 'DailyPuch',
      icon: Clock,
      label: t.nav.punch,
      route: 'DailyPuch',
    },
    {
      name: 'Settings',
      icon: Settings,
      label: t.nav.settings,
      route: 'AppSettings',
    }
  ];

  const isActive = (tabRoute) => {
    return route.name === tabRoute;
  };

  const handleTabPress = (tab) => {
    if (tab.route === 'DailyPuch') {
      // Check if already punched in
      if (isUserCheckedIn) {
        // If toast already shown, don't show again
        if (hasShownToastRef.current) {
          console.log('Toast already shown, ignoring');
          return;
        }
        
        // Mark that toast has been shown
        hasShownToastRef.current = true;
        
        // Show toast only once
        showToast(t.alerts.alreadyPunchedIn || 'You are already punched in!', 'error', 3000);
        
        // Clear the timeout if exists
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        // Reset after delay to allow future toasts (if needed)
        timeoutRef.current = setTimeout(() => {
          hasShownToastRef.current = false;
          timeoutRef.current = null;
        }, DEBOUNCE_DELAY);
        
        return;
      }
    }
    
    // Navigate for other tabs or if not checked in
    navigation.navigate(tab.route);
  };

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: C.bottomNavBg,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : insets.bottom + 8,
        }
      ]}
    >
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const active = isActive(tab.route);
        
        return (
          <TouchableOpacity
            key={index}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab)}
            activeOpacity={0.7}
          >
            <Icon 
              size={wp('5.5%')} 
              color={active ? C.primary : C.textSecondary} 
            />
            <Text 
              style={[
                styles.tabLabel,
                { color: active ? C.primary : C.textSecondary }
              ]}
            >
              {tab.label}
            </Text>
            {active && <View style={[styles.activeIndicator, { backgroundColor: C.primary }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp('0.5%'),
    position: 'relative',
  },
  tabLabel: {
    fontSize: wp('3%'),
    fontFamily: Fonts.light,
    marginTop: hp('0.3%'),
  },
  activeIndicator: {
    position: 'absolute',
    top: -hp('0.5%'),
    width: wp('15%'),
    height: 3,
    borderRadius: 3,
  },
});

export default BottomNavigator;
// src/components/common/BottomNavigator.jsx
import React from 'react';
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
        // dispatch(setAlert(t.alerts.alreadyPunchedIn, 'error'));
        showToast(t.alerts.alreadyPunchedIn, 'error', 4000);
        return;
      }
    }
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
    // Remove fixed paddingBottom - will be handled by insets
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
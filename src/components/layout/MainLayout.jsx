// src/components/layout/MainLayout.jsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useTheme } from '../../context/ThemeContext';
import CustomHeader from '../common/CustomHeader';
import BottomNavigator from '../common/BottomNavigator';

const MainLayout = ({
  children,
  title,
  showBack = false,
  showMenu = false,
  headerRightComponent,
  headerBackgroundColor,
  hideBottomNav = false,
  onMenuPress,
  userName,
  greeting,
  date,
  showProfile,
  onProfilePress,
}) => {
  const { theme } = useTheme();
  const C = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <CustomHeader
        title={title}
        showBack={showBack}
        showMenu={showMenu}
        onMenuPress={onMenuPress}
        rightComponent={headerRightComponent}
        backgroundColor={headerBackgroundColor || C.headerBg}
        userName={userName}
        greeting={greeting}
        date={date}
        showProfile={showProfile}
        onProfilePress={onProfilePress}
      />

      {/* Content */}
      <View
        style={styles.contentContainer}
        // contentContainerStyle={styles.contentContainer}
        // showsVerticalScrollIndicator={false}
      >
        {children}
      </View>

      {/* Bottom Navigation */}
      {!hideBottomNav && <BottomNavigator />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: wp('5%'),
    paddingTop: hp('2%'),
    paddingBottom: hp('20%'),
  },
});

export default MainLayout;

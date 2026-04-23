import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Fonts } from '../../utils/GlobalText';

const StatItem = ({ icon: Icon, value, label, color, theme }) => {
  const C = theme.colors;

  return (
    <View style={styles.statItem}>
      <View
        style={[
          styles.statIconWrap,
          { backgroundColor: color + '15' },
        ]}
      >
        <Icon size={wp('3.5%')} color={color} />
      </View>
      <View style={styles.statTextCol}>
        <Text style={[styles.statValue, { color: C.textPrimary }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.statLabel, { color: C.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    minWidth: 0,
  },
  statIconWrap: {
    width: wp('7%'),
    height: wp('7%'),
    borderRadius: wp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  statTextCol: {
    flex: 1,
    minWidth: 0,
  },
  statValue: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.bold,
  },
  statLabel: {
    fontSize: wp('2.4%'),
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
});

export default StatItem;
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { Fonts } from '../../utils/GlobalText';

const StatusPill = ({ status, color, icon: Icon, style }) => {
  return (
    <View style={[styles.statusPill, { backgroundColor: color + '12' }, style]}>
      {Icon && (
        <View style={[styles.statusPillDot, { backgroundColor: color }]} />
      )}
      <Text style={[styles.statusPillText, { color }]} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('2.5%'),
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
    alignSelf: 'flex-start',
    marginBottom: 4,
    maxWidth: '100%',
  },
  statusPillDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  statusPillText: {
    fontSize: wp('2.4%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
});

export default StatusPill;
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Coffee } from 'lucide-react-native';
import { Fonts } from '../../utils/GlobalText';

const BreakItem = ({ break: b, formatTime, getFormattedDuration, theme }) => {
  const C = theme.colors;

  return (
    <View style={[styles.breakRow, { borderBottomColor: C.border }]}>
      <View style={styles.breakRowLeft}>
        <View
          style={[
            styles.breakTypeBadge,
            {
              backgroundColor: b.breakOut
                ? C.border + '30'
                : C.warning + '15',
            },
          ]}
        >
          <Coffee
            size={wp('3%')}
            color={b.breakOut ? C.textSecondary : C.warning}
          />
          <Text
            style={[
              styles.breakTypeBadgeText,
              {
                color: b.breakOut
                  ? C.textSecondary
                  : C.warning,
              },
            ]}
            numberOfLines={1}
          >
            {b.breakType}
          </Text>
        </View>
        {b.remarks ? (
          <Text
            style={[styles.breakRemark, { color: C.textSecondary }]}
            numberOfLines={2}
          >
            Remarks: {b.remarks}
          </Text>
        ) : null}
        <Text
          style={[styles.breakTimeRange, { color: C.textSecondary }]}
          numberOfLines={1}
        >
          {formatTime(b.breakIn)}
          {b.breakOut
            ? ` → ${formatTime(b.breakOut)}`
            : ` → Ongoing`}
        </Text>
      </View>

      <View
        style={[
          styles.breakDurationBadge,
          {
            backgroundColor: b.durationMinutes
              ? C.primary + '12'
              : C.warning + '12',
          },
        ]}
      >
        <Text
          style={[
            styles.breakDurationText,
            {
              color: b.durationMinutes
                ? C.primary
                : C.warning,
            },
          ]}
        >
          {b.durationMinutes
            ? getFormattedDuration(b.durationMinutes)
            : '●'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp('0.9%'),
    gap: wp('2%'),
  },
  breakRowLeft: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  breakTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: wp('2%'),
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
    maxWidth: '100%',
  },
  breakTypeBadgeText: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
    flexShrink: 1,
  },
  breakRemark: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.regular,
    paddingLeft: 2,
  },
  breakTimeRange: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.regular,
    paddingLeft: 2,
  },
  breakDurationBadge: {
    paddingHorizontal: wp('2.5%'),
    paddingVertical: hp('0.4%'),
    borderRadius: 20,
    flexShrink: 0,
    alignSelf: 'center',
  },
  breakDurationText: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },
});

export default BreakItem;
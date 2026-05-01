import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Fonts } from '../../utils/GlobalText';

const QuickActionCard = ({
  icon: Icon,
  label,
  color,
  onPress,
  disabled = false,
  isActive = false,
  hint,
  theme,
}) => {
  const C = theme.colors;

  // Create lighter version of the color (20% opacity background)
  const getLighterColor = (baseColor) => {
    if (disabled) return C.disabled + '20';
    return baseColor + '20'; // 20% opacity for lighter background
  };

  return (
    <TouchableOpacity
      style={[
        styles.actionCard,
        disabled && styles.actionCardDisabled,
        isActive && { borderColor: C.warning + '66' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: getLighterColor(color) },
        ]}
      >
        <Icon size={wp('5%')} color={disabled ? C.disabled : color} />
      </View>
      <Text
        style={[
          styles.actionLabel,
          { color: C.iconTitle },
          disabled && { color: C.disabled },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
      {isActive && (
        <View style={[styles.activePill, { backgroundColor: C.warning }]}>
          <Text style={[styles.activePillText, { color: C.textDark }]}>
            Active
          </Text>
        </View>
      )}
      {/* {hint && (
        <Text style={[styles.actionHint, { color: C.textSecondary }]}>
          {hint}
        </Text>
      )} */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  actionCard: {
    width: (wp('100%') - wp('8%')) / 4, // 4 items per row with spacing
    aspectRatio: 1, // Makes it square
    borderRadius: wp('3%'),
    paddingVertical: hp('2%'),
    paddingHorizontal: wp('2%'),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // No background
    borderWidth: 0, // No border
    elevation: 0, // Remove shadow
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  actionCardDisabled: { opacity: 0.4 },
  iconContainer: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('3%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('1%'),
  },
  actionLabel: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: hp('0.5%'),
    flexWrap: 'wrap',
    width: '100%',
  },
  actionHint: {
    fontSize: wp('2.2%'),
    fontFamily: Fonts.regular,
    marginTop: 3,
    textAlign: 'center',
  },
  activePill: {
    paddingHorizontal: wp('2.5%'),
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 4,
    position: 'absolute',
    top: hp('1%'),
    right: wp('2%'),
  },
  activePillText: { fontSize: wp('2%'), fontFamily: Fonts.medium },
});

export default QuickActionCard;
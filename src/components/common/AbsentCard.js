import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { XCircle, Mail, Phone } from 'lucide-react-native';
import { Fonts } from '../../utils/GlobalText';

const AbsentCard = ({ 
  managerName, 
  managerEmail, 
  managerPhone, 
  onApplyLeave, 
  onContactManager,
  theme,
  t 
}) => {
  const C = theme.colors;

  return (
    <View
      style={[
        styles.absentContainer,
        { backgroundColor: C.surface, borderColor: C.error + '30' },
      ]}
    >
      <View
        style={[
          styles.absentIconContainer,
          { backgroundColor: C.error + '12' },
        ]}
      >
        <XCircle size={wp('10%')} color={C.error} />
      </View>
      <Text style={[styles.absentTitle, { color: C.textPrimary }]}>
        {t.attendance.absent || 'Absent Today'}
      </Text>
      <Text style={[styles.absentMessage, { color: C.textSecondary }]}>
        {t.attendance.noAttendanceToday}
      </Text>

      <View style={styles.contactManagerSection}>
        <Text style={[styles.contactManagerTitle, { color: C.textPrimary }]}>
          {t.attendance.contactManager || 'Contact Your Manager'}
        </Text>
        <View style={styles.contactButtonsRow}>
          {managerEmail ? (
            <TouchableOpacity
              style={[
                styles.contactButton,
                {
                  backgroundColor: C.primary + '12',
                  borderColor: C.primary,
                },
              ]}
              onPress={() => onContactManager('email')}
            >
              <Mail size={wp('4%')} color={C.primary} />
              <Text style={[styles.contactButtonText, { color: C.primary }]}>
                {t.attendance.email || 'Email'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {managerPhone ? (
            <TouchableOpacity
              style={[
                styles.contactButton,
                {
                  backgroundColor: C.success + '12',
                  borderColor: C.success,
                },
              ]}
              onPress={() => onContactManager('phone')}
            >
              <Phone size={wp('4%')} color={C.success} />
              <Text style={[styles.contactButtonText, { color: C.success }]}>
                {t.attendance.call || 'Call'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={[styles.managerName, { color: C.textSecondary }]}>
          {managerName || 'Your Manager'}
        </Text>
      </View>

      <View style={[styles.absentDivider, { backgroundColor: C.border }]} />

      <TouchableOpacity
        style={[styles.absentContactBtn, { borderColor: C.primary }]}
        onPress={onApplyLeave}
      >
        <Text style={[styles.absentContactText, { color: C.primary }]}>
          {t.attendance.applyLeave || 'Apply for Leave'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  absentContainer: {
    alignItems: 'center',
    padding: hp('3%'),
    margin: wp('4%'),
    borderRadius: wp('4%'),
    borderWidth: 1,
  },
  absentIconContainer: {
    width: wp('16%'),
    height: wp('16%'),
    borderRadius: wp('8%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('1.5%'),
  },
  absentTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
    marginBottom: hp('0.5%'),
  },
  absentMessage: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginBottom: hp('2%'),
  },
  contactManagerSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  contactManagerTitle: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
    marginBottom: hp('1%'),
  },
  contactButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp('3%'),
    marginBottom: hp('1%'),
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('5%'),
    borderWidth: 1,
    gap: wp('1.5%'),
  },
  contactButtonText: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },
  managerName: { fontSize: wp('2.8%'), fontFamily: Fonts.regular },
  absentDivider: { height: 1, width: '30%', marginBottom: hp('2%') },
  absentContactBtn: {
    paddingHorizontal: wp('6%'),
    paddingVertical: hp('1.2%'),
    borderRadius: wp('5%'),
    borderWidth: 1,
  },
  absentContactText: { fontSize: wp('3.2%'), fontFamily: Fonts.medium },
});

export default AbsentCard;
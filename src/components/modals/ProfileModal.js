import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Fonts } from '../../utils/GlobalText';

const ProfileModal = ({ visible, onClose, profile, theme, t }) => {
  const C = theme.colors;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: C.overlayBg }]}>
        <View
          style={[
            styles.profileModalCard,
            { backgroundColor: C.surfaceSolid, borderColor: C.border },
          ]}
        >
          <View style={styles.profileHeader}>
            <View style={[styles.profileAvatar, { backgroundColor: C.primary }]}>
              <Text style={[styles.profileAvatarText, { color: C.textDark }]}>
                {profile?.[0]?.fullName?.charAt(0).toUpperCase() || 'G'}
              </Text>
            </View>
            <Text style={[styles.profileName, { color: C.textPrimary }]}>
              {profile?.[0]?.fullName || 'Guest'}
            </Text>
            <Text style={[styles.profileDesignation, { color: C.textSecondary }]}>
              {profile?.[0]?.designation || '-'}
            </Text>
          </View>

          <View style={styles.profileInfoSection}>
            {[
              {
                label: t.settings.employeeCode || 'Employee Code',
                value: profile?.[0]?.employeeCode || '-',
              },
              {
                label: t.login.emailLabel || 'Email',
                value: profile?.[0]?.email || '-',
              },
              {
                label: t.attendance.department || 'Department',
                value: profile?.[0]?.department || '-',
              },
              {
                label: t.attendance.reportingManager || 'Reporting Manager',
                value: profile?.[0]?.reportingTo?.name || '-',
              },
            ].map((row, i) => (
              <View
                key={i}
                style={[styles.profileRow, { borderBottomColor: C.border }]}
              >
                <Text style={[styles.profileLabel, { color: C.textSecondary }]}>
                  {row.label}
                </Text>
                <Text
                  style={[styles.profileValue, { color: C.textPrimary }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.profileCloseBtn, { backgroundColor: C.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.profileCloseBtnText, { color: C.textDark }]}>
              {t.buttons.close || 'Close'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('6%'),
  },
  profileModalCard: {
    width: '100%',
    borderRadius: wp('5%'),
    padding: wp('6%'),
    borderWidth: 1,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: hp('2%'),
    paddingBottom: hp('2%'),
  },
  profileAvatar: {
    width: wp('18%'),
    height: wp('18%'),
    borderRadius: wp('9%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp('1%'),
  },
  profileAvatarText: { fontSize: wp('7%'), fontFamily: Fonts.bold },
  profileName: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  profileDesignation: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.regular,
    marginTop: 4,
    textAlign: 'center',
  },
  profileInfoSection: { marginTop: hp('1%') },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: hp('1.2%'),
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: wp('4%'),
  },
  profileLabel: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
    flexShrink: 0,
    maxWidth: '45%',
  },
  profileValue: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    flex: 1,
    textAlign: 'right',
  },
  profileCloseBtn: {
    marginTop: hp('2.5%'),
    paddingVertical: hp('1.4%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
  },
  profileCloseBtnText: { fontSize: wp('3.5%'), fontFamily: Fonts.medium },
});

export default ProfileModal;
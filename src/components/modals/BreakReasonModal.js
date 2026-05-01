// src/components/modals/BreakReasonModal.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Fonts } from '../../utils/GlobalText';
import { useSelector } from 'react-redux';

const BreakReasonModal = ({ visible, onClose, onConfirm, loading }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const [remarks, setRemarks] = useState('');
  const [breakType, setBreakType] = useState('LUNCH');
  const [wordCount, setWordCount] = useState(0);
  const MAX_WORDS = 30;

  const { profile } = useSelector(state => state.employeeProfile);

  const department = profile?.[0]?.department || '';
  const isSalesTeam = department.toLowerCase().includes('sales');

  // console.log('Employee isSalesTeam:', isSalesTeam);

  // Base break types for all employees
  const baseBreakTypes = [
    { label: t.breaks.lunch, value: 'LUNCH' },
    { label: t.breaks.tea, value: 'TEA' },
    // { label: t.breaks.coffee, value: 'COFFEE' },
    { label: t.breaks.personal, value: 'PERSONAL' },
    { label: t.breaks.other, value: 'OTHER' },
  ];

  // Sales team specific break types
  const salesBreakTypes = [
    { label: 'Sales Meeting', value: 'SALES_MEETING' },
    // { label: 'Follow Up', value: 'FOLLOW_UP' },
    { label: 'Demo', value: 'DEMO' },
    // { label: 'Collections', value: 'COLLECTIONS' },
  ];

  // Final break types based on department
  const breakTypes = isSalesTeam 
    ? [...baseBreakTypes, ...salesBreakTypes]
    : baseBreakTypes;

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setRemarks('');
    setBreakType('LUNCH');
    setWordCount(0);
  };

  // Function to count words
  const countWords = text => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  // Handle text change with word limit
  const handleTextChange = text => {
    const words = countWords(text);
    if (words <= MAX_WORDS) {
      setRemarks(text);
      setWordCount(words);
    } else {
      alert(`Maximum ${MAX_WORDS} words allowed`);
    }
  };

  const handleConfirm = () => {
    if (!remarks.trim()) {
      alert(t.breaks.reasonRequired || 'Please enter a reason for break');
      return;
    }
    if (wordCount > MAX_WORDS) {
      alert(`Please limit your reason to ${MAX_WORDS} words or less`);
      return;
    }
    onConfirm(breakType, remarks);
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const remainingWords = MAX_WORDS - wordCount;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: C.overlayBg }]}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: C.surfaceSolid,
              borderColor: C.border,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
              {t.breaks.startBreak}
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <X size={wp('6%')} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: C.textSecondary }]}>
            {t.breaks.breakType}
          </Text>
          <View style={styles.breakTypeContainer}>
            {breakTypes.map(type => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.breakTypeButton,
                  {
                    borderColor:
                      breakType === type.value ? C.primary : C.border,
                    backgroundColor:
                      breakType === type.value
                        ? C.primary + '20'
                        : 'transparent',
                  },
                ]}
                onPress={() => setBreakType(type.value)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.breakTypeText,
                    {
                      color:
                        breakType === type.value ? C.primary : C.textPrimary,
                    },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: C.textSecondary }]}>
            {t.breaks.reason}
          </Text>

          <View style={styles.wordCountContainer}>
            <Text
              style={[
                styles.wordCountText,
                {
                  color:
                    remainingWords <= 0
                      ? C.error
                      : remainingWords <= 10
                      ? C.warning
                      : C.textSecondary,
                },
              ]}
            >
              {wordCount} / {MAX_WORDS} words
            </Text>
            {remainingWords > 0 && remainingWords <= 10 && (
              <Text style={[styles.wordCountWarning, { color: C.warning }]}>
                {remainingWords} word{remainingWords !== 1 ? 's' : ''} remaining
              </Text>
            )}
            {remainingWords <= 0 && (
              <Text style={[styles.wordCountError, { color: C.error }]}>
                Word limit exceeded!
              </Text>
            )}
          </View>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: C.inputBg,
                borderColor: remainingWords < 0 ? C.error : C.inputBorder,
                color: C.textPrimary,
              },
              remainingWords < 0 && { borderWidth: 2 },
            ]}
            placeholder={t.breaks.reasonPlaceholder}
            placeholderTextColor={C.textSecondary}
            value={remarks}
            onChangeText={handleTextChange}
            multiline
            numberOfLines={4}
            editable={!loading}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  borderColor: C.border,
                },
              ]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text
                style={[styles.cancelButtonText, { color: C.textSecondary }]}
              >
                {t.breaks.cancel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: C.primary,
                },
                (loading || !remarks.trim() || wordCount > MAX_WORDS) && {
                  opacity: 0.5,
                },
              ]}
              onPress={handleConfirm}
              disabled={loading || !remarks.trim() || wordCount > MAX_WORDS}
            >
              {loading ? (
                <ActivityIndicator size="small" color={C.textDark} />
              ) : (
                <Text style={[styles.confirmButtonText, { color: C.textDark }]}>
                  {t.breaks.confirm}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
  },
  modalContent: {
    width: wp('90%'),
    borderRadius: wp('5%'),
    padding: wp('5%'),
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  modalTitle: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
  },
  label: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
    marginBottom: hp('1%'),
    marginTop: hp('1.5%'),
  },
  breakTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
    marginBottom: hp('1%'),
  },
  breakTypeButton: {
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    marginBottom: hp('1%'),
  },
  breakTypeText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
  },
  wordCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('0.5%'),
  },
  wordCountText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
  },
  wordCountWarning: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.regular,
  },
  wordCountError: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
  },
  input: {
    borderWidth: 1,
    borderRadius: wp('3%'),
    padding: wp('3%'),
    fontFamily: Fonts.regular,
    fontSize: wp('3.5%'),
    textAlignVertical: 'top',
    minHeight: hp('12%'),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp('3%'),
    gap: wp('3%'),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: hp('1.5%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: hp('1.5%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
  },
});

export default BreakReasonModal;
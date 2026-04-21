import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { Clock } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../utils/GlobalText';

const TimePickerModal = ({
  visible,
  onClose,
  onConfirm,
  initialTime = null,
  title = 'Select Time',
}) => {
  const { theme } = useTheme();
  const C = theme.colors;

  // Parse initial time or set defaults
  const parseTime = (timeStr) => {
    if (timeStr) {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        return {
          hour: parseInt(match[1]),
          minute: parseInt(match[2]),
          period: match[3].toUpperCase(),
        };
      }
    }
    return { hour: 10, minute: 0, period: 'AM' };
  };

  const initialParsed = parseTime(initialTime);
  const [tempHour, setTempHour] = useState(initialParsed.hour);
  const [tempMinute, setTempMinute] = useState(initialParsed.minute);
  const [tempPeriod, setTempPeriod] = useState(initialParsed.period);

  // Reset when modal opens with new initial time
  useEffect(() => {
    if (visible && initialTime) {
      const parsed = parseTime(initialTime);
      setTempHour(parsed.hour);
      setTempMinute(parsed.minute);
      setTempPeriod(parsed.period);
    } else if (visible && !initialTime) {
      setTempHour(10);
      setTempMinute(0);
      setTempPeriod('AM');
    }
  }, [visible, initialTime]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const handleConfirm = () => {
    const formattedTime = `${tempHour}:${tempMinute.toString().padStart(2, '0')} ${tempPeriod}`;
    onConfirm(formattedTime);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: C.overlayBg }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: C.surfaceSolid, borderColor: C.border },
          ]}
        >
          <View style={styles.header}>
            <Clock size={wp('5%')} color={C.primary} />
            <Text style={[styles.title, { color: C.textPrimary }]}>
              {title}
            </Text>
          </View>

          <View style={styles.pickerRow}>
            {/* Hours Column */}
            <View style={styles.column}>
              <Text style={[styles.columnLabel, { color: C.textSecondary }]}>
                Hour
              </Text>
              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.pickerItem,
                      tempHour === hour && {
                        backgroundColor: C.primary + '20',
                        borderColor: C.primary,
                      },
                    ]}
                    onPress={() => setTempHour(hour)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        {
                          color: tempHour === hour ? C.primary : C.textPrimary,
                          fontFamily: tempHour === hour ? Fonts.bold : Fonts.medium,
                        },
                      ]}
                    >
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Colon Separator */}
            <View style={styles.colonSeparator}>
              <Text style={[styles.colonText, { color: C.textPrimary }]}>
                :
              </Text>
            </View>

            {/* Minutes Column */}
            <View style={styles.column}>
              <Text style={[styles.columnLabel, { color: C.textSecondary }]}>
                Minute
              </Text>
              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {minutes.map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[
                      styles.pickerItem,
                      tempMinute === min && {
                        backgroundColor: C.primary + '20',
                        borderColor: C.primary,
                      },
                    ]}
                    onPress={() => setTempMinute(min)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        {
                          color: tempMinute === min ? C.primary : C.textPrimary,
                          fontFamily: tempMinute === min ? Fonts.bold : Fonts.medium,
                        },
                      ]}
                    >
                      {min.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Period Column (AM/PM) */}
            <View style={[styles.column, styles.periodColumn]}>
              <Text style={[styles.columnLabel, { color: C.textSecondary }]}>
                Period
              </Text>
              <View style={styles.periodContainer}>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    tempPeriod === 'AM' && {
                      backgroundColor: C.primary + '20',
                      borderColor: C.primary,
                    },
                  ]}
                  onPress={() => setTempPeriod('AM')}
                >
                  <Text
                    style={[
                      styles.periodText,
                      { color: tempPeriod === 'AM' ? C.primary : C.textSecondary },
                    ]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    tempPeriod === 'PM' && {
                      backgroundColor: C.primary + '20',
                      borderColor: C.primary,
                    },
                  ]}
                  onPress={() => setTempPeriod('PM')}
                >
                  <Text
                    style={[
                      styles.periodText,
                      { color: tempPeriod === 'PM' ? C.primary : C.textSecondary },
                    ]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: C.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: C.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: C.primary }]}
              onPress={handleConfirm}
            >
              <Text style={[styles.confirmBtnText, { color: '#fff' }]}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('8%'),
  },
  container: {
    width: '100%',
    borderRadius: wp('5%'),
    borderWidth: 1,
    padding: wp('5%'),
    gap: hp('2%'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp('2%'),
    marginBottom: hp('1%'),
  },
  title: {
    fontSize: wp('4%'),
    fontFamily: Fonts.bold,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: wp('2%'),
  },
  column: {
    alignItems: 'center',
    gap: hp('1%'),
    flex: 1,
  },
  periodColumn: {
    justifyContent: 'flex-start',
  },
  columnLabel: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  scrollView: {
    height: hp('22%'),
  },
  scrollContent: {
    alignItems: 'center',
  },
  pickerItem: {
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    borderColor: 'transparent',
    marginVertical: hp('0.3%'),
    width: wp('12%'),
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
  },
  colonSeparator: {
    justifyContent: 'center',
    height: hp('22%'),
    paddingTop: hp('4%'),
  },
  colonText: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
  },
  periodContainer: {
    gap: hp('0.8%'),
    width: '100%',
  },
  periodButton: {
    paddingHorizontal: wp('2.5%'),
    paddingVertical: hp('0.9%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    width: '100%',
  },
  periodText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
  },
  actions: {
    flexDirection: 'row',
    gap: wp('3%'),
    marginTop: hp('1%'),
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: hp('1.2%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: hp('1.2%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.bold,
    color: '#fff',
  },
});

export default TimePickerModal;
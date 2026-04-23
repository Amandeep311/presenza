import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Fonts } from '../../utils/GlobalText';

const AttendanceTable = ({ sessions, formatTime, getFormattedDuration, theme }) => {
  const C = theme.colors;

  return (
    <View style={[styles.tableSection, { borderColor: C.border }]}>
      <View
        style={[
          styles.tableHead,
          { backgroundColor: C.background + '80' },
        ]}
      >
        <Text
          style={[
            styles.tableHeadCell,
            styles.tableCellLeft,
            { color: C.primary },
          ]}
        >
          IN
        </Text>
        <Text
          style={[
            styles.tableHeadCell,
            styles.tableCellCenter,
            { color: C.primary },
          ]}
        >
          DURATION
        </Text>
        <Text
          style={[
            styles.tableHeadCell,
            styles.tableCellRight,
            { color: C.primary },
          ]}
        >
          OUT
        </Text>
      </View>
      {sessions.map((session, i) => (
        <View
          key={i}
          style={[
            styles.tableBodyRow,
            {
              backgroundColor:
                i % 2 === 0 ? C.background + '80' : C.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.tableBodyCell,
              styles.tableCellLeft,
              { color: C.success },
            ]}
            numberOfLines={1}
          >
            {session.punchIn ? formatTime(session.punchIn) : '---'}
          </Text>
          <Text
            style={[
              styles.tableBodyCell,
              styles.tableCellCenter,
              { color: C.textSecondary },
            ]}
            numberOfLines={1}
          >
            {session.durationMinutes
              ? getFormattedDuration(session.durationMinutes)
              : '---'}
          </Text>
          <Text
            style={[
              styles.tableBodyCell,
              styles.tableCellRight,
              { color: C.error },
            ]}
            numberOfLines={1}
          >
            {session.punchOut
              ? formatTime(session.punchOut)
              : '---'}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tableSection: {
    margin: wp('4%'),
    marginBottom: 0,
    borderRadius: wp('3%'),
    overflow: 'hidden',
    borderWidth: 1,
  },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('3%'),
  },
  tableBodyRow: {
    flexDirection: 'row',
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('3%'),
  },
  tableHeadCell: {
    flex: 1,
    fontSize: wp('2.5%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.4,
  },
  tableBodyCell: {
    flex: 1,
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
  },
  tableCellLeft: { textAlign: 'left' },
  tableCellCenter: { textAlign: 'center' },
  tableCellRight: { textAlign: 'right' },
});

export default AttendanceTable;
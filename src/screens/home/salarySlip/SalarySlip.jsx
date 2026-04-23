// import {
//   RefreshControl,
//   ScrollView,
//   StatusBar,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
//   ActivityIndicator,
//   Alert,
//   Platform,
//   PermissionsAndroid,
// } from 'react-native';
// import React, { useCallback, useState } from 'react';
// import { useTheme } from '../../../context/ThemeContext';
// import { useLanguage } from '../../../context/LanguageContext';
// import {
//   widthPercentageToDP as wp,
//   heightPercentageToDP as hp,
// } from 'react-native-responsive-screen';
// import { Fonts } from '../../../utils/GlobalText';
// import { ChevronLeft, Download, Calendar, FileText, User, Eye } from 'lucide-react-native';
// import RNFS from 'react-native-fs';
// import FileViewer from 'react-native-file-viewer';

// const SalarySlip = ({ navigation }) => {
//   const { theme } = useTheme();
//   const { t } = useLanguage();
//   const C = theme.colors;
//   const [refreshing, setRefreshing] = useState(false);
//   const [selectedMonth, setSelectedMonth] = useState(null);
//   const [downloading, setDownloading] = useState(false);
//   const [downloadedFile, setDownloadedFile] = useState(null);

//   // Dummy salary slips data
//   const [salarySlips, setSalarySlips] = useState([
//     {
//       id: '1',
//       month: 'January',
//       year: '2024',
//       employeeName: 'John Doe',
//       employeeCode: 'EMP001',
//       department: 'Engineering',
//       payDate: '2024-01-31',
//       grossSalary: 50000,
//       totalDeductions: 8500,
//       netSalary: 41500,
//       pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
//     },
//     {
//       id: '2',
//       month: 'February',
//       year: '2024',
//       employeeName: 'John Doe',
//       employeeCode: 'EMP001',
//       department: 'Engineering',
//       payDate: '2024-02-29',
//       grossSalary: 50000,
//       totalDeductions: 8500,
//       netSalary: 41500,
//       pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
//     },
//     {
//       id: '3',
//       month: 'March',
//       year: '2024',
//       employeeName: 'John Doe',
//       employeeCode: 'EMP001',
//       department: 'Engineering',
//       payDate: '2024-03-31',
//       grossSalary: 50000,
//       totalDeductions: 8500,
//       netSalary: 41500,
//       pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
//     },
//   ]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     setTimeout(() => {
//       setRefreshing(false);
//     }, 1000);
//   }, []);

//   const formatDate = (dateString) => {
//     if (!dateString) return '—';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric',
//     });
//   };

//   const formatCurrency = (amount) => {
//     if (!amount && amount !== 0) return '₹0';
//     return new Intl.NumberFormat('en-IN', {
//       style: 'currency',
//       currency: 'INR',
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0,
//     }).format(amount);
//   };

//   const requestStoragePermission = async () => {
//     if (Platform.OS === 'android') {
//       try {
//         const granted = await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
//           {
//             title: 'Storage Permission Required',
//             message: 'App needs permission to save salary slips to your device',
//             buttonNeutral: 'Ask Me Later',
//             buttonNegative: 'Cancel',
//             buttonPositive: 'OK',
//           }
//         );
//         return granted === PermissionsAndroid.RESULTS.GRANTED;
//       } catch (err) {
//         console.log('Permission error:', err);
//         return false;
//       }
//     }
//     return true;
//   };

//   const getDownloadPath = (fileName) => {
//     if (Platform.OS === 'ios') {
//       return `${RNFS.DocumentDirectoryPath}/${fileName}.pdf`;
//     } else {
//       return `${RNFS.DownloadDirectoryPath}/${fileName}.pdf`;
//     }
//   };

//   const openFile = async (filePath) => {
//     try {
//       await FileViewer.open(filePath);
//     } catch (error) {
//       console.error('Error opening file:', error);
//       Alert.alert(
//         'Cannot Open File',
//         'No app available to open this file. Please install a PDF viewer.',
//         [{ text: 'OK' }]
//       );
//     }
//   };

//   const downloadFile = async (url, fileName) => {
//     try {
//       const hasPermission = await requestStoragePermission();
//       if (!hasPermission) {
//         Alert.alert('Permission Denied', 'Cannot save file without storage permission');
//         return false;
//       }

//       const downloadDest = getDownloadPath(fileName);
      
//       console.log('Downloading to:', downloadDest);
      
//       const exists = await RNFS.exists(downloadDest);
//       if (exists) {
//         Alert.alert(
//           'File Already Exists',
//           `File already exists. What would you like to do?`,
//           [
//             { text: 'Cancel', style: 'cancel' },
//             { text: 'Open File', onPress: () => openFile(downloadDest) },
//             // { text: 'Download Again', onPress: () => downloadFile(url, fileName) }
//           ]
//         );
//         return true;
//       }

//       const downloadOptions = {
//         fromUrl: url,
//         toFile: downloadDest,
//         background: true,
//         progressDivider: 1,
//         begin: (res) => {
//           console.log('Download started:', res);
//         },
//         progress: (res) => {
//           const percentage = Math.floor((res.bytesWritten / res.contentLength) * 100);
//           console.log(`Download progress: ${percentage}%`);
//         },
//       };

//       const result = await RNFS.downloadFile(downloadOptions).promise;
      
//       if (result.statusCode === 200) {
//         setDownloadedFile(downloadDest);
//         Alert.alert(
//           'Download Complete',
//           'File downloaded successfully!',
//           [
//             { text: 'Close' },
//             { text: 'Open File', onPress: () => openFile(downloadDest) }
//           ]
//         );
//         return true;
//       } else {
//         throw new Error(`Download failed with status: ${result.statusCode}`);
//       }
//     } catch (error) {
//       console.error('Download error:', error);
//       Alert.alert('Download Failed', 'Failed to download file. Please try again.');
//       return false;
//     }
//   };

//   const handleDownload = async (slip) => {
//     if (!slip.pdfUrl) {
//       Alert.alert('Error', 'PDF URL not available');
//       return;
//     }

//     const fileName = `Salary_Slip_${slip.month}_${slip.year}_${slip.employeeCode}`;
//     const filePath = getDownloadPath(fileName);
    
//     // Check if file already exists
//     const exists = await RNFS.exists(filePath);
//     if (exists) {
//       Alert.alert(
//         'File Already Exists',
//         `Salary slip for ${slip.month} ${slip.year} is already downloaded.`,
//         [
//           { text: 'Cancel', style: 'cancel' },
//           { text: 'Open File', onPress: () => openFile(filePath) },
//           // { text: 'Download Again', onPress: async () => {
//           //   setDownloading(true);
//           //   await downloadFile(slip.pdfUrl, fileName);
//           //   setDownloading(false);
//           // }}
//         ]
//       );
//       return;
//     }

//     Alert.alert(
//       'Download Salary Slip',
//       `Download salary slip for ${slip.month} ${slip.year}?`,
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Download',
//           onPress: async () => {
//             setDownloading(true);
//             await downloadFile(slip.pdfUrl, fileName);
//             setDownloading(false);
//           }
//         },
//       ]
//     );
//   };

//   const handleOpenFile = async (slip) => {
//     const fileName = `Salary_Slip_${slip.month}_${slip.year}_${slip.employeeCode}`;
//     const filePath = getDownloadPath(fileName);
    
//     const exists = await RNFS.exists(filePath);
//     if (exists) {
//       await openFile(filePath);
//     } else {
//       Alert.alert(
//         'File Not Found',
//         'Please download the file first.',
//         [
//           { text: 'Cancel', style: 'cancel' },
//           { text: 'Download', onPress: () => handleDownload(slip) }
//         ]
//       );
//     }
//   };

//   return (
//     <View style={[styles.container, { backgroundColor: C.background }]}>
//       <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />
      
//       {/* Header */}
//       <View
//         style={[
//           styles.header,
//           {
//             backgroundColor: C.background,
//             borderBottomColor: C.border,
//           },
//         ]}
//       >
//         <TouchableOpacity
//           onPress={() => navigation.goBack()}
//           style={[
//             styles.backBtn,
//             {
//               backgroundColor: C.surface,
//               borderColor: C.border,
//             },
//           ]}
//         >
//           <ChevronLeft size={wp('5%')} color={C.textPrimary} />
//         </TouchableOpacity>

//         <View style={styles.pageHeader}>
//           <Text style={[styles.pageTitle, { color: C.textPrimary }]}>
//             Salary Slips
//           </Text>
//           <Text style={[styles.pageSubtitle, { color: C.textSecondary }]}>
//             {salarySlips.length} Records
//           </Text>
//         </View>
//       </View>

//       {/* Content */}
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={styles.scroll}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             colors={[C.primary]}
//             tintColor={C.primary}
//           />
//         }
//       >
//         {/* Month Selection */}
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={styles.monthScroll}
//         >
//           {salarySlips.map((slip) => (
//             <TouchableOpacity
//               key={slip.id}
//               style={[
//                 styles.monthCard,
//                 {
//                   backgroundColor: selectedMonth === slip ? C.primary : C.surface,
//                   borderColor: C.border,
//                 },
//               ]}
//               onPress={() => setSelectedMonth(slip)}
//             >
//               <Calendar
//                 size={wp('4%')}
//                 color={selectedMonth === slip ? '#fff' : C.textSecondary}
//               />
//               <Text
//                 style={[
//                   styles.monthText,
//                   {
//                     color: selectedMonth === slip ? '#fff' : C.textPrimary,
//                   },
//                 ]}
//               >
//                 {slip.month} {slip.year}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </ScrollView>

//         {/* Salary Slip Details */}
//         {selectedMonth ? (
//           <View style={[styles.slipContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
//             {/* Employee Info */}
//             <View style={styles.employeeSection}>
//               <View style={[styles.employeeIconWrap, { backgroundColor: C.primary + '15' }]}>
//                 <User size={wp('6%')} color={C.primary} />
//               </View>
//               <View style={styles.employeeInfo}>
//                 <Text style={[styles.employeeName, { color: C.textPrimary }]}>
//                   {selectedMonth.employeeName}
//                 </Text>
//                 <Text style={[styles.employeeCode, { color: C.textSecondary }]}>
//                   {selectedMonth.employeeCode}
//                 </Text>
//               </View>
//             </View>

//             <View style={[styles.divider, { backgroundColor: C.border }]} />

//             {/* Details */}
//             <View style={styles.detailsContainer}>
//               <View style={styles.detailRow}>
//                 <Text style={[styles.detailLabel, { color: C.textSecondary }]}>Department</Text>
//                 <Text style={[styles.detailValue, { color: C.textPrimary }]}>{selectedMonth.department}</Text>
//               </View>
//               <View style={styles.detailRow}>
//                 <Text style={[styles.detailLabel, { color: C.textSecondary }]}>Pay Date</Text>
//                 <Text style={[styles.detailValue, { color: C.textPrimary }]}>{formatDate(selectedMonth.payDate)}</Text>
//               </View>
//               <View style={styles.detailRow}>
//                 <Text style={[styles.detailLabel, { color: C.textSecondary }]}>Gross Salary</Text>
//                 <Text style={[styles.detailValue, { color: C.textPrimary }]}>{formatCurrency(selectedMonth.grossSalary)}</Text>
//               </View>
//               <View style={styles.detailRow}>
//                 <Text style={[styles.detailLabel, { color: C.textSecondary }]}>Total Deductions</Text>
//                 <Text style={[styles.detailValue, { color: C.textPrimary }]}>{formatCurrency(selectedMonth.totalDeductions)}</Text>
//               </View>
//               <View style={[styles.detailRow, styles.netRow]}>
//                 <Text style={[styles.netLabel, { color: C.primary }]}>Net Payable</Text>
//                 <Text style={[styles.netAmount, { color: C.primary }]}>{formatCurrency(selectedMonth.netSalary)}</Text>
//               </View>
//             </View>

//             {/* Action Buttons */}
//             <View style={styles.actionButtons}>
//               <TouchableOpacity
//                 style={[styles.downloadBtn, { backgroundColor: C.primary }]}
//                 onPress={() => handleDownload(selectedMonth)}
//                 disabled={downloading}
//               >
//                 {downloading ? (
//                   <ActivityIndicator size="small" color="#fff" />
//                 ) : (
//                   <>
//                     <Download size={wp('4.5%')} color="#fff" />
//                     <Text style={styles.downloadBtnText}>Download</Text>
//                   </>
//                 )}
//               </TouchableOpacity>

//               <TouchableOpacity
//                 style={[styles.openBtn, { borderColor: C.primary }]}
//                 onPress={() => handleOpenFile(selectedMonth)}
//               >
//                 <Eye size={wp('4.5%')} color={C.primary} />
//                 <Text style={[styles.openBtnText, { color: C.primary }]}>Open File</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         ) : (
//           <View style={styles.emptyContainer}>
//             <FileText size={wp('15%')} color={C.textSecondary} strokeWidth={1.5} />
//             <Text style={[styles.emptyText, { color: C.textSecondary }]}>
//               Select a month to view salary slip
//             </Text>
//             <Text style={[styles.emptySubText, { color: C.textTertiary }]}>
//               Tap on any month above to see details
//             </Text>
//           </View>
//         )}
//       </ScrollView>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   scroll: {
//     paddingBottom: hp('5%'),
//     paddingHorizontal: wp('4%'),
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: wp('4%'),
//     paddingTop: Platform.OS === 'ios' ? hp('6%') : hp('5%'),
//     paddingBottom: hp('2%'),
//     borderBottomWidth: 1,
//   },
//   backBtn: {
//     width: wp('9%'),
//     height: wp('9%'),
//     borderRadius: wp('2.5%'),
//     borderWidth: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   pageHeader: {
//     flex: 1,
//     paddingLeft: wp('3%'),
//   },
//   pageTitle: {
//     fontSize: wp('5%'),
//     fontFamily: Fonts.bold,
//     letterSpacing: -0.3,
//   },
//   pageSubtitle: {
//     fontSize: wp('3%'),
//     fontFamily: Fonts.regular,
//     marginTop: 2,
//   },
//   monthScroll: {
//     paddingVertical: hp('2%'),
//     gap: wp('3%'),
//   },
//   monthCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: wp('4%'),
//     paddingVertical: hp('1.2%'),
//     borderRadius: wp('5%'),
//     borderWidth: 1,
//     gap: wp('2%'),
//   },
//   monthText: {
//     fontSize: wp('3.5%'),
//     fontFamily: Fonts.medium,
//   },
//   slipContainer: {
//     borderRadius: wp('4%'),
//     borderWidth: 1,
//     padding: wp('4%'),
//     marginTop: hp('1%'),
//   },
//   employeeSection: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: hp('2%'),
//   },
//   employeeIconWrap: {
//     width: wp('12%'),
//     height: wp('12%'),
//     borderRadius: wp('6%'),
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: wp('3%'),
//   },
//   employeeInfo: {
//     flex: 1,
//   },
//   employeeName: {
//     fontSize: wp('4.2%'),
//     fontFamily: Fonts.bold,
//   },
//   employeeCode: {
//     fontSize: wp('3%'),
//     fontFamily: Fonts.regular,
//     marginTop: 2,
//   },
//   divider: {
//     height: 1,
//     marginVertical: hp('1.5%'),
//   },
//   detailsContainer: {
//     marginBottom: hp('2%'),
//   },
//   detailRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: hp('1%'),
//   },
//   detailLabel: {
//     fontSize: wp('3.2%'),
//     fontFamily: Fonts.regular,
//   },
//   detailValue: {
//     fontSize: wp('3.2%'),
//     fontFamily: Fonts.medium,
//   },
//   netRow: {
//     marginTop: hp('1%'),
//     paddingTop: hp('1%'),
//     borderTopWidth: 1,
//     borderTopColor: '#E0E0E0',
//   },
//   netLabel: {
//     fontSize: wp('3.5%'),
//     fontFamily: Fonts.bold,
//   },
//   netAmount: {
//     fontSize: wp('4%'),
//     fontFamily: Fonts.bold,
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     gap: wp('3%'),
//     marginTop: hp('1%'),
//   },
//   downloadBtn: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: hp('1.5%'),
//     borderRadius: wp('3%'),
//     gap: wp('2%'),
//   },
//   downloadBtnText: {
//     color: '#fff',
//     fontSize: wp('3.5%'),
//     fontFamily: Fonts.medium,
//   },
//   openBtn: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: hp('1.5%'),
//     borderRadius: wp('3%'),
//     gap: wp('2%'),
//     borderWidth: 1,
//     backgroundColor: 'transparent',
//   },
//   openBtnText: {
//     fontSize: wp('3.5%'),
//     fontFamily: Fonts.medium,
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingTop: hp('20%'),
//   },
//   emptyText: {
//     marginTop: hp('2%'),
//     fontSize: wp('4%'),
//     fontFamily: Fonts.medium,
//   },
//   emptySubText: {
//     marginTop: hp('1%'),
//     fontSize: wp('3%'),
//     fontFamily: Fonts.regular,
//     textAlign: 'center',
//   },
// });

// export default SalarySlip;
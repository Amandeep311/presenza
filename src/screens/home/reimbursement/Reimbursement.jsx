import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
  Alert,
  Platform,
  Image,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import RNFS from 'react-native-fs';
import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
} from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { Fonts } from '../../../utils/GlobalText';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { pick } from '@react-native-documents/picker';
import {
  ChevronLeft,
  Plus,
  Car,
  Train,
  Plane,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  CreditCard,
  Wallet,
  Trash2,
  Receipt,
  FilePlus,
  Loader,
  Eye,
} from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  createExpense,
  fetchExpenses,
} from '../../../store/actions/expenseActions';
import { requestCameraPermission, requestLocationPermission, quickCheckPermissions } from '../../../utils/permissions';

const Reimbursement = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;
  const dispatch = useDispatch();

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [initialLoadingDone, setInitialLoadingDone] = useState(false);
  const [openingFile, setOpeningFile] = useState(false);

  const { expenses, loading } = useSelector(state => state.expense);

  // Form state
  const [expenseType, setExpenseType] = useState('car');
  const [amount, setAmount] = useState('');
  const [hotelCost, setHotelCost] = useState('');
  const [foodCost, setFoodCost] = useState('');
  const [date, setDate] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [travelPaymentMethod, setTravelPaymentMethod] = useState('self-paid');
  const [foodPaymentMethod, setFoodPaymentMethod] = useState('self-paid');
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [kilometers, setKilometers] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [tempDay, setTempDay] = useState(new Date().getDate());
  const [tempMonth, setTempMonth] = useState(new Date().getMonth() + 1);
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [dateDisplay, setDateDisplay] = useState('');

  const [selectedFiles, setSelectedFiles] = useState([]);

  // ============ CONSTANTS ============
  const AMOUNT_MAX_LENGTH = 5;
  const AMOUNT_MAX_VALUE = 100000;
  const KM_MAX_VALUE = 1000;
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const LOCATION_MAX_LENGTH = 30;
  const PURPOSE_MAX_LENGTH = 30;
  const DESCRIPTION_MAX_LENGTH = 30;

  // Date picker visibility states
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  // Selected dates states
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  // Temporary states for From Date picker
  const [tempFromDay, setTempFromDay] = useState(1);
  const [tempFromMonth, setTempFromMonth] = useState(new Date().getMonth() + 1);
  const [tempFromYear, setTempFromYear] = useState(new Date().getFullYear());

  // Temporary states for To Date picker
  const [tempToDay, setTempToDay] = useState(1);
  const [tempToMonth, setTempToMonth] = useState(new Date().getMonth() + 1);
  const [tempToYear, setTempToYear] = useState(new Date().getFullYear());

  // Refs for From Date picker
  const fromDayScrollRef = useRef(null);
  const fromMonthScrollRef = useRef(null);
  const fromYearScrollRef = useRef(null);

  // Refs for To Date picker
  const toDayScrollRef = useRef(null);
  const toMonthScrollRef = useRef(null);
  const toYearScrollRef = useRef(null);

  // ============ REFS FOR EXISTING DATE PICKER ============
  const dayScrollRef = useRef(null);
  const monthScrollRef = useRef(null);
  const yearScrollRef = useRef(null);

  const ITEM_HEIGHT = hp('5%');

  useEffect(() => {
    loadExpenses();
  }, []);

  // Helper function to get days in a month
  const getDaysInMonthForPicker = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  // Handle From Date confirmation
  // Handle From Date confirmation
  const handleFromDateConfirm = () => {
    const selectedFromDate = new Date(tempFromYear, tempFromMonth - 1, tempFromDay);
    setFromDate(selectedFromDate);
    setShowFromDatePicker(false);

    // If To Date exists and is earlier than From Date, show alert and reset
    if (toDate && selectedFromDate > toDate) {
      alert('To Date cannot be earlier than From Date');
      setToDate(null);
    }
  };

  // Auto-scroll for From Date picker
  useLayoutEffect(() => {
    if (!showFromDatePicker) return;

    const timer = setTimeout(() => {
      if (fromDayScrollRef.current && tempFromDay) {
        const dayIndex = tempFromDay - 1;
        fromDayScrollRef.current.scrollTo({
          y: dayIndex * ITEM_HEIGHT,
          animated: false,
        });
      }
      if (fromMonthScrollRef.current && tempFromMonth) {
        const monthIndex = tempFromMonth - 1;
        fromMonthScrollRef.current.scrollTo({
          y: monthIndex * ITEM_HEIGHT,
          animated: false,
        });
      }

      const yearsArray = generateYearsArray();
      if (fromYearScrollRef.current && tempFromYear) {
        const yearIndex = yearsArray.indexOf(tempFromYear);
        if (yearIndex !== -1) {
          fromYearScrollRef.current.scrollTo({
            y: yearIndex * ITEM_HEIGHT,
            animated: false,
          });
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [showFromDatePicker, tempFromDay, tempFromMonth, tempFromYear]);

  // Auto-scroll for To Date picker
  useLayoutEffect(() => {
    if (!showToDatePicker) return;

    const timer = setTimeout(() => {
      if (toDayScrollRef.current && tempToDay) {
        const dayIndex = tempToDay - 1;
        toDayScrollRef.current.scrollTo({
          y: dayIndex * ITEM_HEIGHT,
          animated: false,
        });
      }
      if (toMonthScrollRef.current && tempToMonth) {
        const monthIndex = tempToMonth - 1;
        toMonthScrollRef.current.scrollTo({
          y: monthIndex * ITEM_HEIGHT,
          animated: false,
        });
      }

      const yearsArray = generateYearsArray();
      if (toYearScrollRef.current && tempToYear) {
        const yearIndex = yearsArray.indexOf(tempToYear);
        if (yearIndex !== -1) {
          toYearScrollRef.current.scrollTo({
            y: yearIndex * ITEM_HEIGHT,
            animated: false,
          });
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [showToDatePicker, tempToDay, tempToMonth, tempToYear]);

  // Auto-scroll for Existing Date Picker
  useLayoutEffect(() => {
    if (!showDatePickerModal) return;

    const years = Array.from(
      { length: 50 },
      (_, i) => new Date().getFullYear() - 10 + i,
    );

    const timer = setTimeout(() => {
      if (dayScrollRef.current && tempDay) {
        const dayIndex = tempDay - 1;
        dayScrollRef.current.scrollTo({
          y: dayIndex * ITEM_HEIGHT,
          animated: false,
        });
      }
      if (monthScrollRef.current && tempMonth) {
        const monthIndex = tempMonth - 1;
        monthScrollRef.current.scrollTo({
          y: monthIndex * ITEM_HEIGHT,
          animated: false,
        });
      }
      if (yearScrollRef.current && tempYear) {
        const yearIndex = years.indexOf(tempYear);
        if (yearIndex !== -1) {
          yearScrollRef.current.scrollTo({
            y: yearIndex * ITEM_HEIGHT,
            animated: false,
          });
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [showDatePickerModal, tempDay, tempMonth, tempYear]);

  // Handle To Date confirmation with validation
  const handleToDateConfirm = () => {
    const selectedToDate = new Date(tempToYear, tempToMonth - 1, tempToDay);

    // Check if To Date is before From Date
    if (fromDate && selectedToDate < fromDate) {
      alert('To Date cannot be earlier than From Date');
      return;
    }

    setToDate(selectedToDate);
    setShowToDatePicker(false);
  };

  // Helper function to format date for display (renamed to avoid conflict)
  const formatDateForPicker = (day, month, year) => {
    if (!day || !month || !year) return '';
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  };

  // Helper function to generate years array
  const generateYearsArray = () => {
    const currentYear = new Date().getFullYear();
    return Array.from(
      { length: 50 },
      (_, i) => currentYear - 10 + i
    );
  };

  const loadExpenses = async () => {
    const result = await dispatch(fetchExpenses());
    setInitialLoadingDone(true);
  };

  // ============ VALIDATION FUNCTIONS ============
  const validateAmount = value => {
    if (!value) return '';
    const numValue = value.replace(/[^0-9]/g, '');
    if (numValue === '') return '';
    // Just return the sliced value - NO max value check
    return numValue.slice(0, AMOUNT_MAX_LENGTH);
  };

  const validateKilometers = value => {
    if (!value) return '';
    const numValue = value.replace(/[^0-9]/g, '');
    if (numValue === '') return '';
    const num = parseInt(numValue, 10);
    if (num > KM_MAX_VALUE) return KM_MAX_VALUE.toString();
    return numValue.slice(0, 6);
  };

  const validateLocation = value => {
    if (!value) return '';
    return value.slice(0, LOCATION_MAX_LENGTH);
  };

  const validatePurpose = value => {
    if (!value) return '';
    return value.slice(0, PURPOSE_MAX_LENGTH);
  };

  const validateDescription = value => {
    if (!value) return '';
    return value.slice(0, DESCRIPTION_MAX_LENGTH);
  };

  // ============ HELPER FUNCTIONS ============
  const formatDDMMYYYY = dateStr => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const formatYYYYMMDD = (day, month, year) => {
    return `${year}-${month.toString().padStart(2, '0')}-${day
      .toString()
      .padStart(2, '0')}`;
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const openDatePicker = () => {
    if (date) {
      const [year, month, day] = date.split('-');
      setTempYear(parseInt(year));
      setTempMonth(parseInt(month));
      setTempDay(parseInt(day));
    } else {
      const now = new Date();
      setTempYear(now.getFullYear());
      setTempMonth(now.getMonth() + 1);
      setTempDay(now.getDate());
    }
    setShowDatePickerModal(true);
  };

  const handleDateConfirm = () => {
    const newDate = formatYYYYMMDD(tempDay, tempMonth, tempYear);
    setDate(newDate);
    setDateDisplay(formatDDMMYYYY(newDate));
    setShowDatePickerModal(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchExpenses());
    setRefreshing(false);
  }, [dispatch]);

  const formatDate = dateString => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = amount => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTravelTypeLabel = type => {
    if (!type) return 'Other';
    const typeStr = type.toLowerCase();
    if (typeStr.includes('car')) return 'Car';
    if (typeStr.includes('train')) return 'Train';
    if (typeStr.includes('flight') || typeStr.includes('plane'))
      return 'Flight';
    return 'Other';
  };

  const getExpenseIcon = type => {
    const typeStr = (type || '').toLowerCase();
    if (typeStr.includes('car')) {
      return <Car size={wp('4%')} color="#FF6B35" />;
    } else if (typeStr.includes('train')) {
      return <Train size={wp('4%')} color="#4A90E2" />;
    } else if (typeStr.includes('flight') || typeStr.includes('plane')) {
      return <Plane size={wp('4%')} color="#9B59B6" />;
    }
    return <FileText size={wp('4%')} color="#1ABC9C" />;
  };

  const getStatusColor = status => {
    const statusStr = (status || '').toUpperCase();
    switch (statusStr) {
      case 'APPROVED':
        return { bg: '#2ECC71', color: '#fff' };
      case 'PENDING':
        return { bg: '#F39C12', color: '#fff' };
      case 'REJECTED':
        return { bg: '#E74C3C', color: '#fff' };
      default:
        return { bg: '#95A5A6', color: '#fff' };
    }
  };

  const getStatusIcon = status => {
    const statusStr = (status || '').toUpperCase();
    switch (statusStr) {
      case 'APPROVED':
        return <CheckCircle size={wp('3%')} color="#fff" />;
      case 'PENDING':
        return <Clock size={wp('3%')} color="#fff" />;
      case 'REJECTED':
        return <XCircle size={wp('3%')} color="#fff" />;
      default:
        return null;
    }
  };

  const handleViewRequest = item => {
    setSelectedRequest(item);
    setShowViewModal(true);
  };

  const addOtherExpense = () => {
    const hasIncompleteExpense = otherExpenses.some(
      item =>
        !item.description.trim() ||
        !item.amount ||
        parseFloat(item.amount) <= 0,
    );

    if (hasIncompleteExpense) {
      Alert.alert(
        'Validation Error',
        'Please complete existing other expense first',
      );
      return;
    }

    setOtherExpenses([
      ...otherExpenses,
      {
        id: Date.now().toString(),
        description: '',
        amount: '',
        paymentMethod: 'self-paid',
      },
    ]);
  };

  const removeOtherExpense = id => {
    setOtherExpenses(otherExpenses.filter(item => item.id !== id));
  };

  const truncateText = (text, maxLength = 30) => {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const updateOtherExpense = (id, field, value) => {
    let updatedValue = value || '';

    if (field === 'amount') {
      updatedValue = validateAmount(updatedValue);
    }

    if (field === 'description') {
      updatedValue = updatedValue.replace(/\n/g, ' ').trimStart();

      updatedValue = validateDescription(updatedValue);
    }

    setOtherExpenses(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: updatedValue } : item,
      ),
    );
  };

  const calculateTotalAmount = () => {
    const travel = parseFloat(amount) || 0;
    const hotel = parseFloat(hotelCost) || 0;
    const food = parseFloat(foodCost) || 0;
    const otherTotal = otherExpenses.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0),
      0,
    );
    return travel + hotel + food + otherTotal;
  };

  // ============ FILE PICKING FUNCTIONS ============
  const validateFileSize = fileSize => {
    if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
      Alert.alert(
        'File Too Large',
        `${MAX_FILE_SIZE_MB}MB maximum file size allowed.`,
      );
      return false;
    }
    return true;
  };

  // const handleImagePick = () => {
  //   if (selectedFiles.length >= 1) {
  //     Alert.alert('Limit Reached', 'You can only upload 1 file');
  //     return;
  //   }

  //   launchImageLibrary(
  //     {
  //       mediaType: 'photo',
  //       selectionLimit: 1,
  //       quality: 0.8,
  //       maxHeight: 2000,
  //       maxWidth: 2000,
  //     },
  //     response => {
  //       if (response.didCancel) {
  //         console.log('User cancelled image picker');
  //       } else if (response.error) {
  //         Alert.alert('Error', 'Failed to pick image: ' + response.error);
  //       } else if (response.assets && response.assets.length > 0) {
  //         const asset = response.assets[0];

  //         if (!validateFileSize(asset.fileSize)) {
  //           return;
  //         }

  //         const imageFile = {
  //           id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  //           uri: asset.uri,
  //           type: asset.type?.includes('png') ? 'png' : 'jpg',
  //           name: asset.fileName || `image_${Date.now()}.jpg`,
  //           size: asset.fileSize,
  //           mimeType: asset.type || 'image/jpeg',
  //         };

  //         setSelectedFiles(prev => [...prev, imageFile]);
  //         Alert.alert('Success', 'Image selected');
  //       }
  //     },
  //   );
  // };

  const handleImagePick = async () => {
    if (selectedFiles.length >= 1) {
      Alert.alert('Limit Reached', 'You can only upload 1 file');
      return;
    }

    // For image picker, we don't need camera permission, just storage
    launchImageLibrary(
      {
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
        maxHeight: 2000,
        maxWidth: 2000,
      },
      response => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.error) {
          Alert.alert('Error', 'Failed to pick image: ' + response.error);
        } else if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];

          if (!validateFileSize(asset.fileSize)) {
            return;
          }

          const imageFile = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            uri: asset.uri,
            type: asset.type?.includes('png') ? 'png' : 'jpg',
            name: asset.fileName || `image_${Date.now()}.jpg`,
            size: asset.fileSize,
            mimeType: asset.type || 'image/jpeg',
          };

          setSelectedFiles(prev => [...prev, imageFile]);
          Alert.alert('Success', 'Image selected');
        }
      },
    );
  };

  const handlePDFPick = async () => {
    if (selectedFiles.length >= 1) {
      Alert.alert('Limit Reached', 'You can only upload 1 file');
      return;
    }

    try {
      const result = await pick({
        type: ['application/pdf'],
        allowMultiSelection: false,
        mode: 'import',
      });

      if (result && result.length > 0) {
        const file = result[0];

        if (!validateFileSize(file.size)) {
          return;
        }

        const pdfFile = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          uri: file.uri,
          type: 'pdf',
          name: file.name || `document_${Date.now()}.pdf`,
          size: file.size,
          mimeType: 'application/pdf',
        };

        setSelectedFiles(prev => [...prev, pdfFile]);
        Alert.alert('Success', 'PDF selected');
      }
    } catch (error) {
      if (error.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert('Error', 'Failed to pick PDF: ' + error.message);
      }
    }
  };

  // ;const handleCameraCapture = () => {
  //   if (selectedFiles.length >= 1) {
  //     Alert.alert('Limit Reached', 'You can only upload 1 file');
  //     return;
  //   }

  //   launchCamera(
  //     {
  //       mediaType: 'photo',
  //       quality: 0.8,
  //       maxHeight: 2000,
  //       maxWidth: 2000,
  //       saveToPhotos: false,
  //     },
  //     response => {
  //       if (response.didCancel) {
  //         console.log('User cancelled camera');
  //       } else if (response.error) {
  //         Alert.alert(
  //           'Camera Error',
  //           'Failed to capture image: ' + response.error,
  //         );
  //       } else if (response.assets && response.assets.length > 0) {
  //         const asset = response.assets[0];

  //         if (!validateFileSize(asset.fileSize)) {
  //           return;
  //         }

  //         const imageFile = {
  //           id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  //           uri: asset.uri,
  //           type: 'jpg',
  //           name: asset.fileName || `capture_${Date.now()}.jpg`,
  //           size: asset.fileSize,
  //           mimeType: 'image/jpeg',
  //         };

  //         setSelectedFiles(prev => [...prev, imageFile]);
  //         Alert.alert('Success', 'Photo captured');
  //       }
  //     },
  //   );
  // }

  const handleCameraCapture = async () => {
    if (selectedFiles.length >= 1) {
      Alert.alert('Limit Reached', 'You can only upload 1 file');
      return;
    }

    // Check camera permission first
    const cameraPermission = await requestCameraPermission(true);

    if (!cameraPermission.granted) {
      Alert.alert(
        'Camera Permission Required',
        'Camera permission is needed to take photos for expense receipts. Please grant permission to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    // Permission granted, proceed with camera
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxHeight: 2000,
        maxWidth: 2000,
        saveToPhotos: false,
      },
      response => {
        if (response.didCancel) {
          console.log('User cancelled camera');
        } else if (response.error) {
          Alert.alert(
            'Camera Error',
            'Failed to capture image: ' + response.error,
          );
        } else if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];

          if (!validateFileSize(asset.fileSize)) {
            return;
          }

          const imageFile = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            uri: asset.uri,
            type: 'jpg',
            name: asset.fileName || `capture_${Date.now()}.jpg`,
            size: asset.fileSize,
            mimeType: 'image/jpeg',
          };

          setSelectedFiles(prev => [...prev, imageFile]);
          Alert.alert('Success', 'Photo captured');
        }
      },
    );
  };

  const showFilePickerOptions = () => {
    if (selectedFiles.length >= 1) {
      Alert.alert(
        'Limit Reached',
        'You can only upload 1 file. Please remove the existing file to add a new one.',
      );
      return;
    }

    Alert.alert(
      'Upload Attachment',
      `Choose file type to add (Max ${MAX_FILE_SIZE_MB}MB)`,
      [
        { text: 'PDF Document', onPress: handlePDFPick },
        { text: 'Image', onPress: handleImagePick },
        { text: 'Take Photo', onPress: handleCameraCapture },
        { text: 'Cancel', onPress: () => { }, style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const removeFile = fileId => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = bytes => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOpenReceipt = async receiptUrl => {
    if (!receiptUrl) {
      Alert.alert('Error', 'No receipt available');
      return;
    }

    try {
      setOpeningFile(true);

      const fileName = receiptUrl.split('/').pop();
      const extension = fileName.split('.').pop()?.toLowerCase();

      const localPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      const downloadResult = await RNFS.downloadFile({
        fromUrl: receiptUrl,
        toFile: localPath,
      }).promise;

      if (downloadResult.statusCode !== 200) {
        Alert.alert('Error', 'Failed to download file');
        return;
      }

      let mimeType = '*/*';

      if (extension === 'pdf') {
        mimeType = 'application/pdf';
      } else if (['jpg', 'jpeg'].includes(extension)) {
        mimeType = 'image/jpeg';
      } else if (extension === 'png') {
        mimeType = 'image/png';
      }

      await FileViewer.open(localPath, {
        showOpenWithDialog: true,
        mimeType,
      });
    } catch (error) {
      console.log('FILE OPEN ERROR =>', error);
      Alert.alert('Error', 'No application found to open this file type');
    } finally {
      setOpeningFile(false);
    }
  };

  // ============ SUBMIT EXPENSE ============
  const handleSubmitExpense = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid travel amount');
      return;
    }
    // Replace date validation with fromDate and toDate validation
    if (!fromDate) {
      Alert.alert('Validation Error', 'Please select From Date');
      return;
    }
    if (!toDate) {
      Alert.alert('Validation Error', 'Please select To Date');
      return;
    }
    if (!fromLocation.trim()) {
      Alert.alert('Validation Error', 'Please enter "From Location"');
      return;
    }
    if (!toLocation.trim()) {
      Alert.alert('Validation Error', 'Please enter "To Location"');
      return;
    }
    if (!purpose.trim()) {
      Alert.alert('Validation Error', 'Please enter Business Purpose');
      return;
    }
    if (expenseType === 'car' && (!kilometers || parseFloat(kilometers) <= 0)) {
      Alert.alert(
        'Validation Error',
        'Please enter valid distance for car travel',
      );
      return;
    }
    // Attachment validation
    if (selectedFiles.length === 0) {
      Alert.alert(
        'Validation Error',
        'Please upload receipt/document attachment',
      );
      return;
    }

    // Other expenses validation
    for (const item of otherExpenses) {
      if (item.description.trim() && !item.amount) {
        Alert.alert(
          'Validation Error',
          'Please enter amount for other expense',
        );
        return;
      }

      if (!item.description.trim() && item.amount) {
        Alert.alert(
          'Validation Error',
          'Please enter description for other expense',
        );
        return;
      }
    }

    submitToServer();
  };
  // ---------------------------------------------------------
  const submitToServer = async () => {
    setSubmitting(true);

    let grade = 'Grade 2 - Senior Employee';
    let policySnapshot = {
      trainClass: '2nd AC / 3rd AC',
      flightClass: 'Economy',
      hotelLimit: 2000,
      carRatePerKm: 10,
    };

    try {
      // Format dates for API
      const formatDateForAPI = (date) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Debug logs to check dates
      console.log('fromDate state:', fromDate);
      console.log('toDate state:', toDate);
      console.log('formatted fromDate:', fromDate ? formatDateForAPI(fromDate) : null);
      console.log('formatted toDate:', toDate ? formatDateForAPI(toDate) : null);

      const expenseData = {
        travelType: expenseType.toUpperCase(),
        grade: grade,
        policySnapshot: policySnapshot,
        fromLocation: fromLocation.trim(),
        toLocation: toLocation.trim(),
        fromDate: fromDate ? formatDateForAPI(fromDate) : null,
        toDate: toDate ? formatDateForAPI(toDate) : null,
        businessPurpose: purpose.trim(),
        distanceKm:
          expenseType === 'car' ? parseFloat(kilometers) || 0 : undefined,
        expenses: {
          travel: {
            amount: parseFloat(amount) || 0,
            paymentMethod:
              travelPaymentMethod === 'self-paid' ? 'SELF' : 'COMPANY',
          },
          hotel: {
            amount: parseFloat(hotelCost) || 0,
            paymentMethod:
              foodPaymentMethod === 'self-paid' ? 'SELF' : 'COMPANY',
          },
          food: {
            amount: parseFloat(foodCost) || 0,
            paymentMethod:
              foodPaymentMethod === 'self-paid' ? 'SELF' : 'COMPANY',
          },
        },
        miscItems: otherExpenses
          .filter(
            item =>
              item.description.trim() &&
              item.amount &&
              parseFloat(item.amount) > 0,
          )
          .map(item => ({
            description: item.description.trim(),
            amount: parseFloat(item.amount),
            paymentMethod:
              item.paymentMethod === 'self-paid' ? 'SELF' : 'COMPANY',
          })),
      };

      // Debug log the entire expenseData
      console.log('Sending expenseData:', JSON.stringify(expenseData, null, 2));

      const receiptFile =
        selectedFiles.length > 0
          ? {
            uri: selectedFiles[0].uri,
            type: selectedFiles[0].type,
            name: selectedFiles[0].name,
          }
          : null;

      const result = await dispatch(createExpense(expenseData, receiptFile));

      if (result.success) {
        setShowCreateForm(false);
        resetForm();
        Alert.alert(
          'Success',
          result.message || 'Expense submitted successfully!',
        );
        await dispatch(fetchExpenses());
      } else {
        Alert.alert('Error', result.error || 'Failed to submit expense');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  // ----------------------serve data end--------------------------
  const resetForm = () => {
    setExpenseType('car');
    setAmount('');
    setHotelCost('');
    setFoodCost('');
    setDate('');
    setDateDisplay('');
    setFromLocation('');
    setToLocation('');
    setPurpose('');
    setTravelPaymentMethod('self-paid');
    setFoodPaymentMethod('self-paid');
    setOtherExpenses([]);
    setKilometers('');
    setSelectedFiles([]);
    setFromDate(null);  // Add this
    setToDate(null);    // Add this

    const now = new Date();

    setTempDay(now.getDate());
    setTempMonth(now.getMonth() + 1);
    setTempYear(now.getFullYear());
    setTempFromDay(1);
    setTempFromMonth(now.getMonth() + 1);
    setTempFromYear(now.getFullYear());
    setTempToDay(1);
    setTempToMonth(now.getMonth() + 1);
    setTempToYear(now.getFullYear());
  };

  const getFilteredRequests = () => {
    if (!expenses || !Array.isArray(expenses)) return [];

    // Debug: Log all status values
    console.log('All status values:', expenses.map(r => r.status));
    console.log('Active filter:', activeFilter);

    if (activeFilter === 'pending') {
      const filtered = expenses.filter(r => (r.status || '').toUpperCase() === 'PENDING');
      console.log('Pending filtered count:', filtered.length);
      return filtered.reverse();
    } else if (activeFilter === 'approved') {
      const filtered = expenses.filter(r => (r.status || '').toUpperCase() === 'APPROVED');
      console.log('Approved filtered count:', filtered.length);
      return filtered.reverse();
    } else if (activeFilter === 'rejected') {
      const filtered = expenses.filter(r => (r.status || '').toUpperCase() === 'REJECTED');
      console.log('Rejected filtered count:', filtered.length);
      console.log('Rejected items:', filtered.map(r => ({ id: r._id, status: r.status })));
      return filtered.reverse();
    }

    return [...expenses].reverse();
  };

  const getFilterCounts = () => {
    if (!expenses || !Array.isArray(expenses)) {
      return { pending: 0, approved: 0, rejected: 0 };
    }

    const pending = expenses.filter(r => {
      const status = (r.status || '').toUpperCase();
      return status === 'PENDING';
    }).length;

    const approved = expenses.filter(r => {
      const status = (r.status || '').toUpperCase();
      return status === 'APPROVED';
    }).length;

    const rejected = expenses.filter(r => {
      const status = (r.status || '').toUpperCase();
      return status === 'REJECTED';
    }).length;

    console.log('Counts - Pending:', pending, 'Approved:', approved, 'Rejected:', rejected);

    return { pending, approved, rejected };
  };

  const counts = getFilterCounts();

  // ============ VIEW MODAL ============
  const renderViewModal = () => {
    if (!selectedRequest) return null;

    return (
      <Modal
        visible={showViewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowViewModal(false);
          setSelectedRequest(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: C.background }]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                Expense Details
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowViewModal(false);
                  setSelectedRequest(null);
                }}
                style={styles.closeButton}
              >
                <XCircle size={wp('6%')} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.viewModalScroll}
            >
              <View style={styles.viewStatusContainer}>
                <View
                  style={[
                    styles.viewStatusBadge,
                    {
                      backgroundColor: getStatusColor(selectedRequest.status)
                        .bg,
                    },
                  ]}
                >
                  {getStatusIcon(selectedRequest.status)}
                  <Text style={[styles.viewStatusText, { color: '#fff' }]}>
                    {selectedRequest.status
                      ? selectedRequest.status.charAt(0).toUpperCase() +
                      selectedRequest.status.slice(1).toLowerCase()
                      : 'Unknown'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.viewTitle, { color: C.textPrimary }]}>
                {getTravelTypeLabel(selectedRequest.travelType)} Travel Request
              </Text>

              <View
                style={[
                  styles.viewAmountCard,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}
              >
                <Text
                  style={[styles.viewAmountLabel, { color: C.textSecondary }]}
                >
                  Total Amount
                </Text>
                <Text style={[styles.viewAmountValue, { color: C.primary }]}>
                  {formatCurrency(selectedRequest.totalAmount || 0)}
                </Text>
              </View>

              <View style={styles.viewSection}>
                <Text
                  style={[styles.viewSectionTitle, { color: C.textPrimary }]}
                >
                  Travel Information
                </Text>

                <View style={styles.viewInfoRow}>
                  <Text
                    style={[styles.viewInfoLabel, { color: C.textSecondary }]}
                  >
                    Travel Type
                  </Text>
                  <View style={styles.viewTypeBadge}>
                    {getExpenseIcon(selectedRequest.travelType)}
                    <Text
                      style={[styles.viewInfoValue, { color: C.textPrimary }]}
                    >
                      {getTravelTypeLabel(selectedRequest.travelType)}
                    </Text>
                  </View>
                </View>

                <View style={styles.viewInfoRow}>
                  <Text
                    style={[styles.viewInfoLabel, { color: C.textSecondary }]}
                  >
                    From
                  </Text>
                  <Text
                    style={[styles.viewInfoValue, { color: C.textPrimary }]}
                  >
                    {selectedRequest.fromLocation || 'N/A'}
                  </Text>
                </View>

                <View style={styles.viewInfoRow}>
                  <Text
                    style={[styles.viewInfoLabel, { color: C.textSecondary }]}
                  >
                    To
                  </Text>
                  <Text
                    style={[styles.viewInfoValue, { color: C.textPrimary }]}
                  >
                    {selectedRequest.toLocation || 'N/A'}
                  </Text>
                </View>

                {/* <View style={styles.viewInfoRow}>
                  <Text
                    style={[styles.viewInfoLabel, { color: C.textSecondary }]}
                  >
                    Date
                  </Text>
                  <Text
                    style={[styles.viewInfoValue, { color: C.textPrimary }]}
                  >
                    {formatDate(selectedRequest.date)}
                  </Text>
                </View> */}

                <View style={styles.viewInfoRow}>
                  <Text
                    style={[styles.viewInfoLabel, { color: C.textSecondary }]}
                  >
                    From Date
                  </Text>
                  <Text
                    style={[styles.viewInfoValue, { color: C.textPrimary }]}
                  >
                    {selectedRequest.fromDate ? formatDate(selectedRequest.fromDate) : 'N/A'}
                  </Text>
                </View>

                <View style={styles.viewInfoRow}>
                  <Text
                    style={[styles.viewInfoLabel, { color: C.textSecondary }]}
                  >
                    To Date
                  </Text>
                  <Text
                    style={[styles.viewInfoValue, { color: C.textPrimary }]}
                  >
                    {selectedRequest.toDate ? formatDate(selectedRequest.toDate) : 'N/A'}
                  </Text>
                </View>

                {selectedRequest.distanceKm && (
                  <View style={styles.viewInfoRow}>
                    <Text
                      style={[styles.viewInfoLabel, { color: C.textSecondary }]}
                    >
                      Distance
                    </Text>
                    <Text
                      style={[styles.viewInfoValue, { color: C.textPrimary }]}
                    >
                      {selectedRequest.distanceKm} km
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.viewSection}>
                <Text
                  style={[styles.viewSectionTitle, { color: C.textPrimary }]}
                >
                  Business Purpose
                </Text>
                <Text
                  style={[styles.viewPurposeText, { color: C.textSecondary }]}
                >
                  {selectedRequest.businessPurpose || 'N/A'}
                </Text>
              </View>

              <View style={styles.viewSection}>
                <Text
                  style={[styles.viewSectionTitle, { color: C.textPrimary }]}
                >
                  Expense Breakdown
                </Text>

                {selectedRequest.expenses?.travel && (
                  <View
                    style={[
                      styles.viewExpenseItem,
                      { borderBottomColor: C.border },
                    ]}
                  >
                    <View>
                      <Text
                        style={[
                          styles.viewExpenseLabel,
                          { color: C.textSecondary },
                        ]}
                      >
                        Travel Cost
                      </Text>

                      <Text
                        style={{
                          color: C.textTertiary,
                          fontSize: wp('2.6%'),
                          fontFamily: Fonts.medium,
                          marginTop: hp('0.3%'),
                        }}
                      >
                        Paid By:{' '}
                        {selectedRequest.expenses.travel.paymentMethod ===
                          'COMPANY'
                          ? 'Company'
                          : 'Self'}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.viewExpenseAmount,
                        { color: C.textPrimary },
                      ]}
                    >
                      {formatCurrency(
                        selectedRequest.expenses.travel.amount || 0,
                      )}
                    </Text>
                  </View>
                )}

                {selectedRequest.expenses?.hotel?.amount > 0 && (
                  <View
                    style={[
                      styles.viewExpenseItem,
                      { borderBottomColor: C.border },
                    ]}
                  >
                    <View>
                      <Text
                        style={[
                          styles.viewExpenseLabel,
                          { color: C.textSecondary },
                        ]}
                      >
                        Hotel Cost
                      </Text>

                      <Text
                        style={{
                          color: C.textTertiary,
                          fontSize: wp('2.6%'),
                          fontFamily: Fonts.medium,
                          marginTop: hp('0.3%'),
                        }}
                      >
                        Paid By:{' '}
                        {selectedRequest.expenses.hotel.paymentMethod ===
                          'COMPANY'
                          ? 'Company'
                          : 'Self'}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.viewExpenseAmount,
                        { color: C.textPrimary },
                      ]}
                    >
                      {formatCurrency(selectedRequest.expenses.hotel.amount)}
                    </Text>
                  </View>
                )}

                {selectedRequest.expenses?.food?.amount > 0 && (
                  <View
                    style={[
                      styles.viewExpenseItem,
                      { borderBottomColor: C.border },
                    ]}
                  >
                    <View>
                      <Text
                        style={[
                          styles.viewExpenseLabel,
                          { color: C.textSecondary },
                        ]}
                      >
                        Food Cost
                      </Text>

                      <Text
                        style={{
                          color: C.textTertiary,
                          fontSize: wp('2.6%'),
                          fontFamily: Fonts.medium,
                          marginTop: hp('0.3%'),
                        }}
                      >
                        Paid By:{' '}
                        {selectedRequest.expenses.food.paymentMethod ===
                          'COMPANY'
                          ? 'Company'
                          : 'Self'}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.viewExpenseAmount,
                        { color: C.textPrimary },
                      ]}
                    >
                      {formatCurrency(selectedRequest.expenses.food.amount)}
                    </Text>
                  </View>
                )}

                {selectedRequest.miscItems?.length > 0 &&
                  selectedRequest.miscItems.map((expense, index) => (
                    <View
                      key={index}
                      style={[
                        styles.viewExpenseItem,
                        { borderBottomColor: C.border },
                      ]}
                    >
                      <View>
                        <Text
                          style={[
                            styles.viewExpenseLabel,
                            { color: C.textSecondary },
                          ]}
                        >
                          {expense.description?.length > 20
                            ? `${expense.description.slice(0, 20)}...`
                            : expense.description}
                        </Text>

                        <Text
                          style={{
                            color: C.textTertiary,
                            fontSize: wp('2.6%'),
                            fontFamily: Fonts.medium,
                            marginTop: hp('0.3%'),
                          }}
                        >
                          Paid By:{' '}
                          {expense.paymentMethod === 'COMPANY'
                            ? 'Company'
                            : 'Self'}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.viewExpenseAmount,
                          { color: C.textPrimary },
                        ]}
                      >
                        {formatCurrency(expense.amount)}
                      </Text>
                    </View>
                  ))}

                <View style={[styles.viewExpenseItem, styles.viewTotalRow]}>
                  <Text
                    style={[
                      styles.viewExpenseLabel,
                      { color: C.textPrimary, fontFamily: Fonts.bold },
                    ]}
                  >
                    Total
                  </Text>
                  <Text
                    style={[
                      styles.viewExpenseAmount,
                      { color: C.primary, fontFamily: Fonts.bold },
                    ]}
                  >
                    {formatCurrency(selectedRequest.totalAmount || 0)}
                  </Text>
                </View>
              </View>

              {selectedRequest.receiptUrl && (
                <View style={styles.viewSection}>
                  <Text
                    style={[styles.viewSectionTitle, { color: C.textPrimary }]}
                  >
                    Receipt
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.viewFileItem,
                      { backgroundColor: C.surface, borderColor: C.border },
                    ]}
                    onPress={() =>
                      handleOpenReceipt(selectedRequest.receiptUrl)
                    }
                    disabled={openingFile}
                  >
                    <FileText size={wp('5%')} color="#E74C3C" />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.viewFileName, { color: C.textPrimary }]}
                        numberOfLines={1}
                      >
                        {selectedRequest.receiptUrl.split('/').pop() ||
                          'View Receipt'}
                      </Text>
                    </View>
                    {openingFile ? (
                      <ActivityIndicator color={C.primary} />
                    ) : (
                      <Eye size={wp('4%')} color={C.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.viewSection}>
                <Text
                  style={[styles.viewSectionTitle, { color: C.textPrimary }]}
                >
                  Submission Details
                </Text>

                <View style={styles.viewInfoRow}>
                  <Text
                    style={[styles.viewInfoLabel, { color: C.textSecondary }]}
                  >
                    Submitted On
                  </Text>
                  <Text
                    style={[styles.viewInfoValue, { color: C.textPrimary }]}
                  >
                    {formatDate(selectedRequest.createdAt)}
                  </Text>
                </View>

                <View style={styles.viewInfoRow}>
                  <Text
                    style={[styles.viewInfoLabel, { color: C.textSecondary }]}
                  >
                    Employee Grade
                  </Text>
                  <Text
                    style={[styles.viewInfoValue, { color: C.textPrimary }]}
                  >
                    {selectedRequest.grade || 'N/A'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.closeViewBtn, { backgroundColor: C.primary }]}
                onPress={() => {
                  setShowViewModal(false);
                  setSelectedRequest(null);
                }}
              >
                <Text style={styles.closeViewBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFromDatePickerModal = () => {
    const daysInMonth = getDaysInMonthForPicker(tempFromMonth, tempFromYear);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = generateYearsArray();

    return (
      <Modal
        visible={showFromDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFromDatePicker(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View
            style={[
              styles.datePickerContainer,
              { backgroundColor: C.background },
            ]}
          >
            <View
              style={[styles.datePickerHeader, { borderBottomColor: C.border }]}
            >
              <Text style={[styles.datePickerTitle, { color: C.textPrimary }]}>
                Select From Date
              </Text>
              <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                <XCircle size={wp('6%')} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerColumns}>
              {/* Day Column */}
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerColumnLabel, { color: C.textSecondary }]}>
                  Day
                </Text>
                <ScrollView
                  ref={fromDayScrollRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.datePickerScroll}
                  contentContainerStyle={styles.datePickerScrollContent}
                >
                  {days.map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.datePickerItem,
                        tempFromDay === day && {
                          backgroundColor: C.primary + '20',
                          borderLeftWidth: 3,
                          borderLeftColor: C.primary,
                        },
                      ]}
                      onPress={() => setTempFromDay(day)}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          { color: tempFromDay === day ? C.primary : C.textPrimary },
                          tempFromDay === day && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Column */}
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerColumnLabel, { color: C.textSecondary }]}>
                  Month
                </Text>
                <ScrollView
                  ref={fromMonthScrollRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.datePickerScroll}
                  contentContainerStyle={styles.datePickerScrollContent}
                >
                  {months.map(month => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.datePickerItem,
                        tempFromMonth === month && {
                          backgroundColor: C.primary + '20',
                          borderLeftWidth: 3,
                          borderLeftColor: C.primary,
                        },
                      ]}
                      onPress={() => {
                        setTempFromMonth(month);
                        const maxDays = getDaysInMonthForPicker(month, tempFromYear);
                        if (tempFromDay > maxDays) {
                          setTempFromDay(maxDays);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          { color: tempFromMonth === month ? C.primary : C.textPrimary },
                          tempFromMonth === month && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {month.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Column */}
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerColumnLabel, { color: C.textSecondary }]}>
                  Year
                </Text>
                <ScrollView
                  ref={fromYearScrollRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.datePickerScroll}
                  contentContainerStyle={styles.datePickerScrollContent}
                >
                  {years.map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.datePickerItem,
                        tempFromYear === year && {
                          backgroundColor: C.primary + '20',
                          borderLeftWidth: 3,
                          borderLeftColor: C.primary,
                        },
                      ]}
                      onPress={() => {
                        setTempFromYear(year);
                        const maxDays = getDaysInMonthForPicker(tempFromMonth, year);
                        if (tempFromDay > maxDays) {
                          setTempFromDay(maxDays);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          { color: tempFromYear === year ? C.primary : C.textPrimary },
                          tempFromYear === year && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View
              style={[styles.datePickerButtons, { borderTopColor: C.border }]}
            >
              <TouchableOpacity
                style={[styles.datePickerCancelBtn, { borderColor: C.border }]}
                onPress={() => setShowFromDatePicker(false)}
              >
                <Text
                  style={[
                    styles.datePickerCancelText,
                    { color: C.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.datePickerConfirmBtn,
                  { backgroundColor: C.primary },
                ]}
                onPress={handleFromDateConfirm}
              >
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderToDatePickerModal = () => {
    const daysInMonth = getDaysInMonthForPicker(tempToMonth, tempToYear);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = generateYearsArray();

    return (
      <Modal
        visible={showToDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowToDatePicker(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View
            style={[
              styles.datePickerContainer,
              { backgroundColor: C.background },
            ]}
          >
            <View
              style={[styles.datePickerHeader, { borderBottomColor: C.border }]}
            >
              <Text style={[styles.datePickerTitle, { color: C.textPrimary }]}>
                Select To Date
              </Text>
              <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                <XCircle size={wp('6%')} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerColumns}>
              {/* Day Column */}
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerColumnLabel, { color: C.textSecondary }]}>
                  Day
                </Text>
                <ScrollView
                  ref={toDayScrollRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.datePickerScroll}
                  contentContainerStyle={styles.datePickerScrollContent}
                >
                  {days.map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.datePickerItem,
                        tempToDay === day && {
                          backgroundColor: C.primary + '20',
                          borderLeftWidth: 3,
                          borderLeftColor: C.primary,
                        },
                      ]}
                      onPress={() => setTempToDay(day)}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          { color: tempToDay === day ? C.primary : C.textPrimary },
                          tempToDay === day && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Column */}
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerColumnLabel, { color: C.textSecondary }]}>
                  Month
                </Text>
                <ScrollView
                  ref={toMonthScrollRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.datePickerScroll}
                  contentContainerStyle={styles.datePickerScrollContent}
                >
                  {months.map(month => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.datePickerItem,
                        tempToMonth === month && {
                          backgroundColor: C.primary + '20',
                          borderLeftWidth: 3,
                          borderLeftColor: C.primary,
                        },
                      ]}
                      onPress={() => {
                        setTempToMonth(month);
                        const maxDays = getDaysInMonthForPicker(month, tempToYear);
                        if (tempToDay > maxDays) {
                          setTempToDay(maxDays);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          { color: tempToMonth === month ? C.primary : C.textPrimary },
                          tempToMonth === month && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {month.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Column */}
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerColumnLabel, { color: C.textSecondary }]}>
                  Year
                </Text>
                <ScrollView
                  ref={toYearScrollRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.datePickerScroll}
                  contentContainerStyle={styles.datePickerScrollContent}
                >
                  {years.map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.datePickerItem,
                        tempToYear === year && {
                          backgroundColor: C.primary + '20',
                          borderLeftWidth: 3,
                          borderLeftColor: C.primary,
                        },
                      ]}
                      onPress={() => {
                        setTempToYear(year);
                        const maxDays = getDaysInMonthForPicker(tempToMonth, year);
                        if (tempToDay > maxDays) {
                          setTempToDay(maxDays);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          { color: tempToYear === year ? C.primary : C.textPrimary },
                          tempToYear === year && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View
              style={[styles.datePickerButtons, { borderTopColor: C.border }]}
            >
              <TouchableOpacity
                style={[styles.datePickerCancelBtn, { borderColor: C.border }]}
                onPress={() => setShowToDatePicker(false)}
              >
                <Text
                  style={[
                    styles.datePickerCancelText,
                    { color: C.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.datePickerConfirmBtn,
                  { backgroundColor: C.primary },
                ]}
                onPress={handleToDateConfirm}
              >
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ============ DATE PICKER MODAL ============
  const renderDatePickerModal = () => {
    const daysInMonth = getDaysInMonth(tempMonth, tempYear);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = Array.from(
      { length: 50 },
      (_, i) => new Date().getFullYear() - 10 + i,
    );

    return (
      <Modal
        visible={showDatePickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View
            style={[
              styles.datePickerContainer,
              { backgroundColor: C.background },
            ]}
          >
            <View
              style={[styles.datePickerHeader, { borderBottomColor: C.border }]}
            >
              <Text style={[styles.datePickerTitle, { color: C.textPrimary }]}>
                Select Date
              </Text>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                <XCircle size={wp('6%')} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerColumns}>
              <View style={styles.datePickerColumn}>
                <Text
                  style={[
                    styles.datePickerColumnLabel,
                    { color: C.textSecondary },
                  ]}
                >
                  Day
                </Text>
                <ScrollView
                  ref={dayScrollRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.datePickerScroll}
                  contentContainerStyle={styles.datePickerScrollContent}
                >
                  {days.map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.datePickerItem,
                        tempDay === day && {
                          backgroundColor: C.primary + '20',
                          borderLeftWidth: 3,
                          borderLeftColor: C.primary,
                        },
                      ]}
                      onPress={() => setTempDay(day)}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          {
                            color: tempDay === day ? C.primary : C.textPrimary,
                          },
                          tempDay === day && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.datePickerColumn}>
                <Text
                  style={[
                    styles.datePickerColumnLabel,
                    { color: C.textSecondary },
                  ]}
                >
                  Month
                </Text>
                <ScrollView
                  ref={monthScrollRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.datePickerScroll}
                  contentContainerStyle={styles.datePickerScrollContent}
                >
                  {months.map(month => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.datePickerItem,
                        tempMonth === month && {
                          backgroundColor: C.primary + '20',
                          borderLeftWidth: 3,
                          borderLeftColor: C.primary,
                        },
                      ]}
                      onPress={() => {
                        setTempMonth(month);
                        const maxDays = getDaysInMonth(month, tempYear);
                        if (tempDay > maxDays) {
                          setTempDay(maxDays);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          {
                            color:
                              tempMonth === month ? C.primary : C.textPrimary,
                          },
                          tempMonth === month && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {month.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.datePickerColumn}>
                <Text
                  style={[
                    styles.datePickerColumnLabel,
                    { color: C.textSecondary },
                  ]}
                >
                  Year
                </Text>
                <ScrollView
                  ref={yearScrollRef}
                  showsVerticalScrollIndicator={false}
                  style={styles.datePickerScroll}
                  contentContainerStyle={styles.datePickerScrollContent}
                >
                  {years.map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.datePickerItem,
                        tempYear === year && {
                          backgroundColor: C.primary + '20',
                          borderLeftWidth: 3,
                          borderLeftColor: C.primary,
                        },
                      ]}
                      onPress={() => {
                        setTempYear(year);
                        const maxDays = getDaysInMonth(tempMonth, year);
                        if (tempDay > maxDays) {
                          setTempDay(maxDays);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.datePickerItemText,
                          {
                            color:
                              tempYear === year ? C.primary : C.textPrimary,
                          },
                          tempYear === year && { fontFamily: Fonts.bold },
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View
              style={[styles.datePickerButtons, { borderTopColor: C.border }]}
            >
              <TouchableOpacity
                style={[styles.datePickerCancelBtn, { borderColor: C.border }]}
                onPress={() => setShowDatePickerModal(false)}
              >
                <Text
                  style={[
                    styles.datePickerCancelText,
                    { color: C.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.datePickerConfirmBtn,
                  { backgroundColor: C.primary },
                ]}
                onPress={handleDateConfirm}
              >
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const filteredRequests = getFilteredRequests();
  const isLoadingOrEmpty = loading || !initialLoadingDone;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />

      <View
        style={[
          styles.header,
          { backgroundColor: C.background, borderBottomColor: C.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <ChevronLeft size={wp('5%')} color={C.textPrimary} />
        </TouchableOpacity>

        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: C.textPrimary }]}>
            {t.reimbursement?.title || 'Reimbursement'}
          </Text>
          <Text style={[styles.pageSubtitle, { color: C.textSecondary }]}>
            {expenses?.length || 0} Total Requests
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.primary }]}
          onPress={() => setShowCreateForm(true)}
        >
          <Plus size={wp('5%')} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.filterContainer, { borderBottomColor: C.border }]}>
        {/* Pending Tab */}
        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilter === 'pending' && styles.activeFilterTab,
            activeFilter === 'pending' && { borderBottomColor: C.primary },
            { marginLeft: wp('5%') }, // Add this line

          ]}
          onPress={() => setActiveFilter('pending')}
        >
          <Clock
            size={wp('4%')}
            color={activeFilter === 'pending' ? C.primary : C.textSecondary}
          />
          <Text
            style={[
              styles.filterText,
              {
                color: activeFilter === 'pending' ? C.primary : C.textSecondary,
              },
            ]}
          >
            Pending ({counts.pending})
          </Text>
        </TouchableOpacity>

        {/* Approved Tab */}
        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilter === 'approved' && styles.activeFilterTab,
            activeFilter === 'approved' && { borderBottomColor: C.primary },
          ]}
          onPress={() => setActiveFilter('approved')}
        >
          <CheckCircle
            size={wp('4%')}
            color={activeFilter === 'approved' ? C.primary : C.textSecondary}
          />
          <Text
            style={[
              styles.filterText,
              {
                color: activeFilter === 'approved' ? C.primary : C.textSecondary,
              },
            ]}
          >
            Approved ({counts.approved})
          </Text>
        </TouchableOpacity>

        {/* Rejected Tab - Only shows REJECTED status requests */}
        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilter === 'rejected' && styles.activeFilterTab,
            activeFilter === 'rejected' && { borderBottomColor: C.primary },
          ]}
          onPress={() => setActiveFilter('rejected')}
        >
          <XCircle
            size={wp('4%')}
            color={activeFilter === 'rejected' ? C.primary : C.textSecondary}
          />
          <Text
            style={[
              styles.filterText,
              {
                color: activeFilter === 'rejected' ? C.primary : C.textSecondary,
              },
            ]}
          >
            Rejected ({counts.rejected})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
      >
        {isLoadingOrEmpty ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>
              Loading requests...
            </Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Receipt
              size={wp('15%')}
              color={C.textSecondary}
              strokeWidth={1.5}
            />
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>
              No {activeFilter} requests
            </Text>
            <Text style={[styles.emptySubText, { color: C.textTertiary }]}>
              {activeFilter === 'pending'
                ? 'Tap + button to create a new request'
                : 'Rejected requests will appear here'}
            </Text>
          </View>
        ) : (
          filteredRequests.map(item => (
            <TouchableOpacity
              key={item._id || item.id}
              activeOpacity={0.7}
              onPress={() => handleViewRequest(item)}
            >
              <View
                style={[
                  styles.requestCard,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.typeIcon}>
                    {getExpenseIcon(item.travelType)}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text
                      style={[styles.requestTitle, { color: C.textPrimary }]}
                      numberOfLines={1}
                    >
                      {getTravelTypeLabel(item.travelType)} Travel
                    </Text>.
                    <Text
                      style={[styles.requestDate, { color: C.textSecondary }]}
                    >
                      {/* {formatDate(item.date)} •{' '} */}
                      <Text
                        style={[styles.requestDate, { color: C.textSecondary }]}
                      >
                        {item.fromDate ? formatDate(item.fromDate) : 'N/A'} - {item.toDate ? formatDate(item.toDate) : 'N/A'} •{' '}
                        {truncateText(item.fromLocation, 20)} →{' '}
                        {truncateText(item.toLocation, 20)}
                      </Text>
                      {/* {truncateText(item.fromLocation, 20)} →{' '}
                      {truncateText(item.toLocation, 20)} */}
                    </Text>
                  </View>
                  <View style={styles.cardRightActions}>
                    <Text style={[styles.amount, { color: C.primary }]}>
                      {formatCurrency(item.totalAmount || 0)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: C.border }]} />

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Text
                      style={[styles.detailLabel, { color: C.textSecondary }]}
                    >
                      Purpose:
                    </Text>
                    <Text
                      style={[styles.detailValue, { color: C.textPrimary }]}
                      numberOfLines={2}
                    >
                      {truncateText(item.businessPurpose, 30)}
                    </Text>
                  </View>

                  <View style={styles.paymentMethodRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status).bg },
                      ]}
                    >
                      {getStatusIcon(item.status)}
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(item.status).color },
                        ]}
                      >
                        {item.status
                          ? item.status.charAt(0).toUpperCase() +
                          item.status.slice(1).toLowerCase()
                          : 'Unknown'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Expense Modal */}
      <Modal
        visible={showCreateForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          resetForm();
          setShowCreateForm(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: C.background }]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                New Reimbursement Request
              </Text>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setShowCreateForm(false);
                }}
              >
                <XCircle size={wp('6%')} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
              <ScrollView
                contentContainerStyle={{
                  paddingBottom: Platform.OS === 'ios' ? 40 : 20, // Extra bottom padding
                  paddingHorizontal: wp('4%'), // Add horizontal padding if needed
                }}
                keyboardShouldPersistTaps="handled"

                showsVerticalScrollIndicator={false}>
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Travel Type *
                </Text>
                <View style={styles.typeGrid}>
                  {['car', 'train', 'flight', 'other'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        { borderColor: C.border },
                        expenseType === type && {
                          borderColor: C.primary,
                          backgroundColor: C.primary + '10',
                        },
                      ]}
                      onPress={() => setExpenseType(type)}
                    >
                      {type === 'car' && (
                        <Car
                          size={wp('5%')}
                          color={
                            expenseType === type ? C.primary : C.textSecondary
                          }
                        />
                      )}
                      {type === 'train' && (
                        <Train
                          size={wp('5%')}
                          color={
                            expenseType === type ? C.primary : C.textSecondary
                          }
                        />
                      )}
                      {type === 'flight' && (
                        <Plane
                          size={wp('5%')}
                          color={
                            expenseType === type ? C.primary : C.textSecondary
                          }
                        />
                      )}
                      {type === 'other' && (
                        <FileText
                          size={wp('5%')}
                          color={
                            expenseType === type ? C.primary : C.textSecondary
                          }
                        />
                      )}
                      <Text
                        style={[
                          styles.typeText,
                          {
                            color:
                              expenseType === type ? C.primary : C.textSecondary,
                          },
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {expenseType === 'car' && (
                  <View>
                    <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                      Distance (KM) *
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: C.surface,
                          borderColor: C.border,
                          color: C.textPrimary,
                        },
                      ]}
                      placeholder="Enter kilometers"
                      placeholderTextColor={C.textTertiary}
                      keyboardType="numeric"
                      value={kilometers}
                      onChangeText={text =>
                        setKilometers(validateKilometers(text))
                      }
                      maxLength={6}
                    />
                  </View>
                )}

                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Travel Amount *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: C.surface,
                      borderColor: C.border,
                      color: C.textPrimary,
                    },
                  ]}
                  placeholder="Enter amount"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={text => setAmount(validateAmount(text))}
                  maxLength={AMOUNT_MAX_LENGTH}
                />

                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Payment Method *
                </Text>
                <View style={styles.paymentMethodGrid}>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      { borderColor: C.border },
                      travelPaymentMethod === 'self-paid' && {
                        borderColor: C.primary,
                        backgroundColor: C.primary + '10',
                      },
                    ]}
                    onPress={() => setTravelPaymentMethod('self-paid')}
                  >
                    <Wallet
                      size={wp('4%')}
                      color={
                        travelPaymentMethod === 'self-paid'
                          ? C.primary
                          : C.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        {
                          color:
                            travelPaymentMethod === 'self-paid'
                              ? C.primary
                              : C.textSecondary,
                        },
                      ]}
                    >
                      Self-Paid
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      { borderColor: C.border },
                      travelPaymentMethod === 'company-paid' && {
                        borderColor: C.primary,
                        backgroundColor: C.primary + '10',
                      },
                    ]}
                    onPress={() => setTravelPaymentMethod('company-paid')}
                  >
                    <CreditCard
                      size={wp('4%')}
                      color={
                        travelPaymentMethod === 'company-paid'
                          ? C.primary
                          : C.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        {
                          color:
                            travelPaymentMethod === 'company-paid'
                              ? C.primary
                              : C.textSecondary,
                        },
                      ]}
                    >
                      Company-Paid
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
                  Additional Expenses (Optional)
                </Text>
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Hotel Cost
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: C.surface,
                      borderColor: C.border,
                      color: C.textPrimary,
                    },
                  ]}
                  placeholder="Enter hotel cost"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="numeric"
                  value={hotelCost}
                  onChangeText={text => setHotelCost(validateAmount(text))}
                  maxLength={AMOUNT_MAX_LENGTH}
                />
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Food Cost
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: C.surface,
                      borderColor: C.border,
                      color: C.textPrimary,
                    },
                  ]}
                  placeholder="Enter food cost"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="numeric"
                  value={foodCost}
                  onChangeText={text => setFoodCost(validateAmount(text))}
                  maxLength={AMOUNT_MAX_LENGTH}
                />

                <View style={styles.otherExpensesHeader}>
                  <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
                    Other Expenses
                  </Text>
                  <TouchableOpacity
                    onPress={addOtherExpense}
                    style={[styles.addExpenseBtn, { borderColor: C.primary }]}
                  >
                    <Plus size={wp('3%')} color={C.primary} />
                    <Text style={[styles.addExpenseText, { color: C.primary }]}>
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>

                {otherExpenses.map(expense => (
                  <View key={expense.id} style={styles.otherExpenseItem}>
                    <TextInput
                      style={[
                        styles.otherExpenseInput,
                        {
                          backgroundColor: C.surface,
                          borderColor: C.border,
                          color: C.textPrimary,
                          flex: 2,
                        },
                      ]}
                      placeholder="Description (max 30 chars)"
                      placeholderTextColor={C.textTertiary}
                      value={expense.description}
                      onChangeText={text =>
                        updateOtherExpense(expense.id, 'description', text)
                      }
                      maxLength={DESCRIPTION_MAX_LENGTH}
                    />
                    <TextInput
                      style={[
                        styles.otherExpenseInput,
                        {
                          backgroundColor: C.surface,
                          borderColor: C.border,
                          color: C.textPrimary,
                          flex: 1,
                        },
                      ]}
                      placeholder="Amount"
                      placeholderTextColor={C.textTertiary}
                      keyboardType="numeric"
                      value={expense.amount}
                      onChangeText={text =>
                        updateOtherExpense(expense.id, 'amount', text)
                      }
                      maxLength={AMOUNT_MAX_LENGTH}
                    />
                    <TouchableOpacity
                      onPress={() => removeOtherExpense(expense.id)}
                    >
                      <Trash2 size={wp('5%')} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.uploadSectionHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
                      Receipt/Document *
                    </Text>
                    <Text
                      style={[styles.uploadSubtitle, { color: C.textTertiary }]}
                    >
                      Upload 1 file only (PDF, JPG, or PNG, Max {MAX_FILE_SIZE_MB}
                      MB) - {selectedFiles.length}/1
                    </Text>
                  </View>
                </View>

                {selectedFiles.length === 0 ? (
                  <View style={styles.uploadButtonsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.uploadOptionBtn,
                        { backgroundColor: C.surface, borderColor: C.border },
                      ]}
                      onPress={showFilePickerOptions}
                    >
                      <View
                        style={[
                          styles.uploadIconCircle,
                          { backgroundColor: C.primary + '15' },
                        ]}
                      >
                        <FilePlus size={wp('6%')} color={C.primary} />
                      </View>
                      <Text
                        style={[
                          styles.uploadOptionTitle,
                          { color: C.textPrimary },
                        ]}
                      >
                        Upload Files
                      </Text>
                      <Text
                        style={[
                          styles.uploadOptionSubtitle,
                          { color: C.textTertiary },
                        ]}
                      >
                        PDF, JPG, PNG{`\n`}(Max {MAX_FILE_SIZE_MB}MB)
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.fileListContainer}>
                    {selectedFiles.map(file => (
                      <View
                        key={file.id}
                        style={[
                          styles.fileItemCard,
                          { backgroundColor: C.surface, borderColor: C.border },
                        ]}
                      >
                        <View style={styles.filePreviewContainer}>
                          {file.type === 'jpg' ||
                            file.type === 'png' ||
                            file.type === 'jpeg' ? (
                            <Image
                              source={{ uri: file.uri }}
                              style={styles.fileThumbnail}
                              resizeMode="cover"
                            />
                          ) : (
                            <View
                              style={[
                                styles.fileTypeIcon,
                                { backgroundColor: '#E74C3C15' },
                              ]}
                            >
                              <FileText size={wp('7%')} color="#E74C3C" />
                            </View>
                          )}
                        </View>

                        <View style={styles.fileDetailsContainer}>
                          <Text
                            style={[styles.fileName, { color: C.textPrimary }]}
                            numberOfLines={1}
                          >
                            {truncateText(file.name, 30)}
                          </Text>
                          <Text
                            style={[
                              styles.fileMetaText,
                              { color: C.textSecondary },
                            ]}
                          >
                            {formatFileSize(file.size)} •{' '}
                            {file.type.toUpperCase()}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.iconButton,
                            { backgroundColor: '#E74C3C15' },
                          ]}
                          onPress={() => removeFile(file.id)}
                        >
                          <Trash2 size={wp('4%')} color="#E74C3C" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <>
                  {/* From Date Field */}
                  <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                    From Date *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dateInput,
                      {
                        backgroundColor: C.surface,
                        borderColor: C.border,
                      },
                    ]}
                    onPress={() => setShowFromDatePicker(true)}
                  >
                    <Calendar size={wp('4%')} color={C.textSecondary} />
                    <Text
                      style={[
                        styles.dateInputText,
                        { color: fromDate ? C.textPrimary : C.textTertiary },
                      ]}
                    >
                      {fromDate
                        ? formatDateForPicker(fromDate.getDate(), fromDate.getMonth() + 1, fromDate.getFullYear())
                        : 'DD/MM/YYYY'}
                    </Text>
                  </TouchableOpacity>

                  {/* To Date Field */}
                  <Text style={[styles.inputLabel, { color: C.textSecondary, marginTop: wp('4%') }]}>
                    To Date *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dateInput,
                      {
                        backgroundColor: C.surface,
                        borderColor: C.border,
                      },
                    ]}
                    onPress={() => setShowToDatePicker(true)}
                  >
                    <Calendar size={wp('4%')} color={C.textSecondary} />
                    <Text
                      style={[
                        styles.dateInputText,
                        { color: toDate ? C.textPrimary : C.textTertiary },
                      ]}
                    >
                      {toDate
                        ? formatDateForPicker(toDate.getDate(), toDate.getMonth() + 1, toDate.getFullYear())
                        : 'DD/MM/YYYY'}
                    </Text>
                  </TouchableOpacity>

                  {/* Render both date picker modals */}
                  {renderFromDatePickerModal()}
                  {renderToDatePickerModal()}
                </>

                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  From Location *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: C.surface,
                      borderColor: C.border,
                      color: C.textPrimary,
                    },
                  ]}
                  placeholder="Starting point (max 30 chars)"
                  placeholderTextColor={C.textTertiary}
                  value={fromLocation}
                  onChangeText={text => setFromLocation(validateLocation(text))}
                  maxLength={LOCATION_MAX_LENGTH}
                />

                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  To Location *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: C.surface,
                      borderColor: C.border,
                      color: C.textPrimary,
                    },
                  ]}
                  placeholder="Destination (max 30 chars)"
                  placeholderTextColor={C.textTertiary}
                  value={toLocation}
                  onChangeText={text => setToLocation(validateLocation(text))}
                  maxLength={LOCATION_MAX_LENGTH}
                />

                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Business Purpose *
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: C.surface,
                      borderColor: C.border,
                      color: C.textPrimary,
                    },
                  ]}
                  placeholder="Describe the purpose (max 30 chars)..."
                  placeholderTextColor={C.textTertiary}
                  multiline
                  numberOfLines={3}
                  value={purpose}
                  onChangeText={text => setPurpose(validatePurpose(text))}
                  maxLength={PURPOSE_MAX_LENGTH}
                />

                <View
                  style={[styles.totalContainer, { borderTopColor: C.border }]}
                >
                  <Text style={[styles.totalLabel, { color: C.textPrimary }]}>
                    Total Amount:
                  </Text>
                  <Text style={[styles.totalAmount, { color: C.primary }]}>
                    {formatCurrency(calculateTotalAmount())}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: submitting ? C.primary + '80' : C.primary,
                    },
                  ]}
                  onPress={handleSubmitExpense}
                  disabled={submitting}
                >
                  {submitting ? (
                    <View style={styles.submittingContainer}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.submitBtnText}>Submitting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Request</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {renderViewModal()}
      {renderDatePickerModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: hp('3%'), paddingHorizontal: wp('4%') },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    paddingTop: Platform.OS === 'ios' ? hp('6%') : hp('5%'),
    paddingBottom: hp('2%'),
    borderBottomWidth: 1,
  },
  backBtn: {
    width: wp('9%'),
    height: wp('9%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeader: { flex: 1, paddingLeft: wp('3%') },
  pageTitle: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
  pageSubtitle: { fontSize: wp('3%'), fontFamily: Fonts.regular, marginTop: 2 },
  addBtn: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp('4%'),
    borderBottomWidth: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp('1.5%'),
    marginRight: wp('6%'),
    gap: wp('2%'),
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeFilterTab: { borderBottomWidth: 2 },
  filterText: { fontSize: wp('3.5%'), fontFamily: Fonts.medium },
  requestCard: {
    borderRadius: wp('3%'),
    borderWidth: 1,
    padding: wp('4%'),
    marginTop: hp('1.5%'),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  typeIcon: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('2%'),
    backgroundColor: '#FF6B3510',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp('3%'),
  },
  cardInfo: { flex: 1 },
  requestTitle: { fontSize: wp('3.8%'), fontFamily: Fonts.bold },
  requestDate: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  amount: { fontSize: wp('4%'), fontFamily: Fonts.bold },
  cardRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
  },
  divider: { height: 1, marginVertical: hp('1.5%') },
  cardDetails: { gap: hp('1%') },
  detailRow: { flexDirection: 'row', gap: wp('2%') },
  detailLabel: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
    width: wp('15%'),
  },
  detailValue: { fontSize: wp('2.8%'), fontFamily: Fonts.regular, flex: 1 },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('0.5%'),
    borderRadius: wp('3%'),
    gap: wp('1%'),
  },
  statusText: { fontSize: wp('2.5%'), fontFamily: Fonts.medium },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp('20%'),
  },
  emptyText: {
    marginTop: hp('2%'),
    fontSize: wp('4%'),
    fontFamily: Fonts.medium,
  },
  emptySubText: {
    marginTop: hp('1%'),
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: hp('90%'),
    borderTopLeftRadius: wp('5%'),
    borderTopRightRadius: wp('5%'),
    padding: wp('5%'),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
    paddingBottom: hp('1.5%'),
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: wp('1%'),
  },
  modalTitle: { fontSize: wp('4.5%'), fontFamily: Fonts.bold },
  inputLabel: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
    marginTop: hp('1.5%'),
    marginBottom: hp('0.5%'),
  },
  input: {
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    minHeight: hp('10%'),
    textAlignVertical: 'top',
  },
  typeGrid: { flexDirection: 'row', gap: wp('2%'), marginBottom: hp('1%') },
  typeOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    alignItems: 'center',
    gap: hp('0.5%'),
  },
  typeText: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },
  paymentMethodGrid: {
    flexDirection: 'row',
    gap: wp('2%'),
    marginBottom: hp('1%'),
  },
  paymentMethodOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp('2%'),
  },
  paymentMethodText: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },
  sectionTitle: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.bold,
    marginTop: hp('2%'),
    marginBottom: hp('1%'),
  },
  otherExpensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp('1%'),
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: wp('2%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.8%'),
    gap: wp('1%'),
  },
  addExpenseText: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },
  otherExpenseItem: {
    flexDirection: 'row',
    gap: wp('2%'),
    marginBottom: hp('1%'),
    alignItems: 'center',
  },
  otherExpenseInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('2%'),
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
  },
  uploadSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp('1.5%'),
  },
  uploadSubtitle: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.regular,
    marginTop: hp('0.3%'),
  },
  uploadButtonsContainer: {
    flexDirection: 'row',
    gap: wp('3%'),
    marginBottom: hp('1%'),
  },
  uploadOptionBtn: {
    flex: 1,
    alignItems: 'center',
    padding: wp('4%'),
    borderRadius: wp('2%'),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: hp('1%'),
  },
  uploadIconCircle: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('6%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOptionTitle: { fontSize: wp('3.2%'), fontFamily: Fonts.medium },
  uploadOptionSubtitle: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },
  fileListContainer: { gap: hp('1%') },
  fileItemCard: {
    flexDirection: 'row',
    padding: wp('3%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    alignItems: 'center',
    gap: wp('3%'),
  },
  filePreviewContainer: {
    width: wp('14%'),
    height: wp('14%'),
    borderRadius: wp('2%'),
    overflow: 'hidden',
  },
  fileThumbnail: { width: '100%', height: '100%', borderRadius: wp('2%') },
  fileTypeIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: wp('2%'),
  },
  fileDetailsContainer: { flex: 1, gap: hp('0.4%') },
  fileName: { fontSize: wp('3.2%'), fontFamily: Fonts.medium },
  fileMetaText: { fontSize: wp('2.5%'), fontFamily: Fonts.regular },
  iconButton: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: hp('2%'),
    marginTop: hp('2%'),
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: wp('4%'), fontFamily: Fonts.bold },
  totalAmount: { fontSize: wp('4.5%'), fontFamily: Fonts.bold },
  submitBtn: {
    paddingVertical: hp('1.8%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
    marginTop: hp('2%'),
    marginBottom: hp('2%'),
  },
  submitBtnText: {
    color: '#fff',
    fontSize: wp('3.8%'),
    fontFamily: Fonts.bold,
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp('2%'),
  },
  viewStatusContainer: {
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  viewStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.8%'),
    borderRadius: wp('5%'),
    gap: wp('1.5%'),
  },
  viewStatusText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  viewTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: hp('2%'),
  },
  viewAmountCard: {
    borderRadius: wp('3%'),
    borderWidth: 1,
    padding: wp('4%'),
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  viewAmountLabel: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
    marginBottom: hp('0.5%'),
  },
  viewAmountValue: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
  },
  viewSection: {
    marginBottom: hp('2%'),
  },
  viewSectionTitle: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.bold,
    marginBottom: hp('1%'),
  },
  viewInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp('0.8%'),
  },
  viewInfoLabel: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
  },
  viewInfoValue: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  viewTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1.5%'),
    paddingVertical: hp('0.5%'),
  },
  viewPurposeText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
    lineHeight: wp('4%'),
  },
  viewExpenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: hp('0.8%'),
    borderBottomWidth: 1,
  },
  viewExpenseLabel: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
  },
  viewExpenseAmount: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  viewTotalRow: {
    marginTop: hp('0.5%'),
    paddingTop: hp('1%'),
    borderBottomWidth: 0,
  },
  viewPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    paddingVertical: hp('1%'),
  },
  viewPaymentText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  viewFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    padding: wp('2.5%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    marginBottom: hp('1%'),
  },
  viewFileName: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
  },
  closeViewBtn: {
    paddingVertical: hp('1.5%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
    marginTop: hp('2%'),
    marginBottom: hp('2%'),
  },
  closeViewBtnText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
    color: '#fff',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    gap: wp('2%'),
  },
  dateInputText: {
    flex: 1,
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    width: wp('85%'),
    maxHeight: hp('60%'),
    borderRadius: wp('4%'),
    padding: wp('4%'),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
    paddingBottom: hp('1%'),
    borderBottomWidth: 1,
  },
  datePickerTitle: {
    fontSize: wp('4%'),
    fontFamily: Fonts.bold,
  },
  datePickerColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp('2%'),
  },
  datePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  datePickerColumnLabel: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
    marginBottom: hp('1%'),
  },
  datePickerScroll: {
    maxHeight: hp('35%'),
    width: '100%',
  },
  datePickerScrollContent: {
    alignItems: 'center',
  },
  datePickerItem: {
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('2%'),
    borderRadius: wp('2%'),
    marginVertical: hp('0.3%'),
    minWidth: wp('12%'),
    alignItems: 'center',
  },
  datePickerItemText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.regular,
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: wp('3%'),
    marginTop: hp('2%'),
    paddingTop: hp('1.5%'),
    borderTopWidth: 1,
  },
  datePickerCancelBtn: {
    flex: 1,
    paddingVertical: hp('1.2%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
    borderWidth: 1,
  },
  datePickerCancelText: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
  },
  datePickerConfirmBtn: {
    flex: 1,
    paddingVertical: hp('1.2%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
  },
  datePickerConfirmText: {
    color: '#fff',
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
  },
  viewModalScroll: {
    paddingBottom: hp('2%'),
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    width: wp('85%'),
    maxHeight: hp('60%'),
    borderRadius: wp('4%'),
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('4%'),
    borderBottomWidth: 1,
  },
  datePickerTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
  },
  datePickerColumns: {
    flexDirection: 'row',
    padding: wp('2%'),
  },
  datePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  datePickerColumnLabel: {
    fontSize: wp('3%'),
    marginBottom: wp('2%'),
    fontFamily: Fonts.medium,
  },
  datePickerScroll: {
    height: hp('30%'),
  },
  datePickerScrollContent: {
    alignItems: 'center',
  },
  datePickerItem: {
    width: wp('20%'),
    paddingVertical: hp('1.5%'),
    alignItems: 'center',
    marginVertical: hp('0.3%'),
    borderRadius: wp('2%'),
  },
  datePickerItemText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.regular,
  },
  datePickerButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: wp('3%'),
    gap: wp('2%'),
  },
  datePickerCancelBtn: {
    flex: 1,
    paddingVertical: hp('1.2%'),
    alignItems: 'center',
    borderRadius: wp('2%'),
    borderWidth: 1,
  },
  datePickerCancelText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
  },
  datePickerConfirmBtn: {
    flex: 1,
    paddingVertical: hp('1.2%'),
    alignItems: 'center',
    borderRadius: wp('2%'),
  },
  datePickerConfirmText: {
    fontSize: wp('3.5%'),
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
  },
});

export default Reimbursement;
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
  Download,
  User,
  Check,
  Printer,
  Bike,
  ChevronDown,
} from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  createExpense,
  fetchExpenses,
} from '../../../store/actions/expenseActions';
import { requestCameraPermission, requestLocationPermission, quickCheckPermissions } from '../../../utils/permissions';
import { pick } from '@react-native-documents/picker';
import Share from 'react-native-share';
import { printToFile, print } from 'react-native-print';
import { getAccessToken } from '../../../utils/keychainHelper';


// API Configuration
const API_BASE_URL = 'https://api-presenza.paulmerchants.net/api/v1';

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
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const { expenses, loading } = useSelector(state => state.expense);
  const { profile } = useSelector(state => state.employeeProfile);
  const { user } = useSelector(state => state.auth);

  // ✅ FIX: Get token from multiple possible locations in Redux store
  const authState = useSelector(state => state.auth);

  const employeeName = profile?.[0]?.fullName || user?.name || 'N/A';

  // Form state
  const [expenseType, setExpenseType] = useState('car');
  const [amount, setAmount] = useState('');
  const [hotelCost, setHotelCost] = useState('');
  const [foodCost, setFoodCost] = useState('');
  const [date, setDate] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [purpose, setPurpose] = useState('');

  // ✅ UPDATED: Separate payment methods for each expense type
  const [travelPaymentMethod, setTravelPaymentMethod] = useState('self-paid');
  const [hotelPaymentMethod, setHotelPaymentMethod] = useState('self-paid');
  const [foodPaymentMethod, setFoodPaymentMethod] = useState('self-paid');

  // ✅ NEW: Dropdown visibility states
  const [showTravelDropdown, setShowTravelDropdown] = useState(false);
  const [showHotelDropdown, setShowHotelDropdown] = useState(false);
  const [showFoodDropdown, setShowFoodDropdown] = useState(false);

  const [otherExpenses, setOtherExpenses] = useState([]);
  const [kilometers, setKilometers] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fuelPricePerKm, setFuelPricePerKm] = useState(null);
  const [fetchingFuelRate, setFetchingFuelRate] = useState(false);

  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [tempDay, setTempDay] = useState(new Date().getDate());
  const [tempMonth, setTempMonth] = useState(new Date().getMonth() + 1);
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [dateDisplay, setDateDisplay] = useState('');

  const [selectedFiles, setSelectedFiles] = useState([]);

  // ============ CONSTANTS ============
  const AMOUNT_MAX_LENGTH = 5;
  const AMOUNT_MAX_VALUE = 100000;
  const KM_MAX_VALUE = 10000; // Max kilometers allowed
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  const LOCATION_MAX_LENGTH = 30;
  const PURPOSE_MAX_LENGTH = 200;
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

  // ============ FUEL RATE API FUNCTION (FIXED) ============
  const fetchFuelRate = async (type, distanceKm) => {
    if (!distanceKm || parseFloat(distanceKm) <= 0) {
      setFuelPricePerKm(null);
      setAmount('');
      return;
    }

    // Only fetch for bike and car
    if (type !== 'bike' && type !== 'car') {
      setFuelPricePerKm(null);
      setAmount('');
      return;
    }

    // ✅ FIX: Await the token from AsyncStorage instead of using Redux
    const token = await getAccessToken();
    console.log('🔑 Token being used:', token);

    // ✅ Check if token is available
    if (!token) {
      console.warn('⚠️ No auth token available for fuel rate API - using fallback rates');
      const vehicleType = type === 'car' ? 'car' : 'bike';
      const fallbackRate = vehicleType === 'car' ? 10 : 5;
      setFuelPricePerKm(fallbackRate);

      const distance = parseFloat(distanceKm);
      if (distance > 0) {
        const calculatedAmount = distance * fallbackRate;
        setAmount(Math.round(calculatedAmount).toString());
      }
      return;
    }

    try {
      setFetchingFuelRate(true);

      // Map expense type to API expected format
      const vehicleType = type === 'car' ? 'car' : 'bike';

      console.log('🔍 Fetching fuel rate for:', vehicleType);
      console.log('🔍 Using token:', token.substring(0, 20) + '...');

      const response = await fetch(`${API_BASE_URL}/fuel-rates`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('📡 Fuel rate response status:', response.status);

      // ✅ Handle 401 specifically
      if (response.status === 401) {
        console.warn('⚠️ 401 Unauthorized: Token might be expired or invalid. Using fallback.');
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();

      console.log('📦 RAW API RESPONSE DATA:', JSON.stringify(data, null, 2));

      // --- PARSING LOGIC ---
      let ratePerKm = null;

      // 1. Check for standard structure: { success: true, data: [ ... ] }
      if (data.success === true && Array.isArray(data.data) && data.data.length > 0) {
        const firstItem = data.data[0];

        if (vehicleType === 'bike') {
          ratePerKm = firstItem.revisedTwoWheeler || firstItem.bikeRate || firstItem.twoWheelerRate || null;
        } else if (vehicleType === 'car') {
          ratePerKm = firstItem.revisedRateFourWheeler || firstItem.carRate || firstItem.fourWheelerRate || null;
        }
        console.log(`📌 Structure 1 (Standard) matched! Found rate for ${vehicleType}: ${ratePerKm}`);
      }

      // 2. Fallback to Array logic
      if (!ratePerKm && Array.isArray(data)) {
        const bikeItem = data.find(item => item.vehicleType?.toLowerCase().includes('bike') || item.revisedTwoWheeler);
        const carItem = data.find(item => item.vehicleType?.toLowerCase().includes('car') || item.revisedRateFourWheeler);

        if (vehicleType === 'bike' && bikeItem) {
          ratePerKm = bikeItem.revisedTwoWheeler || bikeItem.ratePerKm || bikeItem.rate || bikeItem.fuelRate || null;
        } else if (vehicleType === 'car' && carItem) {
          ratePerKm = carItem.revisedRateFourWheeler || carItem.ratePerKm || carItem.rate || carItem.fuelRate || null;
        }
        console.log('📌 Structure 2 (Array) matched! Found rate:', ratePerKm);
      }

      // 3. Fallback to Nested Array logic
      if (!ratePerKm && data.data && Array.isArray(data.data)) {
        const bikeItem = data.data.find(item => item.vehicleType?.toLowerCase().includes('bike') || item.revisedTwoWheeler);
        const carItem = data.data.find(item => item.vehicleType?.toLowerCase().includes('car') || item.revisedRateFourWheeler);
        if (vehicleType === 'bike' && bikeItem) {
          ratePerKm = bikeItem.revisedTwoWheeler || bikeItem.ratePerKm || bikeItem.rate || bikeItem.fuelRate || null;
        } else if (vehicleType === 'car' && carItem) {
          ratePerKm = carItem.revisedRateFourWheeler || carItem.ratePerKm || carItem.rate || carItem.fuelRate || null;
        }
        console.log('📌 Structure 3 (Nested Array) matched! Found rate:', ratePerKm);
      }

      // If we still don't have a rate, use fallback
      if (!ratePerKm || ratePerKm === 0) {
        console.warn(`⚠️ Could not find a valid rate in API response. Using fallback.`);
        const fallbackRate = vehicleType === 'car' ? 10 : 5;
        ratePerKm = fallbackRate;
        console.log(`⚠️ Using fallback rate: ${ratePerKm}`);
      }

      console.log(`✅ Final rate for ${vehicleType}: ₹${ratePerKm}/km`);

      // Update State
      setFuelPricePerKm(ratePerKm);

      // Auto-calculate amount based on kilometers and rate
      const distance = parseFloat(distanceKm);
      if (distance > 0 && ratePerKm > 0) {
        const calculatedAmount = distance * ratePerKm;
        const roundedAmount = Math.round(calculatedAmount);
        setAmount(roundedAmount.toString());
        console.log(`💰 Calculated amount: ${distance}km × ₹${ratePerKm} = ₹${roundedAmount}`);
      }

    } catch (error) {
      // ✅ Use console.warn instead of console.error to avoid the red screen
      console.warn(`⚠️ API Failed (${error.message}). Setting fallback rate.`);

      const vehicleType = type === 'car' ? 'car' : 'bike';
      const fallbackRate = vehicleType === 'car' ? 10 : 5;

      setFuelPricePerKm(fallbackRate);

      const distance = parseFloat(distanceKm);
      if (distance > 0) {
        const calculatedAmount = distance * fallbackRate;
        setAmount(Math.round(calculatedAmount).toString());
      }

      // Show warning to user (only once per session to avoid spam)
      if (!fetchFuelRate.warningShown) {
        fetchFuelRate.warningShown = true;
        Alert.alert(
          'Note',
          'Unable to fetch latest fuel rates. Using default rates for calculation.',
          [{ text: 'OK' }]
        );
        setTimeout(() => {
          fetchFuelRate.warningShown = false;
        }, 10000);
      }
    } finally {
      setFetchingFuelRate(false);
    }
  };

  // Static property to track warning display
  fetchFuelRate.warningShown = false;


  // ============ VALIDATION FUNCTIONS ============
  const validateAmount = value => {
    if (!value) return '';
    const numValue = value.replace(/[^0-9]/g, '');
    if (numValue === '') return '';
    return numValue.slice(0, AMOUNT_MAX_LENGTH);
  };

  const validateKilometers = value => {
    if (!value) return '';
    const numValue = value.replace(/[^0-9]/g, '');
    if (numValue === '') return '';

    // Parse the numeric value
    const numericValue = parseFloat(numValue);

    // Check if value exceeds max limit
    if (numericValue > KM_MAX_VALUE) {
      Alert.alert(
        'Distance Limit Exceeded',
        `Maximum allowed distance is ${KM_MAX_VALUE} km. Please enter a valid distance.`,
        [{ text: 'OK' }]
      );
      return KM_MAX_VALUE.toString(); // Return max value as string
    }

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

  // Handle kilometers change with fuel rate fetch and validation
  const handleKilometersChange = (text) => {
    // First validate and apply limit
    const validated = validateKilometers(text);
    setKilometers(validated);

    // Fetch fuel rate when kilometers is valid and > 0
    if (validated && parseFloat(validated) > 0 && parseFloat(validated) <= KM_MAX_VALUE) {
      fetchFuelRate(expenseType, validated);
    } else {
      setFuelPricePerKm(null);
      setAmount('');
    }
  };

  // Handle expense type change
  const handleExpenseTypeChange = (type) => {
    setExpenseType(type);

    // Reset fuel-related fields when switching to non-vehicle types
    if (type !== 'bike' && type !== 'car') {
      setFuelPricePerKm(null);
      setAmount('');
      setKilometers('');
    } else if (kilometers && parseFloat(kilometers) > 0 && parseFloat(kilometers) <= KM_MAX_VALUE) {
      // If switching between bike and car, recalculate with new rate
      // Note: DO NOT setFuelPricePerKm(null) here! Let the fetch update it.
      fetchFuelRate(type, kilometers);
    }
  };

  // Handle From Date confirmation
  const handleFromDateConfirm = () => {
    const selectedFromDate = new Date(tempFromYear, tempFromMonth - 1, tempFromDay);
    setFromDate(selectedFromDate);
    setShowFromDatePicker(false);

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

    if (fromDate && selectedToDate < fromDate) {
      alert('To Date cannot be earlier than From Date');
      return;
    }

    setToDate(selectedToDate);
    setShowToDatePicker(false);
  };

  // Helper function to format date for display
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
    if (typeStr.includes('bike') || typeStr.includes('two') || typeStr.includes('2wheeler')) return 'Bike';
    if (typeStr.includes('train')) return 'Train';
    if (typeStr.includes('flight') || typeStr.includes('plane')) return 'Flight';
    return 'Other';
  };

  const getExpenseIcon = type => {
    const typeStr = (type || '').toLowerCase();
    if (typeStr.includes('car')) {
      return <Car size={wp('4%')} color="#FF6B35" />;
    } else if (typeStr.includes('bike') || typeStr.includes('two') || typeStr.includes('2wheeler')) {
      return <Bike size={wp('4%')} color="#2ECC71" />;
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

  const handleImagePick = async () => {
    if (selectedFiles.length >= 1) {
      Alert.alert('Limit Reached', 'You can only upload 1 file');
      return;
    }

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
      let pickConfig;

      if (Platform.OS === 'ios') {
        pickConfig = {
          type: ['public.content'],
          allowMultiSelection: false,
          mode: 'import',
        };
      } else {
        pickConfig = {
          type: ['application/pdf'],
          allowMultiSelection: false,
          mode: 'import',
          copyToInternalStorage: true,
        };
      }

      console.log('📄 PDF Pick Config:', pickConfig);

      const result = await pick(pickConfig);

      console.log('📄 PDF Pick Result:', result);

      const files = Array.isArray(result) ? result : (result ? [result] : []);

      if (files.length > 0) {
        const file = files[0];

        if (!file || !file.uri) {
          console.log('No file selected');
          return;
        }

        const fileName = (file.name || '').toLowerCase();
        const isPDF = fileName.endsWith('.pdf') ||
          file.mimeType === 'application/pdf' ||
          file.type === 'application/pdf';

        if (!isPDF) {
          Alert.alert('Invalid File', 'Please select a PDF file');
          return;
        }

        if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
          Alert.alert(
            'File Too Large',
            `${MAX_FILE_SIZE_MB}MB maximum file size allowed.`
          );
          return;
        }

        const pdfFile = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          uri: file.uri,
          type: 'pdf',
          name: file.name || `document_${Date.now()}.pdf`,
          size: file.size || 0,
          mimeType: 'application/pdf',
        };

        setSelectedFiles(prev => [...prev, pdfFile]);
        Alert.alert('Success', 'PDF selected successfully');
      }
    } catch (error) {
      console.log('PDF Picker Error:', error);

      if (error.code === 'DOCUMENT_PICKER_CANCELED' ||
        error.code === 'OPERATION_CANCELED' ||
        error.code === 3072 ||
        error.message?.includes('canceled') ||
        error.message?.includes('cancelled')) {
        console.log('User canceled PDF picker');
        return;
      }

      Alert.alert('Error', 'Failed to pick PDF: ' + (error.message || 'Unknown error'));
    }
  };

  const handleCameraCapture = async () => {
    if (selectedFiles.length >= 1) {
      Alert.alert('Limit Reached', 'You can only upload 1 file');
      return;
    }

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

  // ============ DOWNLOAD RECEIPT - FIXED ============
  const handleDownloadReceipt = async (receiptUrl) => {
    if (!receiptUrl) {
      Alert.alert('Error', 'No receipt available');
      return;
    }

    try {
      setOpeningFile(true);

      const fileName = receiptUrl.split('/').pop();
      const extension = fileName.split('.').pop()?.toLowerCase();

      const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
      if (!allowedExtensions.includes(extension?.toLowerCase())) {
        Alert.alert('Error', 'Unsupported file type');
        setOpeningFile(false);
        return;
      }

      // Use DocumentDirectoryPath for better compatibility
      const downloadPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      // Check if file already exists
      const fileExists = await RNFS.exists(downloadPath);
      if (fileExists) {
        // File already exists, offer to open it
        Alert.alert(
          'File Already Exists',
          'The file is already downloaded. Would you like to open it?',
          [
            {
              text: 'Open',
              onPress: async () => {
                try {
                  let mimeType = '*/*';
                  if (extension === 'pdf') mimeType = 'application/pdf';
                  else if (['jpg', 'jpeg'].includes(extension)) mimeType = 'image/jpeg';
                  else if (extension === 'png') mimeType = 'image/png';

                  await FileViewer.open(downloadPath, {
                    showOpenWithDialog: true,
                    mimeType,
                  });
                } catch (error) {
                  Alert.alert('Error', 'Cannot open file');
                }
              }
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setOpeningFile(false);
        return;
      }

      const downloadResult = await RNFS.downloadFile({
        fromUrl: receiptUrl,
        toFile: downloadPath,
        progressDivider: 10,
      }).promise;

      if (downloadResult.statusCode === 200) {
        Alert.alert(
          'Download Successful',
          `File saved successfully!`,
          [
            {
              text: 'Open File',
              onPress: async () => {
                try {
                  let mimeType = '*/*';
                  if (extension === 'pdf') mimeType = 'application/pdf';
                  else if (['jpg', 'jpeg'].includes(extension)) mimeType = 'image/jpeg';
                  else if (extension === 'png') mimeType = 'image/png';

                  await FileViewer.open(downloadPath, {
                    showOpenWithDialog: true,
                    mimeType,
                  });
                } catch (error) {
                  Alert.alert('Error', 'Cannot open file');
                }
              }
            },
            { text: 'OK' },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to download file');
      }
    } catch (error) {
      console.log('DOWNLOAD ERROR =>', error);
      Alert.alert('Error', 'Failed to download receipt: ' + error.message);
    } finally {
      setOpeningFile(false);
    }
  };

  // OR if the above doesn't work, use:
  // import { printToFile } from 'react-native-print';

  // ============ GENERATE AND DOWNLOAD PDF - USING REACT-NATIVE-PRINT ============
  // ============ GENERATE AND DOWNLOAD PDF - FIXED ============
  const generateExpensePDF = async (request) => {
    try {
      setDownloadingPDF(true);

      const status = (request.status || '').toUpperCase();
      const isApproved = status === 'APPROVED';
      const isRejected = status === 'REJECTED';

      const approvedByName = request.approvedBy?.fullName || '—';
      const approvedBy = isApproved ? approvedByName : isRejected ? approvedByName : '—';

      // ✅ FIX: Check if purpose exists and is not just whitespace
      const hasPurpose = request.businessPurpose && request.businessPurpose.trim().length > 0;

      // Create HTML content for PDF
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, Helvetica, sans-serif; 
            padding: 40px; 
            color: #333;
            background: #fff;
            font-size: 14px;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #2c3e50; 
            padding-bottom: 20px; 
            margin-bottom: 20px; 
          }
          .title { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2c3e50; 
            margin: 0; 
          }
          .subtitle { 
            font-size: 14px; 
            color: #7f8c8d; 
            margin-top: 5px; 
          }
          .status-badge { 
            display: inline-block; 
            padding: 8px 20px; 
            border-radius: 20px; 
            font-weight: bold; 
            font-size: 14px; 
          }
          .status-APPROVED { background: #2ecc71; color: white; }
          .status-PENDING { background: #f39c12; color: white; }
          .status-REJECTED { background: #e74c3c; color: white; }
          .section { 
            margin-top: 25px; 
          }
          .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            color: #2c3e50; 
            border-bottom: 2px solid #ecf0f1; 
            padding-bottom: 10px; 
            margin-bottom: 15px; 
          }
          .row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px solid #ecf0f1; 
          }
          .label { 
            font-weight: 600; 
            color: #7f8c8d; 
          }
          .value { 
            color: #2c3e50; 
          }
          .total-row { 
            background: #f8f9fa; 
            padding: 15px; 
            margin-top: 15px; 
            border-radius: 5px; 
            display: flex;
            justify-content: space-between;
          }
          .total-label { 
            font-size: 20px; 
            font-weight: bold; 
            color: #2c3e50; 
          }
          .total-amount { 
            font-size: 24px; 
            font-weight: bold; 
            color: #e67e22; 
          }
          .expense-item { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px solid #ecf0f1; 
          }
          .expense-desc { 
            color: #2c3e50; 
          }
          .expense-amount { 
            font-weight: 600; 
            color: #2c3e50; 
          }
          .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #ecf0f1; 
            font-size: 12px; 
            color: #95a5a6; 
            text-align: center; 
          }
          .employee-row { 
            display: flex; 
            justify-content: space-between; 
            margin-top: 10px; 
            padding: 10px 0;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">EXPENSE REIMBURSEMENT DETAILS</h1>
          <p class="subtitle">Generated on: ${new Date().toLocaleString()}</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <span class="status-badge status-${status}">${status}</span>
        </div>

        <div class="section">
          <h2 class="section-title">📋 TRAVEL INFORMATION</h2>
          <div class="row">
            <span class="label">Travel Type:</span>
            <span class="value">${getTravelTypeLabel(request.travelType)}</span>
          </div>
          <div class="row">
            <span class="label">From Location:</span>
            <span class="value">${request.fromLocation || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">To Location:</span>
            <span class="value">${request.toLocation || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">From Date:</span>
            <span class="value">${request.fromDate ? formatDate(request.fromDate) : 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">To Date:</span>
            <span class="value">${request.toDate ? formatDate(request.toDate) : 'N/A'}</span>
          </div>
          ${request.distanceKm ? `
          <div class="row">
            <span class="label">Distance:</span>
            <span class="value">${request.distanceKm} km</span>
          </div>` : ''}
        </div>

        ${hasPurpose ? `
        <div class="section">
          <h2 class="section-title">🎯 BUSINESS PURPOSE</h2>
          <p style="margin: 10px 0;">${request.businessPurpose}</p>
        </div>` : ''}

        <div class="section">
          <h2 class="section-title">📊 EXPENSE BREAKDOWN</h2>
          ${(() => {
          let items = '';
          let totalAmount = 0;

          if (request.expenses?.travel) {
            const amount = request.expenses.travel.amount || 0;
            totalAmount += amount;
            const paidBy = request.expenses.travel.paymentMethod === 'COMPANY' ? 'Company' : 'Self';
            items += `
                <div class="expense-item">
                  <span class="expense-desc">Travel Cost (${paidBy})</span>
                  <span class="expense-amount">${formatCurrency(amount)}</span>
                </div>`;
          }

          if (request.expenses?.hotel?.amount > 0) {
            const amount = request.expenses.hotel.amount;
            totalAmount += amount;
            const paidBy = request.expenses.hotel.paymentMethod === 'COMPANY' ? 'Company' : 'Self';
            items += `
                <div class="expense-item">
                  <span class="expense-desc">Hotel Cost (${paidBy})</span>
                  <span class="expense-amount">${formatCurrency(amount)}</span>
                </div>`;
          }

          if (request.expenses?.food?.amount > 0) {
            const amount = request.expenses.food.amount;
            totalAmount += amount;
            const paidBy = request.expenses.food.paymentMethod === 'COMPANY' ? 'Company' : 'Self';
            items += `
                <div class="expense-item">
                  <span class="expense-desc">Food Cost (${paidBy})</span>
                  <span class="expense-amount">${formatCurrency(amount)}</span>
                </div>`;
          }

          if (request.miscItems?.length > 0) {
            request.miscItems.forEach(item => {
              const amount = item.amount || 0;
              totalAmount += amount;
              const paidBy = item.paymentMethod === 'COMPANY' ? 'Company' : 'Self';
              const desc = item.description || 'Other Expense';
              items += `
                  <div class="expense-item">
                    <span class="expense-desc">${desc} (${paidBy})</span>
                    <span class="expense-amount">${formatCurrency(amount)}</span>
                  </div>`;
            });
          }

          items += `
              <div class="total-row">
                <span class="total-label">TOTAL AMOUNT:</span>
                <span class="total-amount">${formatCurrency(totalAmount)}</span>
              </div>`;

          return items;
        })()}
        </div>

        <div class="section">
          <h2 class="section-title">📝 SUBMISSION DETAILS</h2>
          <div class="row">
            <span class="label">Submitted On:</span>
            <span class="value">${formatDate(request.createdAt)}</span>
          </div>
          <div class="employee-row">
            <span><strong>Employee:</strong> ${employeeName}</span>
            <span><strong>Approved By:</strong> ${approvedBy}</span>
          </div>
        </div>

        <div class="footer">
          <p>Generated from Expense Reimbursement System</p>
        </div>
      </body>
      </html>
    `;

      console.log('📄 Generating PDF...');

      // Try using react-native-html-to-pdf
      let pdfPath = null;
      let error = null;

      // Method 1: Using RNHTMLtoPDF from import
      try {
        const { RNHTMLtoPDF } = require('react-native-html-to-pdf');
        if (RNHTMLtoPDF && typeof RNHTMLtoPDF.convert === 'function') {
          const options = {
            html: htmlContent,
            fileName: `Expense_${request._id || 'report'}`,
            directory: Platform.OS === 'android' ? 'Download' : 'Documents',
            padding: 20,
            quality: 100,
            orientation: 'portrait',
            base64: false,
          };
          const result = await RNHTMLtoPDF.convert(options);
          pdfPath = result.filePath;
          console.log('📄 PDF generated via RNHTMLtoPDF:', pdfPath);
        }
      } catch (e) {
        error = e;
        console.log('📄 RNHTMLtoPDF method 1 failed:', e.message);
      }

      // Method 2: Try different import style
      if (!pdfPath) {
        try {
          const module = require('react-native-html-to-pdf');
          const RNHTMLtoPDF = module.default || module;
          if (RNHTMLtoPDF && typeof RNHTMLtoPDF.convert === 'function') {
            const options = {
              html: htmlContent,
              fileName: `Expense_${request._id || 'report'}`,
              directory: Platform.OS === 'android' ? 'Download' : 'Documents',
              padding: 20,
              quality: 100,
              orientation: 'portrait',
              base64: false,
            };
            const result = await RNHTMLtoPDF.convert(options);
            pdfPath = result.filePath;
            console.log('📄 PDF generated via RNHTMLtoPDF method 2:', pdfPath);
          }
        } catch (e) {
          error = e;
          console.log('📄 RNHTMLtoPDF method 2 failed:', e.message);
        }
      }

      // If PDF generation failed, create HTML file as fallback
      if (!pdfPath) {
        console.log('📄 PDF generation failed, creating HTML file as fallback');
        const fileName = `Expense_${request._id || 'report'}_${Date.now()}.html`;
        const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

        await RNFS.writeFile(filePath, htmlContent, 'utf8');
        pdfPath = filePath;
        console.log('📄 HTML file created at:', pdfPath);

        Alert.alert(
          '✅ Report Generated',
          `Report saved as HTML file.\nYou can view it in any browser.\n\nFile: ${fileName}`,
          [
            {
              text: 'Open File',
              onPress: async () => {
                try {
                  await FileViewer.open(pdfPath, {
                    showOpenWithDialog: true,
                    mimeType: 'text/html',
                  });
                } catch (error) {
                  console.log('📄 Error opening file:', error);
                  Alert.alert('Error', 'Cannot open file: ' + error.message);
                }
              }
            },
            {
              text: 'Share File',
              onPress: async () => {
                try {
                  await Share.open({
                    url: `file://${pdfPath}`,
                    type: 'text/html',
                    title: 'Expense Report',
                  });
                } catch (error) {
                  if (error.message !== 'User canceled') {
                    console.log('📄 Error sharing file:', error);
                    Alert.alert('Error', 'Failed to share file: ' + error.message);
                  }
                }
              }
            },
            { text: 'OK' },
          ],
          { cancelable: false }
        );

        setDownloadingPDF(false);
        return;
      }

      // Verify file exists
      const fileExists = await RNFS.exists(pdfPath);
      console.log('📄 File exists:', fileExists);

      if (!fileExists) {
        throw new Error('PDF file not found at: ' + pdfPath);
      }

      // For Android, copy to Downloads folder
      if (Platform.OS === 'android' && pdfPath.endsWith('.pdf')) {
        try {
          const fileName = `Expense_${request._id || 'report'}_${Date.now()}.pdf`;
          const downloadsPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
          await RNFS.copyFile(pdfPath, downloadsPath);
          console.log('📄 PDF copied to Downloads:', downloadsPath);
          pdfPath = downloadsPath;
        } catch (copyError) {
          console.log('📄 Copy to Downloads failed:', copyError);
        }
      }

      // Show success message with options
      Alert.alert(
        '✅ PDF Downloaded Successfully',
        `PDF saved to:\n${pdfPath}\n\nWhat would you like to do?`,
        [
          {
            text: 'Open PDF',
            onPress: async () => {
              try {
                console.log('📄 Opening PDF from:', pdfPath);
                await FileViewer.open(pdfPath, {
                  showOpenWithDialog: true,
                  mimeType: 'application/pdf',
                });
              } catch (error) {
                console.log('📄 Error opening PDF:', error);
                Alert.alert('Error', 'Cannot open PDF: ' + error.message);
              }
            }
          },
          {
            text: 'Share PDF',
            onPress: async () => {
              try {
                await Share.open({
                  url: `file://${pdfPath}`,
                  type: 'application/pdf',
                  title: 'Expense Report',
                });
              } catch (error) {
                if (error.message !== 'User canceled') {
                  console.log('📄 Error sharing PDF:', error);
                  Alert.alert('Error', 'Failed to share PDF: ' + error.message);
                }
              }
            }
          },
          { text: 'OK' },
        ],
        { cancelable: false }
      );

    } catch (error) {
      console.log('📄 PDF GENERATION ERROR =>', error);
      Alert.alert(
        'Error',
        'Failed to generate PDF: ' + (error.message || 'Unknown error')
      );
    } finally {
      setDownloadingPDF(false);
    }
  };

  // ============ SUBMIT EXPENSE ============
  const handleSubmitExpense = () => {

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
    // if (!purpose.trim()) {
    //   Alert.alert('Validation Error', 'Please enter Business Purpose');
    //   return;
    // }

    if ((expenseType === 'car' || expenseType === 'bike') && (!kilometers || parseFloat(kilometers) <= 0)) {
      Alert.alert(
        'Validation Error',
        'Please enter valid distance for travel',
      );
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid travel amount');
      return;
    }
    // Validate distance limit for car and bike
    if ((expenseType === 'car' || expenseType === 'bike') && parseFloat(kilometers) > KM_MAX_VALUE) {
      Alert.alert(
        'Validation Error',
        `Distance cannot exceed ${KM_MAX_VALUE} km. Please enter a valid distance.`,
      );
      return;
    }
    // if (selectedFiles.length === 0) {
    //   Alert.alert(
    //     'Validation Error',
    //     'Please upload receipt/document attachment',
    //   );
    //   return;
    // }

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

  const submitToServer = async () => {
    setSubmitting(true);

    let grade = 'Grade 2 - Senior Employee';
    let policySnapshot = {
      trainClass: '2nd AC / 3rd AC',
      flightClass: 'Economy',
      hotelLimit: 2000,
      carRatePerKm: 10,
      bikeRatePerKm: 5,
    };

    try {
      const formatDateForAPI = (date) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const expenseData = {
        travelType: expenseType.toUpperCase(),
        grade: grade,
        policySnapshot: policySnapshot,
        fromLocation: fromLocation.trim(),
        toLocation: toLocation.trim(),
        fromDate: fromDate ? formatDateForAPI(fromDate) : null,
        toDate: toDate ? formatDateForAPI(toDate) : null,
        businessPurpose: purpose.trim(),
        distanceKm: (expenseType === 'car' || expenseType === 'bike') ? parseFloat(kilometers) || 0 : undefined,
        expenses: {
          travel: {
            amount: parseFloat(amount) || 0,
            paymentMethod: travelPaymentMethod === 'self-paid' ? 'SELF' : 'COMPANY',
          },
          hotel: {
            amount: parseFloat(hotelCost) || 0,
            paymentMethod: hotelPaymentMethod === 'self-paid' ? 'SELF' : 'COMPANY', // ✅ UPDATED
          },
          food: {
            amount: parseFloat(foodCost) || 0,
            paymentMethod: foodPaymentMethod === 'self-paid' ? 'SELF' : 'COMPANY', // ✅ UPDATED
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
            paymentMethod: item.paymentMethod === 'self-paid' ? 'SELF' : 'COMPANY',
          })),
      };

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
    // ✅ UPDATED: Reset all payment methods
    setTravelPaymentMethod('self-paid');
    setHotelPaymentMethod('self-paid');
    setFoodPaymentMethod('self-paid');
    setOtherExpenses([]);
    setKilometers('');
    setSelectedFiles([]);
    setFromDate(null);
    setToDate(null);
    setFuelPricePerKm(null);
    // ✅ Reset dropdowns
    setShowTravelDropdown(false);
    setShowHotelDropdown(false);
    setShowFoodDropdown(false);

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

    if (activeFilter === 'pending') {
      const filtered = expenses.filter(r => (r.status || '').toUpperCase() === 'PENDING');
      return filtered.reverse();
    } else if (activeFilter === 'approved') {
      const filtered = expenses.filter(r => (r.status || '').toUpperCase() === 'APPROVED');
      return filtered.reverse();
    } else if (activeFilter === 'rejected') {
      const filtered = expenses.filter(r => (r.status || '').toUpperCase() === 'REJECTED');
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

    return { pending, approved, rejected };
  };

  const counts = getFilterCounts();

  // ============ VIEW MODAL ============
  const renderViewModal = () => {
    if (!selectedRequest) return null;

    const isApproved = selectedRequest.status?.toUpperCase() === 'APPROVED';
    const isRejected = selectedRequest.status?.toUpperCase() === 'REJECTED';

    const approvedByName = selectedRequest.approvedBy?.fullName || '—';
    const approvedBy = isApproved ? approvedByName : isRejected ? approvedByName : '—';

    // ✅ FIX: Check if purpose exists and is not just whitespace
    const hasPurpose = selectedRequest.businessPurpose && selectedRequest.businessPurpose.trim().length > 0;

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

              {/* ✅ FIX: Only render Business Purpose section if it has content */}
              {hasPurpose && (
                <View style={styles.viewSection}>
                  <Text
                    style={[styles.viewSectionTitle, { color: C.textPrimary }]}
                  >
                    Business Purpose
                  </Text>
                  <Text
                    style={[styles.viewPurposeText, { color: C.textSecondary }]}
                  >
                    {selectedRequest.businessPurpose}
                  </Text>
                </View>
              )}

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
                      <Text style={[
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
                  <View style={styles.receiptActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.viewFileItem,
                        { backgroundColor: C.surface, borderColor: C.border, flex: 1 },
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

                    <TouchableOpacity
                      style={[
                        styles.downloadReceiptBtn,
                        { backgroundColor: C.primary },
                      ]}
                      onPress={() => handleDownloadReceipt(selectedRequest.receiptUrl)}
                      disabled={openingFile}
                    >
                      {openingFile ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Download size={wp('4%')} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
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

                <View style={styles.employeeApprovedRow}>
                  <Text
                    style={[styles.employeeApprovedText, { color: C.textSecondary }]}
                  >
                    Employee: <Text style={[styles.employeeApprovedValue, { color: C.textPrimary }]}>{employeeName}</Text>
                  </Text>
                  <Text
                    style={[styles.employeeApprovedText, { color: C.textSecondary }]}
                  >
                    Approved By: <Text style={[styles.employeeApprovedValue, { color: C.textPrimary }]}>{approvedBy}</Text>
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.downloadPDFBtn,
                  { backgroundColor: C.primary + '15', borderColor: C.primary },
                ]}
                onPress={() => generateExpensePDF(selectedRequest)}
                disabled={downloadingPDF}
              >
                {downloadingPDF ? (
                  <ActivityIndicator color={C.primary} size="small" />
                ) : (
                  <>
                    <Download size={wp('4%')} color={C.primary} />
                    <Text style={[styles.downloadPDFText, { color: C.primary }]}>
                      Download PDF
                    </Text>
                  </>
                )}
              </TouchableOpacity>

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
        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilter === 'pending' && styles.activeFilterTab,
            activeFilter === 'pending' && { borderBottomColor: C.primary },
            { marginLeft: wp('5%') },
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
                : activeFilter === 'approved'
                  ? 'Approved requests will appear here'
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
                    </Text>
                    <Text
                      style={[styles.requestDate, { color: C.textSecondary }]}
                    >
                      {item.fromDate ? formatDate(item.fromDate) : 'N/A'} - {item.toDate ? formatDate(item.toDate) : 'N/A'} •{' '}
                      {truncateText(item.fromLocation, 20)} →{' '}
                      {truncateText(item.toLocation, 20)}
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
                  {/* ✅ FIX: Only render Purpose row if it has content */}
                  {item.businessPurpose && item.businessPurpose.trim().length > 0 && (
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
                  )}

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
                  paddingBottom: Platform.OS === 'ios' ? 40 : 20,
                  paddingHorizontal: wp('4%'),
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Travel Type *
                </Text>
                <View style={styles.typeGrid}>
                  {['car', 'bike', 'train', 'flight', 'other'].map(type => {
                    let icon;
                    let label = type.charAt(0).toUpperCase() + type.slice(1);
                    if (type === 'bike') label = 'Bike';

                    switch (type) {
                      case 'car':
                        icon = <Car size={wp('5%')} color={expenseType === type ? C.primary : C.textSecondary} />;
                        break;
                      case 'bike':
                        icon = <Bike size={wp('5%')} color={expenseType === type ? C.primary : C.textSecondary} />;
                        break;
                      case 'train':
                        icon = <Train size={wp('5%')} color={expenseType === type ? C.primary : C.textSecondary} />;
                        break;
                      case 'flight':
                        icon = <Plane size={wp('5%')} color={expenseType === type ? C.primary : C.textSecondary} />;
                        break;
                      default:
                        icon = <FileText size={wp('5%')} color={expenseType === type ? C.primary : C.textSecondary} />;
                    }

                    return (
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
                        onPress={() => handleExpenseTypeChange(type)}
                      >
                        {icon}
                        <Text
                          style={[
                            styles.typeText,
                            {
                              color:
                                expenseType === type ? C.primary : C.textSecondary,
                            },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <>
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


                {(expenseType === 'car' || expenseType === 'bike') && (
                  <>
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
                        onChangeText={handleKilometersChange}
                        maxLength={6}
                      />
                      {kilometers && parseFloat(kilometers) > KM_MAX_VALUE && (
                        <Text style={[styles.errorText, { color: '#E74C3C' }]}>
                          Maximum allowed distance is {KM_MAX_VALUE} km
                        </Text>
                      )}
                    </View>
                    {fetchingFuelRate && (
                      <View style={styles.fuelRateLoader}>
                        <ActivityIndicator size="small" color={C.primary} />
                        <Text style={[styles.fuelRateText, { color: C.textSecondary }]}>
                          Fetching fuel rate...
                        </Text>
                      </View>
                    )}
                    {fuelPricePerKm !== null && !fetchingFuelRate && kilometers && parseFloat(kilometers) > 0 && parseFloat(kilometers) <= KM_MAX_VALUE && (
                      <View style={[styles.fuelRateInfo, { backgroundColor: C.surface, borderColor: C.border }]}>
                        <Text style={[styles.fuelRateLabel, { color: C.textSecondary }]}>
                          Fuel Rate:
                        </Text>
                        <Text style={[styles.fuelRateValue, { color: C.primary }]}>
                          ₹{fuelPricePerKm.toFixed(2)}/km
                        </Text>
                        <Text style={[styles.fuelRateCalculated, { color: C.textSecondary }]}>
                          Total: ₹{(parseFloat(kilometers) * fuelPricePerKm).toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {/* ✅ TRAVEL AMOUNT SECTION WITH DROPDOWN */}
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Travel Amount *
                </Text>
                <View style={[styles.rowContainer, { zIndex: 1000 }]}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: C.surface,
                        borderColor: C.border,
                        color: C.textPrimary,
                        flex: 1,
                      },
                    ]}
                    placeholder={
                      (expenseType === 'car' || expenseType === 'bike')
                        ? 'Auto-calculated'
                        : 'Enter amount'
                    }

                    placeholderTextColor={C.textTertiary}
                    keyboardType="numeric"
                    value={amount}
                    editable={expenseType !== 'car' && expenseType !== 'bike'}
                    onChangeText={text => setAmount(validateAmount(text))}
                    maxLength={AMOUNT_MAX_LENGTH}
                  />
                  <View style={{ flex: 0.8, marginLeft: wp('2%') }}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownTrigger,
                        { backgroundColor: C.surface, borderColor: C.border },
                      ]}
                      onPress={() => setShowTravelDropdown(!showTravelDropdown)}
                    >
                      <Text style={[styles.dropdownText, { color: C.textPrimary }]} numberOfLines={1}>
                        {travelPaymentMethod === 'self-paid' ? 'Self-Paid' : 'Company-Paid'}
                      </Text>
                      <ChevronDown size={wp('3%')} color={C.textSecondary} />
                    </TouchableOpacity>
                    {showTravelDropdown && (
                      <View style={[styles.dropdownMenu, { backgroundColor: C.surface, borderColor: C.border }]}>
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setTravelPaymentMethod('self-paid');
                            setShowTravelDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { color: C.textPrimary }]}>Self-Paid</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setTravelPaymentMethod('company-paid');
                            setShowTravelDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { color: C.textPrimary }]}>Company-Paid</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Additional Expenses (Optional)
                </Text>

                {/* ✅ HOTEL COST SECTION WITH DROPDOWN */}
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Hotel Cost
                </Text>
                <View style={[styles.rowContainer, { zIndex: 900 }]}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: C.surface,
                        borderColor: C.border,
                        color: C.textPrimary,
                        flex: 1,
                      },
                    ]}
                    placeholder="Enter hotel cost"
                    placeholderTextColor={C.textTertiary}
                    keyboardType="numeric"
                    value={hotelCost}
                    onChangeText={text => setHotelCost(validateAmount(text))}
                    maxLength={AMOUNT_MAX_LENGTH}
                  />
                  <View style={{ flex: 0.8, marginLeft: wp('2%') }}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownTrigger,
                        { backgroundColor: C.surface, borderColor: C.border },
                      ]}
                      onPress={() => setShowHotelDropdown(!showHotelDropdown)}
                    >
                      <Text style={[styles.dropdownText, { color: C.textPrimary }]} numberOfLines={1}>
                        {hotelPaymentMethod === 'self-paid' ? 'Self-Paid' : 'Company-Paid'}
                      </Text>
                      <ChevronDown size={wp('3%')} color={C.textSecondary} />
                    </TouchableOpacity>
                    {showHotelDropdown && (
                      <View style={[styles.dropdownMenu, { backgroundColor: C.surface, borderColor: C.border }]}>
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setHotelPaymentMethod('self-paid');
                            setShowHotelDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { color: C.textPrimary }]}>Self-Paid</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setHotelPaymentMethod('company-paid');
                            setShowHotelDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { color: C.textPrimary }]}>Company-Paid</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* ✅ FOOD COST SECTION WITH DROPDOWN */}
                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Food Cost
                </Text>
                <View style={[styles.rowContainer, { zIndex: 800 }]}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: C.surface,
                        borderColor: C.border,
                        color: C.textPrimary,
                        flex: 1,
                      },
                    ]}
                    placeholder="Enter food cost"
                    placeholderTextColor={C.textTertiary}
                    keyboardType="numeric"
                    value={foodCost}
                    onChangeText={text => setFoodCost(validateAmount(text))}
                    maxLength={AMOUNT_MAX_LENGTH}
                  />
                  <View style={{ flex: 0.8, marginLeft: wp('2%') }}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownTrigger,
                        { backgroundColor: C.surface, borderColor: C.border },
                      ]}
                      onPress={() => setShowFoodDropdown(!showFoodDropdown)}
                    >
                      <Text style={[styles.dropdownText, { color: C.textPrimary }]} numberOfLines={1}>
                        {foodPaymentMethod === 'self-paid' ? 'Self-Paid' : 'Company-Paid'}
                      </Text>
                      <ChevronDown size={wp('3%')} color={C.textSecondary} />
                    </TouchableOpacity>
                    {showFoodDropdown && (
                      <View style={[styles.dropdownMenu, { backgroundColor: C.surface, borderColor: C.border }]}>
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFoodPaymentMethod('self-paid');
                            setShowFoodDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { color: C.textPrimary }]}>Self-Paid</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFoodPaymentMethod('company-paid');
                            setShowFoodDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { color: C.textPrimary }]}>Company-Paid</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.otherExpensesHeader}>
                  <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
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
                    <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                      Receipt/Document (Optional)
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

                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                  Business Purpose (Optional)
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
                  placeholder="Describe the purpose (max 200 chars)..."
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
    // ✅ REMOVED: height and textAlignVertical to restore original natural height
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
    marginBottom: hp('1%')
  },
  typeOption: {
    flex: 1,
    minWidth: '18%',
    borderWidth: 1,
    borderRadius: wp('2%'),
    padding: wp('3%'),
    alignItems: 'center',
    gap: hp('0.5%'),
  },
  typeText: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },

  // ✅ FIXED: Dropdown Layout Styles
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('1%'),
    // Note: zIndex is now applied dynamically in the JSX to prevent overlap
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: wp('2%'),
    // ✅ FIXED: Matching vertical padding of input to get the same height
    paddingVertical: wp('3%'),
    paddingHorizontal: wp('3%'),
  },
  dropdownText: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    // ✅ FIXED: Adjusted top position to sit right below the trigger
    top: hp('6%'),
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: wp('2%'),
    paddingVertical: hp('0.5%'),
    backgroundColor: '#FFFFFF', // Ensure solid white background
    zIndex: 9999, // Highest z-index for the popup itself
    elevation: 10, // Higher elevation for Android shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  dropdownItem: {
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('3%'),
  },
  dropdownItemText: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
  },

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
  receiptActionsRow: {
    flexDirection: 'row',
    gap: wp('2%'),
    alignItems: 'center',
  },
  downloadReceiptBtn: {
    width: wp('12%'),
    height: wp('12%'),
    borderRadius: wp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadPDFBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp('1.2%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    gap: wp('2%'),
    marginTop: hp('1%'),
    marginBottom: hp('1%'),
  },
  downloadPDFText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  employeeApprovedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp('0.8%'),
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  employeeApprovedText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
  },
  employeeApprovedValue: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  fuelRateLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    marginTop: hp('1%'),
    paddingVertical: hp('0.5%'),
  },
  fuelRateText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
  },
  fuelRateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp('3%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    marginTop: hp('1%'),
    marginBottom: hp('1%'),
  },
  fuelRateLabel: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
  },
  fuelRateValue: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.bold,
  },
  fuelRateCalculated: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
  },
  errorText: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.medium,
    marginTop: hp('0.5%'),
  },
});

export default Reimbursement;
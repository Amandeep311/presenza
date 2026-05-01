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
  DatePickerAndroid,
  DatePickerIOS,
} from 'react-native';

import React, { useCallback, useState } from 'react';
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
  AlertCircle,
  FilePlus,
  Camera,
  RefreshCw,
  ImageIcon,
  Loader,
  Eye,
} from 'lucide-react-native';
import { useToast } from 'react-native-toast-notifications';
import { useDispatch, useSelector } from 'react-redux';
import { createExpense } from '../../../store/actions/expenseActions';
import { showToast } from '../../../components/common/ToastProvider';

const Reimbursement = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;
  const dispatch = useDispatch();
  const toast = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('new');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

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

  // File state - sirf selected files store karte hain
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Dummy data
  const [reimbursements, setReimbursements] = useState([
    {
      id: 1,
      type: 'flight',
      title: 'Flight Ticket - Client Meeting',
      amount: 1420,
      date: '2026-03-15',
      fromLocation: 'New York',
      toLocation: 'San Francisco',
      purpose: 'Client Meeting for project discussion',
      status: 'approved',
      submittedDate: '2026-03-16',
      approvedBy: 'Lisa Brown',
      approvedDate: '2026-03-17',
      paymentMethod: 'company-paid',
      travelCost: 1420,
      hotelCost: 0,
      foodCost: 0,
      attachments: [],
    },
    {
      id: 2,
      type: 'car',
      title: 'Car Travel - Business Visit',
      amount: 180,
      date: '2026-03-18',
      fromLocation: 'Office',
      toLocation: 'Client Site',
      purpose: 'Business visit to client location',
      status: 'pending',
      submittedDate: '2026-03-18',
      paymentMethod: 'self-paid',
      travelCost: 120,
      hotelCost: 0,
      foodCost: 60,
      kilometers: 12,
      attachments: [],
    },
    {
      id: 3,
      type: 'train',
      title: 'Train Travel - Conference',
      amount: 315,
      date: '2026-03-10',
      fromLocation: 'Boston',
      toLocation: 'Providence',
      purpose: 'Conference Attendance',
      status: 'approved',
      submittedDate: '2026-03-11',
      approvedBy: 'Lisa Brown',
      approvedDate: '2026-03-12',
      paymentMethod: 'company-paid',
      travelCost: 65,
      hotelCost: 200,
      foodCost: 50,
      attachments: [],
    },
    {
      id: 4,
      type: 'other',
      title: 'Conference Registration & Accommodation',
      amount: 580,
      date: '2026-03-12',
      fromLocation: 'Home Office',
      toLocation: 'Tech Summit, Austin',
      purpose: 'Attended 3-day technology conference with networking dinner',
      status: 'approved',
      submittedDate: '2026-03-14',
      approvedBy: 'Lisa Brown',
      approvedDate: '2026-03-15',
      paymentMethod: 'company-paid',
      travelCost: 250,
      hotelCost: 250,
      foodCost: 80,
      attachments: [],
      otherExpenses: [
        {
          id: '1',
          description: 'Conference Registration',
          amount: 100,
          paymentMethod: 'company-paid',
        },
        {
          id: '2',
          description: 'Networking Dinner',
          amount: 50,
          paymentMethod: 'self-paid',
        },
      ],
    },
    {
      id: 5,
      type: 'flight',
      title: 'Flight - Business Trip',
      amount: 850,
      date: '2026-03-20',
      fromLocation: 'Chicago',
      toLocation: 'Los Angeles',
      purpose: 'Client presentation',
      status: 'pending',
      submittedDate: '2026-03-20',
      paymentMethod: 'self-paid',
      travelCost: 850,
      hotelCost: 0,
      foodCost: 0,
      attachments: [],
    },
  ]);

  // const { profile } = useSelector(state => state.employeeProfile);

  // ============ ADD THESE HELPER FUNCTIONS ============
  const formatDDMMYYYY = dateStr => {
    if (!dateStr) return '';
    // Handle YYYY-MM-DD to DD/MM/YYYY
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
    // Initialize temp values from current date
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
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

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

  const getExpenseIcon = type => {
    switch (type) {
      case 'car':
        return <Car size={wp('4%')} color="#FF6B35" />;
      case 'train':
        return <Train size={wp('4%')} color="#4A90E2" />;
      case 'flight':
        return <Plane size={wp('4%')} color="#9B59B6" />;
      default:
        return <FileText size={wp('4%')} color="#1ABC9C" />;
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case 'approved':
        return { bg: '#2ECC71', color: '#fff' };
      case 'pending':
        return { bg: '#F39C12', color: '#fff' };
      case 'rejected':
        return { bg: '#E74C3C', color: '#fff' };
      default:
        return { bg: '#95A5A6', color: '#fff' };
    }
  };

  const getStatusIcon = status => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={wp('3%')} color="#fff" />;
      case 'pending':
        return <Clock size={wp('3%')} color="#fff" />;
      case 'rejected':
        return <XCircle size={wp('3%')} color="#fff" />;
      default:
        return null;
    }
  };

  // ============ DELETE REQUEST FUNCTION ============
  const handleDeleteRequest = item => {
    Alert.alert(
      'Delete Request',
      `Are you sure you want to delete "${item.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setReimbursements(prev => prev.filter(r => r.id !== item.id));
            showToast('Request deleted successfully', 'success');

            // Close view modal if it's open for this item
            if (selectedRequest?.id === item.id) {
              setShowViewModal(false);
              setSelectedRequest(null);
            }
          },
        },
      ],
    );
  };

  // ============ VIEW REQUEST DETAILS ============
  const handleViewRequest = item => {
    setSelectedRequest(item);
    setShowViewModal(true);
  };

  const addOtherExpense = () => {
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

  const updateOtherExpense = (id, field, value) => {
    setOtherExpenses(
      otherExpenses.map(item =>
        item.id === id ? { ...item, [field]: value } : item,
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

  // ============ FILE PICKING FUNCTIONS (No upload, just select) ============

  const handleImagePick = () => {
    const remainingSlots = 5 - selectedFiles.length;
    if (remainingSlots <= 0) {
      // Alert.alert('Limit Reached', 'Maximum 5 files allowed');
      showToast('You have already selected 5 files', 'warning');
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'photo',
        selectionLimit: remainingSlots,
        quality: 0.8,
        maxHeight: 2000,
        maxWidth: 2000,
      },
      response => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.error) {
          console.log('ImagePicker Error:', response.error);
        } else if (response.assets && response.assets.length > 0) {
          const imageFiles = response.assets.map(asset => ({
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            uri: asset.uri,
            type: asset.type?.includes('png') ? 'png' : 'jpg',
            name:
              asset.fileName ||
              `image_${Date.now()}.${
                asset.type?.includes('png') ? 'png' : 'jpg'
              }`,
            size: asset.fileSize,
            mimeType: asset.type || 'image/jpeg',
          }));

          setSelectedFiles(prev => [...prev, ...imageFiles]);

          showToast(`${imageFiles.length} image(s) selected`, 'success');
        }
      },
    );
  };

  const handlePDFPick = async () => {
    const remainingSlots = 5 - selectedFiles.length;
    if (remainingSlots <= 0) {
      // Alert.alert('Limit Reached', 'Maximum 5 files allowed');
      showToast('You have already selected 5 files', 'warning');
      return;
    }

    try {
      const result = await pick({
        type: ['application/pdf'],
        allowMultiSelection: true,
        mode: 'import',
      });

      if (result && result.length > 0) {
        const filesToAdd = result.slice(0, remainingSlots);
        const pdfFiles = filesToAdd.map(file => ({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          uri: file.uri,
          type: 'pdf',
          name: file.name || `document_${Date.now()}.pdf`,
          size: file.size,
          mimeType: 'application/pdf',
        }));

        setSelectedFiles(prev => [...prev, ...pdfFiles]);
        showToast(`${pdfFiles.length} PDF(s) selected`, 'success');

        if (result.length > remainingSlots) {
          Alert.alert(
            'Note',
            `Only ${remainingSlots} file(s) added. Maximum 5 files allowed.`,
          );
        }
      }
    } catch (error) {
      if (error.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.log('PDF picker error:', error);
      }
    }
  };

  const handleAllFilesPick = async () => {
    const remainingSlots = 5 - selectedFiles.length;
    if (remainingSlots <= 0) {
      // Alert.alert('Limit Reached', 'Maximum 5 files allowed');
      showToast('You have already selected 5 files', 'warning');
      return;
    }

    try {
      const result = await pick({
        type: ['image/*', 'application/pdf'],
        allowMultiSelection: true,
        mode: 'import',
      });


      if (result && result.length > 0) {
        const filesToAdd = result.slice(0, remainingSlots);
        const files = filesToAdd.map(file => {
          let fileType = 'pdf';
          if (file.type?.includes('image')) {
            fileType = file.type.includes('png') ? 'png' : 'jpg';
          }
          return {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            uri: file.uri,
            type: fileType,
            name: file.name || `file_${Date.now()}.${fileType}`,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
          };
        });

        setSelectedFiles(prev => [...prev, ...files]);
        showToast(`${files.length} file(s) selected`, 'success');

        if (result.length > remainingSlots) {
          Alert.alert(
            'Note',
            `Only ${remainingSlots} file(s) added. Maximum 5 files allowed.`,
          );
        }
      }
    } catch (error) {
      if (error.code !== 'DOCUMENT_PICKER_CANCELED') {
        console.log('File picker error:', error);
      }
    }
  };

  const handleCameraCapture = () => {
    if (selectedFiles.length >= 5) {
      // Alert.alert('Limit Reached', 'Maximum 5 files allowed');
      showToast('You have already selected 5 files', 'warning');
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
          console.log('Camera Error:', response.error);
          // Alert.alert('Error', 'Failed to capture image');
          showToast('Failed to capture image', 'danger');
        } else if (response.assets && response.assets.length > 0) {
          const imageFile = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            uri: response.assets[0].uri,
            type: 'jpg',
            name: response.assets[0].fileName || `capture_${Date.now()}.jpg`,
            size: response.assets[0].fileSize,
            mimeType: 'image/jpeg',
          };

          setSelectedFiles(prev => [...prev, imageFile]);
          showToast('Photo captured', 'success');
        }
      },
    );
  };

  const showFilePickerOptions = () => {
    if (selectedFiles.length >= 5) {
      Alert.alert(
        'Limit Reached',
        'Maximum 5 files allowed. Remove some files to add new ones.',
      );
      return;
    }

    Alert.alert(
      'Upload Attachment',
      'Choose file type to add',
      [
        { text: 'PDF Document', onPress: handlePDFPick },
        { text: 'Image', onPress: handleImagePick },
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

  const getFileIcon = (type, size = wp('6%')) => {
    if (type === 'pdf') return <FileText size={size} color="#E74C3C" />;
    return <ImageIcon size={size} color="#3498DB" />;
  };

  // ============ SUBMIT (Single API Call with File) ============

  const handleSubmitExpense = () => {
    if (!amount || !date || !fromLocation || !toLocation || !purpose) {
      // Alert.alert('Error', 'Please fill all required fields');
      showToast('Please fill all required fields', 'danger');
      return;
    }

    submitToServer();
  };

  // const getPolicyByDesignation = designation => {
  //   const d = (designation || '').toLowerCase();

  //   // 🔹 DEFAULT (fallback)
  //   const defaultPolicy = {
  //     grade: 'Grade 2 - Senior Employee',
  //     policySnapshot: {
  //       trainClass: '2nd AC / 3rd AC',
  //       flightClass: 'Economy',
  //       hotelLimit: 2000,
  //       carRatePerKm: 10,
  //     },
  //   };

  //   if (!d) return defaultPolicy;

  //   // 🔹 MANAGER / SENIOR
  //   if (d.includes('manager') || d.includes('lead')) {
  //     return {
  //       grade: 'Grade 1 - Manager',
  //       policySnapshot: {
  //         trainClass: '1st AC / 2nd AC',
  //         flightClass: 'Business',
  //         hotelLimit: 4000,
  //         carRatePerKm: 15,
  //       },
  //     };
  //   }

  //   // 🔹 MID LEVEL
  //   if (d.includes('senior') || d.includes('engineer')) {
  //     return {
  //       grade: 'Grade 2 - Senior Employee',
  //       policySnapshot: {
  //         trainClass: '2nd AC / 3rd AC',
  //         flightClass: 'Economy',
  //         hotelLimit: 2500,
  //         carRatePerKm: 12,
  //       },
  //     };
  //   }

  //   // 🔹 JUNIOR
  //   if (d.includes('intern') || d.includes('trainee') || d.includes('junior')) {
  //     return {
  //       grade: 'Grade 3 - Junior',
  //       policySnapshot: {
  //         trainClass: 'Sleeper / 3rd AC',
  //         flightClass: 'Economy',
  //         hotelLimit: 1500,
  //         carRatePerKm: 8,
  //       },
  //     };
  //   }

  //   // 🔹 fallback
  //   return defaultPolicy;
  // };

  const submitToServer = async () => {
    setSubmitting(true);
    // const designation = profile?.[0]?.designation;
    // const { grade, policySnapshot } = getPolicyByDesignation(designation);

    let grade = 'Grade 2 - Senior Employee';
    let policySnapshot = {
      trainClass: '2nd AC / 3rd AC',
      flightClass: 'Economy',
      hotelLimit: 2000,
      carRatePerKm: 10,
    };

    try {
      const expenseData = {
        travelType: expenseType.toUpperCase(),
        grade: grade,
        policySnapshot: policySnapshot,
        fromLocation: fromLocation,
        toLocation: toLocation,
        date: date,
        businessPurpose: purpose,
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
          },
          food: {
            amount: parseFloat(foodCost) || 0,
            paymentMethod:
              foodPaymentMethod === 'self-paid' ? 'SELF' : 'COMPANY',
          },
        },
        miscItems: otherExpenses.map(item => ({
          description: item.description,
          amount: parseFloat(item.amount) || 0,
          paymentMethod:
            item.paymentMethod === 'self-paid' ? 'SELF' : 'COMPANY',
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

      console.log('🚀 Submitting expense...');
      console.log('📋 Data:', JSON.stringify(expenseData, null, 2));
      if (receiptFile) console.log('📎 File:', receiptFile.name);

      const result = await dispatch(createExpense(expenseData, receiptFile));

      if (result.success) {
        const newRequest = {
          id: result.data._id || result.data.id || Date.now(),
          type: expenseType,
          title: `${
            expenseType.charAt(0).toUpperCase() + expenseType.slice(1)
          } Travel - ${purpose.substring(0, 30)}`,
          amount: calculateTotalAmount(),
          date: date,
          fromLocation: fromLocation,
          toLocation: toLocation,
          purpose: purpose,
          status: 'pending',
          submittedDate: new Date().toISOString().split('T')[0],
          paymentMethod: travelPaymentMethod,
          travelCost: parseFloat(amount) || 0,
          hotelCost: parseFloat(hotelCost) || 0,
          foodCost: parseFloat(foodCost) || 0,
          otherExpenses: otherExpenses.length > 0 ? otherExpenses : undefined,
          kilometers: kilometers ? parseFloat(kilometers) : undefined,
          attachments: selectedFiles.map(f => ({
            fileName: f.name,
            type: f.type,
            size: f.size,
          })),
        };

        setReimbursements(prev => [newRequest, ...prev]);
        setShowCreateForm(false);
        resetForm();
        // Alert.alert(
        //   'Success',
        //   result.message || 'Expense submitted successfully!',
        // );
        showToast(result.message || 'Expense submitted successfully!', 'success');
      } else {
        // Alert.alert('Error', result.error || 'Failed to submit expense');
        showToast(result.error || 'Failed to submit expense', 'danger');
      }
    } catch (error) {
      console.log('Submit error:', error);
      // Alert.alert('Error', 'Something went wrong. Please try again.');
      showToast('Something went wrong. Please try again.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    // Reset all form fields
    setExpenseType('car');
    setAmount('');
    setHotelCost('');
    setFoodCost('');
    setFromLocation('');
    setToLocation('');
    setPurpose('');
    setTravelPaymentMethod('self-paid');
    setFoodPaymentMethod('self-paid');
    setOtherExpenses([]);
    setKilometers('');
    setSelectedFiles([]);

    // Reset date to today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const todayFormatted = `${year}-${month}-${day}`;
    setDate(todayFormatted);
    setDateDisplay(`${day}/${month}/${year}`);
  };

  const getFilteredRequests = () => {
    if (activeFilter === 'new') {
      return reimbursements.filter(r => r.status === 'pending');
    } else if (activeFilter === 'approved') {
      return reimbursements.filter(r => r.status === 'approved');
    }
    return reimbursements;
  };

  const getFilterCounts = () => {
    return {
      new: reimbursements.filter(r => r.status === 'pending').length,
      approved: reimbursements.filter(r => r.status === 'approved').length,
    };
  };

  const counts = getFilterCounts();

  // ============ VIEW MODAL RENDER COMPONENT ============
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
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                Request Details
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowViewModal(false);
                  setSelectedRequest(null);
                }}
              >
                <XCircle size={wp('6%')} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Status Badge */}
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
                    {selectedRequest.status.charAt(0).toUpperCase() +
                      selectedRequest.status.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text style={[styles.viewTitle, { color: C.textPrimary }]}>
                {selectedRequest.title}
              </Text>

              {/* Amount */}
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
                  {formatCurrency(selectedRequest.amount)}
                </Text>
              </View>

              {/* Basic Info Section */}
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
                    {getExpenseIcon(selectedRequest.type)}
                    <Text
                      style={[styles.viewInfoValue, { color: C.textPrimary }]}
                    >
                      {selectedRequest.type.charAt(0).toUpperCase() +
                        selectedRequest.type.slice(1)}
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
                    {selectedRequest.fromLocation}
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
                    {selectedRequest.toLocation}
                  </Text>
                </View>

                <View style={styles.viewInfoRow}>
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
                </View>

                {selectedRequest.kilometers && (
                  <View style={styles.viewInfoRow}>
                    <Text
                      style={[styles.viewInfoLabel, { color: C.textSecondary }]}
                    >
                      Distance
                    </Text>
                    <Text
                      style={[styles.viewInfoValue, { color: C.textPrimary }]}
                    >
                      {selectedRequest.kilometers} km
                    </Text>
                  </View>
                )}
              </View>

              {/* Purpose Section */}
              <View style={styles.viewSection}>
                <Text
                  style={[styles.viewSectionTitle, { color: C.textPrimary }]}
                >
                  Business Purpose
                </Text>
                <Text
                  style={[styles.viewPurposeText, { color: C.textSecondary }]}
                >
                  {selectedRequest.purpose}
                </Text>
              </View>

              {/* Expense Breakdown */}
              <View style={styles.viewSection}>
                <Text
                  style={[styles.viewSectionTitle, { color: C.textPrimary }]}
                >
                  Expense Breakdown
                </Text>

                <View
                  style={[
                    styles.viewExpenseItem,
                    { borderBottomColor: C.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.viewExpenseLabel,
                      { color: C.textSecondary },
                    ]}
                  >
                    Travel Cost
                  </Text>
                  <Text
                    style={[styles.viewExpenseAmount, { color: C.textPrimary }]}
                  >
                    {formatCurrency(selectedRequest.travelCost || 0)}
                  </Text>
                </View>

                {selectedRequest.hotelCost > 0 && (
                  <View
                    style={[
                      styles.viewExpenseItem,
                      { borderBottomColor: C.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.viewExpenseLabel,
                        { color: C.textSecondary },
                      ]}
                    >
                      Hotel Cost
                    </Text>
                    <Text
                      style={[
                        styles.viewExpenseAmount,
                        { color: C.textPrimary },
                      ]}
                    >
                      {formatCurrency(selectedRequest.hotelCost)}
                    </Text>
                  </View>
                )}

                {selectedRequest.foodCost > 0 && (
                  <View
                    style={[
                      styles.viewExpenseItem,
                      { borderBottomColor: C.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.viewExpenseLabel,
                        { color: C.textSecondary },
                      ]}
                    >
                      Food Cost
                    </Text>
                    <Text
                      style={[
                        styles.viewExpenseAmount,
                        { color: C.textPrimary },
                      ]}
                    >
                      {formatCurrency(selectedRequest.foodCost)}
                    </Text>
                  </View>
                )}

                {selectedRequest.otherExpenses?.map((expense, index) => (
                  <View
                    key={index}
                    style={[
                      styles.viewExpenseItem,
                      { borderBottomColor: C.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.viewExpenseLabel,
                        { color: C.textSecondary },
                      ]}
                    >
                      {expense.description}
                    </Text>
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
                    {formatCurrency(selectedRequest.amount)}
                  </Text>
                </View>
              </View>

              {/* Payment Method */}
              <View style={styles.viewSection}>
                <Text
                  style={[styles.viewSectionTitle, { color: C.textPrimary }]}
                >
                  Payment Method
                </Text>
                <View style={styles.viewPaymentBadge}>
                  {selectedRequest.paymentMethod === 'self-paid' ? (
                    <Wallet size={wp('4%')} color="#3498DB" />
                  ) : (
                    <CreditCard size={wp('4%')} color="#9B59B6" />
                  )}
                  <Text
                    style={[styles.viewPaymentText, { color: C.textPrimary }]}
                  >
                    {selectedRequest.paymentMethod === 'self-paid'
                      ? 'Self-Paid'
                      : 'Company-Paid'}
                  </Text>
                </View>
              </View>

              {/* Submission Info */}
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
                    {formatDate(selectedRequest.submittedDate)}
                  </Text>
                </View>

                {selectedRequest.approvedBy && (
                  <>
                    <View style={styles.viewInfoRow}>
                      <Text
                        style={[
                          styles.viewInfoLabel,
                          { color: C.textSecondary },
                        ]}
                      >
                        Approved By
                      </Text>
                      <Text
                        style={[styles.viewInfoValue, { color: C.textPrimary }]}
                      >
                        {selectedRequest.approvedBy}
                      </Text>
                    </View>
                    <View style={styles.viewInfoRow}>
                      <Text
                        style={[
                          styles.viewInfoLabel,
                          { color: C.textSecondary },
                        ]}
                      >
                        Approved On
                      </Text>
                      <Text
                        style={[styles.viewInfoValue, { color: C.textPrimary }]}
                      >
                        {formatDate(selectedRequest.approvedDate)}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Attachments */}
              {selectedRequest.attachments &&
                selectedRequest.attachments.length > 0 && (
                  <View style={styles.viewSection}>
                    <Text
                      style={[
                        styles.viewSectionTitle,
                        { color: C.textPrimary },
                      ]}
                    >
                      Attachments
                    </Text>
                    {selectedRequest.attachments.map((file, index) => (
                      <View
                        key={index}
                        style={[
                          styles.viewFileItem,
                          { backgroundColor: C.surface, borderColor: C.border },
                        ]}
                      >
                        {getFileIcon(file.type, wp('5%'))}
                        <Text
                          style={[
                            styles.viewFileName,
                            { color: C.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {file.fileName}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

              {/* Close Button */}
              <TouchableOpacity
                style={[
                  styles.closeViewBtn,
                  { backgroundColor: C.surface, borderColor: C.border },
                ]}
                onPress={() => {
                  setShowViewModal(false);
                  setSelectedRequest(null);
                }}
              >
                <Text
                  style={[styles.closeViewBtnText, { color: C.textPrimary }]}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ============ CUSTOM DATE PICKER MODAL COMPONENT ============
  const renderDatePickerModal = () => {
    const daysInMonth = getDaysInMonth(tempMonth, tempYear);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = Array.from(
      { length: 50 },
      (_, i) => new Date().getFullYear() + i,
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
            <View style={styles.datePickerHeader}>
              <Text style={[styles.datePickerTitle, { color: C.textPrimary }]}>
                Select Date
              </Text>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                <XCircle size={wp('6%')} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerColumns}>
              {/* Day Column */}
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

              {/* Month Column */}
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
                        },
                      ]}
                      onPress={() => {
                        setTempMonth(month);
                        // Adjust day if current day exceeds days in new month
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

              {/* Year Column */}
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
                        },
                      ]}
                      onPress={() => {
                        setTempYear(year);
                        // Adjust day if current day exceeds days in new year-month
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

            <View style={styles.datePickerButtons}>
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

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />

      {/* Header */}
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
            {reimbursements.length} Total Requests
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.primary }]}
          onPress={() => setShowCreateForm(true)}
        >
          <Plus size={wp('5%')} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilter === 'new' && styles.activeFilterTab,
            activeFilter === 'new' && { borderBottomColor: C.primary },
          ]}
          onPress={() => setActiveFilter('new')}
        >
          <Clock
            size={wp('4%')}
            color={activeFilter === 'new' ? C.primary : C.textSecondary}
          />
          <Text
            style={[
              styles.filterText,
              { color: activeFilter === 'new' ? C.primary : C.textSecondary },
            ]}
          >
            Pending Requests ({counts.new})
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
                color:
                  activeFilter === 'approved' ? C.primary : C.textSecondary,
              },
            ]}
          >
            Approved ({counts.approved})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
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
        {getFilteredRequests().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Receipt
              size={wp('15%')}
              color={C.textSecondary}
              strokeWidth={1.5}
            />
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>
              No {activeFilter === 'new' ? 'pending' : 'approved'} requests
            </Text>
            <Text style={[styles.emptySubText, { color: C.textTertiary }]}>
              {activeFilter === 'new'
                ? 'Tap + button to create a new request'
                : 'Approved requests will appear here'}
            </Text>
          </View>
        ) : (
          getFilteredRequests().map(item => (
            <TouchableOpacity
              key={item.id}
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
                    {getExpenseIcon(item.type)}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text
                      style={[styles.requestTitle, { color: C.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.requestDate, { color: C.textSecondary }]}
                    >
                      {formatDate(item.date)} • {item.fromLocation} →{' '}
                      {item.toLocation}
                    </Text>
                  </View>
                  <View style={styles.cardRightActions}>
                    <Text style={[styles.amount, { color: C.primary }]}>
                      {formatCurrency(item.amount)}
                    </Text>
                    {item.status === 'pending' && (
                      <TouchableOpacity
                        style={styles.deleteIconBtn}
                        onPress={e => {
                          e.stopPropagation();
                          handleDeleteRequest(item);
                        }}
                      >
                        <Trash2 size={wp('4.5%')} color="#E74C3C" />
                      </TouchableOpacity>
                    )}
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
                      {item.purpose}
                    </Text>
                  </View>

                  <View style={styles.paymentMethodRow}>
                    <View style={styles.paymentBadge}>
                      {item.paymentMethod === 'self-paid' ? (
                        <Wallet size={wp('3%')} color="#3498DB" />
                      ) : (
                        <CreditCard size={wp('3%')} color="#9B59B6" />
                      )}
                      <Text
                        style={[styles.paymentText, { color: C.textSecondary }]}
                      >
                        {item.paymentMethod === 'self-paid'
                          ? 'Self-Paid'
                          : 'Company-Paid'}
                      </Text>
                    </View>

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
                        {item.status.charAt(0).toUpperCase() +
                          item.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {item.status === 'approved' && item.approvedBy && (
                    <Text
                      style={[styles.approvedText, { color: C.textTertiary }]}
                    >
                      Approved by {item.approvedBy} on{' '}
                      {formatDate(item.approvedDate)}
                    </Text>
                  )}
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
          resetForm(); // 👈 Add this line
          setShowCreateForm(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: C.background }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                New Reimbursement Request
              </Text>
              <TouchableOpacity
                onPress={() => {
                  resetForm(); // 👈 Add this line
                  setShowCreateForm(false);
                }}
              >
                <XCircle size={wp('6%')} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Travel Type Selection */}
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

              {/* Car KM */}
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
                    onChangeText={setKilometers}
                  />
                </View>
              )}

              {/* Amount */}
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
                onChangeText={setAmount}
              />

              {/* Payment Method */}
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

              {/* Hotel & Food */}
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
                onChangeText={setHotelCost}
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
                onChangeText={setFoodCost}
              />

              {/* Other Expenses */}
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
                    placeholder="Description"
                    placeholderTextColor={C.textTertiary}
                    value={expense.description}
                    onChangeText={text =>
                      updateOtherExpense(expense.id, 'description', text)
                    }
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
                  />
                  <TouchableOpacity
                    onPress={() => removeOtherExpense(expense.id)}
                  >
                    <Trash2 size={wp('5%')} color="#E74C3C" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* File Selection Section */}
              <View
                style={[styles.uploadSection, { borderTopColor: C.border }]}
              >
                <View style={styles.uploadSectionHeader}>
                  <View>
                    <Text
                      style={[styles.sectionTitle, { color: C.textPrimary }]}
                    >
                      Receipts & Documents
                    </Text>
                    <Text
                      style={[styles.uploadSubtitle, { color: C.textTertiary }]}
                    >
                      Select PDF, JPG, or PNG files (Max 5) -{' '}
                      {selectedFiles.length}/5
                    </Text>
                  </View>
                  {selectedFiles.length > 0 && (
                    <TouchableOpacity
                      onPress={showFilePickerOptions}
                      style={[styles.addMoreBtn, { borderColor: C.primary }]}
                    >
                      <Plus size={wp('3.5%')} color={C.primary} />
                      <Text style={[styles.addMoreText, { color: C.primary }]}>
                        Add More
                      </Text>
                    </TouchableOpacity>
                  )}
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
                        Browse Files
                      </Text>
                      <Text
                        style={[
                          styles.uploadOptionSubtitle,
                          { color: C.textTertiary },
                        ]}
                      >
                        PDF, JPG, PNG{`\n`}(Max 3 MB)
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
                            {file.name}
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
              </View>

              {/* Date */}
              <Text style={[styles.inputLabel, { color: C.textSecondary }]}>
                Date *
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                  },
                ]}
                onPress={openDatePicker}
              >
                <Calendar size={wp('4%')} color={C.textSecondary} />
                <Text
                  style={[
                    styles.dateInputText,
                    { color: dateDisplay ? C.textPrimary : C.textTertiary },
                  ]}
                >
                  {dateDisplay || 'DD/MM/YYYY'}
                </Text>
              </TouchableOpacity>

              {renderDatePickerModal()}

              {/* Locations */}
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
                placeholder="Starting point"
                placeholderTextColor={C.textTertiary}
                value={fromLocation}
                onChangeText={setFromLocation}
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
                placeholder="Destination"
                placeholderTextColor={C.textTertiary}
                value={toLocation}
                onChangeText={setToLocation}
              />

              {/* Purpose */}
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
                placeholder="Describe the purpose..."
                placeholderTextColor={C.textTertiary}
                multiline
                numberOfLines={3}
                value={purpose}
                onChangeText={setPurpose}
              />

              {/* Total */}
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

              {/* Submit */}
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
                    <Loader size={wp('4%')} color="#fff" />
                    <Text style={styles.submitBtnText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitBtnText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Details Modal */}
      {renderViewModal()}
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
  deleteIconBtn: {
    padding: wp('1%'),
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentBadge: { flexDirection: 'row', alignItems: 'center', gap: wp('1%') },
  paymentText: { fontSize: wp('2.5%'), fontFamily: Fonts.regular },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('0.5%'),
    borderRadius: wp('3%'),
    gap: wp('1%'),
  },
  statusText: { fontSize: wp('2.5%'), fontFamily: Fonts.medium },
  approvedText: { fontSize: wp('2.2%'), fontFamily: Fonts.regular },
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

  // File Upload Section
  uploadSection: {
    marginTop: hp('2%'),
    paddingTop: hp('2%'),
    borderTopWidth: 1,
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
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: wp('2%'),
    paddingHorizontal: wp('2.5%'),
    paddingVertical: hp('0.6%'),
    gap: wp('1%'),
  },
  addMoreText: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },
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

  // File List
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

  // Total & Submit
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

  // View Modal Styles
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
    flex: 1,
  },
  closeViewBtn: {
    paddingVertical: hp('1.5%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
    marginTop: hp('2%'),
    marginBottom: hp('2%'),
    borderWidth: 1,
  },
  closeViewBtnText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
  },
  // ============ ADD THESE STYLES TO YOUR STYLESHEET ============
  // Date Picker Styles
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
    borderBottomColor: '#E5E5E5',
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
    borderTopColor: '#E5E5E5',
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
});

export default Reimbursement;

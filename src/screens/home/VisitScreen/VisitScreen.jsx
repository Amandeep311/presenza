// src/screens/VisitScreen/VisitScreen.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  AppState,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  TextInput,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {
  MapPin,
  CheckCircle,
  Loader,
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Briefcase,
  User,
  LogIn,
  LogOut,
  Navigation,
  FileText,
  RefreshCw,
} from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Fonts } from '../../../utils/GlobalText';
import MainLayout from '../../../components/layout/MainLayout';
import { getAttendanceHistory } from '../../../store/actions/attendanceActions';
import {
  checkAndRequestLocationPermission,
  getCurrentLocation,
  getAddressFromCoords,
} from '../../../utils/utils';
import {
  quickCheckPermissions,
  showPermissionRequiredDialog,
} from '../../../utils/permissions';
import { showToast } from '../../../components/common/ToastProvider';
import * as ImagePicker from 'react-native-image-picker';
import { getAccessToken } from '../../../utils/keychainHelper';

// Visit types
const VISIT_TYPES = [
  { id: 'CLIENT_VISIT', label: 'Client Visit', icon: User },
  { id: 'SITE_VISIT', label: 'Site Visit', icon: Navigation },
  { id: 'DELIVERY', label: 'Delivery', icon: MapPin },
  { id: 'INSPECTION', label: 'Inspection', icon: FileText },
  { id: 'OTHER', label: 'Other', icon: Briefcase },
];

const VisitScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const { punchInLoading, location, history, punchError } = useSelector(
    state => state.attendance,
  );
  const { user } = useSelector(state => state.auth);

  // Profile data
  const { profile } = useSelector(state => state.employeeProfile);
  const department = profile?.[0]?.department || '';
  const isSalesTeam = department?.toLowerCase().includes('sales');

  // Check if user has active office session (Daily Punch In)
  const today = new Date().toISOString().split('T')[0];
  const todayRecord = history?.find(r => r.date?.split('T')[0] === today);
  const hasActiveSession = todayRecord?.isPunchedIn === true;
  
  // Get isVisitActive from Redux - THIS IS THE SOURCE OF TRUTH
  const isVisitActive = todayRecord?.isVisitActive === true;

  // visitStatus - Only two states: 'idle' or 'punched_in'
  // When isVisitActive is true -> punched_in (END VISIT)
  // When isVisitActive is false -> idle (START VISIT)
  const visitStatus = isVisitActive ? 'punched_in' : 'idle';
  
  // Form states
  const [visitType, setVisitType] = useState(route.params?.visitType || 'CLIENT_VISIT');
  const [customerName, setCustomerName] = useState(route.params?.customerName || '');
  const [visitPurpose, setVisitPurpose] = useState(route.params?.visitPurpose || '');
  const [visitAddress, setVisitAddress] = useState(route.params?.visitAddress || '');
  const [visitRemarks, setVisitRemarks] = useState('');
  const [visitPunchInTime, setVisitPunchInTime] = useState(null);
  const [visitPunchOutTime, setVisitPunchOutTime] = useState(null);
  const [visitDuration, setVisitDuration] = useState(0);
  const durationTimerRef = useRef(null);
  
  // Image states for Visit In
  const [selectedImageIn, setSelectedImageIn] = useState(null);
  const [imageBase64In, setImageBase64In] = useState(null);
  
  // Image states for Visit Out
  const [selectedImageOut, setSelectedImageOut] = useState(null);
  const [imageBase64Out, setImageBase64Out] = useState(null);
  
  const [visitInResponse, setVisitInResponse] = useState(null);
  const [visitOutResponse, setVisitOutResponse] = useState(null);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(true);

  const [uiState, setUiState] = useState('idle');
  const [stepStatuses, setStepStatuses] = useState({
    location: 'pending',
    selfie: 'pending',
    upload: 'pending',
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [locationCheckDone, setLocationCheckDone] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [isGettingAddress, setIsGettingAddress] = useState(false);
  
  // ✅ Location toast control
  const [initialLocationLoaded, setInitialLocationLoaded] = useState(false);

  // ── Animations ─────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(hp('4%'))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const dotOpacityAnim = useRef(new Animated.Value(1)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  const isLocationFetchingRef = useRef(false);
  const rotationLoopRef = useRef(null);

  // ── Load visit data from history ──
  const loadVisitData = useCallback(() => {
    console.log('🔍 Loading visit data...');
    console.log('📊 isVisitActive:', isVisitActive);
    
    if (!todayRecord) {
      console.log('ℹ️ No today record found');
      setIsLoadingState(false);
      return;
    }

    const allVisits = todayRecord.sessions?.flatMap(s => s.visits || []) || [];
    
    if (isVisitActive) {
      // Active visit - Load visit data for display
      console.log('✅ Active visit found - showing END VISIT');
      const activeVisit = allVisits.find(v => v.status === 'IN_PROGRESS');
      
      if (activeVisit) {
        setVisitType(activeVisit.visitType || 'CLIENT_VISIT');
        setCustomerName(activeVisit.customerName || '');
        setVisitPurpose(activeVisit.purpose || '');
        if (activeVisit.visitIn) {
          const punchInTime = new Date(activeVisit.visitIn);
          setVisitPunchInTime(punchInTime);
          
          // ✅ Calculate duration from punch in time to now
          const now = new Date();
          const diffSeconds = Math.floor((now - punchInTime) / 1000);
          setVisitDuration(diffSeconds > 0 ? diffSeconds : 0);
        }
        if (activeVisit.punchInLocation?.address) {
          setVisitAddress(activeVisit.punchInLocation.address);
          setUserCoords({
            latitude: activeVisit.punchInLocation.latitude,
            longitude: activeVisit.punchInLocation.longitude,
          });
        }
      }
    } else {
      // No active visit - Reset everything for START VISIT
      console.log('ℹ️ No active visit - showing START VISIT');
      setVisitPunchInTime(null);
      setVisitPunchOutTime(null);
      setVisitDuration(0);
      setCustomerName('');
      setVisitPurpose('');
      setVisitAddress('');
      setVisitRemarks('');
      setVisitType('CLIENT_VISIT');
      setSelectedImageIn(null);
      setImageBase64In(null);
      setSelectedImageOut(null);
      setImageBase64Out(null);
    }
    
    setIsLoadingState(false);
  }, [todayRecord, isVisitActive]);

  // ── Load data when component mounts or history changes ──
  useEffect(() => {
    if (history) {
      loadVisitData();
    }
  }, [history, loadVisitData]);

  // ── Force refresh on focus ──
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Visit screen focused - refreshing history');
      setIsLoadingState(true);
      dispatch(getAttendanceHistory());
    }, [dispatch])
  );

  // ── Animation helpers ──────────────────────────
  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.07,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const startRotation = useCallback(() => {
    rotationAnim.setValue(0);
    rotationLoopRef.current = Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    rotationLoopRef.current.start();
  }, [rotationAnim]);

  const stopRotation = useCallback(() => {
    if (rotationLoopRef.current) {
      rotationLoopRef.current.stop();
      rotationLoopRef.current = null;
    }
    rotationAnim.setValue(0);
  }, [rotationAnim]);

  const startWave = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [waveAnim]);

  const startDotBlink = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacityAnim, {
          toValue: 0.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [dotOpacityAnim]);

  // ── Get Address from Coordinates ──
  const getAddressFromCoordsAPI = useCallback(async (lat, lng) => {
    try {
      setIsGettingAddress(true);
      const address = await getAddressFromCoords(lat, lng);
      console.log('📍 Address from API:', address);
      return address;
    } catch (error) {
      console.log('Error getting address:', error);
      return null;
    } finally {
      setIsGettingAddress(false);
    }
  }, []);

  // ── Get Current Location ──
  const getCurrentLocationData = useCallback(async () => {
    try {
      const hasPermission = await checkAndRequestLocationPermission();
      if (!hasPermission) {
        showToast('Location permission is required', 'error');
        return null;
      }
      const locationData = await getCurrentLocation();
      return locationData;
    } catch (error) {
      console.log('Error getting location:', error);
      showToast('Unable to get current location', 'error');
      return null;
    }
  }, []);

  // ── Update location with toast control ──
  const updateLocation = useCallback(async (isUserInitiated = false) => {
    if (isLocationFetchingRef.current) return;

    isLocationFetchingRef.current = true;
    setIsCheckingLocation(true);
    setLocationCheckDone(false);

    try {
      const locationData = await getCurrentLocationData();
      if (locationData) {
        const coords = {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        };
        setUserCoords(coords);

        const address = await getAddressFromCoordsAPI(
          locationData.latitude,
          locationData.longitude
        );

        // ✅ Only show toast on user-initiated refresh or first successful load
        const shouldShowToast = isUserInitiated || !initialLocationLoaded;

        if (address) {
          setVisitAddress(address);
          if (shouldShowToast) {
            showToast('Location updated successfully', 'success');
          }
        } else {
          setVisitAddress(
            `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`
          );
          if (shouldShowToast) {
            showToast('Location coordinates captured', 'info');
          }
        }

        if (!initialLocationLoaded) {
          setInitialLocationLoaded(true);
        }
      }
    } catch (error) {
      console.log('Location error:', error);
      if (isUserInitiated || !initialLocationLoaded) {
        showToast('Failed to get location', 'error');
      }
    } finally {
      setIsCheckingLocation(false);
      setLocationCheckDone(true);
      isLocationFetchingRef.current = false;
    }
  }, [getCurrentLocationData, getAddressFromCoordsAPI, initialLocationLoaded]);

  // ── Initialize animations and location ──
  useEffect(() => {
    startPulse();
    startWave();
    startDotBlink();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    // Initial load - no toast
    const timer = setTimeout(() => {
      updateLocation(false);
    }, 500);

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      clearTimeout(timer);
      clearInterval(timeInterval);
      stopRotation();
    };
  }, []);

  // ── App state listener ──
  const lastCheckRef = useRef(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const now = Date.now();
      if (nextAppState === 'active' && now - lastCheckRef.current > 5000) {
        lastCheckRef.current = now;
        // Silent background refresh - no toast
        updateLocation(false);
      }
    });
    return () => subscription.remove();
  }, [updateLocation]);

  // ── Duration timer ──
  // ✅ Fixed: Timer now works with visitPunchInTime
  useEffect(() => {
    // Clear existing timer
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (visitStatus === 'punched_in' && visitPunchInTime) {
      // ✅ Calculate initial duration from punch in time
      const now = new Date();
      const initialDuration = Math.floor((now - visitPunchInTime) / 1000);
      setVisitDuration(initialDuration > 0 ? initialDuration : 0);

      // ✅ Start timer to update duration every second
      durationTimerRef.current = setInterval(() => {
        setVisitDuration(prev => prev + 1);
      }, 1000);
    } else {
      // Reset duration when visit is not active
      if (visitStatus !== 'punched_in') {
        setVisitDuration(0);
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [visitStatus, visitPunchInTime]);

  // ── Manage rotation animation ──
  useEffect(() => {
    const showLoader = isCheckingLocation && !locationCheckDone;
    if (showLoader || punchInLoading || isProcessing || isGettingAddress || isLoadingState) {
      startRotation();
    } else {
      stopRotation();
    }
  }, [isCheckingLocation, locationCheckDone, punchInLoading, isProcessing, isGettingAddress, isLoadingState, startRotation, stopRotation]);

  // ── UI State management ──
  useEffect(() => {
    if (punchInLoading || isProcessing) {
      setUiState('loading');
      setStepStatuses({
        location: 'success',
        selfie: 'success',
        upload: 'loading',
      });
    } else if (punchError) {
      setUiState('error');
      setStepStatuses({
        location: 'success',
        selfie: 'success',
        upload: 'error',
      });
      const timer = setTimeout(() => setUiState('idle'), 3000);
      return () => clearTimeout(timer);
    } else {
      setUiState('idle');
      setStepStatuses({
        location: 'pending',
        selfie: 'pending',
        upload: 'pending',
      });
    }
  }, [punchInLoading, isProcessing]);

  // ── Derived values ──
  const showLoader = isCheckingLocation && !locationCheckDone;
  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const waveScale = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.9],
  });
  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.45, 0.15, 0],
  });

  // ── Check if punch is disabled ──
  const isPunchDisabled =
  !isSalesTeam ||
  punchInLoading ||
  isCheckingLocation ||
  isProcessing ||
  isGettingAddress ||
  isLoadingState ||
  !hasActiveSession;

  const getAccentColor = () => {
    if (visitStatus === 'punched_in') return C.success;
    if (!hasActiveSession) return C.warning;
    if (!isSalesTeam) return C.error;
    if (showLoader || punchInLoading || isProcessing || isGettingAddress || isLoadingState) return C.primary;
    return C.primary;
  };

  const accentColor = getAccentColor();

  const getCircleIcon = () => {
    if (isLoadingState) {
      const rotateValue = rotation || '0deg';
      return (
        <Animated.View style={{ transform: [{ rotate: rotateValue }] }}>
          <Loader size={wp('14%')} color={C.textDark} />
        </Animated.View>
      );
    }
    if (visitStatus === 'punched_in')
      return <CheckCircle size={wp('14%')} color={C.textDark} />;
    if (!hasActiveSession)
      return <LogIn size={wp('14%')} color={C.textDark} />;
    if (!isSalesTeam)
      return <XCircle size={wp('14%')} color={C.textDark} />;
    if (showLoader || punchInLoading || isProcessing || isGettingAddress) {
      const rotateValue = rotation || '0deg';
      return (
        <Animated.View style={{ transform: [{ rotate: rotateValue }] }}>
          <Loader size={wp('14%')} color={C.textDark} />
        </Animated.View>
      );
    }
    if (uiState === 'success')
      return <CheckCircle size={wp('14%')} color={C.textDark} />;
    if (uiState === 'error')
      return <XCircle size={wp('14%')} color={C.textDark} />;
    return <MapPin size={wp('14%')} color={C.textPrimary} />;
  };

  const getCircleLabel = () => {
    if (isLoadingState)
      return 'LOADING...';
    if (visitStatus === 'punched_in')
      return 'END VISIT';
    if (!isSalesTeam)
      return 'NOT AVAILABLE';
    if (!hasActiveSession)
      return 'PUNCH IN FIRST';
    if (showLoader)
      return 'GETTING LOCATION...';
    if (isGettingAddress)
      return 'GETTING ADDRESS...';
    if (punchInLoading || isProcessing)
      return 'PROCESSING...';
    if (uiState === 'success')
      return 'SUCCESS!';
    if (uiState === 'error')
      return 'ERROR!';
    return 'START VISIT';
  };

  const getCircleSubLabel = () => {
    if (isLoadingState)
      return 'Loading visit data...';
    if (visitStatus === 'punched_in')
      return 'Tap to end visit';
    if (!isSalesTeam)
      return 'Visit feature is only for sales team';
    if (!hasActiveSession)
      return 'Please punch in first';
    if (showLoader)
      return 'Detecting your location...';
    if (isGettingAddress)
      return 'Getting address from location...';
    if (punchInLoading || isProcessing)
      return 'Verifying your details...';
    if (uiState === 'error')
      return 'Tap to retry';
    return '';
  };

  const getSyncLabel = () => {
    if (isLoadingState)
      return 'LOADING...';
    if (visitStatus === 'punched_in')
      return 'VISIT ACTIVE';
    if (!hasActiveSession)
      return 'PUNCH IN REQUIRED';
    if (showLoader || isGettingAddress)
      return 'LOCATING...';
    if (punchInLoading || isProcessing)
      return 'PROCESSING';
    if (uiState === 'error')
      return 'FAILED';
    return 'READY FOR VISIT';
  };

  const getLocationMessage = () => {
    if (isLoadingState)
      return 'Loading visit data...';
    if (visitStatus === 'punched_in')
      return 'Visit in progress';
    if (!isSalesTeam)
      return 'Visit feature is only for sales team';
    if (!hasActiveSession)
      return 'Please punch in first';
    if (showLoader)
      return 'Getting current location...';
    if (isGettingAddress)
      return 'Fetching address from location...';
    if (punchInLoading || isProcessing)
      return 'Verifying your details...';
    if (userCoords && visitAddress) {
      return `📍 ${visitAddress}`;
    }
    if (userCoords) {
      return `📍 ${userCoords.latitude.toFixed(6)}, ${userCoords.longitude.toFixed(6)}`;
    }
    return 'Tap refresh to get location';
  };

  const syncDotColor = visitStatus === 'punched_in'
    ? C.success
    : !hasActiveSession
      ? C.warning
      : isCheckingLocation || punchInLoading || isProcessing || isGettingAddress || isLoadingState
        ? C.primary
        : C.success;

  const syncTextColor = syncDotColor;

  const locationStripColors = {
    bg: visitStatus === 'punched_in'
      ? C.success + '18'
      : !hasActiveSession
        ? C.warning + '18'
        : showLoader || punchInLoading || isProcessing || isGettingAddress || isLoadingState
          ? C.primary + '18'
          : C.success + '18',
    border: visitStatus === 'punched_in'
      ? C.success + '50'
      : !hasActiveSession
        ? C.warning + '50'
        : showLoader || punchInLoading || isProcessing || isGettingAddress || isLoadingState
          ? C.primary + '50'
          : C.success + '50',
    text: visitStatus === 'punched_in'
      ? C.success
      : !hasActiveSession
        ? C.warning
        : showLoader || punchInLoading || isProcessing || isGettingAddress || isLoadingState
          ? C.primary
          : C.success,
  };

  const getLocationStripIcon = () => {
    const size = wp('3.5%');
    if (isLoadingState) return <Loader size={size} color={C.primary} />;
    if (visitStatus === 'punched_in') return <CheckCircle2 size={size} color={C.success} />;
    if (!hasActiveSession) return <AlertTriangle size={size} color={C.warning} />;
    if (showLoader || punchInLoading || isProcessing || isGettingAddress) return <Loader size={size} color={C.primary} />;
    return <MapPin size={size} color={C.success} />;
  };

  const getStepIcon = (step, status) => {
    const size = wp('4%');
    if (step === 'upload' && status === 'loading') {
      const rotateValue = rotation || '0deg';
      return (
        <Animated.View style={{ transform: [{ rotate: rotateValue }] }}>
          <Loader size={size} color={C.primary} />
        </Animated.View>
      );
    }
    switch (status) {
      case 'success':
        return <CheckCircle2 size={size} color={C.success} />;
      case 'error':
        return <XCircle size={size} color={C.error} />;
      case 'loading':
        return <Loader size={size} color={C.primary} />;
      default:
        const DefaultIcon = {
          location: MapPin,
          selfie: Camera,
          upload: Upload,
        }[step];
        return DefaultIcon ? (
          <DefaultIcon size={size} color={C.disabled} />
        ) : null;
    }
  };

  const getStepColor = s =>
  ({ success: C.success, error: C.error, loading: C.primary }[s] ||
    C.disabled);

  const getStepLabel = step => {
    switch (step) {
      case 'location':
        return 'Location';
      case 'selfie':
        return 'Photo';
      case 'upload':
        return 'Upload';
      default:
        return step;
    }
  };

  // ── Open Camera for Visit In ──
  const openCameraIn = useCallback(() => {
    return new Promise((resolve) => {
      ImagePicker.launchCamera(
        {
          mediaType: 'photo',
          includeBase64: true,
          quality: 0.7,
        },
        (response) => {
          console.log('📸 Visit In Camera Response:', JSON.stringify(response, null, 2));
          
          if (response.didCancel) {
            console.log('User cancelled camera for visit in');
            resolve(null);
            return;
          }

          if (response.error) {
            console.log('ImagePicker Error: ', response.error);
            showToast('Failed to capture image: ' + response.error, 'error');
            resolve(null);
            return;
          }

          if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            console.log('📸 Photo captured successfully:', asset.fileName);
            resolve({
              uri: asset.uri,
              base64: asset.base64,
              fileName: asset.fileName || 'photo.jpg',
              type: asset.type || 'image/jpeg',
            });
          } else {
            console.log('No assets in response');
            resolve(null);
          }
        },
      );
    });
  }, []);

  // ── Open Camera for Visit Out ──
  const openCameraOut = useCallback(() => {
    return new Promise((resolve) => {
      ImagePicker.launchCamera(
        {
          mediaType: 'photo',
          includeBase64: true,
          quality: 0.7,
        },
        (response) => {
          console.log('📸 Visit Out Camera Response:', JSON.stringify(response, null, 2));
          
          if (response.didCancel) {
            console.log('User cancelled camera for visit out');
            resolve(null);
            return;
          }

          if (response.error) {
            console.log('ImagePicker Error: ', response.error);
            showToast('Failed to capture image: ' + response.error, 'error');
            resolve(null);
            return;
          }

          if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            console.log('📸 Photo captured successfully:', asset.fileName);
            resolve({
              uri: asset.uri,
              base64: asset.base64,
              fileName: asset.fileName || 'photo.jpg',
              type: asset.type || 'image/jpeg',
            });
          } else {
            console.log('No assets in response');
            resolve(null);
          }
        },
      );
    });
  }, []);

  // ── API Call for Visit In ──
  const callVisitInAPI = useCallback(async (imageData) => {
    try {
      const token = await getAccessToken();
      console.log("token----->", token);

      const baseUrl = 'https://api-presenza.paulmerchants.net';

      const jsonData = {
        visitType: visitType,
        customerName: customerName || 'Unknown Customer',
        purpose: visitPurpose || 'Visit',
        latitude: userCoords?.latitude || 0,
        longitude: userCoords?.longitude || 0,
        address: visitAddress || 'Current Location',
      };

      const formData = new FormData();
      formData.append('jsonData', JSON.stringify(jsonData));

      if (imageData && imageData.base64) {
        const fileName = imageData.fileName || 'visit_in_photo.jpg';
        formData.append('image', {
          uri: imageData.uri,
          type: imageData.type || 'image/jpeg',
          name: fileName,
        });
        console.log('✅ Image added to form data for Visit In');
        console.log('📸 Image URI:', imageData.uri);
      } else {
        console.log('❌ No image data provided for Visit In');
        throw new Error('Photo is required for visit in');
      }

      console.log('📤 Calling Visit In API...');
      console.log('JSON Data:', jsonData);

      const response = await fetch(`${baseUrl}/api/v1/attendance/visit-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log('✅ Visit In Successful:', responseData);
        setVisitInResponse(responseData);
        return { success: true, data: responseData };
      } else {
        console.log('❌ Visit In Failed:', responseData);
        return { success: false, error: responseData.message || 'Visit in failed' };
      }
    } catch (error) {
      console.log('❌ Visit In API Error:', error);
      return { success: false, error: error.message || 'Network error' };
    }
  }, [visitType, customerName, visitPurpose, userCoords, visitAddress]);

  // ── API Call for Visit Out ──
  const callVisitOutAPI = useCallback(async (imageData) => {
    try {
      const token = await getAccessToken();
      const baseUrl = 'https://api-presenza.paulmerchants.net';

      const jsonData = {
        remarks: visitRemarks || 'Visit completed',
        latitude: userCoords?.latitude || 0,
        longitude: userCoords?.longitude || 0,
        address: visitAddress || 'Current Location',
      };

      const formData = new FormData();
      formData.append('jsonData', JSON.stringify(jsonData));

      if (imageData && imageData.base64) {
        const fileName = imageData.fileName || 'visit_out_photo.jpg';
        formData.append('image', {
          uri: imageData.uri,
          type: imageData.type || 'image/jpeg',
          name: fileName,
        });
        console.log('✅ Image added to form data for Visit Out');
        console.log('📸 Image URI:', imageData.uri);
      } else {
        console.log('❌ No image data provided for Visit Out');
        throw new Error('Photo is required for visit out');
      }

      console.log('📤 Calling Visit Out API...');
      console.log('JSON Data:', jsonData);

      const response = await fetch(`${baseUrl}/api/v1/attendance/visit-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log('✅ Visit Out Successful:', responseData);
        setVisitOutResponse(responseData);
        return { success: true, data: responseData };
      } else {
        console.log('❌ Visit Out Failed:', responseData);
        return { success: false, error: responseData.message || 'Visit out failed' };
      }
    } catch (error) {
      console.log('❌ Visit Out API Error:', error);
      return { success: false, error: error.message || 'Network error' };
    }
  }, [visitRemarks, userCoords, visitAddress]);

  // ── Show Remarks Modal ──
  const showRemarksInputModal = () => {
    setShowRemarksModal(true);
  };

  // ── Render Remarks Modal ──
  const renderRemarksModal = () => {
    return (
      <Modal
        visible={showRemarksModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isProcessing) {
            setShowRemarksModal(false);
            setVisitRemarks('');
          }
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.remarksModalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardAvoidingView}
            >
              <TouchableWithoutFeedback>
                <View
                  style={[
                    styles.remarksModalContent,
                    { backgroundColor: C.surface },
                  ]}
                >
                  <Text style={[styles.remarksModalTitle, { color: C.textPrimary }]}>
                    Visit Remarks
                  </Text>
                  <Text style={[styles.remarksModalSubtitle, { color: C.textSecondary }]}>
                    Please enter your remarks for this visit *
                  </Text>
                  
                  <TextInput
                    style={[
                      styles.remarksInput,
                      {
                        backgroundColor: C.background,
                        borderColor: C.border,
                        color: C.textPrimary,
                      },
                    ]}
                    placeholder="Enter your remarks here..."
                    placeholderTextColor={C.textSecondary}
                    value={visitRemarks}
                    onChangeText={setVisitRemarks}
                    multiline
                    numberOfLines={4}
                    autoFocus={true}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  <View style={styles.remarksModalButtons}>
                    <TouchableOpacity
                      style={[styles.remarksModalCancelBtn, { borderColor: C.border }]}
                      onPress={() => {
                        setShowRemarksModal(false);
                        setVisitRemarks('');
                        Keyboard.dismiss();
                      }}
                      disabled={isProcessing}
                    >
                      <Text style={[styles.remarksModalCancelText, { color: C.textSecondary }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.remarksModalSubmitBtn,
                        { backgroundColor: C.primary },
                        (!visitRemarks.trim() || isProcessing) && { opacity: 0.5 },
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setTimeout(() => {
                          handleRemarksSubmit();
                        }, 150);
                      }}
                      disabled={!visitRemarks.trim() || isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color={C.textDark} />
                      ) : (
                        <Text style={[styles.remarksModalSubmitText, { color: C.textDark }]}>
                          Submit & End Visit
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // ── Handle Remarks Submit ──
  const handleRemarksSubmit = async () => {
    if (!visitRemarks.trim()) {
      showToast('Remarks are mandatory. Please enter your remarks.', 'error');
      return;
    }

    if (isProcessing) {
      return;
    }

    setShowRemarksModal(false);

    Alert.alert(
      'End Visit',
      'Are you sure you want to end this visit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Visit',
          style: 'destructive',
          onPress: async () => {
            if (!userCoords) {
              await updateLocation(true);
            }

            const hasPermissions = await quickCheckPermissions();
            if (!hasPermissions.camera) {
              showPermissionRequiredDialog(
                { camera: !hasPermissions.camera },
                () => Linking.openSettings(),
              );
              return;
            }

            const imageData = await openCameraOut();
            console.log('📸 Image data for visit out:', imageData ? 'Received' : 'Failed');

            if (!imageData) {
              showToast('Photo is mandatory to end the visit. Please try again.', 'error');
              return;
            }

            setSelectedImageOut(imageData.uri);
            setImageBase64Out(imageData.base64);

            console.log('✅ Visit Out photo captured successfully');

            setIsProcessing(true);
            setUiState('loading');
            setStepStatuses({
              location: 'success',
              selfie: 'success',
              upload: 'loading',
            });

            try {
              const result = await callVisitOutAPI(imageData);

              if (result.success) {
                setVisitPunchOutTime(new Date());
                setUiState('success');
                setStepStatuses({
                  location: 'success',
                  selfie: 'success',
                  upload: 'success',
                });
                showToast('Visit completed successfully', 'success');
                
                // Refresh history - This will update isVisitActive to false
                await dispatch(getAttendanceHistory());
                
                // Navigate back after successful completion
                setTimeout(() => {
                  navigation.goBack();
                }, 1500);
              } else {
                setUiState('error');
                setStepStatuses({
                  location: 'success',
                  selfie: 'success',
                  upload: 'error',
                });
                showToast(result.error || 'Failed to end visit', 'error');
              }
            } catch (error) {
              setUiState('error');
              showToast('Failed to end visit', 'error');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  // ── Visit Punch In ──
  const handleVisitPunchIn = async () => {
    if (visitStatus === 'punched_in') {
      showToast('Visit is already in progress', 'info');
      return;
    }

    if (!visitPurpose.trim()) {
      showToast('Please enter visit purpose', 'error');
      return;
    }

    if (!customerName.trim()) {
      showToast('Please enter customer name', 'error');
      return;
    }

    if (!userCoords) {
      showToast('Getting current location...', 'info');
      await updateLocation(true);
      if (!userCoords) {
        showToast('Unable to get location. Please try again.', 'error');
        return;
      }
    }

    const hasPermissions = await quickCheckPermissions();
    if (!hasPermissions.camera) {
      showPermissionRequiredDialog(
        { camera: !hasPermissions.camera },
        () => Linking.openSettings(),
      );
      return;
    }

    const imageData = await openCameraIn();
    console.log('📸 Image data for visit in:', imageData ? 'Received' : 'Failed');

    if (!imageData) {
      showToast('Photo is mandatory to start the visit. Please try again.', 'error');
      return;
    }

    setSelectedImageIn(imageData.uri);
    setImageBase64In(imageData.base64);

    console.log('✅ Visit In photo captured successfully');

    // ✅ Set punch in time
    const punchInTime = new Date();
    setVisitPunchInTime(punchInTime);
    setVisitDuration(0);

    setIsProcessing(true);
    setUiState('loading');
    setStepStatuses({
      location: 'success',
      selfie: 'success',
      upload: 'loading',
    });

    try {
      const result = await callVisitInAPI(imageData);

      if (result.success) {
        setUiState('success');
        setStepStatuses({
          location: 'success',
          selfie: 'success',
          upload: 'success',
        });
        showToast('Visit started successfully', 'success');
        
        // Refresh history to get updated isVisitActive
        await dispatch(getAttendanceHistory());
        console.log('✅ Visit started, refreshing history...');
      } else {
        setVisitPunchInTime(null);
        setVisitDuration(0);
        setUiState('error');
        setStepStatuses({
          location: 'success',
          selfie: 'success',
          upload: 'error',
        });
        showToast(result.error || 'Failed to start visit', 'error');
      }
    } catch (error) {
      setVisitPunchInTime(null);
      setVisitDuration(0);
      setUiState('error');
      showToast('Failed to start visit', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Visit Punch Out ──
  const handleVisitPunchOut = async () => {
    console.log('🔄 handleVisitPunchOut called');
    console.log('📊 visitStatus:', visitStatus);
    
    if (visitStatus !== 'punched_in') {
      showToast('No active visit to end', 'error');
      return;
    }

    console.log('✅ Showing remarks modal');
    setShowRemarksModal(true);
  };

  // ── Main punch handler ──
  const handlePunch = async () => {
    console.log('🔄 handlePunch called');
    console.log('📊 visitStatus:', visitStatus);
    console.log('📊 isSalesTeam:', isSalesTeam);
    console.log('📊 hasActiveSession:', hasActiveSession);
    
    if (!isSalesTeam) {
      showToast('Visit feature is only available for sales team', 'error');
      return;
    }

    if (visitStatus === 'punched_in') {
      console.log('✅ Visit is active, calling handleVisitPunchOut');
      await handleVisitPunchOut();
      return;
    }

    if (!hasActiveSession) {
      Alert.alert(
        'Punch In Required',
        'You need to punch in first before starting a visit.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Punch In',
            onPress: () => navigation.navigate('DailyPunch'),
          },
        ],
      );
      return;
    }

    console.log('✅ Starting new visit');
    await handleVisitPunchIn();
  };

  // ── Manual location refresh (user initiated) ──
  const handleManualLocationRefresh = () => {
    if (!isCheckingLocation && !punchInLoading && !isProcessing && !isGettingAddress) {
      // User initiated - show toast
      updateLocation(true);
    }
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render visit type selector
  const renderVisitTypeSelector = () => {
    if (visitStatus !== 'idle') return null;

    const isFormDisabled = !hasActiveSession || !isSalesTeam;

    return (
      <View style={styles.visitTypeContainer}>
        <Text style={[styles.visitTypeLabel, { color: C.textSecondary }]}>
          Visit Type
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.visitTypeScroll}>
          {VISIT_TYPES.map(type => {
            const Icon = type.icon;
            const isSelected = visitType === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.visitTypeChip,
                  {
                    backgroundColor: isSelected ? C.primary + '20' : C.surface,
                    borderColor: isSelected ? C.primary : C.border,
                    opacity: isFormDisabled ? 0.5 : 1,
                  },
                ]}
                onPress={() => !isFormDisabled && setVisitType(type.id)}
                disabled={isFormDisabled}
              >
                <Icon
                  size={wp('4%')}
                  color={isSelected ? C.primary : C.textSecondary}
                />
                <Text
                  style={[
                    styles.visitTypeChipText,
                    {
                      color: isSelected ? C.primary : C.textSecondary,
                      fontFamily: isSelected ? Fonts.medium : Fonts.regular,
                    },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Render visit form
  const renderVisitForm = () => {
    if (visitStatus !== 'idle') return null;

    const isFormDisabled = !hasActiveSession || !isSalesTeam;

    return (
      <View style={[styles.formContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={styles.formField}>
          <Text style={[styles.formLabel, { color: C.textSecondary }]}>
            Customer Name *
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: isFormDisabled ? C.background + '60' : C.background,
                borderColor: C.border,
                color: C.textPrimary,
                opacity: isFormDisabled ? 0.6 : 1,
              },
            ]}
            placeholder="Enter customer name"
            placeholderTextColor={C.textSecondary}
            value={customerName}
            onChangeText={setCustomerName}
            editable={!isFormDisabled}
          />
        </View>

        <View style={styles.formField}>
          <Text style={[styles.formLabel, { color: C.textSecondary }]}>
            Visit Purpose *
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: isFormDisabled ? C.background + '60' : C.background,
                borderColor: C.border,
                color: C.textPrimary,
                opacity: isFormDisabled ? 0.6 : 1,
              },
            ]}
            placeholder="Enter visit purpose"
            placeholderTextColor={C.textSecondary}
            value={visitPurpose}
            onChangeText={setVisitPurpose}
            multiline
            numberOfLines={2}
            editable={!isFormDisabled}
          />
        </View>

        <View style={styles.formField}>
          <Text style={[styles.formLabel, { color: C.textSecondary }]}>
            Location Address <Text style={{ color: C.error }}>*</Text>
          </Text>
          <View style={styles.locationAddressContainer}>
            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: isFormDisabled ? C.background + '60' : C.background,
                  borderColor: C.border,
                  color: C.textPrimary,
                  opacity: isFormDisabled ? 0.6 : 1,
                  flex: 1,
                  minHeight: hp('6%'),
                },
              ]}
              placeholder="Auto-detected from location"
              placeholderTextColor={C.textSecondary}
              value={visitAddress}
              onChangeText={setVisitAddress}
              multiline
              numberOfLines={2}
              editable={false}
            />
            <TouchableOpacity
              style={[
                styles.refreshLocationBtnSmall,
                { backgroundColor: C.primary },
              ]}
              onPress={handleManualLocationRefresh}
              disabled={isFormDisabled || isCheckingLocation || isGettingAddress}
            >
              {isCheckingLocation || isGettingAddress ? (
                <Animated.View style={{ transform: [{ rotate: rotation || '0deg' }] }}>
                  <Loader size={wp('3.5%')} color={C.textDark} />
                </Animated.View>
              ) : (
                <RefreshCw size={wp('3.5%')} color={C.textDark} />
              )}
            </TouchableOpacity>
          </View>
          {userCoords && (
            <View style={styles.coordsContainer}>
              <Text style={[styles.coordsText, { color: C.textSecondary }]}>
                📍 Lat: {userCoords.latitude.toFixed(6)}, Lng: {userCoords.longitude.toFixed(6)}
              </Text>
              {isGettingAddress && (
                <Text style={[styles.coordsText, { color: C.primary }]}>
                  Fetching address...
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render visit status info
  const renderVisitStatusInfo = () => {
    if (visitStatus === 'idle') return null;

    return (
      <View style={[styles.visitStatusCard, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={styles.visitStatusRow}>
          <Text style={[styles.visitStatusLabel, { color: C.textSecondary }]}>
            Status
          </Text>
          <View style={[styles.visitStatusBadge, { backgroundColor: C.success + '20' }]}>
            <Text style={[styles.visitStatusBadgeText, { color: C.success }]}>
              In Progress
            </Text>
          </View>
        </View>

        <View style={styles.visitStatusRow}>
          <Text style={[styles.visitStatusLabel, { color: C.textSecondary }]}>
            Type
          </Text>
          <Text style={[styles.visitStatusValue, { color: C.textPrimary }]}>
            {VISIT_TYPES.find(t => t.id === visitType)?.label || visitType}
          </Text>
        </View>

        <View style={styles.visitStatusRow}>
          <Text style={[styles.visitStatusLabel, { color: C.textSecondary }]}>
            Customer
          </Text>
          <Text style={[styles.visitStatusValue, { color: C.textPrimary }]}>
            {customerName}
          </Text>
        </View>

        <View style={styles.visitStatusRow}>
          <Text style={[styles.visitStatusLabel, { color: C.textSecondary }]}>
            Purpose
          </Text>
          <Text style={[styles.visitStatusValue, { color: C.textPrimary }]}>
            {visitPurpose}
          </Text>
        </View>

        <View style={styles.visitStatusRow}>
          <Text style={[styles.visitStatusLabel, { color: C.textSecondary }]}>
            Address
          </Text>
          <Text style={[styles.visitStatusValue, { color: C.textPrimary }]}>
            {visitAddress || 'Current Location'}
          </Text>
        </View>

        {userCoords && (
          <View style={styles.visitStatusRow}>
            <Text style={[styles.visitStatusLabel, { color: C.textSecondary }]}>
              Coordinates
            </Text>
            <Text style={[styles.visitStatusValue, { color: C.textPrimary, fontSize: wp('2.5%') }]}>
              {userCoords.latitude.toFixed(6)}, {userCoords.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        <View style={styles.visitStatusRow}>
          <Text style={[styles.visitStatusLabel, { color: C.textSecondary }]}>
            Duration
          </Text>
          <Text style={[styles.visitStatusValue, { color: C.primary, fontFamily: Fonts.bold }]}>
            {formatDuration(visitDuration)}
          </Text>
        </View>

        {visitPunchInTime && (
          <View style={styles.visitStatusRow}>
            <Text style={[styles.visitStatusLabel, { color: C.textSecondary }]}>
              Started At
            </Text>
            <Text style={[styles.visitStatusValue, { color: C.textPrimary }]}>
              {new Date(visitPunchInTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ── Debug logs ──
  console.log('🔄 Render - isVisitActive:', isVisitActive, 'visitStatus:', visitStatus, 'duration:', visitDuration);

  // Show loading while restoring state
  if (isLoadingState) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[styles.loadingText, { color: C.textSecondary }]}>
          Loading visit data...
        </Text>
      </View>
    );
  }

  return (
    <MainLayout
      title="Visit"
      showBack
      headerBackgroundColor={C.background}
      hideBottomNav={false}
    >
      {(isProcessing || punchInLoading) && (
        <View style={[styles.overlay, { backgroundColor: C.overlayBg }]}>
          <View
            style={[
              styles.overlayCard,
              { backgroundColor: C.surfaceSolid, borderColor: C.border },
            ]}
          >
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={[styles.overlayText, { color: C.textPrimary }]}>
              {isProcessing ? 'Processing...' : t.attendance.processing}
            </Text>
          </View>
        </View>
      )}

      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />

      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            backgroundColor: C.background,
          },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Sales team badge */}
          {isSalesTeam ? (
            <View
              style={[
                styles.salesBadge,
                {
                  backgroundColor: C.success + '15',
                  borderColor: C.success + '40',
                },
              ]}
            >
              <Briefcase size={wp('3.5%')} color={C.success} />
              <Text style={[styles.salesBadgeText, { color: C.success }]}>
                Sales Team — Visit Feature Enabled
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.salesBadge,
                {
                  backgroundColor: C.error + '15',
                  borderColor: C.error + '40',
                },
              ]}
            >
              <XCircle size={wp('3.5%')} color={C.error} />
              <Text style={[styles.salesBadgeText, { color: C.error }]}>
                Visit Feature Only for Sales Team
              </Text>
            </View>
          )}

          {/* Status Card */}
          <View
            style={[
              styles.statusCard,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
          >
            <Text style={[styles.statusCardLabel, { color: C.primary }]}>
              Visit Status
            </Text>
            <Text style={[styles.statusCardValue, { color: C.textPrimary }]}>
              {visitStatus === 'punched_in'
                ? 'Visit in Progress'
                : !isSalesTeam
                  ? 'Not Available'
                  : !hasActiveSession
                    ? 'Punch In Required'
                    : 'Ready for Visit'}
            </Text>

            <View style={styles.locationRow}>
              <View style={styles.locationLeft}>
                <View
                  style={[
                    styles.locationIconWrap,
                    { backgroundColor: C.primary + '20' },
                  ]}
                >
                  <MapPin size={wp('3.8%')} color={C.primary} />
                </View>
                <Text
                  style={[styles.locationText, { color: C.textSecondary }]}
                  numberOfLines={1}
                >
                  {location?.name || 'Current Location'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.mapBadge, { backgroundColor: C.primary }]}
                onPress={handleManualLocationRefresh}
                activeOpacity={0.8}
                disabled={visitStatus === 'punched_in' || !isSalesTeam || isCheckingLocation || isGettingAddress}
              >
                {isCheckingLocation || isGettingAddress ? (
                  <Animated.View style={{ transform: [{ rotate: rotation || '0deg' }] }}>
                    <Loader size={wp('3%')} color={C.textDark} />
                  </Animated.View>
                ) : (
                  <RefreshCw size={wp('3%')} color={C.textDark} />
                )}
                <Text style={[styles.mapBadgeText, { color: C.textDark }]}>
                  REFRESH
                </Text>
              </TouchableOpacity>
            </View>

            {/* Location strip */}
            <View
              style={[
                styles.locationStrip,
                {
                  backgroundColor: locationStripColors.bg,
                  borderColor: locationStripColors.border,
                },
              ]}
            >
              {getLocationStripIcon()}
              <Text
                style={[
                  styles.locationStripText,
                  { color: locationStripColors.text },
                ]}
                numberOfLines={2}
              >
                {getLocationMessage()}
              </Text>
            </View>
          </View>

          {/* Visit Type Selector */}
          {renderVisitTypeSelector()}

          {/* Visit Form */}
          {renderVisitForm()}

          {/* Visit Status Info */}
          {renderVisitStatusInfo()}

          {/* Punch Circle */}
          <View style={styles.punchSection}>
            {visitStatus === 'idle' &&
              isSalesTeam &&
              hasActiveSession &&
              uiState !== 'error' && (
                <Animated.View
                  style={[
                    styles.waveRing,
                    {
                      transform: [{ scale: waveScale }],
                      opacity: waveOpacity,
                      borderColor: accentColor,
                    },
                  ]}
                />
              )}

            <TouchableOpacity
              onPress={handlePunch}
              disabled={isPunchDisabled}
              activeOpacity={isPunchDisabled ? 1 : 0.85}
            >
              <Animated.View
                style={[
                  styles.punchCircle,
                  { backgroundColor: accentColor, shadowColor: accentColor },
                  !isPunchDisabled &&
                  visitStatus !== 'punched_in' && {
                    transform: [{ scale: pulseAnim }],
                  },
                  (isPunchDisabled) && { opacity: 0.78 },
                ]}
              >
                {getCircleIcon()}
                <Text style={[styles.punchLabel, { color: C.textDark }]}>
                  {getCircleLabel()}
                </Text>
                <Text style={[styles.punchSubLabel, { color: C.textDark }]}>
                  {getCircleSubLabel()}
                </Text>
              </Animated.View>
            </TouchableOpacity>

            {/* Sync pill */}
            <View
              style={[
                styles.syncPill,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <Animated.View
                style={[
                  styles.syncDot,
                  { backgroundColor: syncDotColor },
                  !hasActiveSession &&
                  visitStatus === 'idle' && { opacity: dotOpacityAnim },
                ]}
              />
              <Text style={[styles.syncText, { color: syncTextColor }]}>
                {getSyncLabel()}
              </Text>
            </View>
          </View>

          {/* Verification Steps */}
          <View
            style={[
              styles.stepsCard,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
          >
            <Text style={[styles.stepsTitle, { color: C.textSecondary }]}>
              Verification Process
            </Text>
            <View style={styles.stepsRow}>
              {['location', 'selfie', 'upload'].map((step, i) => (
                <React.Fragment key={step}>
                  <View style={styles.stepItem}>
                    {getStepIcon(step, stepStatuses[step])}
                    <Text
                      style={[
                        styles.stepText,
                        { color: getStepColor(stepStatuses[step]) },
                      ]}
                    >
                      {getStepLabel(step)}
                    </Text>
                  </View>
                  {i < 2 && (
                    <View
                      style={[
                        styles.stepConnector,
                        { backgroundColor: C.border },
                        stepStatuses[step] === 'success' && {
                          backgroundColor: C.success,
                        },
                      ]}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Punch In Required Message */}
          {!hasActiveSession && isSalesTeam && visitStatus === 'idle' && (
            <View
              style={[
                styles.distanceInfo,
                {
                  backgroundColor: C.surface,
                  borderColor: C.warning + '40',
                },
              ]}
            >
              <Text style={[styles.distanceText, { color: C.textSecondary }]}>
                ⚠️ Daily Punch In Required
              </Text>
              <Text style={[styles.distanceHint, { color: C.warning }]}>
                Please punch in first before starting a visit
              </Text>
              <TouchableOpacity
                style={[
                  styles.punchInNowBtn,
                  { backgroundColor: C.primary, marginTop: hp('1%') },
                ]}
                onPress={() => navigation.navigate('DailyPunch')}
              >
                <LogIn size={wp('4%')} color={C.textDark} />
                <Text style={[styles.punchInNowText, { color: C.textDark }]}>
                  Punch In Now
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: hp('2%') }} />
        </ScrollView>
      </Animated.View>

      {/* Remarks Modal */}
      {renderRemarksModal()}
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: hp('2%'),
    fontSize: wp('4%'),
    fontFamily: Fonts.regular,
  },
  container: {
    flex: 1,
    paddingHorizontal: wp('5%'),
    paddingTop: hp('2%'),
  },
  scrollContent: {
    paddingBottom: hp('3%'),
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  overlayCard: {
    borderRadius: wp('4%'),
    padding: wp('8%'),
    alignItems: 'center',
    gap: hp('1.5%'),
    borderWidth: 1,
  },
  overlayText: { fontSize: wp('3.5%'), fontFamily: Fonts.medium },
  salesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    paddingHorizontal: wp('3.5%'),
    paddingVertical: hp('0.8%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: hp('1.5%'),
  },
  salesBadgeText: { fontSize: wp('2.8%'), fontFamily: Fonts.medium },
  statusCard: {
    borderRadius: wp('5%'),
    padding: wp('5%'),
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  statusCardLabel: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.8,
    marginBottom: hp('0.5%'),
  },
  statusCardValue: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
    marginBottom: hp('2%'),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: wp('3%'),
  },
  locationIconWrap: {
    width: wp('7%'),
    height: wp('7%'),
    borderRadius: wp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp('2%'),
  },
  locationText: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    flex: 1,
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1.5%'),
    paddingHorizontal: wp('3.5%'),
    paddingVertical: hp('0.7%'),
    borderRadius: wp('2%'),
  },
  mapBadgeText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.5,
  },
  locationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    marginTop: hp('1.5%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.9%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
  },
  locationStripText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    flex: 1,
  },
  visitTypeContainer: {
    marginTop: hp('2%'),
  },
  visitTypeLabel: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: hp('1%'),
  },
  visitTypeScroll: {
    flexDirection: 'row',
  },
  visitTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1.5%'),
    paddingHorizontal: wp('3.5%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    marginRight: wp('2%'),
  },
  visitTypeChipText: {
    fontSize: wp('2.8%'),
  },
  formContainer: {
    marginTop: hp('2%'),
    borderRadius: wp('5%'),
    padding: wp('4%'),
    borderWidth: 1,
  },
  formField: {
    marginBottom: hp('1.5%'),
  },
  formLabel: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    marginBottom: hp('0.5%'),
  },
  formInput: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    minHeight: hp('5%'),
  },
  locationAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
  },
  refreshLocationBtnSmall: {
    padding: wp('2%'),
    borderRadius: wp('2%'),
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: wp('8%'),
    minHeight: wp('8%'),
  },
  coordsContainer: {
    marginTop: hp('0.5%'),
  },
  coordsText: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.regular,
  },
  visitStatusCard: {
    marginTop: hp('2%'),
    borderRadius: wp('5%'),
    padding: wp('4%'),
    borderWidth: 1,
  },
  visitStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp('0.5%'),
  },
  visitStatusLabel: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
  },
  visitStatusValue: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    flex: 1,
    textAlign: 'right',
    marginLeft: wp('2%'),
  },
  visitStatusBadge: {
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.4%'),
    borderRadius: wp('2%'),
  },
  visitStatusBadgeText: {
    fontSize: wp('2.4%'),
    fontFamily: Fonts.medium,
  },
  punchSection: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: hp('30%'),
    marginVertical: hp('3%'),
  },
  waveRing: {
    position: 'absolute',
    width: wp('45%'),
    height: wp('45%'),
    borderRadius: wp('26%'),
    borderWidth: 2,
    marginTop: -hp('10%'),
  },
  punchCircle: {
    width: wp('46%'),
    height: wp('46%'),
    borderRadius: wp('23%'),
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  punchLabel: {
    marginTop: hp('1%'),
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.3,
    textAlign: 'center',
    paddingHorizontal: wp('2%'),
  },
  punchSubLabel: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.regular,
    marginTop: 3,
    opacity: 0.8,
    textAlign: 'center',
    paddingHorizontal: wp('2%'),
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('0.9%'),
    borderRadius: 30,
    borderWidth: 1,
    marginTop: hp('2%'),
    gap: wp('2%'),
  },
  syncDot: {
    width: wp('2%'),
    height: wp('2%'),
    borderRadius: wp('1%'),
  },
  syncText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.5,
  },
  stepsCard: {
    borderRadius: wp('5%'),
    padding: wp('5%'),
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  stepsTitle: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: hp('2%'),
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    gap: hp('0.6%'),
  },
  stepText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
  },
  stepConnector: {
    height: 1.5,
    width: wp('12%'),
    marginHorizontal: wp('2%'),
    marginBottom: hp('1.5%'),
  },
  distanceInfo: {
    marginTop: hp('2%'),
    padding: wp('4%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    alignItems: 'center',
  },
  distanceText: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
  },
  distanceHint: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    marginTop: hp('0.5%'),
    textAlign: 'center',
  },
  punchInNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.2%'),
    borderRadius: wp('3%'),
  },
  punchInNowText: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.medium,
  },
  keyboardAvoidingView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remarksModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('5%'),
  },
  remarksModalContent: {
    width: '100%',
    borderRadius: wp('5%'),
    padding: wp('6%'),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    maxHeight: hp('80%'),
  },
  remarksModalTitle: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
    marginBottom: hp('0.5%'),
    textAlign: 'center',
  },
  remarksModalSubtitle: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    marginBottom: hp('2%'),
    textAlign: 'center',
  },
  remarksInput: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.regular,
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    minHeight: hp('12%'),
    textAlignVertical: 'top',
  },
  remarksModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp('2%'),
    gap: wp('3%'),
  },
  remarksModalCancelBtn: {
    flex: 1,
    paddingVertical: hp('1.2%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    alignItems: 'center',
  },
  remarksModalCancelText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
  },
  remarksModalSubmitBtn: {
    flex: 2,
    paddingVertical: hp('1.2%'),
    borderRadius: wp('2.5%'),
    alignItems: 'center',
  },
  remarksModalSubmitText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
  },
});

export default VisitScreen;
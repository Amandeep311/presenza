// src/screens/home/punch/DailyPunch.jsx
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
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {
  MapPin,
  CheckCircle,
  Loader,
  Frown,
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  Map,
  AlertTriangle,
  Briefcase,
} from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Fonts } from '../../../utils/GlobalText';
import MainLayout from '../../../components/layout/MainLayout';
import {
  punchIn,
  getAttendanceHistory,
} from '../../../store/actions/attendanceActions';
import { setAlert } from '../../../store/actions/authActions';
import GeofenceMapModal from '../../../components/modals/GeofenceMapModal';
import RemoteLocationModal from '../../../components/modals/RemoteLocationModal';
import {
  checkAndRequestLocationPermission,
  getCurrentLocation,
} from '../../../utils/utils';
import {
  quickCheckPermissions,
  showPermissionRequiredDialog,
} from '../../../utils/permissions';
import { showToast } from '../../../components/common/ToastProvider';

// Office configuration
const OFFICE_CONFIG = {
  name: 'Head Office',
  latitude: 30.737875,
  longitude: 76.775631,
  radiusMeters: 100,
};

const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const DailyPunch = ({ navigation }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;

  const { punchInLoading, location, punchError, history } = useSelector(
    state => state.attendance,
  );

  // Profile for sales team detection
  const { profile } = useSelector(state => state.employeeProfile);
  const department = profile?.[0]?.department || '';
  const isSalesTeam = department?.toLowerCase().includes('sales');

  const [uiState, setUiState] = useState('idle');
  const [mapVisible, setMapVisible] = useState(false);
  const [isInsideGeofence, setIsInsideGeofence] = useState(null);
  const [stepStatuses, setStepStatuses] = useState({
    location: 'pending',
    selfie: 'pending',
    upload: 'pending',
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [distance, setDistance] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [locationCheckDone, setLocationCheckDone] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [remoteModalVisible, setRemoteModalVisible] = useState(false);

  // Check if user has active session
  const today = new Date().toISOString().split('T')[0];
  const todayRecord = history?.find(r => r.date?.split('T')[0] === today);
  const hasActiveSession = todayRecord?.isPunchedIn === true;

  // ── Animations ─────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(hp('4%'))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const dotOpacityAnim = useRef(new Animated.Value(1)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  const isLocationFetchingRef = useRef(false);
  const rotationLoopRef = useRef(null);

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

  // ── Location check function ──

  const checkLocationAutomatically = useCallback(async () => {
    if (hasActiveSession || isLocationFetchingRef.current) return;

    isLocationFetchingRef.current = true;
    setIsCheckingLocation(true);
    setLocationCheckDone(false);

    try {
      const hasPermission = await checkAndRequestLocationPermission();

      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Location permission is required to punch in. Please allow access.',
          [
            {
              text: 'Retry',
              onPress: () => checkLocationAutomatically(),
            },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
            { text: 'Cancel', style: 'cancel' },
          ],
        );

        setIsInsideGeofence(null);
        return;
      }

      const locationData = await getCurrentLocation();

      const dist = getDistanceMeters(
        locationData.latitude,
        locationData.longitude,
        OFFICE_CONFIG.latitude,
        OFFICE_CONFIG.longitude,
      );

      const inside = dist <= OFFICE_CONFIG.radiusMeters;

      setIsInsideGeofence(inside);
      setDistance(Math.round(dist));
      setUserCoords({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      });
    } catch (e) {
      console.log('Location error:', e);

      Alert.alert(
        'Location Error',
        'Unable to fetch location. Please try again.',
        [{ text: 'Retry', onPress: () => checkLocationAutomatically() }],
      );

      setIsInsideGeofence(null);
    } finally {
      setIsCheckingLocation(false);
      setLocationCheckDone(true);
      isLocationFetchingRef.current = false;
    }
  }, [hasActiveSession]);

  // ── Initialize animations and location ──
  useEffect(() => {
    // Start all animations
    startPulse();
    startWave();
    startDotBlink();

    // Entrance animations
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

    // Initial location check
    const timer = setTimeout(() => {
      checkLocationAutomatically();
    }, 500);

    // Time interval
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
      if (
        nextAppState === 'active' &&
        !hasActiveSession &&
        now - lastCheckRef.current > 5000
      ) {
        lastCheckRef.current = now;
        checkLocationAutomatically();
      }
    });
    return () => subscription.remove();
  }, [checkLocationAutomatically, hasActiveSession]);

  // ── UI State management ──
  useEffect(() => {
    if (punchInLoading) {
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
  }, [punchInLoading, punchError]);

  // ── Manage rotation animation during location fetch and API call ──
  useEffect(() => {
    const showLoader = isCheckingLocation && !locationCheckDone;
    if (showLoader || punchInLoading) {
      startRotation();
    } else {
      stopRotation();
    }
  }, [
    isCheckingLocation,
    locationCheckDone,
    punchInLoading,
    startRotation,
    stopRotation,
  ]);

  // ── Derived values ──
  const outsideGeofence = isInsideGeofence === false;
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

  const isPunchDisabled =
    punchInLoading ||
    hasActiveSession ||
    isCheckingLocation ||
    (!isSalesTeam && outsideGeofence);

  const getAccentColor = () => {
    if (hasActiveSession) return C.warning;
    if (isSalesTeam && outsideGeofence) return C.warning;
    if (!isSalesTeam && outsideGeofence) return C.error;
    if (showLoader || punchInLoading) return C.primary;
    return C.primary;
  };

  const accentColor = getAccentColor();

  const getCircleIcon = () => {
    if (hasActiveSession)
      return <CheckCircle size={wp('14%')} color={C.textDark} />;
    if (!isSalesTeam && outsideGeofence)
      return <XCircle size={wp('14%')} color={C.textDark} />;
    if (isSalesTeam && outsideGeofence)
      return <Briefcase size={wp('14%')} color={C.textDark} />;
    if (showLoader || punchInLoading) {
      return (
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Loader size={wp('14%')} color={C.textDark} />
        </Animated.View>
      );
    }
    if (uiState === 'success')
      return <CheckCircle size={wp('14%')} color={C.textDark} />;
    if (uiState === 'error')
      return <Frown size={wp('14%')} color={C.textDark} />;
    return <Camera size={wp('14%')} color={C.textPrimary} />;
  };

  const getCircleLabel = () => {
    if (hasActiveSession)
      return t.attendance.alreadyPunchedIn || 'ALREADY PUNCHED IN';
    if (showLoader)
      return t.attendance.gettingLocation || 'GETTING LOCATION...';
    if (punchInLoading) return t.attendance.processing || 'PROCESSING...';
    if (!isSalesTeam && outsideGeofence)
      return t.attendance.outsideGeofenceStatus || 'OUT OF RANGE';
    if (isSalesTeam && outsideGeofence)
      return t?.remoteLocation?.remotePunchIn || 'REMOTE PUNCH IN';
    if (uiState === 'success') return t.attendance.success || 'SUCCESS!';
    if (uiState === 'error') return t.attendance.error || 'ERROR!';
    return t.attendance.punchIn;
  };

  const getCircleSubLabel = () => {
    if (hasActiveSession)
      return (
        t.attendance.alreadyHaveActiveSession || 'You have an active session'
      );
    if (showLoader)
      return t.attendance.detectingLocation || 'Detecting your location...';
    if (punchInLoading)
      return t.attendance.verifying || 'Verifying your details...';
    if (!isSalesTeam && outsideGeofence)
      return t.attendance.openMap || 'Open map to verify';
    if (isSalesTeam && outsideGeofence)
      return t?.remoteLocation?.tapToConfirm || 'Tap to confirm location';
    if (uiState === 'error') return t.attendance.tapRetry || 'Tap to retry';
    return '';
  };

  const getSyncLabel = () => {
    if (hasActiveSession) return t.attendance.sessionActive || 'ACTIVE SESSION';
    if (showLoader) return t.attendance.locating || 'LOCATING...';
    if (punchInLoading) return t.attendance.processing || 'PROCESSING';
    if (isSalesTeam && isInsideGeofence === false)
      return t?.remoteLocation?.remoteLabel || 'REMOTE LOCATION';
    if (isInsideGeofence === false)
      return t.attendance.outsideGeofenceStatus || 'OUTSIDE GEOFENCE';
    if (isInsideGeofence === true)
      return t.attendance.insideGeofenceStatus || 'INSIDE GEOFENCE';
    if (uiState === 'error') return t.attendance.failed || 'FAILED';
    return t.attendance.readyToSync;
  };

  const getGeofenceMessage = () => {
    if (hasActiveSession)
      return t.attendance.cannotPunchTwice || 'You are already punched in';
    if (showLoader)
      return t.attendance.checkingLocation || 'Checking your location...';
    if (punchInLoading)
      return t.attendance.verifyingAttendance || 'Verifying your attendance...';
    if (isSalesTeam && isInsideGeofence === false) {
      return (
        t?.remoteLocation?.salesOutsideMsg ||
        'Remote punch-in available for sales team'
      );
    }
    if (isInsideGeofence === true)
      return t.geofence.youAreInside || 'You are inside the geofence';
    if (isInsideGeofence === false)
      return t.geofence.youAreOutside || 'You are outside the geofence';
    return t.geofence.checking || 'Checking your location...';
  };

  const syncDotColor = hasActiveSession
    ? C.warning
    : isCheckingLocation || punchInLoading
    ? C.primary
    : isSalesTeam && isInsideGeofence === false
    ? C.warning
    : isInsideGeofence === false
    ? C.error
    : isInsideGeofence === true
    ? C.success
    : C.success;

  const syncTextColor = syncDotColor;

  const geofenceStripColors = {
    bg: hasActiveSession
      ? C.warning + '18'
      : showLoader || punchInLoading
      ? C.primary + '18'
      : isSalesTeam && isInsideGeofence === false
      ? C.warning + '18'
      : isInsideGeofence
      ? C.success + '18'
      : C.error + '18',
    border: hasActiveSession
      ? C.warning + '50'
      : showLoader || punchInLoading
      ? C.primary + '50'
      : isSalesTeam && isInsideGeofence === false
      ? C.warning + '50'
      : isInsideGeofence
      ? C.success + '50'
      : C.error + '50',
    text: hasActiveSession
      ? C.warning
      : showLoader || punchInLoading
      ? C.primary
      : isSalesTeam && isInsideGeofence === false
      ? C.warning
      : isInsideGeofence
      ? C.success
      : C.error,
  };

  const getGeofenceStripIcon = () => {
    const size = wp('3.5%');
    if (hasActiveSession) return <CheckCircle2 size={size} color={C.warning} />;
    if (showLoader || punchInLoading)
      return <Loader size={size} color={C.primary} />;
    if (isSalesTeam && isInsideGeofence === false)
      return <Briefcase size={size} color={C.warning} />;
    if (isInsideGeofence) return <CheckCircle2 size={size} color={C.success} />;
    return <AlertTriangle size={size} color={C.error} />;
  };

  const getStepIcon = (step, status) => {
    const size = wp('4%');
    if (step === 'upload' && status === 'loading') {
      return (
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
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
        return t.attendance.locationStep;
      case 'selfie':
        return t.attendance.selfieStep;
      case 'upload':
        return t.attendance.uploadStep;
      default:
        return step;
    }
  };

  // Update executePunch function in DailyPunch.jsx:

  const executePunch = async () => {
    setIsProcessing(true);
    try {
      const result = await dispatch(punchIn());

      // 🔥 NEW: Handle camera cancellation
      if (result?.cancelled) {
        console.log('📸 Camera cancelled by user');
        setIsProcessing(false);
        return; // Silently return, no toast
      }

      if (result?.success) {
        setUiState('success');
        await dispatch(getAttendanceHistory());
        setTimeout(() => {
          navigation.replace('Home');
        }, 1500);
      } else {
        setUiState('error');
        // Only show toast if it's not a cancellation
        if (!result?.cancelled) {
          showToast(result?.error || t.alerts.punchInFailed, 'error');
        }
      }
    } catch (err) {
      setUiState('error');
      showToast(t.alerts.punchInFailed, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const checkPermissionsBeforePunch = async () => {
    const permStatus = await quickCheckPermissions();

    if (!permStatus.camera || !permStatus.location) {
      showPermissionRequiredDialog(
        {
          camera: !permStatus.camera,
          location: !permStatus.location,
        },
        () => Linking.openSettings(),
      );
      return false;
    }

    return true;
  };

  // ── Punch handler ──
  const handlePunch = async () => {
    const hasPermissions = await checkPermissionsBeforePunch();
    if (!hasPermissions) return;
    if (hasActiveSession) {
      showToast(
        t.alerts.alreadyPunchedIn || 'You are already punched in',
        'warning',
      );
      return;
    }

    if (punchInLoading || isCheckingLocation) return;

    // Non-sales: block if outside geofence
    if (!isSalesTeam && outsideGeofence) {
      showToast(t.alerts.outsideGeofence, 'error');
      return;
    }

    // Sales team + outside geofence → show remote location modal
    if (isSalesTeam && outsideGeofence) {
      setRemoteModalVisible(true);
      return;
    }

    // Inside geofence or sales team inside — proceed
    await executePunch();
  };

  const handleRemoteConfirm = async () => {
    setRemoteModalVisible(false);
    await executePunch();
  };

  const handleGeofenceStatusChange = (
    status,
    distanceValue,
    coords,
    address,
  ) => {
    setIsInsideGeofence(status);
    setDistance(distanceValue);
    if (coords) setUserCoords(coords);
    if (address) setUserAddress(address);
  };

  const handleManualLocationRefresh = () => {
    if (!isCheckingLocation && !hasActiveSession && !punchInLoading) {
      checkLocationAutomatically();
    }
  };

  return (
    <MainLayout
      title={
        hasActiveSession ? t.attendance.alreadyPunchedIn : t.attendance.punchIn
      }
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
              {t.attendance.processing}
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
        {/* Sales team badge */}
        {isSalesTeam && (
          <View
            style={[
              styles.salesBadge,
              {
                backgroundColor: C.warning + '15',
                borderColor: C.warning + '40',
              },
            ]}
          >
            <Briefcase size={wp('3.5%')} color={C.warning} />
            <Text style={[styles.salesBadgeText, { color: C.warning }]}>
              {t?.remoteLocation?.salesTeamBadge ||
                'Sales Team — Remote Punch-In Enabled'}
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
            {t.attendance.currentStatus}
          </Text>
          <Text style={[styles.statusCardValue, { color: C.textPrimary }]}>
            {hasActiveSession
              ? t.attendance.punchedIn
              : t.attendance.notPunched}
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
                {location?.name || t.attendance.defaultLocation}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.mapBadge, { backgroundColor: C.primary }]}
              onPress={() => setMapVisible(true)}
              activeOpacity={0.8}
              disabled={hasActiveSession}
            >
              <Map size={wp('3%')} color={C.textDark} />
              <Text style={[styles.mapBadgeText, { color: C.textDark }]}>
                {t.attendance.map || 'MAP'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Geofence strip */}
          <View
            style={[
              styles.geofenceStrip,
              {
                backgroundColor: geofenceStripColors.bg,
                borderColor: geofenceStripColors.border,
              },
            ]}
          >
            {getGeofenceStripIcon()}
            <Text
              style={[
                styles.geofenceStripText,
                { color: geofenceStripColors.text },
              ]}
            >
              {getGeofenceMessage()}
              {!hasActiveSession &&
                !isCheckingLocation &&
                !punchInLoading &&
                distance !== null &&
                !isInsideGeofence &&
                ` - ${Math.round(distance)} ${t.geofence.meters || 'm'}`}
            </Text>
          </View>
        </View>

        {/* Punch Circle */}
        <View style={styles.punchSection}>
          {!hasActiveSession &&
            !(isSalesTeam ? false : outsideGeofence) &&
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
                !isPunchDisabled && {
                  transform: [{ scale: pulseAnim }],
                },
                isPunchDisabled && { opacity: 0.78 },
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
                isInsideGeofence === null &&
                  !hasActiveSession &&
                  !isCheckingLocation &&
                  !punchInLoading && { opacity: dotOpacityAnim },
              ]}
            />
            <Text style={[styles.syncText, { color: syncTextColor }]}>
              {getSyncLabel()}
            </Text>
          </View>

          {/* Manual refresh button */}
          {/* {!hasActiveSession && !isCheckingLocation && !punchInLoading && ( */}
          <TouchableOpacity
            style={[
              styles.refreshLocationBtn,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
            onPress={handleManualLocationRefresh}
          >
            <Loader size={wp('3%')} color={C.primary} />
            <Text style={[styles.refreshLocationText, { color: C.primary }]}>
              {t.attendance.refreshLocation || 'Refresh Location'}
            </Text>
          </TouchableOpacity>
          {/* )} */}
        </View>

        {/* Verification Steps */}
        <View
          style={[
            styles.stepsCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <Text style={[styles.stepsTitle, { color: C.textSecondary }]}>
            {t.attendance.verificationProcess}
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

        {/* Distance Info for non-sales */}
        {!isSalesTeam &&
          !hasActiveSession &&
          !isCheckingLocation &&
          !punchInLoading &&
          isInsideGeofence === false &&
          distance !== null && (
            <View
              style={[
                styles.distanceInfo,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <Text style={[styles.distanceText, { color: C.textSecondary }]}>
                {t.geofence.distanceToOffice || 'Distance to office'}:{' '}
                {Math.round(distance)} {t.geofence.meters || 'm'}
              </Text>
              <Text style={[styles.distanceHint, { color: C.warning }]}>
                {t.geofence.moveCloser || 'Please move closer to the office'}
              </Text>
            </View>
          )}

        {/* Distance Info for sales team */}
        {isSalesTeam &&
          !hasActiveSession &&
          !isCheckingLocation &&
          !punchInLoading &&
          isInsideGeofence === false &&
          distance !== null && (
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
                {t.geofence.distanceToOffice || 'Distance to office'}:{' '}
                {Math.round(distance)} {t.geofence.meters || 'm'}
              </Text>
              <Text style={[styles.distanceHint, { color: C.warning }]}>
                {t?.remoteLocation?.salesDistanceHint ||
                  'Tap the punch button to confirm remote punch-in'}
              </Text>
            </View>
          )}
      </Animated.View>

      {/* Geofence Map Modal */}
      <GeofenceMapModal
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        onStatusChange={handleGeofenceStatusChange}
        isSalesTeam={isSalesTeam}
      />

      {/* Remote Location Confirmation Modal */}
      <RemoteLocationModal
        visible={remoteModalVisible}
        onClose={() => setRemoteModalVisible(false)}
        onConfirm={handleRemoteConfirm}
        loading={isProcessing || punchInLoading}
        locationData={{
          latitude: userCoords?.latitude ?? null,
          longitude: userCoords?.longitude ?? null,
          address: userAddress,
          distance: distance,
        }}
      />
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp('5%'),
    paddingTop: hp('2.5%'),
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
  geofenceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    marginTop: hp('1.5%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.9%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
  },
  geofenceStripText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    flex: 1,
  },
  punchSection: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: hp('35%'), // Use minHeight instead of flex:1
    marginVertical: hp('2%'),
  },
  waveRing: {
    position: 'absolute',
    width: wp('45%'),
    height: wp('45'),
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
  refreshLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    marginTop: hp('1.5%'),
  },
  refreshLocationText: {
    fontSize: wp('2.6%'),
    fontFamily: Fonts.medium,
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
});

export default DailyPunch;

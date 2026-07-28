import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  SafeAreaView,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {
  Target,
  TrendingUp,
  Award,
  BarChart3,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle,
  Circle,
  Edit2,
  Save,
  Check,
  Pencil,
} from 'lucide-react-native';
import { Fonts } from '../../../utils/GlobalText';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchKRA,
  updateKRAMetric,
  updateKRAStatus,
} from '../../../store/actions/kraActions';
import { showToast } from '../../../components/common/ToastProvider';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// RESPONSIVE DESIGN SYSTEM
// ============================================================================

const isTablet = SCREEN_WIDTH > 600;
const isMobile = SCREEN_WIDTH <= 600;

const RESPONSIVE = {
  xs: wp('1%'),
  sm: wp('2%'),
  md: wp('4%'),
  lg: wp('6%'),
  xl: wp('8%'),
  fontSize: {
    xs: wp(isMobile ? '2.2%' : '1.8%'),
    sm: wp(isMobile ? '2.5%' : '2%'),
    base: wp(isMobile ? '3%' : '2.4%'),
    lg: wp(isMobile ? '3.5%' : '2.8%'),
    xl: wp(isMobile ? '4%' : '3.2%'),
    '2xl': wp(isMobile ? '4.5%' : '3.6%'),
    '3xl': wp(isMobile ? '5%' : '4%'),
  },
  iconSize: {
    xs: wp(isMobile ? '3%' : '2.4%'),
    sm: wp(isMobile ? '4%' : '3.2%'),
    md: wp(isMobile ? '5%' : '4%'),
    lg: wp(isMobile ? '6%' : '4.8%'),
    xl: wp(isMobile ? '7%' : '5.6%'),
  },
  componentHeight: {
    touchable: hp(isMobile ? '6.5%' : '7%'),
    button: hp(isMobile ? '5.5%' : '6%'),
    card: 'auto',
  },
  borderRadius: {
    sm: wp(isMobile ? '2%' : '1.5%'),
    md: wp(isMobile ? '3%' : '2%'),
    lg: wp(isMobile ? '4%' : '2.5%'),
    xl: wp(isMobile ? '5%' : '3%'),
  },
};

// ============================================================================
// CONSTANTS
// ============================================================================

const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 100,
  GOOD: 80,
  FAIR: 60,
  NEEDS_IMPROVEMENT: 40,
  POOR: 0,
};

const PERFORMANCE_COLORS = {
  EXCELLENT: { bg: '#22C55E20', text: '#4ADE80', bar: '#4ADE80' },
  GOOD: { bg: '#06B6D420', text: '#22D3EE', bar: '#22D3EE' },
  FAIR: { bg: '#F9731620', text: '#FB923C', bar: '#FB923C' },
  NEEDS_IMPROVEMENT: { bg: '#F59E0B20', text: '#FBBF24', bar: '#FBBF24' },
  POOR: { bg: '#EF444420', text: '#F87171', bar: '#F87171' },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getPerformanceColor = percentage => {
  if (percentage >= PERFORMANCE_THRESHOLDS.EXCELLENT)
    return PERFORMANCE_COLORS.EXCELLENT;
  if (percentage >= PERFORMANCE_THRESHOLDS.GOOD) return PERFORMANCE_COLORS.GOOD;
  if (percentage >= PERFORMANCE_THRESHOLDS.FAIR) return PERFORMANCE_COLORS.FAIR;
  if (percentage >= PERFORMANCE_THRESHOLDS.NEEDS_IMPROVEMENT)
    return PERFORMANCE_COLORS.NEEDS_IMPROVEMENT;
  return PERFORMANCE_COLORS.POOR;
};

const getPerformanceBarColor = percentage =>
  getPerformanceColor(percentage).bar;

const calculateAchievement = (achieved, target) => {
  if (!target || target === 0) return 0;
  return Math.min(Math.round((achieved / target) * 100), 200);
};

const getRecommendation = (
  avgAchievement,
  completedKras,
  totalKras,
  pendingKras,
) => {
  if (avgAchievement >= 90) {
    return {
      type: 'EXCELLENT',
      icon: Award,
      title: 'Excellent Performance! 🌟',
      message: `You've achieved ${avgAchievement}% of your targets. Outstanding work! Keep maintaining this excellence.`,
      colorKey: 'success',
    };
  }
  if (avgAchievement >= 70) {
    return {
      type: 'GOOD',
      icon: TrendingUp,
      title: 'Good Progress! 📈',
      message: `You're on the right track with ${avgAchievement}% achievement. Focus on completing the remaining ${pendingKras} KRA(s).`,
      colorKey: 'info',
    };
  }
  if (avgAchievement < 70) {
    return {
      type: 'IMPROVEMENT',
      icon: AlertCircle,
      title: 'Need Improvement 📊',
      message: `Your achievement rate is ${avgAchievement}%. Consider discussing with your manager for guidance.`,
      colorKey: 'warning',
    };
  }
  return {
    type: 'FOCUS',
    icon: Target,
    title: 'Focus Areas 🎯',
    message: `${pendingKras} KRA(s) are pending completion. Prioritize these to improve your overall score.`,
    colorKey: 'primary',
  };
};

// ============================================================================
// EDIT MODAL COMPONENT - FIXED UI
// ============================================================================

const MetricEditModal = ({
  visible,
  metric,
  kraId,
  onClose,
  onUpdate,
  theme,
}) => {
  const C = theme.colors;
  const [achievedValue, setAchievedValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (metric && visible) {
      const initialValue = metric.achieved || metric.achievedValue || 0;
      setAchievedValue(String(initialValue));
      console.log('📝 Edit modal opened for metric:', metric.name, 'Current value:', initialValue);

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 300);
    }
  }, [metric, visible]);

  const handleUpdate = async () => {
    if (!metric || !kraId) {
      console.error('❌ Missing metric or kraId');
      showToast('Missing metric or KRA ID', 'error');
      return;
    }

    const achieved = parseFloat(achievedValue);
    if (isNaN(achieved) || achieved < 0) {
      showToast('Please enter a valid number', 'error');
      return;
    }

    console.log('📤 Updating metric:', {
      kraId,
      metricId: metric._id || metric.id,
      achieved,
    });

    Keyboard.dismiss();

    setIsUpdating(true);
    try {
      const result = await onUpdate(kraId, metric._id || metric.id, achieved);
      if (result && result.success) {
        console.log('✅ Metric updated successfully');
        showToast('Metric updated successfully!', 'success');
        onClose();
      } else {
        console.error('❌ Update failed:', result?.error);
        showToast(result?.error || 'Failed to update metric', 'error');
      }
    } catch (error) {
      console.error('❌ Update error:', error);
      showToast('Error updating metric', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!metric) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
      onDismiss={() => Keyboard.dismiss()}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={[styles.editModalContainer, { backgroundColor: C.background }]}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    onClose();
                  }}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={RESPONSIVE.iconSize.lg} color={C.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                  Update Achievement
                </Text>
                <View style={{ width: RESPONSIVE.iconSize.lg }} />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.modalContentScroll}
                keyboardShouldPersistTaps="handled"
                bounces={true}
                scrollEnabled={true}
              >
                <View style={styles.editMetricInfo}>
                  <Text style={[styles.editMetricLabel, { color: C.textSecondary }]}>
                    Metric
                  </Text>
                  <Text style={[styles.editMetricName, { color: C.textPrimary }]}>
                    {metric.name || 'Untitled Metric'}
                  </Text>

                  <View style={styles.editMetricDetails}>
                    <View style={styles.editDetailItem}>
                      <Text style={[styles.editDetailLabel, { color: C.textSecondary }]}>
                        Category
                      </Text>
                      <Text style={[styles.editDetailValue, { color: C.textPrimary }]}>
                        {metric.category || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.editDetailItem}>
                      <Text style={[styles.editDetailLabel, { color: C.textSecondary }]}>
                        Target
                      </Text>
                      <Text style={[styles.editDetailValue, { color: C.primary }]}>
                        {metric.target || 0}
                      </Text>
                    </View>
                    <View style={styles.editDetailItem}>
                      <Text style={[styles.editDetailLabel, { color: C.textSecondary }]}>
                        Current Achievement
                      </Text>
                      <Text style={[styles.editDetailValue, { color: C.textPrimary }]}>
                        {metric.achieved || 0}
                      </Text>
                    </View>
                    <View style={styles.editDetailItem}>
                      <Text style={[styles.editDetailLabel, { color: C.textSecondary }]}>
                        Weightage
                      </Text>
                      <Text style={[styles.editDetailValue, { color: C.textPrimary }]}>
                        {metric.weightage || 0}%
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.editInputContainer}>
                  <Text style={[styles.editInputLabel, { color: C.textSecondary }]}>
                    New Achieved Value
                  </Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      ref={inputRef}
                      style={[
                        styles.editInput,
                        {
                          backgroundColor: C.surface,
                          borderColor: C.border,
                          color: C.textPrimary,
                        },
                      ]}
                      value={achievedValue}
                      onChangeText={setAchievedValue}
                      keyboardType="numeric"
                      placeholder="Enter achieved value"
                      placeholderTextColor={C.textSecondary}
                      returnKeyType="done"
                      onSubmitEditing={handleUpdate}
                      blurOnSubmit={true}
                      clearButtonMode="while-editing"
                      selectTextOnFocus={true}
                      maxLength={2}
                    />
                  </View>
                  <Text style={[styles.editInputHint, { color: C.textSecondary }]}>
                    Enter the updated achieved value for this metric
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.updateButton,
                    { backgroundColor: C.primary },
                    isUpdating && styles.updateButtonDisabled,
                  ]}
                  onPress={handleUpdate}
                  disabled={isUpdating}
                  activeOpacity={0.7}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Save size={RESPONSIVE.iconSize.md} color="#fff" />
                      <Text style={styles.updateButtonText}>Update Achievement</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={{ height: Platform.OS === 'ios' ? 30 : 20 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ============================================================================
// STATUS UPDATE MODAL
// ============================================================================

const StatusUpdateModal = ({
  visible,
  kra,
  onClose,
  onUpdate,
  theme,
}) => {
  const C = theme.colors;
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (kra && visible) {
      setSelectedStatus(kra.status || 'pending');
    }
  }, [kra, visible]);

  const handleUpdate = async () => {
    if (!kra) return;

    setIsUpdating(true);
    try {
      const result = await onUpdate(kra.kraId || kra._id, selectedStatus);
      if (result && result.success) {
        showToast(`KRA status updated to ${selectedStatus}`, 'success');
        onClose();
      }
    } catch (error) {
      console.error('Status update error:', error);
      showToast('Failed to update status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!kra) return null;

  const statusOptions = [
    { value: 'pending', label: 'Pending', icon: Clock, color: C.warning },
    { value: 'in_progress', label: 'In Progress', icon: TrendingUp, color: C.info },
    { value: 'completed', label: 'Completed', icon: CheckCircle, color: C.success },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.editModalContainer, { backgroundColor: C.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.modalCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={RESPONSIVE.iconSize.lg} color={C.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
              Update KRA Status
            </Text>
            <View style={{ width: RESPONSIVE.iconSize.lg }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalContentScroll}
          >
            <View style={styles.editMetricInfo}>
              <Text style={[styles.editMetricLabel, { color: C.textSecondary }]}>
                KRA
              </Text>
              <Text style={[styles.editMetricName, { color: C.textPrimary }]}>
                {kra.title}
              </Text>
              <Text style={[styles.editMetricSub, { color: C.textSecondary }]}>
                {kra.period} • {kra.department}
              </Text>
            </View>

            <View style={styles.statusOptionsContainer}>
              <Text style={[styles.editInputLabel, { color: C.textSecondary }]}>
                Select Status
              </Text>
              {statusOptions.map((option) => {
                const isSelected = selectedStatus === option.value;
                const Icon = option.icon;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusOption,
                      {
                        backgroundColor: isSelected ? option.color + '20' : C.surface,
                        borderColor: isSelected ? option.color : C.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedStatus(option.value)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon
                      size={RESPONSIVE.iconSize.md}
                      color={isSelected ? option.color : C.textSecondary}
                    />
                    <Text
                      style={[
                        styles.statusOptionText,
                        {
                          color: isSelected ? option.color : C.textPrimary,
                          fontFamily: isSelected ? Fonts.bold : Fonts.regular,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Check
                        size={RESPONSIVE.iconSize.sm}
                        color={option.color}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.updateButton,
                { backgroundColor: C.primary },
                isUpdating && styles.updateButtonDisabled,
              ]}
              onPress={handleUpdate}
              disabled={isUpdating}
              activeOpacity={0.7}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={RESPONSIVE.iconSize.md} color="#fff" />
                  <Text style={styles.updateButtonText}>Update Status</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// KRA DETAIL MODAL COMPONENT - FIXED
// ============================================================================

const KRADetailModal = ({
  visible,
  kra,
  onClose,
  onEditMetric,
  onUpdateStatus,
  theme,
}) => {
  const C = theme.colors;
  const [showStatusModal, setShowStatusModal] = useState(false);

  if (!kra) return null;

  const kraAchievement = kra.achievement || 0;
  const performanceColor = getPerformanceColor(kraAchievement);

  const handleEditPress = (metric) => {
    console.log('🎯 Edit pressed for metric:', metric?.name);
    onClose();
    setTimeout(() => {
      onEditMetric(metric, kra._id || kra.kraId);
    }, 350);
  };

  const handleStatusUpdate = () => {
    setShowStatusModal(true);
  };

  const handleStatusClose = () => {
    setShowStatusModal(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <TouchableOpacity 
                onPress={onClose} 
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={RESPONSIVE.iconSize.lg} color={C.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                KRA Details
              </Text>
              {/* <TouchableOpacity
                onPress={handleStatusUpdate}
                style={styles.statusUpdateBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Edit2 size={RESPONSIVE.iconSize.md} color={C.primary} />
              </TouchableOpacity> */}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContentScroll}
            >
              {/* KRA Header */}
              <View style={styles.modalKraHeader}>
                <View
                  style={[
                    styles.modalKraIcon,
                    { backgroundColor: C.primary + '20' },
                  ]}
                >
                  <BarChart3 size={RESPONSIVE.iconSize.xl} color={C.primary} />
                </View>
                <View style={styles.modalKraInfo}>
                  <Text style={[styles.modalKraTitle, { color: C.textPrimary }]}>
                    {kra.title}
                  </Text>
                  <View style={styles.modalKraPeriodContainer}>
                    <Calendar size={RESPONSIVE.iconSize.xs} color={C.textSecondary} />
                    <Text style={[styles.modalKraPeriod, { color: C.textSecondary }]}>
                      {kra.period}
                    </Text>
                  </View>
                  <View style={styles.modalKraStatusContainer}>
                    <View style={[styles.statusBadge, {
                      backgroundColor: kra.status === 'completed' ? C.success + '20' :
                        kra.status === 'in_progress' ? C.info + '20' :
                          C.warning + '20'
                    }]}>
                      <Text style={[styles.statusBadgeText, {
                        color: kra.status === 'completed' ? C.success :
                          kra.status === 'in_progress' ? C.info :
                            C.warning
                      }]}>
                        {kra.status || 'pending'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Achievement Badge */}
              <View
                style={[
                  styles.modalAchievementBadge,
                  { backgroundColor: performanceColor.bg },
                ]}
              >
                <Text
                  style={[
                    styles.modalAchievementText,
                    { color: performanceColor.text },
                  ]}
                >
                  {kraAchievement}% Achievement
                </Text>
              </View>

              {/* Description */}
              {kra.description && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: C.textPrimary }]}>
                    Description
                  </Text>
                  <Text style={[styles.modalDescription, { color: C.textSecondary }]}>
                    {kra.description}
                  </Text>
                </View>
              )}

              {/* Metrics Section */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Text style={[styles.modalSectionTitle, { color: C.textPrimary }]}>
                    Metrics & Targets
                  </Text>
                  <Text style={[styles.modalSectionCount, { color: C.textSecondary }]}>
                    {kra.metrics?.length || 0} metrics
                  </Text>
                </View>

                {kra.metricsWithAchievement?.map((metric, index) => {
                  const metricPerformanceColor = getPerformanceColor(
                    metric.achievement,
                  );
                  return (
                    <View
                      key={metric._id || index}
                      style={[
                        styles.modalMetricCard,
                        { backgroundColor: C.surface, borderColor: C.border },
                      ]}
                    >
                      <View style={styles.modalMetricHeader}>
                        <View style={styles.modalMetricCategory}>
                          <Text
                            style={[
                              styles.modalMetricCategoryText,
                              { color: C.primary },
                            ]}
                          >
                            {metric.category}
                          </Text>
                        </View>
                        <View style={styles.modalMetricActions}>
                          {!metric.isCompleted && metric.status !== 'completed' && (
                            <TouchableOpacity
                              onPress={() => {
                                console.log('✏️ Edit button pressed for metric:', metric.name);
                                handleEditPress(metric);
                              }}
                              style={styles.editMetricBtn}
                              activeOpacity={0.7}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Pencil size={RESPONSIVE.iconSize.sm} color={C.primary} />
                              <Text style={[styles.editBtnText, { color: C.primary }]}>
                                Edit
                              </Text>
                            </TouchableOpacity>
                          )}
                          {metric.isCompleted ? (
                            <CheckCircle size={RESPONSIVE.iconSize.sm} color={C.success} />
                          ) : (
                            <Circle size={RESPONSIVE.iconSize.sm} color={C.textSecondary} />
                          )}
                        </View>
                      </View>

                      <Text style={[styles.modalMetricName, { color: C.textPrimary }]}>
                        {metric.name}
                      </Text>

                      <View style={styles.modalMetricStats}>
                        <View style={styles.modalMetricStat}>
                          <Text style={[styles.modalMetricStatLabel, { color: C.textSecondary }]}>
                            Target
                          </Text>
                          <Text style={[styles.modalMetricStatValue, { color: C.primary }]}>
                            {metric.target?.toLocaleString() || 0}
                          </Text>
                        </View>
                        <View style={styles.modalMetricStat}>
                          <Text style={[styles.modalMetricStatLabel, { color: C.textSecondary }]}>
                            Achieved
                          </Text>
                          <Text style={[styles.modalMetricStatValue, {
                            color: metric.isCompleted ? C.success : C.textPrimary,
                          }]}>
                            {metric.achieved?.toLocaleString() || 0}
                          </Text>
                        </View>
                        <View style={styles.modalMetricStat}>
                          <Text style={[styles.modalMetricStatLabel, { color: C.textSecondary }]}>
                            Weightage
                          </Text>
                          <Text style={[styles.modalMetricStatValue, { color: C.textPrimary }]}>
                            {metric.weightage || 0}%
                          </Text>
                        </View>
                        <View style={styles.modalMetricStat}>
                          <Text style={[styles.modalMetricStatLabel, { color: C.textSecondary }]}>
                            Achievement
                          </Text>
                          <Text style={[styles.modalMetricStatValue, { color: metricPerformanceColor.text }]}>
                            {metric.achievement}%
                          </Text>
                        </View>
                      </View>

                      <View style={styles.modalProgressBarContainer}>
                        <View
                          style={[
                            styles.modalProgressBar,
                            {
                              width: `${Math.min(metric.achievement, 100)}%`,
                              backgroundColor: getPerformanceBarColor(metric.achievement),
                            },
                          ]}
                        />
                      </View>

                      {metric.status === 'pending' && (
                        <View style={[styles.modalPendingBadge, { backgroundColor: C.warning + '20' }]}>
                          <Clock size={RESPONSIVE.iconSize.xs} color={C.warning} />
                          <Text style={[styles.modalPendingText, { color: C.warning }]}>
                            Pending Review
                          </Text>
                        </View>
                      )}

                      {metric.isCompleted && (
                        <View style={[styles.modalCompletedBadge, { backgroundColor: C.success + '20' }]}>
                          <Award size={RESPONSIVE.iconSize.xs} color={C.success} />
                          <Text style={[styles.modalCompletedText, { color: C.success }]}>
                            Target Achieved! 🎉
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status Update Modal */}
      <StatusUpdateModal
        visible={showStatusModal}
        kra={kra}
        onClose={handleStatusClose}
        onUpdate={onUpdateStatus}
        theme={theme}
      />
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const KRA = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;
  const dispatch = useDispatch();

  const { kraList, loading, error } = useSelector(state => state.kra || { kraList: [], loading: false, error: null });
  const { profile } = useSelector(state => state.employeeProfile || { profile: [] });

  const [kraData, setKraData] = useState(null);
  const [expandedKRAs, setExpandedKRAs] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [selectedKRA, setSelectedKRA] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editMetricData, setEditMetricData] = useState(null);
  const [showEditMetricModal, setShowEditMetricModal] = useState(false);

  // =========================================================================
  // LIFECYCLE HOOKS
  // =========================================================================

  useEffect(() => {
    loadKRA();
  }, []);

  // =========================================================================
  // DATA LOADING
  // =========================================================================

  const loadKRA = async () => {
    try {
      const result = await dispatch(fetchKRA());
      if (result && result.success && result.data) {
        const transformedData = transformKRAData(result.data);
        setKraData(transformedData);

        const expandedState = {};
        if (transformedData && transformedData.kras) {
          transformedData.kras.forEach(kra => {
            if (kra && kra._id) {
              expandedState[kra._id] = false;
            }
          });
        }
        setExpandedKRAs(expandedState);
      } else {
        const errorMsg = result?.error || 'Failed to load KRA data';
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      showToast('Error loading KRA data', 'error');
      console.error('KRA Load Error:', err);
    }
  };

  const transformKRAData = (apiData) => {
    if (!apiData) return null;

    const kras = apiData.kras || [];

    let totalAchievement = 0;
    let completedKras = 0;
    let pendingKras = 0;

    const transformedKras = kras.map(kra => {
      const metrics = kra.metrics || [];
      const totalAchieved = metrics.reduce((sum, m) => sum + (m?.achieved || 0), 0);
      const totalTarget = metrics.reduce((sum, m) => sum + (m?.target || 0), 0);
      const achievement = calculateAchievement(totalAchieved, totalTarget);

      if (kra.status === 'completed') completedKras++;
      if (kra.status === 'pending') pendingKras++;

      totalAchievement += achievement;

      return {
        ...kra,
        _id: kra.kraId || kra._id,
        achievement,
        metricsWithAchievement: metrics.map(metric => ({
          ...metric,
          achievement: calculateAchievement(
            metric?.achieved || 0,
            metric?.target || 0,
          ),
          isCompleted: (metric?.achieved || 0) >= (metric?.target || 0),
        })),
      };
    }).filter(Boolean);

    const avgAchievement = transformedKras.length > 0
      ? Math.round(totalAchievement / transformedKras.length)
      : 0;

    return {
      ...apiData,
      kras: transformedKras,
      summary: {
        overallRating: avgAchievement > 80 ? 4.5 : avgAchievement > 60 ? 3.5 : 2.5,
        completedKras,
        totalKras: transformedKras.length,
        avgAchievement,
        excellenceScore: `${completedKras}/${transformedKras.length}`,
        pendingKras,
      }
    };
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadKRA();
      showToast('KRA data refreshed', 'success');
    } catch (err) {
      showToast('Failed to refresh data', 'error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // =========================================================================
  // API UPDATE HANDLERS
  // =========================================================================

  const handleMetricUpdate = async (kraId, metricId, achievedValue) => {
    try {
      const result = await dispatch(updateKRAMetric(kraId, metricId, achievedValue));
      if (result && result.success) {
        await loadKRA();
        return result;
      } else {
        const errorMsg = result?.error || 'Failed to update metric';
        showToast(errorMsg, 'error');
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Metric Update Error:', err);
      throw err;
    }
  };

  const handleStatusUpdate = async (kraId, status) => {
    try {
      const result = await dispatch(updateKRAStatus(kraId, status));
      if (result && result.success) {
        await loadKRA();
        return result;
      } else {
        const errorMsg = result?.error || 'Failed to update status';
        showToast(errorMsg, 'error');
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Status Update Error:', err);
      throw err;
    }
  };

  // =========================================================================
  // UI HANDLERS
  // =========================================================================

  const toggleKRAExpanded = useCallback(kraId => {
    if (!kraId) return;
    setExpandedKRAs(prev => ({
      ...prev,
      [kraId]: !prev[kraId],
    }));
  }, []);

  const handleKraPress = useCallback(kra => {
    if (!kra) return;
    setSelectedKRA(kra);
    setShowDetailModal(true);
  }, []);

  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedKRA(null);
  }, []);

  const handleEditFromDetail = useCallback((metric, kraId) => {
    console.log('✏️ Edit from detail modal:', metric?.name);
    console.log('📊 KRA ID:', kraId);
    
    if (!metric || !kraId) {
      console.error('❌ Missing metric or kra data');
      showToast('Unable to edit metric', 'error');
      return;
    }

    setTimeout(() => {
      setEditMetricData({
        metric: metric,
        kraId: kraId,
      });
      setShowEditMetricModal(true);
    }, 100);
  }, []);

  const handleDirectMetricEdit = useCallback((metric, kra) => {
    console.log('✏️ Direct edit for metric:', metric?.name);
    console.log('📊 KRA ID:', kra?._id || kra?.kraId);

    if (!metric || !kra) {
      console.error('❌ Missing metric or kra data');
      showToast('Unable to edit metric', 'error');
      return;
    }

    setEditMetricData({
      metric: metric,
      kraId: kra._id || kra.kraId,
    });
    setShowEditMetricModal(true);
  }, []);

  const closeEditMetricModal = useCallback(() => {
    setShowEditMetricModal(false);
    setEditMetricData(null);
  }, []);

  // =========================================================================
  // MEMOIZED COMPUTATIONS
  // =========================================================================

  const memoizedKRAs = useMemo(() => {
    if (!kraData?.kras) return [];
    return kraData.kras;
  }, [kraData?.kras]);

  const memoizedSummary = useMemo(() => {
    return kraData?.summary || {
      overallRating: 0,
      completedKras: 0,
      totalKras: 0,
      avgAchievement: 0,
      excellenceScore: '0/0',
      pendingKras: 0,
    };
  }, [kraData?.summary]);

  const userProfile = useMemo(() => {
    if (!profile || !Array.isArray(profile) || profile.length === 0) {
      return {};
    }
    return profile[0] || {};
  }, [profile]);

  // =========================================================================
  // RENDER SECTIONS
  // =========================================================================

  if (loading && !kraData) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[styles.loadingText, { color: C.textSecondary, marginTop: RESPONSIVE.lg }]}>
          Loading KRA data...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: 'center', alignItems: 'center', paddingHorizontal: RESPONSIVE.md }]}>
        <AlertCircle size={RESPONSIVE.iconSize.xl} color={C.error} />
        <Text style={[styles.errorText, { color: C.error, marginTop: RESPONSIVE.lg, textAlign: 'center' }]}>
          {error}
        </Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: C.primary, marginTop: RESPONSIVE.lg }]} onPress={loadKRA}>
          <Text style={[styles.retryBtnText, { color: '#fff' }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!memoizedKRAs || memoizedKRAs.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />
        <View style={[styles.header, { backgroundColor: C.background, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
            <ChevronLeft size={RESPONSIVE.iconSize.md} color={C.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>KRA Management</Text>
            <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>Key Result Areas</Text>
          </View>
          <View style={styles.downloadBtn} />
        </View>
        <View style={styles.emptyContainer}>
          <BarChart3 size={RESPONSIVE.iconSize.xl} color={C.disabled} />
          <Text style={[styles.emptyTitle, { color: C.textPrimary, marginTop: RESPONSIVE.lg }]}>No KRA Data Available</Text>
          <Text style={[styles.emptySubtitle, { color: C.textSecondary, textAlign: 'center', marginTop: RESPONSIVE.md }]}>
            Your KRA metrics haven't been assigned yet.{'\n'}Please contact your manager.
          </Text>
        </View>
      </View>
    );
  }

  const summary = memoizedSummary;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />

      <View style={[styles.header, { backgroundColor: C.background, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
          <ChevronLeft size={RESPONSIVE.iconSize.md} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>KRA Management</Text>
          <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>Key Result Areas</Text>
        </View>
        <View style={styles.downloadBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        }
      >
        {/* Employee Overview Card */}
        <View style={[styles.overviewCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.overviewHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.employeeName, { color: C.textPrimary }]} numberOfLines={2}>
                {userProfile?.fullName || 'Employee'}
              </Text>
              <Text style={[styles.employeeRole, { color: C.textSecondary }]} numberOfLines={2}>
                {userProfile?.designation || 'Position'} • {userProfile?.department || 'Department'}
              </Text>
            </View>
            <View style={styles.ratingContainer}>
              <Text style={[styles.ratingLabel, { color: C.textSecondary }]}>Overall Rating</Text>
              <Text style={[styles.overallRating, { color: C.textPrimary }]}>{summary.overallRating || '0'} / 5</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: C.primary + '15', borderColor: C.primary + '40' }]}>
              <Target size={RESPONSIVE.iconSize.md} color={C.primary} />
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{summary.completedKras}/{summary.totalKras}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>KRAs Completed</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.success + '15', borderColor: C.success + '40' }]}>
              <TrendingUp size={RESPONSIVE.iconSize.md} color={C.success} />
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{summary.avgAchievement}%</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Avg Achievement</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.warning + '15', borderColor: C.warning + '40' }]}>
              <Award size={RESPONSIVE.iconSize.md} color={C.warning} />
              <Text style={[styles.statValue, { color: C.textPrimary }]}>{summary.excellenceScore || '0/0'}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Excellence Score</Text>
            </View>
          </View>
        </View>

        {/* KRA Sections */}
        {memoizedKRAs.map(kra => {
          if (!kra) return null;

          const isExpanded = expandedKRAs[kra._id] || false;
          const kraAchievement = kra.achievement || 0;
          const performanceColor = getPerformanceColor(kraAchievement);

          return (
            <View key={kra._id || Math.random().toString()} style={[styles.kraSection, { backgroundColor: C.surface, borderColor: C.border }]}>
              <TouchableOpacity
                style={styles.kraHeaderMain}
                onPress={() => handleKraPress(kra)}
                activeOpacity={0.7}
              >
                <View style={styles.kraTitleSection}>
                  <View style={[styles.kraIcon, { backgroundColor: C.primary + '20' }]}>
                    <BarChart3 size={RESPONSIVE.iconSize.md} color={C.primary} />
                  </View>
                  <View style={styles.kraInfo}>
                    <Text style={[styles.kraTitle, { color: C.textPrimary }]} numberOfLines={2}>
                      {kra.title || 'Untitled KRA'}
                    </Text>
                    <Text style={[styles.kraPeriod, { color: C.textSecondary }]} numberOfLines={1}>
                      {kra.period || 'N/A'}
                    </Text>
                  </View>
                </View>
                <View style={styles.kraScoreSection}>
                  <View style={[styles.kraScoreBadge, { backgroundColor: performanceColor.bg }]}>
                    <Text style={[styles.kraScoreText, { color: performanceColor.text }]}>
                      {kraAchievement}%
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={e => {
                      e.stopPropagation();
                      toggleKRAExpanded(kra._id);
                    }}
                    style={styles.expandIcon}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {isExpanded ? (
                      <ChevronUp size={RESPONSIVE.iconSize.sm} color={C.textSecondary} />
                    ) : (
                      <ChevronDown size={RESPONSIVE.iconSize.sm} color={C.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {isExpanded && kra.metricsWithAchievement && kra.metricsWithAchievement.length > 0 && (
                <View style={styles.metricsContainer}>
                  {kra.description && (
                    <Text style={[styles.descriptionText, { color: C.textSecondary }]} numberOfLines={3}>
                      {kra.description}
                    </Text>
                  )}

                  {kra.metricsWithAchievement.map(metric => {
                    if (!metric) return null;

                    const metricPerformanceColor = getPerformanceColor(metric.achievement || 0);
                    return (
                      <View key={metric._id || Math.random().toString()} style={[styles.metricItem, { backgroundColor: C.background, borderColor: C.border }]}>
                        <View style={styles.metricHeader}>
                          <View style={styles.metricTitleContainer}>
                            <View style={styles.metricCategoryBadge}>
                              <Text style={[styles.metricCategory, { color: C.primary }]}>
                                {metric.category || 'Uncategorized'}
                              </Text>
                            </View>
                            <Text style={[styles.metricName, { color: C.textPrimary }]} numberOfLines={2}>
                              {metric.name || 'Untitled Metric'}
                            </Text>
                          </View>
                          {!metric.isCompleted && metric.status !== 'completed' && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                console.log('✏️ Edit button pressed for metric:', metric.name);
                                handleDirectMetricEdit(metric, kra);
                              }}
                              style={styles.editSmallBtn}
                              activeOpacity={0.7}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Pencil size={RESPONSIVE.iconSize.sm} color={C.primary} />
                              <Text style={[styles.editSmallText, { color: C.primary }]}>Edit</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.metricMetrics}>
                          <View style={styles.metricItemBox}>
                            <Text style={[styles.metricLabel, { color: C.textSecondary }]}>Target</Text>
                            <Text style={[styles.metricValue, { color: C.primary }]}>{metric.target?.toLocaleString() || 0}</Text>
                          </View>
                          <View style={styles.metricItemBox}>
                            <Text style={[styles.metricLabel, { color: C.textSecondary }]}>Achieved</Text>
                            <Text style={[styles.metricValue, { color: metric.isCompleted ? C.success : C.textPrimary }]}>
                              {metric.achieved?.toLocaleString() || 0}
                            </Text>
                          </View>
                          <View style={styles.metricItemBox}>
                            <Text style={[styles.metricLabel, { color: C.textSecondary }]}>Weightage</Text>
                            <Text style={[styles.metricValue, { color: C.textPrimary }]}>{metric.weightage || 0}%</Text>
                          </View>
                          <View style={styles.metricItemBox}>
                            <Text style={[styles.metricLabel, { color: C.textSecondary }]}>Achievement</Text>
                            <Text style={[styles.metricValue, { color: metricPerformanceColor.text }]}>{metric.achievement || 0}%</Text>
                          </View>
                        </View>

                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBar, { width: `${Math.min(metric.achievement || 0, 100)}%`, backgroundColor: getPerformanceBarColor(metric.achievement || 0) }]} />
                        </View>

                        {metric.status === 'pending' && (
                          <View style={[styles.pendingBadge, { backgroundColor: C.warning + '20' }]}>
                            <Clock size={RESPONSIVE.iconSize.xs} color={C.warning} />
                            <Text style={[styles.pendingText, { color: C.warning }]}>Pending Review</Text>
                          </View>
                        )}

                        {metric.isCompleted && (
                          <View style={[styles.completedBadge, { backgroundColor: C.success + '20' }]}>
                            <Award size={RESPONSIVE.iconSize.xs} color={C.success} />
                            <Text style={[styles.completedText, { color: C.success }]}>Target Achieved! 🎉</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Performance Summary */}
        <View style={[styles.summaryCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.summaryTitle, { color: C.textPrimary }]}>Performance Summary</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: C.primary }]}>{summary.avgAchievement}%</Text>
              <Text style={[styles.summaryStatLabel, { color: C.textSecondary }]}>Average Achievement</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: C.warning }]}>{summary.completedKras}/{summary.totalKras}</Text>
              <Text style={[styles.summaryStatLabel, { color: C.textSecondary }]}>KRAs Completed</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: C.success }]}>{summary.pendingKras}</Text>
              <Text style={[styles.summaryStatLabel, { color: C.textSecondary }]}>Pending KRAs</Text>
            </View>
          </View>
        </View>

        {/* Recommendations */}
        <View style={[styles.recommendationsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.summaryTitle, { color: C.textPrimary }]}>Recommendations</Text>
          {(() => {
            const recommendation = getRecommendation(
              summary.avgAchievement,
              summary.completedKras,
              summary.totalKras,
              summary.pendingKras,
            );
            const RecommendationIcon = recommendation.icon;
            return (
              <View style={[styles.recommendationItem, { backgroundColor: C[recommendation.colorKey] + '15', borderColor: C[recommendation.colorKey] + '40' }]}>
                <RecommendationIcon size={RESPONSIVE.iconSize.md} color={C[recommendation.colorKey]} />
                <View style={styles.recommendationContent}>
                  <Text style={[styles.recommendationTitle, { color: C.textPrimary }]}>{recommendation.title}</Text>
                  <Text style={[styles.recommendationDesc, { color: C.textSecondary }]}>{recommendation.message}</Text>
                </View>
              </View>
            );
          })()}
        </View>

        <View style={{ height: RESPONSIVE.xl }} />
      </ScrollView>

      {/* KRA Detail Modal */}
      <KRADetailModal
        visible={showDetailModal}
        kra={selectedKRA}
        onClose={closeDetailModal}
        onEditMetric={handleEditFromDetail}
        onUpdateStatus={handleStatusUpdate}
        theme={theme}
      />

      {/* Single MetricEditModal - rendered once */}
      <MetricEditModal
        visible={showEditMetricModal}
        metric={editMetricData?.metric || null}
        kraId={editMetricData?.kraId || null}
        onClose={closeEditMetricModal}
        onUpdate={handleMetricUpdate}
        theme={theme}
      />
    </View>
  );
};

// ============================================================================
// STYLESHEET - FULLY RESPONSIVE
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { 
    paddingBottom: RESPONSIVE.lg,
    paddingHorizontal: RESPONSIVE.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: RESPONSIVE.md,
    paddingTop: Platform.OS === 'ios' ? hp('6%') : hp('5%'),
    paddingBottom: RESPONSIVE.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: RESPONSIVE.componentHeight.button,
    height: RESPONSIVE.componentHeight.button,
    borderRadius: RESPONSIVE.borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: RESPONSIVE.sm,
  },
  headerTitle: {
    fontSize: RESPONSIVE.fontSize['2xl'],
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: 2,
  },
  downloadBtn: {
    width: RESPONSIVE.componentHeight.button,
    height: RESPONSIVE.componentHeight.button,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  overviewCard: {
    marginBottom: RESPONSIVE.md,
    borderRadius: RESPONSIVE.borderRadius.lg,
    borderWidth: 1,
    padding: RESPONSIVE.md,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: RESPONSIVE.lg,
    gap: RESPONSIVE.sm,
  },
  employeeName: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontFamily: Fonts.bold,
    flexShrink: 1,
  },
  employeeRole: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.regular,
    marginTop: 4,
    flexShrink: 1,
  },
  ratingContainer: { alignItems: 'flex-end', flexShrink: 0 },
  ratingLabel: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.medium,
    marginBottom: 4,
  },
  overallRating: {
    fontSize: RESPONSIVE.fontSize.xl,
    fontFamily: Fonts.bold,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: RESPONSIVE.sm,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: isMobile ? 1 : 0,
    minWidth: isMobile ? '30%' : '29%',
    padding: RESPONSIVE.md,
    borderRadius: RESPONSIVE.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: RESPONSIVE.fontSize.xl,
    fontFamily: Fonts.bold,
    marginVertical: 6,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },

  kraSection: {
    marginBottom: RESPONSIVE.md,
    borderRadius: RESPONSIVE.borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  kraHeaderMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: RESPONSIVE.md,
    gap: RESPONSIVE.sm,
  },
  kraTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: RESPONSIVE.md,
    minWidth: 0,
  },
  kraIcon: {
    width: RESPONSIVE.componentHeight.button,
    height: RESPONSIVE.componentHeight.button,
    borderRadius: RESPONSIVE.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  kraInfo: { flex: 1, minWidth: 0 },
  kraTitle: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  kraPeriod: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.regular,
  },
  kraScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: RESPONSIVE.sm,
    flexShrink: 0,
  },
  kraScoreBadge: {
    paddingHorizontal: RESPONSIVE.sm,
    paddingVertical: 6,
    borderRadius: RESPONSIVE.borderRadius.md,
  },
  kraScoreText: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontFamily: Fonts.bold,
  },
  expandIcon: { padding: 4 },

  metricsContainer: {
    padding: RESPONSIVE.md,
    paddingTop: RESPONSIVE.sm,
    gap: RESPONSIVE.md,
  },
  descriptionText: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.regular,
    lineHeight: hp('2.2%'),
    marginBottom: RESPONSIVE.md,
  },
  metricItem: {
    borderRadius: RESPONSIVE.borderRadius.md,
    borderWidth: 1,
    padding: RESPONSIVE.md,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: RESPONSIVE.md,
    gap: RESPONSIVE.sm,
  },
  metricTitleContainer: { flex: 1, minWidth: 0 },
  metricCategoryBadge: {
    backgroundColor: '#3B82F620',
    paddingHorizontal: RESPONSIVE.sm,
    paddingVertical: 4,
    borderRadius: RESPONSIVE.borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  metricCategory: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.bold,
  },
  metricName: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.medium,
  },
  editSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    paddingHorizontal: 8,
    borderRadius: RESPONSIVE.borderRadius.sm,
    backgroundColor: 'transparent',
  },
  editSmallText: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.medium,
    marginLeft: 4,
  },

  metricMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: RESPONSIVE.md,
    marginBottom: RESPONSIVE.md,
    justifyContent: 'space-between',
  },
  metricItemBox: {
    minWidth: isMobile ? '22%' : '20%',
  },
  metricLabel: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.regular,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.bold,
  },

  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: RESPONSIVE.borderRadius.sm,
    overflow: 'hidden',
    marginBottom: RESPONSIVE.md,
  },
  progressBar: {
    height: '100%',
    borderRadius: RESPONSIVE.borderRadius.sm,
  },

  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: RESPONSIVE.sm,
    paddingVertical: 4,
    borderRadius: RESPONSIVE.borderRadius.sm,
  },
  pendingText: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.medium,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: RESPONSIVE.sm,
    paddingVertical: 4,
    borderRadius: RESPONSIVE.borderRadius.sm,
  },
  completedText: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.medium,
  },

  summaryCard: {
    marginBottom: RESPONSIVE.md,
    borderRadius: RESPONSIVE.borderRadius.lg,
    borderWidth: 1,
    padding: RESPONSIVE.md,
  },
  summaryTitle: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontFamily: Fonts.bold,
    marginBottom: RESPONSIVE.md,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: RESPONSIVE.md,
  },
  summaryStat: {
    alignItems: 'center',
    flex: 1,
    minWidth: wp('30%'),
  },
  summaryStatValue: {
    fontSize: RESPONSIVE.fontSize.xl,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },

  recommendationsCard: {
    marginBottom: RESPONSIVE.md,
    borderRadius: RESPONSIVE.borderRadius.lg,
    borderWidth: 1,
    padding: RESPONSIVE.md,
  },
  recommendationItem: {
    flexDirection: 'row',
    padding: RESPONSIVE.md,
    borderRadius: RESPONSIVE.borderRadius.md,
    borderWidth: 1,
    gap: RESPONSIVE.sm,
    marginBottom: RESPONSIVE.md,
  },
  recommendationContent: { flex: 1, minWidth: 0 },
  recommendationTitle: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  recommendationDesc: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontFamily: Fonts.regular,
    lineHeight: 18,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    maxHeight: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: RESPONSIVE.borderRadius.xl,
    borderTopRightRadius: RESPONSIVE.borderRadius.xl,
    overflow: 'hidden',
  },
  editModalContainer: {
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: RESPONSIVE.borderRadius.xl,
    borderTopRightRadius: RESPONSIVE.borderRadius.xl,
    overflow: 'hidden',
    width: '100%',
  },
  modalContentScroll: {
    paddingHorizontal: RESPONSIVE.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: RESPONSIVE.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: RESPONSIVE.md,
    paddingVertical: RESPONSIVE.md,
    borderBottomWidth: 1,
    minHeight: hp('7%'),
  },
  modalCloseBtn: { 
    padding: RESPONSIVE.sm,
    minWidth: wp('8%'),
    minHeight: wp('8%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusUpdateBtn: { 
    padding: RESPONSIVE.sm,
    minWidth: wp('8%'),
    minHeight: wp('8%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontFamily: Fonts.bold,
    flex: 1,
    textAlign: 'center',
  },
  modalKraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: RESPONSIVE.md,
    marginBottom: RESPONSIVE.lg,
  },
  modalKraIcon: {
    width: RESPONSIVE.componentHeight.touchable,
    height: RESPONSIVE.componentHeight.touchable,
    borderRadius: RESPONSIVE.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  modalKraInfo: { flex: 1 },
  modalKraTitle: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  modalKraPeriodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  modalKraPeriod: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.regular,
  },
  modalKraStatusContainer: {
    marginTop: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: RESPONSIVE.sm,
    paddingVertical: 4,
    borderRadius: RESPONSIVE.borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.bold,
    textTransform: 'capitalize',
  },
  modalAchievementBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: RESPONSIVE.md,
    paddingVertical: 8,
    borderRadius: RESPONSIVE.borderRadius.xl,
    marginBottom: RESPONSIVE.lg,
  },
  modalAchievementText: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.bold,
  },
  modalSection: { marginBottom: RESPONSIVE.lg },
  modalSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: RESPONSIVE.md,
  },
  modalSectionTitle: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontFamily: Fonts.bold,
  },
  modalSectionCount: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontFamily: Fonts.medium,
  },
  modalDescription: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.regular,
    lineHeight: 22,
  },
  modalMetricCard: {
    borderRadius: RESPONSIVE.borderRadius.md,
    borderWidth: 1,
    padding: RESPONSIVE.md,
    marginBottom: RESPONSIVE.md,
  },
  modalMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: RESPONSIVE.md,
  },
  modalMetricCategory: {
    backgroundColor: '#3B82F620',
    paddingHorizontal: RESPONSIVE.sm,
    paddingVertical: 4,
    borderRadius: RESPONSIVE.borderRadius.sm,
  },
  modalMetricCategoryText: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.bold,
  },
  modalMetricActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: RESPONSIVE.sm,
  },
  editMetricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    paddingHorizontal: 8,
    borderRadius: RESPONSIVE.borderRadius.sm,
    backgroundColor: 'transparent',
  },
  editBtnText: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.medium,
    marginLeft: 4,
  },
  modalMetricName: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.medium,
    marginBottom: RESPONSIVE.md,
  },
  modalMetricStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: RESPONSIVE.md,
    marginBottom: RESPONSIVE.md,
  },
  modalMetricStat: { flex: 1, minWidth: wp('20%') },
  modalMetricStatLabel: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.regular,
    marginBottom: 2,
  },
  modalMetricStatValue: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.bold,
  },
  modalProgressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: RESPONSIVE.borderRadius.sm,
    overflow: 'hidden',
    marginBottom: RESPONSIVE.md,
  },
  modalProgressBar: {
    height: '100%',
    borderRadius: RESPONSIVE.borderRadius.sm,
  },
  modalPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: RESPONSIVE.sm,
    paddingVertical: 4,
    borderRadius: RESPONSIVE.borderRadius.sm,
  },
  modalPendingText: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.medium,
  },
  modalCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: RESPONSIVE.sm,
    paddingVertical: 4,
    borderRadius: RESPONSIVE.borderRadius.sm,
  },
  modalCompletedText: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.medium,
  },

  editMetricInfo: {
    marginBottom: RESPONSIVE.lg,
  },
  editMetricLabel: {
    fontSize: RESPONSIVE.fontSize.sm,
    fontFamily: Fonts.medium,
    marginBottom: 4,
  },
  editMetricName: {
    fontSize: RESPONSIVE.fontSize.xl,
    fontFamily: Fonts.bold,
    marginBottom: RESPONSIVE.md,
  },
  editMetricSub: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.regular,
  },
  editMetricDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: RESPONSIVE.md,
    marginTop: RESPONSIVE.sm,
  },
  editDetailItem: {
    flex: 1,
    minWidth: wp('28%'),
  },
  editDetailLabel: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.regular,
    marginBottom: 2,
  },
  editDetailValue: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.bold,
  },
  editInputContainer: {
    marginBottom: RESPONSIVE.lg,
    width: '100%',
  },
  editInputLabel: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.medium,
    marginBottom: RESPONSIVE.sm,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: RESPONSIVE.borderRadius.md,
    padding: RESPONSIVE.md,
    fontSize: RESPONSIVE.fontSize.lg,
    fontFamily: Fonts.regular,
    height: hp('6%'),
  },
  editInputHint: {
    fontSize: RESPONSIVE.fontSize.xs,
    fontFamily: Fonts.regular,
    marginTop: 6,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: RESPONSIVE.md,
    borderRadius: RESPONSIVE.borderRadius.md,
    gap: RESPONSIVE.sm,
    height: hp('6%'),
    marginBottom: hp('1%'),
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: RESPONSIVE.fontSize.lg,
    fontFamily: Fonts.bold,
  },

  statusOptionsContainer: {
    marginBottom: RESPONSIVE.lg,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: RESPONSIVE.md,
    borderRadius: RESPONSIVE.borderRadius.md,
    marginBottom: RESPONSIVE.sm,
    gap: RESPONSIVE.md,
  },
  statusOptionText: {
    fontSize: RESPONSIVE.fontSize.base,
    flex: 1,
  },

  emptyContainer: {
    flex: 1,
    paddingHorizontal: RESPONSIVE.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: RESPONSIVE.fontSize.xl,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginTop: RESPONSIVE.lg,
  },
  emptySubtitle: {
    fontSize: RESPONSIVE.fontSize.base,
    fontFamily: Fonts.regular,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: RESPONSIVE.md,
  },

  loadingText: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontFamily: Fonts.medium,
  },
  errorText: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontFamily: Fonts.medium,
  },
  retryBtn: {
    paddingHorizontal: RESPONSIVE.md,
    paddingVertical: 12,
    borderRadius: RESPONSIVE.borderRadius.md,
  },
  retryBtnText: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontFamily: Fonts.bold,
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  inputWrapper: {
    width: '100%',
  },
});

export default KRA;
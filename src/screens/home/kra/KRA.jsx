import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {
  Star,
  Target,
  TrendingUp,
  Award,
  BookOpen,
  ChevronLeft,
  BarChart3,
  FileText,
  Download,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { Fonts } from '../../../utils/GlobalText';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { setAlert } from '../../../store/actions/authActions';
import { useDispatch, useSelector } from 'react-redux';
import { fetchKRA, updateKRAMetric } from '../../../store/actions/kraActions';
import { showToast } from '../../../components/common/ToastProvider';

// ============================================================================
// CONSTANTS - Extracted for maintainability
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

const STAR_SIZE = wp('4.5%'); // Improved from 3.5% for better tappability
const STAR_PADDING = 6; // Improved from 2 for better tap area
const MIN_TAP_AREA = 48; // Accessibility standard minimum

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get performance color based on achievement percentage
 * @param {number} percentage - Achievement percentage (0-200)
 * @returns {object} - Colors object with bg and text
 */
const getPerformanceColor = percentage => {
  if (percentage >= PERFORMANCE_THRESHOLDS.EXCELLENT) {
    return PERFORMANCE_COLORS.EXCELLENT;
  }
  if (percentage >= PERFORMANCE_THRESHOLDS.GOOD) {
    return PERFORMANCE_COLORS.GOOD;
  }
  if (percentage >= PERFORMANCE_THRESHOLDS.FAIR) {
    return PERFORMANCE_COLORS.FAIR;
  }
  if (percentage >= PERFORMANCE_THRESHOLDS.NEEDS_IMPROVEMENT) {
    return PERFORMANCE_COLORS.NEEDS_IMPROVEMENT;
  }
  return PERFORMANCE_COLORS.POOR;
};

/**
 * Get performance bar color based on achievement percentage
 * @param {number} percentage - Achievement percentage
 * @returns {string} - Color hex code
 */
const getPerformanceBarColor = percentage => {
  return getPerformanceColor(percentage).bar;
};

/**
 * Calculate achievement percentage based on achieved vs target
 * Caps at 200% to show over-achievement
 * @param {number} achieved - Achieved value
 * @param {number} target - Target value
 * @returns {number} - Achievement percentage (0-200)
 */
const calculateAchievement = (achieved, target) => {
  if (!target || target === 0) return 0;
  return Math.min(Math.round((achieved / target) * 100), 200);
};

/**
 * Convert 0-100 score to star rating (0-5)
 * @param {number} score - Score value (0-100)
 * @returns {number} - Star rating (0-5)
 */
const scoreToStars = score => Math.round(score / 20);

/**
 * Get recommendation message based on performance
 * @param {number} avgAchievement - Average achievement percentage
 * @param {number} completedKras - Number of completed KRAs
 * @param {number} totalKras - Total KRAs
 * @param {number} pendingKras - Pending KRAs
 * @returns {object} - Recommendation object with icon, title, message, color
 */
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
      bgSuffix: '10',
      borderSuffix: '30',
      colorKey: 'success',
    };
  }

  if (avgAchievement >= 70) {
    return {
      type: 'GOOD',
      icon: TrendingUp,
      title: 'Good Progress! 📈',
      message: `You're on the right track with ${avgAchievement}% achievement. Focus on completing the remaining ${pendingKras} KRA(s) to reach excellence.`,
      bgSuffix: '10',
      borderSuffix: '30',
      colorKey: 'info',
    };
  }

  if (avgAchievement < 70) {
    return {
      type: 'IMPROVEMENT',
      icon: AlertCircle,
      title: 'Need Improvement 📊',
      message: `Your achievement rate is ${avgAchievement}%. Consider discussing with your manager for guidance and create an action plan to improve performance.`,
      bgSuffix: '10',
      borderSuffix: '30',
      colorKey: 'warning',
    };
  }

  return {
    type: 'FOCUS',
    icon: Target,
    title: 'Focus Areas 🎯',
    message: `${pendingKras} KRA(s) are pending completion. Prioritize these to improve your overall score and achieve your targets.`,
    bgSuffix: '10',
    borderSuffix: '30',
    colorKey: 'primary',
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const KRA = ({ navigation }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = theme.colors;
  const dispatch = useDispatch();

  const { kraList, loading, error } = useSelector(state => state.kra);
  const { profile } = useSelector(state => state.employeeProfile);

  const [kraData, setKraData] = useState(null);
  const [expandedKRAs, setExpandedKRAs] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [updatingMetrics, setUpdatingMetrics] = useState(new Set());

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
      if (result.success && result.data) {
        setKraData(result.data);

        // Initialize expanded state for all KRAs
        const expandedState = {};
        if (result.data.kras) {
          result.data.kras.forEach(kra => {
            expandedState[kra._id] = true; // Expanded by default
          });
        }
        setExpandedKRAs(expandedState);
      } else {
        showToast(result.error || 'Failed to load KRA data', 'error');
      }
    } catch (err) {
      showToast('Error loading KRA data', 'error');
      console.error('KRA Load Error:', err);
    }
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
  }, [dispatch]);

  // =========================================================================
  // METRIC UPDATES (COMMENTED - Waiting for API)
  // =========================================================================

  /**
   * TODO: Star rating update functionality
   *
   * STATUS: PENDING API IMPLEMENTATION
   *
   * Requirements:
   * - Backend API endpoint: PUT /api/kra/:kraId/metric/:metricId
   * - Expected payload: { achievedValue: number (0-100) }
   * - Expected response: { success: boolean, updatedMetric: object }
   *
   * Implementation notes:
   * - Star rating is currently READ-ONLY (disabled)
   * - Users can see their current rating but cannot change it
   * - Visual feedback will be added once API is ready
   * - Loading state will show spinner during API call
   * - Optimistic updates should be implemented
   *
   * To enable when API is ready:
   * 1. Uncomment handleMetricUpdate function below
   * 2. Change renderStars to pass onPress handler
   * 3. Add loading state management
   * 4. Add success/error feedback
   */

  /*
  const handleMetricUpdate = async (kraId, metricId, achievedValue) => {
    setUpdatingMetrics(prev => new Set(prev).add(`${kraId}-${metricId}`));

    try {
      const result = await dispatch(updateKRAMetric(kraId, metricId, achievedValue));
      if (result.success) {
        showToast('Metric updated successfully!', 'success');
        await loadKRA(); // Reload to get updated data
      } else {
        showToast(result.error || 'Failed to update metric', 'error');
      }
    } catch (err) {
      showToast('Error updating metric', 'error');
      console.error('Metric Update Error:', err);
    } finally {
      setUpdatingMetrics(prev => {
        const updated = new Set(prev);
        updated.delete(`${kraId}-${metricId}`);
        return updated;
      });
    }
  };
  */

  // =========================================================================
  // UI HANDLERS
  // =========================================================================

  const toggleKRAExpanded = useCallback(kraId => {
    setExpandedKRAs(prev => ({
      ...prev,
      [kraId]: !prev[kraId],
    }));
  }, []);

  // =========================================================================
  // MEMOIZED COMPUTATIONS
  // =========================================================================

  // Memoize achievement calculations to avoid recalculating on every render
  const memoizedKRAs = useMemo(() => {
    if (!kraData?.kras) return [];

    return kraData.kras.map(kra => {
      const totalAchieved =
        kra.metrics?.reduce((sum, m) => sum + (m.achieved || 0), 0) || 0;
      const totalTarget =
        kra.metrics?.reduce((sum, m) => sum + (m.target || 0), 0) || 0;
      const achievement = calculateAchievement(totalAchieved, totalTarget);

      return {
        ...kra,
        achievement,
        metricsWithAchievement: (kra.metrics || []).map(metric => ({
          ...metric,
          achievement: calculateAchievement(
            metric.achieved || 0,
            metric.target || 0,
          ),
          isCompleted: (metric.achieved || 0) >= (metric.target || 0),
        })),
      };
    });
  }, [kraData?.kras]);

  // Memoize summary data
  const memoizedSummary = useMemo(() => {
    return (
      kraData?.summary || {
        overallRating: 0,
        completedKras: 0,
        totalKras: 0,
        avgAchievement: 0,
        excellenceScore: '0/0',
        pendingKras: 0,
      }
    );
  }, [kraData?.summary]);

  const userProfile = useMemo(() => profile?.[0] || {}, [profile]);

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================

  /**
   * Render star rating component
   * Currently READ-ONLY (no click handler)
   * @param {number} rating - Rating score (0-100)
   * @param {boolean} editable - Whether stars are editable (currently always false)
   * @param {string} kraId - KRA ID (for API call when ready)
   * @param {string} metricId - Metric ID (for API call when ready)
   */
  const renderStars = (
    rating,
    editable = false,
    kraId = null,
    metricId = null,
  ) => {
    const starCount = scoreToStars(rating);

    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <View
            key={star}
            style={[
              styles.starButton,
              {
                // Increase tap area for better accessibility
                minHeight: MIN_TAP_AREA,
                minWidth: MIN_TAP_AREA,
              },
            ]}
          >
            <Star
              size={STAR_SIZE}
              color={star <= starCount ? '#FBBF24' : '#6B7280'}
              fill={star <= starCount ? '#FBBF24' : 'transparent'}
            />
            {/* 
              TODO: Uncomment when API is ready
              <TouchableOpacity
                onPress={() => {
                  if (editable && kraId && metricId && !updatingMetrics.has(`${kraId}-${metricId}`)) {
                    handleMetricUpdate(kraId, metricId, star * 20);
                  }
                }}
                disabled={!editable || updatingMetrics.has(`${kraId}-${metricId}`)}
                style={StyleSheet.absoluteFill}
              />
              {updatingMetrics.has(`${kraId}-${metricId}`) && (
                <ActivityIndicator size="small" color={C.primary} />
              )}
            */}
          </View>
        ))}
      </View>
    );
  };

  // =========================================================================
  // RENDER SECTIONS
  // =========================================================================

  if (loading && !kraData) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: C.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color={C.primary} />
        <Text
          style={[
            styles.loadingText,
            { color: C.textSecondary, marginTop: hp('2%') },
          ]}
        >
          Loading KRA data...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: C.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <AlertCircle size={wp('10%')} color={C.error} />
        <Text
          style={[
            styles.errorText,
            {
              color: C.error,
              marginTop: hp('2%'),
              textAlign: 'center',
              paddingHorizontal: wp('5%'),
            },
          ]}
        >
          {error}
        </Text>
        <TouchableOpacity
          style={[
            styles.retryBtn,
            { backgroundColor: C.primary, marginTop: hp('2%') },
          ]}
          onPress={loadKRA}
        >
          <Text style={[styles.retryBtnText, { color: '#fff' }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!memoizedKRAs || memoizedKRAs.length === 0) {
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
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
              KRA Management
            </Text>
            <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>
              Key Result Areas
            </Text>
          </View>
          {/* <TouchableOpacity
            style={[
              styles.downloadBtn,
              { backgroundColor: C.surface, borderColor: C.border },
            ]}
          >
            <Download size={wp('4%')} color={C.textSecondary} />
          </TouchableOpacity> */}
          <View style={styles.downloadBtn}/>
        </View>

        <View
          style={[
            styles.emptyContainer,
            { justifyContent: 'center', alignItems: 'center', flex: 1 },
          ]}
        >
          <BarChart3 size={wp('15%')} color={C.disabled} />
          <Text
            style={[
              styles.emptyTitle,
              { color: C.textPrimary, marginTop: hp('2%') },
            ]}
          >
            No KRA Data Available
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              {
                color: C.textSecondary,
                textAlign: 'center',
                marginTop: hp('1%'),
                marginHorizontal: wp('8%'),
              },
            ]}
          >
            Your KRA metrics haven't been assigned yet.{'\n'}Please contact your
            manager.
          </Text>
        </View>
      </View>
    );
  }

  const summary = memoizedSummary;

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
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
            KRA Management
          </Text>
          <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>
            Key Result Areas
          </Text>
        </View>
        {/* <TouchableOpacity
          style={[
            styles.downloadBtn,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
          onPress={() =>
            showToast('Export report feature coming soon', 'info')
          }
        >
          <Download size={wp('4%')} color={C.textSecondary} />
        </TouchableOpacity> */}
        <View style={styles.downloadBtn}/>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
      >
        {/* Employee Overview Card */}
        <View
          style={[
            styles.overviewCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <View style={styles.overviewHeader}>
            <View>
              <Text style={[styles.employeeName, { color: C.textPrimary }]}>
                {userProfile.fullName || 'Employee'}
              </Text>
              <Text style={[styles.employeeRole, { color: C.textSecondary }]}>
                {userProfile.designation || 'Position'} •{' '}
                {userProfile.department || 'Department'}
              </Text>
            </View>
            <View style={styles.ratingContainer}>
              <Text style={[styles.ratingLabel, { color: C.textSecondary }]}>
                Overall Rating
              </Text>
              <View style={styles.ratingValueContainer}>
                <Text style={[styles.overallRating, { color: C.textPrimary }]}>
                  {summary.overallRating || '0'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: C.primary + '15',
                  borderColor: C.primary + '40',
                },
              ]}
            >
              <Target size={wp('5%')} color={C.primary} />
              <Text style={[styles.statValue, { color: C.textPrimary }]}>
                {summary.completedKras}/{summary.totalKras}
              </Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>
                KRAs Completed
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: C.success + '15',
                  borderColor: C.success + '40',
                },
              ]}
            >
              <TrendingUp size={wp('5%')} color={C.success} />
              <Text style={[styles.statValue, { color: C.textPrimary }]}>
                {summary.avgAchievement}%
              </Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>
                Avg Achievement
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: C.warning + '15',
                  borderColor: C.warning + '40',
                },
              ]}
            >
              <Award size={wp('5%')} color={C.warning} />
              <Text style={[styles.statValue, { color: C.textPrimary }]}>
                {summary.excellenceScore || '0/0'}
              </Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>
                Excellence Score
              </Text>
            </View>
          </View>
        </View>

        {/* KRA Sections */}
        {memoizedKRAs.map(kra => {
          const isExpanded = expandedKRAs[kra._id];
          const kraAchievement = kra.achievement || 0;
          const performanceColor = getPerformanceColor(kraAchievement);

          return (
            <View
              key={kra._id}
              style={[
                styles.kraSection,
                { backgroundColor: C.surface, borderColor: C.border },
              ]}
            >
              <TouchableOpacity
                style={styles.kraHeaderMain}
                onPress={() => toggleKRAExpanded(kra._id)}
                activeOpacity={0.7}
              >
                <View style={styles.kraTitleSection}>
                  <View
                    style={[
                      styles.kraIcon,
                      { backgroundColor: C.primary + '20' },
                    ]}
                  >
                    <BarChart3 size={wp('4%')} color={C.primary} />
                  </View>
                  <View style={styles.kraInfo}>
                    <Text style={[styles.kraTitle, { color: C.textPrimary }]}>
                      {kra.title}
                    </Text>
                    <Text
                      style={[styles.kraPeriod, { color: C.textSecondary }]}
                    >
                      {kra.period}
                    </Text>
                  </View>
                </View>
                <View style={styles.kraScoreSection}>
                  <View
                    style={[
                      styles.kraScoreBadge,
                      { backgroundColor: performanceColor.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.kraScoreText,
                        { color: performanceColor.text },
                      ]}
                    >
                      {kraAchievement}%
                    </Text>
                  </View>
                  <View style={styles.expandIcon}>
                    {isExpanded ? (
                      <ChevronUp size={wp('4%')} color={C.textSecondary} />
                    ) : (
                      <ChevronDown size={wp('4%')} color={C.textSecondary} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {isExpanded &&
                kra.metricsWithAchievement &&
                kra.metricsWithAchievement.length > 0 && (
                  <View style={styles.metricsContainer}>
                    <Text
                      style={[
                        styles.descriptionText,
                        { color: C.textSecondary },
                      ]}
                    >
                      {kra.description}
                    </Text>

                    {kra.metricsWithAchievement.map(metric => {
                      const metricPerformanceColor = getPerformanceColor(
                        metric.achievement,
                      );

                      return (
                        <View
                          key={metric._id}
                          style={[
                            styles.metricItem,
                            {
                              backgroundColor: C.background,
                              borderColor: C.border,
                            },
                          ]}
                        >
                          <View style={styles.metricHeader}>
                            <View style={styles.metricTitleContainer}>
                              <View style={styles.metricCategoryBadge}>
                                <Text
                                  style={[
                                    styles.metricCategory,
                                    { color: C.primary },
                                  ]}
                                >
                                  {metric.category}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.metricName,
                                  { color: C.textPrimary },
                                ]}
                              >
                                {metric.name}
                              </Text>
                            </View>
                            <View style={styles.metricRating}>
                              <Text
                                style={[
                                  styles.ratingLabelSmall,
                                  { color: C.textSecondary },
                                ]}
                              >
                                Self Rating
                              </Text>
                             
                            </View>
                          </View>

                          <View style={styles.metricMetrics}>
                            <View style={styles.metricItemBox}>
                              <Text
                                style={[
                                  styles.metricLabel,
                                  { color: C.textSecondary },
                                ]}
                              >
                                Target
                              </Text>
                              <Text
                                style={[
                                  styles.metricValue,
                                  { color: C.primary },
                                ]}
                              >
                                {metric.target?.toLocaleString() || 0}
                              </Text>
                            </View>
                            <View style={styles.metricItemBox}>
                              <Text
                                style={[
                                  styles.metricLabel,
                                  { color: C.textSecondary },
                                ]}
                              >
                                Achieved
                              </Text>
                              <Text
                                style={[
                                  styles.metricValue,
                                  {
                                    color: metric.isCompleted
                                      ? C.success
                                      : C.textPrimary,
                                  },
                                ]}
                              >
                                {metric.achieved?.toLocaleString() || 0}
                              </Text>
                            </View>
                            <View style={styles.metricItemBox}>
                              <Text
                                style={[
                                  styles.metricLabel,
                                  { color: C.textSecondary },
                                ]}
                              >
                                Weightage
                              </Text>
                              <Text
                                style={[
                                  styles.metricValue,
                                  { color: C.textPrimary },
                                ]}
                              >
                                {metric.weightage || 0}%
                              </Text>
                            </View>
                            <View style={styles.metricItemBox}>
                              <Text
                                style={[
                                  styles.metricLabel,
                                  { color: C.textSecondary },
                                ]}
                              >
                                Achievement
                              </Text>
                              <Text
                                style={[
                                  styles.metricValue,
                                  { color: metricPerformanceColor.text },
                                ]}
                              >
                                {metric.achievement}%
                              </Text>
                            </View>
                          </View>

                          {/* Progress Bar */}
                          <View style={styles.progressBarContainer}>
                            <View
                              style={[
                                styles.progressBar,
                                {
                                  width: `${Math.min(
                                    metric.achievement,
                                    100,
                                  )}%`,
                                  backgroundColor: getPerformanceBarColor(
                                    metric.achievement,
                                  ),
                                },
                              ]}
                            />
                          </View>

                          {metric.status === 'pending' && (
                            <View
                              style={[
                                styles.pendingBadge,
                                { backgroundColor: C.warning + '20' },
                              ]}
                            >
                              <Clock size={wp('2.5%')} color={C.warning} />
                              <Text
                                style={[
                                  styles.pendingText,
                                  { color: C.warning },
                                ]}
                              >
                                Pending Review
                              </Text>
                            </View>
                          )}

                          {metric.isCompleted && (
                            <View
                              style={[
                                styles.completedBadge,
                                { backgroundColor: C.success + '20' },
                              ]}
                            >
                              <Award size={wp('2.5%')} color={C.success} />
                              <Text
                                style={[
                                  styles.completedText,
                                  { color: C.success },
                                ]}
                              >
                                Target Achieved! 🎉
                              </Text>
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
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <Text style={[styles.summaryTitle, { color: C.textPrimary }]}>
            Performance Summary
          </Text>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: C.primary }]}>
                {summary.avgAchievement}%
              </Text>
              <Text
                style={[styles.summaryStatLabel, { color: C.textSecondary }]}
              >
                Average Achievement
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: C.warning }]}>
                {summary.completedKras}/{summary.totalKras}
              </Text>
              <Text
                style={[styles.summaryStatLabel, { color: C.textSecondary }]}
              >
                KRAs Completed
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: C.success }]}>
                {summary.pendingKras}
              </Text>
              <Text
                style={[styles.summaryStatLabel, { color: C.textSecondary }]}
              >
                Pending KRAs
              </Text>
            </View>
          </View>
        </View>

        {/* Recommendations based on performance */}
        <View
          style={[
            styles.recommendationsCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <Text style={[styles.summaryTitle, { color: C.textPrimary }]}>
            Recommendations
          </Text>

          {/* Render appropriate recommendation based on performance */}
          {(() => {
            const recommendation = getRecommendation(
              summary.avgAchievement,
              summary.completedKras,
              summary.totalKras,
              summary.pendingKras,
            );

            const RecommendationIcon = recommendation.icon;

            return (
              <View
                style={[
                  styles.recommendationItem,
                  {
                    backgroundColor:
                      C[recommendation.colorKey] + recommendation.bgSuffix,
                    borderColor:
                      C[recommendation.colorKey] + recommendation.borderSuffix,
                  },
                ]}
              >
                <RecommendationIcon
                  size={wp('4%')}
                  color={C[recommendation.colorKey]}
                />
                <View style={styles.recommendationContent}>
                  <Text
                    style={[
                      styles.recommendationTitle,
                      { color: C.textPrimary },
                    ]}
                  >
                    {recommendation.title}
                  </Text>
                  <Text
                    style={[
                      styles.recommendationDesc,
                      { color: C.textSecondary },
                    ]}
                  >
                    {recommendation.message}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* Additional focus areas recommendation if there are pending KRAs */}
          {summary.completedKras < summary.totalKras && (
            <View
              style={[
                styles.recommendationItem,
                {
                  backgroundColor: C.primary + '10',
                  borderColor: C.primary + '30',
                  marginTop: hp('1%'),
                },
              ]}
            >
              <Target size={wp('4%')} color={C.primary} />
              <View style={styles.recommendationContent}>
                <Text
                  style={[styles.recommendationTitle, { color: C.textPrimary }]}
                >
                  Focus Areas 🎯
                </Text>
                <Text
                  style={[
                    styles.recommendationDesc,
                    { color: C.textSecondary },
                  ]}
                >
                  {summary.pendingKras} KRA(s) are pending completion.
                  Prioritize these to improve your overall score and achieve
                  your targets.
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: hp('4%') }} />
      </ScrollView>
    </View>
  );
};

// ============================================================================
// STYLESHEET
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp('3%'),
  },
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: wp('2%'),
  },
  headerTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
  },
  headerSubtitle: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: 2,
  },
  downloadBtn: {
    width: wp('9%'),
    height: wp('9%'),
    // borderRadius: wp('2.5%'),
    // borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewCard: {
    marginHorizontal: wp('4%'),
    marginTop: hp('2%'),
    borderRadius: wp('4%'),
    borderWidth: 1,
    padding: wp('4%'),
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp('2%'),
  },
  employeeName: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
  },
  employeeRole: {
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  ratingLabel: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.medium,
    marginBottom: 4,
  },
  ratingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1%'),
  },
  overallRating: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: STAR_PADDING,
  },
  starButton: {
    padding: STAR_PADDING,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
  },
  statCard: {
    flex: 1,
    minWidth: wp('28%'),
    padding: wp('3%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
    marginVertical: hp('0.5%'),
  },
  statLabel: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  kraSection: {
    marginHorizontal: wp('4%'),
    marginTop: hp('2%'),
    borderRadius: wp('4%'),
    borderWidth: 1,
    overflow: 'hidden',
  },
  kraHeaderMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp('4%'),
  },
  kraTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: wp('3%'),
  },
  kraIcon: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('2.5%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  kraInfo: {
    flex: 1,
  },
  kraTitle: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  kraPeriod: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.regular,
  },
  kraScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
  },
  kraScoreBadge: {
    paddingHorizontal: wp('2%'),
    paddingVertical: 3,
    borderRadius: wp('2%'),
  },
  kraScoreText: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.bold,
  },
  expandIcon: {
    padding: 2,
  },
  metricsContainer: {
    padding: wp('4%'),
    paddingTop: 0,
    gap: hp('1.5%'),
  },
  descriptionText: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.regular,
    lineHeight: hp('2.2%'),
    marginBottom: hp('1%'),
  },
  metricItem: {
    borderRadius: wp('3%'),
    borderWidth: 1,
    padding: wp('3%'),
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp('1.5%'),
  },
  metricTitleContainer: {
    flex: 1,
    marginRight: wp('2%'),
  },
  metricCategoryBadge: {
    backgroundColor: '#3B82F620',
    paddingHorizontal: wp('2%'),
    paddingVertical: 2,
    borderRadius: wp('1.5%'),
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  metricCategory: {
    fontSize: wp('2.2%'),
    fontFamily: Fonts.bold,
  },
  metricName: {
    fontSize: wp('3%'),
    fontFamily: Fonts.medium,
  },
  metricRating: {
    alignItems: 'flex-end',
  },
  ratingLabelSmall: {
    fontSize: wp('2%'),
    fontFamily: Fonts.medium,
    marginBottom: 2,
  },
  metricMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('3%'),
    marginBottom: hp('1.5%'),
  },
  metricItemBox: {
    flex: 1,
    minWidth: wp('20%'),
  },
  metricLabel: {
    fontSize: wp('2.2%'),
    fontFamily: Fonts.regular,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.bold,
  },
  progressBarContainer: {
    height: hp('0.8%'),
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: wp('1%'),
    overflow: 'hidden',
    marginBottom: hp('1%'),
  },
  progressBar: {
    height: '100%',
    borderRadius: wp('1%'),
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: wp('2%'),
    paddingVertical: 2,
    borderRadius: wp('2%'),
  },
  pendingText: {
    fontSize: wp('2.2%'),
    fontFamily: Fonts.medium,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: wp('2%'),
    paddingVertical: 2,
    borderRadius: wp('2%'),
  },
  completedText: {
    fontSize: wp('2.2%'),
    fontFamily: Fonts.medium,
  },
  summaryCard: {
    marginHorizontal: wp('4%'),
    marginTop: hp('2%'),
    borderRadius: wp('4%'),
    borderWidth: 1,
    padding: wp('4%'),
  },
  summaryTitle: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.bold,
    marginBottom: hp('2%'),
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatValue: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: wp('2.5%'),
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: hp('3%'),
    backgroundColor: '#E5E7EB',
  },
  recommendationsCard: {
    marginHorizontal: wp('4%'),
    marginTop: hp('2%'),
    marginBottom: hp('2%'),
    borderRadius: wp('4%'),
    borderWidth: 1,
    padding: wp('4%'),
  },
  recommendationItem: {
    flexDirection: 'row',
    padding: wp('3%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    gap: wp('2%'),
    marginBottom: hp('1%'),
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  recommendationDesc: {
    fontSize: wp('2.4%'),
    fontFamily: Fonts.regular,
    lineHeight: hp('2%'),
  },
  loadingText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
  },
  errorText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.medium,
  },
  retryBtn: {
    paddingHorizontal: wp('6%'),
    paddingVertical: hp('1.2%'),
    borderRadius: wp('3%'),
  },
  retryBtnText: {
    fontSize: wp('3.5%'),
    fontFamily: Fonts.bold,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: wp('8%'),
  },
  emptyTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
  },
  emptySubtitle: {
    fontSize: wp('3.2%'),
    fontFamily: Fonts.regular,
    lineHeight: hp('2.5%'),
  },
});

export default KRA;

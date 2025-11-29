import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { healthAPI, foodAPI } from '../services/api';
import { colors, spacing, borderRadius } from '../constants/theme';
import { EmotionShowcase, EmotionKey } from '../components/EmotionShowcase';
import { checkAndScheduleReminders } from '../services/notifications';

type WeeklyDay = {
  dayName?: string;
  energyScore?: number | null;
  sleepHours?: string | null;
};

type WeeklyData = {
  weekData?: WeeklyDay[];
  patterns?: { description: string }[];
  dataPoints?: number;
  bestDay?: { day: string; energy: number };
  worstDay?: { day: string; energy: number };
  avgEnergy?: number;
};

type EnergyState = {
  key: EmotionKey;
  label: string;
  note: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: string[];
  labelColor: string;
};

export default function OverviewScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [healthData, setHealthData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [foodLogs, setFoodLogs] = useState<any[]>([]);
  const [foodTotals, setFoodTotals] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [energyModalVisible, setEnergyModalVisible] = useState(false);
  const [sleepModalVisible, setSleepModalVisible] = useState(false);
  const [pendingEnergy, setPendingEnergy] = useState<number>(5);
  const [pendingSleep, setPendingSleep] = useState<number>(7);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [lastSeenNotificationCount, setLastSeenNotificationCount] = useState(0);

  const hydrationTarget = 8;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [today, weekly, food] = await Promise.all([
        healthAPI.getToday(),
        healthAPI.getWeekly(),
        foodAPI.getLogs().catch(() => ({ foodLogs: [], totals: null })),
      ]);
      setHealthData(today);
      setWeeklyData(weekly);
      setFoodLogs(food.foodLogs || []);
      setFoodTotals(food.totals || null);
      // Load any existing AI insights from today's data
      if (today?.analyzedSymptoms?.length > 0) {
        setAiInsights(today.analyzedSymptoms);
      } else if (today?.insights?.length > 0) {
        setAiInsights(today.insights);
      }
      
      // Check and schedule smart reminders based on current health data
      checkAndScheduleReminders({
        hydrationGlasses: today?.hydrationGlasses || 0,
        sleepHours: today?.sleepHours,
        energyScore: today?.energyScore,
        caloriesConsumed: today?.caloriesConsumed || food?.totals?.calories || 0,
      }).catch(err => console.log('Reminder check error:', err));
      
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Only mark unread when new notifications arrive beyond what has been viewed
    const currentCount = aiInsights?.length || 0;
    if (currentCount > lastSeenNotificationCount) {
      setHasUnreadNotifications(true);
    }
  }, [aiInsights, lastSeenNotificationCount]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleQuickLog = async (type: string, value: any) => {
    try {
      await healthAPI.logMetric({ [type]: value });
      await loadData();
      await runAnalysis();
    } catch (error) {
      console.error('Failed to log metric:', error);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      const result = await healthAPI.analyzeSymptoms();
      // Store the AI insights from the response
      if (result?.insights) {
        setAiInsights(result.insights);
      } else if (result?.analyzedSymptoms) {
        setAiInsights(result.analyzedSymptoms);
      } else if (Array.isArray(result)) {
        setAiInsights(result);
      }
      await loadData();
    } catch (error) {
      console.error('Failed to analyze symptoms:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

const getEnergyState = (score: number | null): EnergyState => {
  if (score === null || score === undefined) {
      return {
        key: 'mindfull_chill',
        label: 'No data yet',
        note: 'Log your energy to see insights.',
        icon: 'help-circle-outline',
        gradient: ['#e2e8f0', '#cbd5e1'],
        labelColor: colors.textLight,
      };
    }
    if (score <= 4) {
      return {
        key: 'tired_low',
        label: 'Rest mode',
        note: 'Energy is low — take it easy today.',
        icon: 'cloudy-outline',
        gradient: ['#fee2e2', '#f87171'],
        labelColor: colors.error,
      };
    }
    if (score >= 7) {
      return {
        key: 'productive',
        label: 'Bright & focused',
        note: 'Momentum feels strong — ride the wave.',
        icon: 'sunny',
        gradient: ['#bae6fd', '#38bdf8'],
        labelColor: colors.success,
      };
    }
    return {
      key: 'mindfull_chill',
      label: 'Steady & calm',
      note: 'Balanced pace with gentle focus.',
      icon: 'leaf-outline',
      gradient: ['#dcfce7', '#34d399'],
      labelColor: colors.warning,
    };
  };

  const getEnergyEmoji = (score: number | null) => {
    if (score === null) return '🙂';
    if (score >= 7) return '😄';
    if (score >= 5) return '🙂';
    return '😓';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your wellness data...</Text>
      </View>
    );
  }

  const energyScore: number | null = healthData?.energyScore ?? null;
  const analyzedSymptoms = aiInsights.length > 0 ? aiInsights : (healthData?.analyzedSymptoms || []);
  const hydrationGlasses = healthData?.hydrationGlasses || 0;
  const energyState = getEnergyState(energyScore);
  const weeklyDays = weeklyData?.weekData || [];
  const notificationCount = aiInsights?.length || 0;
  const hasNotifications = notificationCount > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.background, '#ffffff']} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.greetingSmall}>{getGreeting()}</Text>
                <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'there'}</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={styles.notificationButton}
                  activeOpacity={0.85}
                  onPress={() => {
                    setNotificationModalVisible(true);
                    setHasUnreadNotifications(false);
                    setLastSeenNotificationCount(notificationCount);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="View notifications"
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Ionicons name="notifications-outline" size={20} color={colors.text} />
                  {hasNotifications && hasUnreadNotifications && <View style={styles.notificationBadge} />}
                </TouchableOpacity>
                <View style={styles.dateContainer}>
                  <Text style={styles.dateDay}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                  </Text>
                  <Text style={styles.dateNumber}>{new Date().getDate()}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.headerTagline}>Your daily wellness overview</Text>
          </View>

          <View style={styles.energyCard}>
            {/* Header */}
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.energyCardTitle}>Energy</Text>
                <Text style={styles.energyCardSubtitle}>{energyState.label}</Text>
              </View>
              <TouchableOpacity
                style={styles.energyUpdateButton}
                onPress={() => {
                  setPendingEnergy(energyScore ?? 5);
                  setEnergyModalVisible(true);
                }}
              >
                <Text style={styles.energyUpdateText}>Update</Text>
              </TouchableOpacity>
            </View>
            
            {/* Main content with emoji on left */}
            <View style={styles.energyMainRow}>
              {/* Emoji on left */}
              <Text style={styles.energyFaceEmoji}>{getEnergyEmoji(energyScore)}</Text>
              
              {/* Score, bar, note on right */}
              <View style={styles.energyDetailsColumn}>
                <View style={styles.energyScoreRow}>
                  <Text style={styles.energyScoreBig}>
                    {energyScore !== null ? energyScore : '--'}
                  </Text>
                  <Text style={styles.energyScoreMax}>/ 10</Text>
                </View>
                
                <View style={styles.energyTrackWhite}>
                  <View 
                    style={[
                      styles.energyTrackFillWhite,
                      { width: `${(Math.min(10, Math.max(0, energyScore || 0)) / 10) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.energyNoteWhite}>{energyState.note}</Text>
              </View>
            </View>

            {energyScore === null && (
              <View style={styles.quickActionsWhite}>
                <TouchableOpacity
                  style={styles.quickActionWhite}
                  onPress={() => handleQuickLog('energyScore', 6)}
                >
                  <Ionicons name="flash" size={16} color="#f59e0b" />
                  <Text style={styles.quickActionTextDark}>Log Energy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionWhite}
                  onPress={() => handleQuickLog('sleepHours', '7.0')}
                >
                  <Ionicons name="moon" size={16} color="#6366f1" />
                  <Text style={styles.quickActionTextDark}>Log Sleep</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Today's Food Log - Premium Card */}
          <LinearGradient
            colors={['#fef3c7', '#ffedd5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.foodCard}
          >
            {/* Big plate emoji on right */}
            <View style={styles.foodEmojiContainer}>
              <Text style={styles.foodBigEmoji}>🍽️</Text>
            </View>
            {/* Content */}
            <View style={styles.foodContent}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.foodCardTitle}>Today's Food</Text>
                <TouchableOpacity 
                  style={styles.foodAddButton}
                  onPress={() => navigation.navigate('Food')}
                >
                  <Ionicons name="add" size={14} color="#c2410c" />
                  <Text style={styles.foodAddText}>Add</Text>
                </TouchableOpacity>
              </View>
              
              {/* Calorie Goal Tracker */}
              {(() => {
                const calorieGoal = healthData?.calorieGoal || 2000;
                const consumed = foodTotals?.calories || 0;
                const remaining = calorieGoal - consumed;
                const progress = Math.min((consumed / calorieGoal) * 100, 100);
                const isOverBudget = remaining < 0;
                
                return (
                  <View style={styles.foodCalorieSection}>
                    <Text style={styles.foodCalorieMain}>
                      {isOverBudget ? (
                        <Text style={styles.foodCalorieOver}>{Math.abs(remaining)} over</Text>
                      ) : (
                        <>{remaining} cal left</>
                      )}
                    </Text>
                    <Text style={styles.foodCalorieGoal}>{consumed} / {calorieGoal}</Text>
                    <View style={styles.foodProgressBg}>
                      <View 
                        style={[
                          styles.foodProgressFill, 
                          { 
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: isOverBudget ? '#ef4444' : '#ea580c'
                          }
                        ]} 
                      />
                    </View>
                  </View>
                );
              })()}

              {foodLogs.length > 0 ? (
                <>
                  <View style={styles.foodMacrosRow}>
                    <View style={styles.foodMacroItem}>
                      <Text style={styles.foodMacroValue}>{foodTotals?.protein || 0}g</Text>
                      <Text style={styles.foodMacroLabel}>protein</Text>
                    </View>
                    <View style={styles.foodMacroItem}>
                      <Text style={styles.foodMacroValue}>{foodTotals?.carbs || 0}g</Text>
                      <Text style={styles.foodMacroLabel}>carbs</Text>
                    </View>
                    <View style={styles.foodMacroItem}>
                      <Text style={styles.foodMacroValue}>{foodTotals?.fat || 0}g</Text>
                      <Text style={styles.foodMacroLabel}>fat</Text>
                    </View>
                  </View>
                  {/* Last 3 food items */}
                  <View style={styles.foodItemsList}>
                    {foodLogs.slice(0, 3).map((log: any) => (
                      <View key={log.id} style={styles.foodItemRow}>
                        <View style={styles.foodItemIcon}>
                          <Ionicons 
                            name={
                              log.mealType === 'BREAKFAST' ? 'sunny-outline' :
                              log.mealType === 'LUNCH' ? 'restaurant-outline' :
                              log.mealType === 'DINNER' ? 'moon-outline' : 'cafe-outline'
                            } 
                            size={18} 
                            color="#ffffff" 
                          />
                        </View>
                        <View style={styles.foodItemDetails}>
                          <Text style={styles.foodItemName} numberOfLines={1}>
                            {log.description || 'Food'}
                          </Text>
                          <Text style={styles.foodItemMeta}>
                            {log.calories} cal  •  {log.mealType?.toLowerCase()}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  {foodLogs.length > 3 && (
                    <TouchableOpacity onPress={() => navigation.navigate('Food')}>
                      <Text style={styles.foodViewAll}>
                        +{foodLogs.length - 3} more items →
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.foodEmptyState}>
                  <Text style={styles.foodEmptyText}>No food logged yet</Text>
                  <TouchableOpacity 
                    style={styles.foodScanButton}
                    onPress={() => navigation.navigate('Food')}
                  >
                    <Ionicons name="camera" size={16} color="#c2410c" />
                    <Text style={styles.foodScanText}>Scan Food</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </LinearGradient>

            {/* Sleep & Weekly Patterns Row */}
            <View style={styles.cardGrid}>
              <View style={styles.sleepCard}>
                {/* Stars decoration */}
                <View style={styles.sleepStars}>
                  <Text style={styles.star1}>✦</Text>
                  <Text style={styles.star2}>✧</Text>
                  <Text style={styles.star3}>✦</Text>
                  <Text style={styles.star4}>✧</Text>
                  <Text style={styles.star5}>✦</Text>
                </View>
                {/* Big moon emoji - half visible */}
                <View style={styles.sleepMoonContainer}>
                  <Text style={styles.sleepMoonEmoji}>🌙</Text>
                </View>
                {/* Content */}
                <View style={styles.sleepContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.sleepCardTitle}>Sleep</Text>
                    <TouchableOpacity
                      style={styles.sleepUpdateButton}
                      onPress={() => {
                        const currentSleep = healthData?.sleepHours ? parseFloat(healthData.sleepHours) : 7;
                        setPendingSleep(Number.isNaN(currentSleep) ? 7 : currentSleep);
                        setSleepModalVisible(true);
                      }}
                    >
                      <Text style={styles.sleepUpdateText}>Update</Text>
                    </TouchableOpacity>
                  </View>
                  {healthData?.sleepHours ? (
                    <>
                      <Text style={styles.sleepValue}>{healthData.sleepHours} hrs</Text>
                      <Text style={styles.sleepStatus}>
                        {parseFloat(healthData.sleepHours) >= 7 ? '✓ Great sleep' : 'Need more rest'}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.sleepValue}>--</Text>
                      <Text style={styles.sleepStatus}>Not logged</Text>
                    </>
                  )}
                </View>
              </View>

              <View style={styles.weekCard}>
                {/* Decorations */}
                <View style={styles.weekDecorations}>
                  <Text style={styles.weekDeco1}>✦</Text>
                  <Text style={styles.weekDeco2}>✧</Text>
                  <Text style={styles.weekDeco3}>✦</Text>
                </View>
                {/* Big calendar emoji */}
                <View style={styles.weekEmojiContainer}>
                  <Text style={styles.weekBigEmoji}>📅</Text>
                </View>
                {/* Content */}
                <View style={styles.weekContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.weekCardTitle}>This Week</Text>
                    <Text style={styles.weekDaysLabel}>{weeklyData?.dataPoints || 0} days</Text>
                  </View>
                  {weeklyData?.avgEnergy ? (
                    <>
                      <Text style={styles.weekAvgValue}>{weeklyData.avgEnergy.toFixed(1)}</Text>
                      <Text style={styles.weekAvgLabel}>avg energy</Text>
                      {(weeklyData?.bestDay || weeklyData?.worstDay) && (
                        <View style={styles.weekHighLow}>
                          {weeklyData?.bestDay && (
                            <Text style={styles.weekHighLowText}>
                              ↑ {weeklyData.bestDay.day}
                            </Text>
                          )}
                          {weeklyData?.worstDay && (
                            <Text style={styles.weekHighLowText}>
                              ↓ {weeklyData.worstDay.day}
                            </Text>
                          )}
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <Text style={styles.weekAvgValue}>--</Text>
                      <Text style={styles.weekAvgLabel}>No data yet</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* Hydration & Activity Row */}
            <View style={styles.cardGrid}>
              <View style={styles.hydrationCard}>
                {/* Bubbles decoration */}
                <View style={styles.hydrationDecorations}>
                  <Text style={styles.hydrationDeco1}>○</Text>
                  <Text style={styles.hydrationDeco2}>◦</Text>
                  <Text style={styles.hydrationDeco3}>○</Text>
                  <Text style={styles.hydrationDeco4}>◦</Text>
                </View>
                {/* Big water drop emoji */}
                <View style={styles.hydrationEmojiContainer}>
                  <Text style={styles.hydrationBigEmoji}>💧</Text>
                </View>
                {/* Content */}
                <View style={styles.hydrationContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.hydrationCardTitle}>Hydration</Text>
                    <TouchableOpacity
                      style={styles.hydrationAddButton}
                      onPress={() => handleQuickLog('hydrationGlasses', hydrationGlasses + 1)}
                    >
                      <Ionicons name="add" size={16} color="#0284c7" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.hydrationValue}>{hydrationGlasses} / {hydrationTarget}</Text>
                  <View style={styles.hydrationProgressBg}>
                    <View 
                      style={[
                        styles.hydrationProgressFill, 
                        { width: `${Math.min((hydrationGlasses / hydrationTarget) * 100, 100)}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.hydrationStatus}>
                    {hydrationGlasses >= hydrationTarget ? '✓ Goal reached!' : `${hydrationTarget - hydrationGlasses} more glasses`}
                  </Text>
                </View>
              </View>

              <View style={styles.activityCard}>
                {/* Motion lines decoration */}
                <View style={styles.activityDecorations}>
                  <Text style={styles.activityDeco1}>~</Text>
                  <Text style={styles.activityDeco2}>~</Text>
                  <Text style={styles.activityDeco3}>✦</Text>
                </View>
                {/* Big running emoji */}
                <View style={styles.activityEmojiContainer}>
                  <Text style={styles.activityBigEmoji}>🏃</Text>
                </View>
                {/* Content */}
                <View style={styles.activityContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.activityCardTitle}>Activity</Text>
                    {(healthData?.steps || healthData?.heartRate) && (
                      <View style={styles.activitySyncBadge}>
                        <Ionicons name="checkmark" size={12} color="#059669" />
                      </View>
                    )}
                  </View>
                  {healthData?.steps || healthData?.heartRate || healthData?.activeCalories ? (
                    <>
                      <Text style={styles.activityValue}>
                        {healthData?.steps?.toLocaleString() || '0'}
                      </Text>
                      <Text style={styles.activityLabel}>steps today</Text>
                      <View style={styles.activityStatsRow}>
                        {healthData?.heartRate && (
                          <Text style={styles.activityStatText}>❤️ {healthData.heartRate}</Text>
                        )}
                        {healthData?.activeCalories && (
                          <Text style={styles.activityStatText}>🔥 {healthData.activeCalories}</Text>
                        )}
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.activityValue}>--</Text>
                      <Text style={styles.activityLabel}>No data yet</Text>
                    </>
                  )}
                </View>
              </View>
            </View>

          {/* Unified AI Insights Card */}
          <View style={styles.fullCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.aiInsightsHeader}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>AI Insights</Text>
              </View>
              {(energyScore || healthData?.sleepHours || hydrationGlasses > 0) && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonGreen, analyzing && { opacity: 0.5 }]}
                  onPress={runAnalysis} 
                  disabled={analyzing}
                >
                  <Ionicons name={analyzing ? "sync" : "refresh"} size={14} color="#059669" />
                  {!analyzing && <Text style={[styles.actionButtonText, { color: '#059669' }]}>Refresh</Text>}
                </TouchableOpacity>
              )}
            </View>

            {/* Detected Symptoms Section */}
            {analyzedSymptoms.length > 0 && (
              <>
                <Text style={styles.aiSectionLabel}>Detected patterns</Text>
                {analyzedSymptoms.map((symptom: any, idx: number) => (
                  <View key={idx} style={styles.symptomRow}>
                    <View
                      style={[
                        styles.symptomDot,
                        {
                          backgroundColor:
                            symptom.confidence === 'high'
                              ? '#ef4444'
                              : symptom.confidence === 'medium'
                              ? '#f59e0b'
                              : '#d1d5db',
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.symptomName}>{symptom.name}</Text>
                      <Text style={styles.symptomReasoning}>{symptom.reasoning}</Text>
                    </View>
                    <Text style={styles.symptomConfidence}>
                      {symptom.confidence === 'high'
                        ? 'Likely'
                        : symptom.confidence === 'medium'
                        ? 'Possible'
                        : 'Monitoring'}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* What may be affecting you - Always show if there's data */}
            {(energyScore !== null || healthData?.sleepHours || hydrationGlasses > 0) ? (
              <>
                {analyzedSymptoms.length > 0 && <View style={styles.aiSectionDivider} />}
                <Text style={styles.aiSectionLabel}>What may be affecting you</Text>
                <View style={styles.chipsContainer}>
                  {energyScore !== null && energyScore < 6 && (
                    <Chip color="#f87171" text={`Low energy ${energyScore}/10`} />
                  )}
                  {healthData?.sleepHours && parseFloat(healthData.sleepHours) < 7 && (
                    <Chip color="#facc15" text={`Insufficient sleep (${healthData.sleepHours} hrs)`} />
                  )}
                  {hydrationGlasses < 4 && (
                    <Chip color="#0ea5e9" text={`Under-hydrated (${hydrationGlasses}/${hydrationTarget})`} />
                  )}
                  {(energyScore === null || energyScore >= 6) &&
                    (!healthData?.sleepHours || parseFloat(healthData.sleepHours) >= 7) &&
                    hydrationGlasses >= 4 && (
                    <Chip color="#34d399" text="No major concerns detected" />
                  )}
                </View>

                {/* AI Recommendations */}
                <View style={styles.aiSectionDivider} />
                <Text style={styles.aiSectionLabel}>Recommendations</Text>
                <View style={styles.chipsContainer}>
                  {energyScore !== null && energyScore < 6 && (
                    <Chip color="#34d399" text="Light movement & fresh air" />
                  )}
                  {healthData?.sleepHours && parseFloat(healthData.sleepHours) < 7 && (
                    <Chip color="#38bdf8" text="Aim for 7-8 hours tonight" />
                  )}
                  {hydrationGlasses < 4 && (
                    <Chip color="#0ea5e9" text="Increase water intake" />
                  )}
                  {(energyScore === null || energyScore >= 6) &&
                    (!healthData?.sleepHours || parseFloat(healthData.sleepHours) >= 7) &&
                    hydrationGlasses >= 4 && (
                    <Chip color="#34d399" text="Keep up the great work!" />
                  )}
                </View>
              </>
            ) : (
              <View style={styles.aiEmptyState}>
                <Ionicons name="analytics-outline" size={32} color={colors.textLight} />
                <Text style={styles.mutedText}>
                  Log energy, sleep, or hydration to unlock AI insights.
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.pricingCard}
            onPress={() => Linking.openURL('https://rootwise.vercel.app/#pricing')}
          >
            <Ionicons name="star-outline" size={22} color="#f59e0b" />
            <Text style={styles.pricingText}>Upgrade to Rootwise Plus for advanced features</Text>
            <Text style={styles.pricingLink}>View Plans {'>'}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Educational wellness information only. Not a substitute for medical care.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Energy picker modal */}
      <Modal visible={energyModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set your energy</Text>
            <Text style={styles.modalValue}>{pendingEnergy.toFixed(0)} / 10</Text>
            <Slider
              minimumValue={0}
              maximumValue={10}
              step={1}
              value={pendingEnergy}
              onValueChange={setPendingEnergy}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor={colors.primary}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEnergyModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={() => {
                  handleQuickLog('energyScore', Math.round(pendingEnergy));
                  setEnergyModalVisible(false);
                }}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sleep picker modal */}
      <Modal visible={sleepModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set your sleep</Text>
            <Text style={styles.modalValue}>{pendingSleep.toFixed(1)} hrs</Text>
            <Slider
              minimumValue={0}
              maximumValue={12}
              step={0.5}
              value={pendingSleep}
              onValueChange={setPendingSleep}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor="#e2e8f0"
              thumbTintColor={colors.primary}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setSleepModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={() => {
                  handleQuickLog('sleepHours', pendingSleep.toFixed(1));
                  setSleepModalVisible(false);
                }}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications modal */}
      <Modal
        visible={notificationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationModal}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {hasNotifications ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {aiInsights.map((item: any, idx: number) => (
                  <View key={idx} style={styles.notificationItem}>
                    <View style={styles.notificationDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notificationTitle}>{item.name || item.title || 'Insight'}</Text>
                      {item.reasoning || item.description ? (
                        <Text style={styles.notificationBody} numberOfLines={3}>
                          {item.reasoning || item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyNotifications}>
                <Ionicons name="notifications-off-outline" size={32} color={colors.textLight} />
                <Text style={styles.emptyNotificationsText}>No notifications yet</Text>
                <Text style={styles.emptyNotificationsSub}>Check back after new insights arrive.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Chip({ color, text }: { color: string; text: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: `${color}20` }]}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={[styles.chipText, { color }]}>{text}</Text>
    </View>
  );
}

function WeeklyEnergyChart({ data }: { data: WeeklyDay[] }) {
  if (!data || data.length === 0) {
    return <Text style={styles.mutedText}>No data to display yet</Text>;
  }

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {data.map((day, idx) => {
          const energy = day.energyScore ?? 5;
          const height = (Math.min(Math.max(energy, 0), 10) / 10) * 100;
          const color = energy >= 7 ? '#34d399' : energy >= 5 ? '#90b4b2' : '#f87171';
          return (
            <View key={`${day.dayName}-${idx}`} style={styles.chartBarWrapper}>
              <View style={[styles.chartBar, { height: `${height}%`, backgroundColor: color }]} />
              <Text style={styles.chartLabel}>{day.dayName ? day.dayName.slice(0, 3) : ''}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.primary,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + 80,
    gap: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  greetingSmall: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0f2822',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f97316',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  notificationModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.glassBorder,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f97316',
    marginTop: 6,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  notificationBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyNotificationsText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  emptyNotificationsSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dateContainer: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 52,
  },
  dateDay: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  dateNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: -2,
  },
  headerTagline: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  energyMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    width: '100%',
  },
  energyEmoji: {
    fontSize: 80,
  },
  energyScoreSection: {
    flex: 1,
    gap: spacing.sm,
  },
  energyMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  energyFaceEmoji: {
    fontSize: 64,
  },
  energyDetailsColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  energyScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  energyScoreBig: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  energyScoreMax: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textLight,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  energyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textLight,
    letterSpacing: 2,
  },
  updateButtonText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  updateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  energyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.full,
  },
  energyTrack: {
    width: '100%',
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  energyTrackFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  energyNote: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stripCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  fullCard: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 2,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  mainValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#eff6ff',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  badgeSky: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  weekDay: {
    fontSize: 13,
    color: colors.text,
  },
  weekValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  // Sleep card compact styles
  // Premium Sleep Card
  sleepCard: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 120,
    // Premium shadow
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  sleepStars: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  star1: {
    position: 'absolute',
    top: 12,
    left: 20,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  star2: {
    position: 'absolute',
    top: 28,
    left: 45,
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
  },
  star3: {
    position: 'absolute',
    top: 50,
    left: 15,
    fontSize: 6,
    color: 'rgba(255,255,255,0.4)',
  },
  star4: {
    position: 'absolute',
    top: 70,
    left: 55,
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
  },
  star5: {
    position: 'absolute',
    top: 40,
    left: 70,
    fontSize: 8,
    color: 'rgba(255,255,255,0.35)',
  },
  sleepMoonContainer: {
    position: 'absolute',
    right: -30,
    top: '50%',
    transform: [{ translateY: -40 }],
  },
  sleepMoonEmoji: {
    fontSize: 80,
    opacity: 0.3,
  },
  sleepContent: {
    flex: 1,
    zIndex: 1,
  },
  sleepCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  sleepUpdateButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  sleepUpdateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  sleepValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: spacing.sm,
  },
  sleepStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  
  // Premium Energy Card (White, clean)
  energyCard: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  energyContent: {
    flex: 1,
    zIndex: 1,
  },
  energyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  energyCardSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 2,
  },
  energyUpdateButton: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  energyUpdateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  energyTrackWhite: {
    width: '100%',
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  energyTrackFillWhite: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: borderRadius.full,
  },
  energyNoteWhite: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  quickActionsWhite: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickActionWhite: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  quickActionTextDark: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  
  // Premium Food Card (Soft orange/yellow gradient)
  foodCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  foodEmojiContainer: {
    position: 'absolute',
    right: -30,
    top: '50%',
    transform: [{ translateY: -50 }],
  },
  foodBigEmoji: {
    fontSize: 100,
    opacity: 0.15,
  },
  foodContent: {
    flex: 1,
    zIndex: 1,
  },
  foodCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  foodAddButton: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  foodAddText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#c2410c',
  },
  foodCalorieSection: {
    marginTop: spacing.md,
  },
  foodCalorieMain: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  foodCalorieOver: {
    color: '#dc2626',
  },
  foodCalorieGoal: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  foodProgressBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(194, 65, 12, 0.15)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  foodProgressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
    backgroundColor: '#ea580c',
  },
  foodMacrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  foodMacroItem: {
    alignItems: 'center',
  },
  foodMacroValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  foodMacroLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  foodItemsList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  foodItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodItemDetails: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  foodItemMeta: {
    fontSize: 12,
    color: '#c2410c',
    marginTop: 2,
  },
  foodViewAll: {
    fontSize: 12,
    fontWeight: '600',
    color: '#c2410c',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  foodEmptyState: {
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  foodEmptyText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  foodScanButton: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
  },
  foodScanText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c2410c',
  },
  
  // Premium Week Card (Light teal)
  weekCard: {
    flex: 1,
    backgroundColor: '#ccfbf1',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 120,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  weekDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  weekDeco1: {
    position: 'absolute',
    top: 12,
    left: 15,
    fontSize: 10,
    color: 'rgba(0,0,0,0.15)',
  },
  weekDeco2: {
    position: 'absolute',
    top: 35,
    left: 40,
    fontSize: 8,
    color: 'rgba(0,0,0,0.1)',
  },
  weekDeco3: {
    position: 'absolute',
    top: 60,
    left: 20,
    fontSize: 6,
    color: 'rgba(0,0,0,0.12)',
  },
  weekEmojiContainer: {
    position: 'absolute',
    right: -25,
    top: '50%',
    transform: [{ translateY: -35 }],
  },
  weekBigEmoji: {
    fontSize: 70,
    opacity: 0.2,
  },
  weekContent: {
    flex: 1,
    zIndex: 1,
  },
  weekCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#134e4a',
  },
  weekDaysLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0f766e',
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  weekAvgValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#134e4a',
    marginTop: spacing.sm,
  },
  weekAvgLabel: {
    fontSize: 12,
    color: '#0f766e',
    marginTop: 2,
  },
  weekHighLow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  weekHighLowText: {
    fontSize: 11,
    color: '#115e59',
  },
  
  // Premium Hydration Card (Light blue)
  hydrationCard: {
    flex: 1,
    backgroundColor: '#e0f2fe',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 120,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  hydrationDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hydrationDeco1: {
    position: 'absolute',
    top: 15,
    left: 20,
    fontSize: 12,
    color: 'rgba(0,0,0,0.12)',
  },
  hydrationDeco2: {
    position: 'absolute',
    top: 40,
    left: 35,
    fontSize: 8,
    color: 'rgba(0,0,0,0.08)',
  },
  hydrationDeco3: {
    position: 'absolute',
    top: 65,
    left: 15,
    fontSize: 10,
    color: 'rgba(0,0,0,0.1)',
  },
  hydrationDeco4: {
    position: 'absolute',
    top: 30,
    left: 55,
    fontSize: 6,
    color: 'rgba(0,0,0,0.06)',
  },
  hydrationEmojiContainer: {
    position: 'absolute',
    right: -20,
    top: '50%',
    transform: [{ translateY: -35 }],
  },
  hydrationBigEmoji: {
    fontSize: 70,
    opacity: 0.2,
  },
  hydrationContent: {
    flex: 1,
    zIndex: 1,
  },
  hydrationCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c4a6e',
  },
  hydrationAddButton: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hydrationValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0c4a6e',
    marginTop: spacing.sm,
  },
  hydrationProgressBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  hydrationProgressFill: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: borderRadius.full,
  },
  hydrationStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0369a1',
    marginTop: spacing.xs,
  },
  
  // Premium Activity Card (Light amber)
  activityCard: {
    flex: 1,
    backgroundColor: '#fef3c7',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 120,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  activityDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  activityDeco1: {
    position: 'absolute',
    top: 20,
    left: 15,
    fontSize: 16,
    color: 'rgba(0,0,0,0.1)',
  },
  activityDeco2: {
    position: 'absolute',
    top: 40,
    left: 30,
    fontSize: 14,
    color: 'rgba(0,0,0,0.07)',
  },
  activityDeco3: {
    position: 'absolute',
    top: 30,
    left: 55,
    fontSize: 8,
    color: 'rgba(0,0,0,0.12)',
  },
  activityEmojiContainer: {
    position: 'absolute',
    right: -20,
    top: '50%',
    transform: [{ translateY: -35 }],
  },
  activityBigEmoji: {
    fontSize: 70,
    opacity: 0.2,
  },
  activityContent: {
    flex: 1,
    zIndex: 1,
  },
  activityCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78350f',
  },
  activitySyncBadge: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#78350f',
    marginTop: spacing.sm,
  },
  activityLabel: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 2,
  },
  activityStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  activityStatText: {
    fontSize: 12,
    color: '#78350f',
  },
  
  sleepValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sleepEmptyState: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  // Weekly patterns compact styles
  weeklyStatRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  weeklyStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  weeklyStatLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  weeklyHighLow: {
    marginTop: spacing.sm,
    gap: 2,
  },
  weeklyHighLowText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Compact card styles (shared)
  compactValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  compactValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  compactUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: -4,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Activity mini stats
  activityMiniStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  activityMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityMiniText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  // Hydration extra styles
  waterDropsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
  },
  hydrationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  hydrationPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  mutedText: {
    fontSize: 12,
    color: colors.textLight,
  },
  // Activity card styles
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  activityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  activityItem: {
    alignItems: 'center',
    gap: 6,
  },
  activityIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  // Unified action button styles
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    minWidth: 36,
    minHeight: 28,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Specific action button colors
  actionButtonGreen: {
    backgroundColor: '#ecfdf5',
  },
  actionButtonBlue: {
    backgroundColor: '#eff6ff',
  },
  actionButtonCyan: {
    backgroundColor: '#ecfeff',
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#ecfeff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  iconButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0891b2',
  },
  cupsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cupContainer: {
    alignItems: 'center',
    gap: 4,
    width: 48,
  },
  cup: {
    width: 36,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cupFilled: {
    borderColor: '#bae6fd',
    backgroundColor: '#f8fafc',
  },
  cupFill: {
    height: '20%',
    backgroundColor: '#e2e8f0',
  },
  cupFillActive: {
    height: '70%',
    backgroundColor: '#bae6fd',
  },
  cupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textLight,
  },
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  symptomDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: spacing.xs,
  },
  symptomName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  symptomReasoning: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  symptomConfidence: {
    fontSize: 12,
    color: colors.textLight,
  },
  // AI Insights unified card styles
  aiInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  aiSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  aiSectionDivider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing.md,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  aiEmptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  patternChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  patternChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#ecfdf3',
  },
  patternText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  chartContainer: {
    marginTop: spacing.md,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    height: 120,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  chartBar: {
    width: 16,
    borderRadius: borderRadius.md,
  },
  chartLabel: {
    marginTop: 6,
    fontSize: 10,
    color: colors.textLight,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pricingCard: {
    backgroundColor: '#fff7ed',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    // Premium shadow
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  pricingText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  pricingLink: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  footerText: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCancel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Calorie tracker styles - Simple
  calorieTracker: {
    marginBottom: spacing.md,
  },
  calorieSimpleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  calorieMainText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  calorieHighlight: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  calorieOver: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
  },
  calorieOfGoal: {
    fontSize: 14,
    color: colors.textLight,
  },
  calorieProgressBg: {
    height: 10,
    backgroundColor: colors.background,
    borderRadius: 5,
    overflow: 'hidden',
  },
  calorieProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  // Food section styles
  foodTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  foodTotalItem: {
    alignItems: 'center',
  },
  foodTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  foodTotalLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  foodLogsList: {
    gap: spacing.sm,
  },
  foodLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  foodLogIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodLogContent: {
    flex: 1,
  },
  foodLogDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  foodLogMeta: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  emptyFoodState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  scanFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  scanFoodButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

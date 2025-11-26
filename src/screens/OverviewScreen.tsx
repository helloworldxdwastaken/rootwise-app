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

  const hydrationTarget = 6;

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

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, '#ffffff']} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                {`${getGreeting()}, ${user?.name || 'there'}`}
              </Text>
              <Text style={styles.headerTitle}>How your body is doing today</Text>
              <Text style={styles.headerSubtitle}>Track your wellness and chat with AI for insights.</Text>
            </View>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.lottieWrapper}>
              <EmotionShowcase emotion={energyState.key} />
            </View>
            <Text style={styles.statusTitle}>{energyState.label}</Text>
            <Text style={styles.statusNote}>{energyState.note}</Text>
            <View style={styles.energyBarCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionLabel}>ENERGY</Text>
                <TouchableOpacity
                  onPress={() => {
                    setPendingEnergy(energyScore ?? 5);
                    setEnergyModalVisible(true);
                  }}
                >
                  <Text style={styles.updateButtonText}>Update</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.energyContentRow}>
                <Text style={styles.energyEmoji}>{getEnergyEmoji(energyScore)}</Text>
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text style={styles.energyValue}>
                    {energyScore !== null ? `${energyScore} / 10` : '--'}
                  </Text>
                  <View style={styles.energyTrack}>
                    <LinearGradient
                      colors={['#7dd3fc', '#38bdf8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.energyTrackFill,
                        { width: `${(Math.min(10, Math.max(0, energyScore || 0)) / 10) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={[styles.energyLabel, { color: colors.success }]}>
                    {energyState.label}
                  </Text>
                </View>
              </View>
            </View>
            {energyScore === null && (
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={[styles.quickAction, { backgroundColor: '#ecfdf3' }]}
                  onPress={() => handleQuickLog('energyScore', 6)}
                >
                  <Ionicons name="flash-outline" size={16} color={colors.success} />
                  <Text style={styles.quickActionText}>Log Energy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickAction, { backgroundColor: '#eff6ff' }]}
                  onPress={() => handleQuickLog('sleepHours', '7.0')}
                >
                  <Ionicons name="moon" size={16} color="#2563eb" />
                  <Text style={styles.quickActionText}>Log Sleep</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

            <View style={styles.cardGrid}>
              <View style={styles.stripCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Sleep</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const currentSleep = healthData?.sleepHours ? parseFloat(healthData.sleepHours) : 7;
                      setPendingSleep(Number.isNaN(currentSleep) ? 7 : currentSleep);
                      setSleepModalVisible(true);
                    }}
                  >
                    <Text style={styles.linkText}>Update</Text>
                  </TouchableOpacity>
                </View>
              {healthData?.sleepHours ? (
                <>
                  <View style={styles.rowBetween}>
                    <Text style={styles.mainValue}>{healthData.sleepHours} hrs</Text>
                    <View style={styles.badge}>
                      <Ionicons name="moon" size={14} color="#1d4ed8" />
                      <Text style={styles.badgeText}>
                        {parseFloat(healthData.sleepHours) >= 7 ? 'Great sleep' : 'Try for more rest'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                </>
              ) : (
                <Text style={styles.mutedText}>Not logged yet</Text>
              )}
              <View style={{ marginTop: spacing.sm }}>
                <Text style={styles.subLabel}>This week</Text>
                {weeklyDays.filter((d) => d.sleepHours !== null && d.sleepHours !== undefined).length > 0 ? (
                  weeklyDays.map((day, idx) =>
                    day.sleepHours !== null && day.sleepHours !== undefined ? (
                      <View key={`${day.dayName}-${idx}`} style={styles.weekRow}>
                        <Text style={styles.weekDay}>{day.dayName}</Text>
                        <Text style={styles.weekValue}>{day.sleepHours} hrs</Text>
                      </View>
                    ) : null
                  )
                ) : (
                  <Text style={styles.mutedText}>No sleep logged this week</Text>
                )}
              </View>
            </View>

            <View style={styles.stripCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Hydration</Text>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleQuickLog('hydrationGlasses', hydrationGlasses + 1)}
                >
                  <Ionicons name="add" size={16} color="#0ea5e9" />
                  <Text style={styles.iconButtonText}>+1</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.mainValue}>
                {hydrationGlasses} of {hydrationTarget} glasses
              </Text>
              <Text style={styles.subLabel}>
                {Math.round((hydrationGlasses / hydrationTarget) * 100)}% to goal
              </Text>
              <View style={styles.cupsRow}>
                {Array.from({ length: hydrationTarget }).map((_, idx) => (
                  <HydrationCup key={idx} filled={idx < hydrationGlasses} label={`Glass ${idx + 1}`} />
                ))}
              </View>
              {hydrationGlasses < hydrationTarget && (
                <View style={styles.badgeSky}>
                  <Ionicons name="water" size={14} color="#0284c7" />
                  <Text style={styles.badgeText}>
                    {hydrationTarget - hydrationGlasses} more to reach your goal
                  </Text>
                </View>
              )}
            </View>

            {/* Activity Card - Steps & Heart Rate from Health Apps */}
            <View style={styles.stripCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Activity</Text>
                {(healthData?.steps || healthData?.heartRate) && (
                  <View style={styles.syncBadge}>
                    <Ionicons name="sync" size={12} color="#059669" />
                    <Text style={styles.syncBadgeText}>Synced</Text>
                  </View>
                )}
              </View>
              {healthData?.steps || healthData?.heartRate || healthData?.activeCalories ? (
                <View style={styles.activityGrid}>
                  {healthData?.steps && (
                    <View style={styles.activityItem}>
                      <View style={[styles.activityIconBg, { backgroundColor: '#fef3c7' }]}>
                        <Ionicons name="footsteps" size={20} color="#d97706" />
                      </View>
                      <Text style={styles.activityValue}>{healthData.steps.toLocaleString()}</Text>
                      <Text style={styles.activityLabel}>Steps</Text>
                    </View>
                  )}
                  {healthData?.heartRate && (
                    <View style={styles.activityItem}>
                      <View style={[styles.activityIconBg, { backgroundColor: '#fee2e2' }]}>
                        <Ionicons name="heart" size={20} color="#dc2626" />
                      </View>
                      <Text style={styles.activityValue}>{healthData.heartRate}</Text>
                      <Text style={styles.activityLabel}>BPM</Text>
                    </View>
                  )}
                  {healthData?.activeCalories && (
                    <View style={styles.activityItem}>
                      <View style={[styles.activityIconBg, { backgroundColor: '#dbeafe' }]}>
                        <Ionicons name="flame" size={20} color="#2563eb" />
                      </View>
                      <Text style={styles.activityValue}>{healthData.activeCalories}</Text>
                      <Text style={styles.activityLabel}>Cal</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.activityEmpty}>
                  <Ionicons name="watch-outline" size={32} color={colors.textLight} />
                  <Text style={styles.mutedText}>Connect Apple Health or Health Connect in Settings to see activity data</Text>
                </View>
              )}
            </View>

            <View style={styles.stripCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>AI Health Insights</Text>
                {(energyScore || healthData?.sleepHours || hydrationGlasses > 0) && (
                  <TouchableOpacity onPress={runAnalysis} disabled={analyzing}>
                    <Text style={[styles.linkText, analyzing && { opacity: 0.5 }]}>
                      {analyzing ? 'Analyzing...' : 'Analyze now'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {analyzedSymptoms.length > 0 ? (
                analyzedSymptoms.map((symptom: any, idx: number) => (
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
                ))
              ) : (
                <Text style={styles.mutedText}>
                  Log energy, sleep, or hydrate to unlock AI health insights.
                </Text>
              )}
            </View>
          </View>

          {/* Today's Food Log */}
          <View style={styles.stripCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Today's Food</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Food')}>
                <Text style={styles.linkText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            
            {/* Calorie Goal Tracker - Simple */}
            {(() => {
              const calorieGoal = healthData?.calorieGoal || 2000;
              const consumed = foodTotals?.calories || 0;
              const remaining = calorieGoal - consumed;
              const progress = Math.min((consumed / calorieGoal) * 100, 100);
              const isOverBudget = remaining < 0;
              
              return (
                <View style={styles.calorieTracker}>
                  <View style={styles.calorieSimpleRow}>
                    <Text style={styles.calorieMainText}>
                      {isOverBudget ? (
                        <Text style={styles.calorieOver}>{Math.abs(remaining)} over limit</Text>
                      ) : (
                        <><Text style={styles.calorieHighlight}>{remaining}</Text> cal left</>
                      )}
                    </Text>
                    <Text style={styles.calorieOfGoal}>{consumed} / {calorieGoal}</Text>
                  </View>
                  <View style={styles.calorieProgressBg}>
                    <LinearGradient
                      colors={isOverBudget ? ['#f87171', '#ef4444'] : [colors.primary, colors.primaryLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.calorieProgressFill, { width: `${Math.min(progress, 100)}%` }]}
                    />
                  </View>
                </View>
              );
            })()}

            {foodLogs.length > 0 ? (
              <>
                <View style={styles.foodTotalsRow}>
                  <View style={styles.foodTotalItem}>
                    <Text style={styles.foodTotalValue}>{foodTotals?.protein || 0}g</Text>
                    <Text style={styles.foodTotalLabel}>protein</Text>
                  </View>
                  <View style={styles.foodTotalItem}>
                    <Text style={styles.foodTotalValue}>{foodTotals?.carbs || 0}g</Text>
                    <Text style={styles.foodTotalLabel}>carbs</Text>
                  </View>
                  <View style={styles.foodTotalItem}>
                    <Text style={styles.foodTotalValue}>{foodTotals?.fat || 0}g</Text>
                    <Text style={styles.foodTotalLabel}>fat</Text>
                  </View>
                </View>
                <View style={styles.foodLogsList}>
                  {foodLogs.slice(0, 5).map((log: any) => (
                    <View key={log.id} style={styles.foodLogItem}>
                      <View style={styles.foodLogIcon}>
                        <Ionicons 
                          name={
                            log.mealType === 'BREAKFAST' ? 'sunny-outline' :
                            log.mealType === 'LUNCH' ? 'partly-sunny-outline' :
                            log.mealType === 'DINNER' ? 'moon-outline' :
                            'cafe-outline'
                          } 
                          size={16} 
                          color={colors.primary} 
                        />
                      </View>
                      <View style={styles.foodLogContent}>
                        <Text style={styles.foodLogDescription} numberOfLines={1}>
                          {log.description}
                        </Text>
                        <Text style={styles.foodLogMeta}>
                          {log.calories} cal • {log.mealType?.toLowerCase()}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {foodLogs.length > 5 && (
                    <Text style={styles.mutedText}>
                      +{foodLogs.length - 5} more items
                    </Text>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.emptyFoodState}>
                <Ionicons name="restaurant-outline" size={32} color={colors.textLight} />
                <Text style={styles.mutedText}>No food logged today</Text>
                <TouchableOpacity 
                  style={styles.scanFoodButton}
                  onPress={() => navigation.navigate('Food')}
                >
                  <Ionicons name="camera-outline" size={16} color="#fff" />
                  <Text style={styles.scanFoodButtonText}>Scan Food</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.fullCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Weekly patterns</Text>
              <Text style={styles.subLabel}>
                {weeklyData?.dataPoints || 0} entries this week
              </Text>
            </View>
            {weeklyData?.patterns && weeklyData.patterns.length > 0 ? (
              <View style={styles.patternChips}>
                {weeklyData.patterns.map((pattern, idx) => (
                  <View key={idx} style={styles.patternChip}>
                    <Text style={styles.patternText}>{pattern.description}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.mutedText}>No clear patterns yet</Text>
            )}
            {(weeklyData?.bestDay || weeklyData?.worstDay) && (
              <View style={styles.rowBetween}>
                {weeklyData?.bestDay && (
                  <Text style={styles.subLabel}>
                    Best: {weeklyData.bestDay.day} ({weeklyData.bestDay.energy}/10)
                  </Text>
                )}
                {weeklyData?.worstDay && (
                  <Text style={styles.subLabel}>
                    Lowest: {weeklyData.worstDay.day} ({weeklyData.worstDay.energy}/10)
                  </Text>
                )}
              </View>
            )}
            <WeeklyEnergyChart data={weeklyDays} />
          </View>

          {analyzedSymptoms.length > 0 && (
            <View style={styles.cardGrid}>
              <View style={styles.stripCard}>
                <Text style={styles.cardTitle}>What may be affecting you</Text>
                <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                  {energyScore !== null && energyScore < 6 && (
                    <Chip color="#f87171" text={`Low energy ${energyScore}/10`} />
                  )}
                  {healthData?.sleepHours && parseFloat(healthData.sleepHours) < 7 && (
                    <Chip color="#facc15" text={`Insufficient sleep (${healthData.sleepHours} hrs)`} />
                  )}
                  {hydrationGlasses < 4 && (
                    <Chip color="#0ea5e9" text={`Under-hydrated (${hydrationGlasses}/${hydrationTarget})`} />
                  )}
                  {analyzedSymptoms.filter((s: any) => s.confidence === 'high').length === 0 && (
                    <Chip color="#34d399" text="No major concerns detected" />
                  )}
                </View>
              </View>

              <View style={styles.stripCard}>
                <Text style={styles.cardTitle}>AI recommendations</Text>
                <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                  {energyScore !== null && energyScore < 6 && (
                    <Chip color="#34d399" text="Light movement & fresh air" />
                  )}
                  {healthData?.sleepHours && parseFloat(healthData.sleepHours) < 7 && (
                    <Chip color="#38bdf8" text="Aim for 7-8 hours tonight" />
                  )}
                  {hydrationGlasses < 4 && (
                    <Chip color="#0ea5e9" text="Increase water intake" />
                  )}
                  <Chip color="#f59e0b" text="Chat with AI for personalized tips" />
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('Chat')}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.chatGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={32} color="#ffffff" />
              <View style={styles.chatTextContainer}>
                <Text style={styles.chatButtonTitle}>Chat with AI Assistant</Text>
                <Text style={styles.chatButtonSubtitle}>Get personalized wellness insights</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

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
    </View>
  );
}

function HydrationCup({ filled, label }: { filled: boolean; label: string }) {
  return (
    <View style={styles.cupContainer}>
      <View style={[styles.cup, filled && styles.cupFilled]}>
        <View style={[styles.cupFill, filled && styles.cupFillActive]} />
      </View>
      <Text style={[styles.cupLabel, filled && { color: '#0ea5e9' }]}>{label.replace('Glass ', 'G')}</Text>
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
    paddingTop: 70,
    paddingBottom: spacing.xxl + 80,
    gap: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  heroCard: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  lottieWrapper: {
    marginTop: -20,
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
  energyCard: {
    width: '100%',
    alignItems: 'center',
  },
  energyBarCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.sm,
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
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  statusNote: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  energyScoreText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  energyLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  energyContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  energyEmoji: {
    fontSize: 32,
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
  energyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  energyBar: {
    width: 70,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: borderRadius.full,
  },
  energyFill: {
    height: '100%',
    borderRadius: borderRadius.full,
    backgroundColor: '#ffffff',
  },
  energyNote: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stripCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.xs,
  },
  fullCard: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.sm,
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
  activityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  activityLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  activityEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  iconButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
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
  chatButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  chatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  chatTextContainer: {
    flex: 1,
  },
  chatButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  chatButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  pricingCard: {
    backgroundColor: '#fff7ed',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#fed7aa',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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

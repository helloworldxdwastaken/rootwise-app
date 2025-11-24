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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { healthAPI } from '../services/api';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function OverviewScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [healthData, setHealthData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [today, weekly] = await Promise.all([
        healthAPI.getToday(),
        healthAPI.getWeekly(),
      ]);
      setHealthData(today);
      setWeeklyData(weekly);
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
      await healthAPI.analyzeSymptoms();
    } catch (error) {
      console.error('Failed to log metric:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getEnergyEmoji = (score: number | null) => {
    if (score === null) return '🤷';
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

  const energyScore = healthData?.energyScore;
  const analyzedSymptoms = healthData?.analyzedSymptoms || [];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, '#ffffff']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                {getGreeting().toUpperCase()}, {(user?.name || 'THERE').toUpperCase()}
              </Text>
              <Text style={styles.headerTitle}>How your body is doing today</Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Sign out</Text>
            </TouchableOpacity>
          </View>

          {/* Energy Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ENERGY</Text>
            {energyScore !== null ? (
              <>
                <View style={styles.energyRow}>
                  <Text style={styles.energyEmoji}>{getEnergyEmoji(energyScore)}</Text>
                  <View style={styles.energyContent}>
                    <View style={styles.energyBar}>
                      <View
                        style={[
                          styles.energyFill,
                          {
                            width: `${(energyScore / 10) * 100}%`,
                            backgroundColor: energyScore >= 7 ? colors.success : energyScore >= 5 ? colors.warning : colors.error,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.energyScore}>{energyScore} / 10</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={() => {
                    // In real app, show modal/picker
                    navigation.navigate('LogEnergy');
                  }}
                >
                  <Text style={styles.updateButtonText}>Update</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.logButton}
                onPress={() => navigation.navigate('LogEnergy')}
              >
                <Text style={styles.logButtonText}>⚡ Log Energy</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardSleep]}>
              <Text style={styles.statIcon}>🌙</Text>
              <Text style={styles.statLabel}>Sleep</Text>
              <Text style={styles.statValue}>
                {healthData?.sleepHours || '--'}
              </Text>
              {!healthData?.sleepHours && (
                <TouchableOpacity onPress={() => navigation.navigate('LogSleep')}>
                  <Text style={styles.statLink}>Log</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.statCard, styles.statCardWater]}>
              <Text style={styles.statIcon}>💧</Text>
              <Text style={styles.statLabel}>Hydration</Text>
              <Text style={styles.statValue}>
                {healthData?.hydrationGlasses || 0}/6
              </Text>
              <TouchableOpacity
                onPress={() => handleQuickLog('hydrationGlasses', (healthData?.hydrationGlasses || 0) + 1)}
              >
                <Text style={styles.statLink}>+1</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Health Insights */}
          {analyzedSymptoms.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>AI HEALTH INSIGHTS</Text>
              {analyzedSymptoms.map((symptom: any, idx: number) => (
                <View key={idx} style={styles.symptomRow}>
                  <Text style={styles.symptomIcon}>
                    {symptom.confidence === 'high' ? '🔴' : symptom.confidence === 'medium' ? '🟡' : '⚪'}
                  </Text>
                  <View style={styles.symptomContent}>
                    <Text style={styles.symptomName}>{symptom.name}</Text>
                    <Text style={styles.symptomReasoning}>{symptom.reasoning}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Chat CTA */}
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate('Chat')}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.chatGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.chatIcon}>💬</Text>
              <View style={styles.chatTextContainer}>
                <Text style={styles.chatButtonTitle}>Chat with AI Assistant</Text>
                <Text style={styles.chatButtonSubtitle}>Get personalized wellness insights</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Pricing CTA */}
          <TouchableOpacity
            style={styles.pricingCard}
            onPress={() => Linking.openURL('https://your-rootwise-domain.vercel.app/#pricing')}
          >
            <Text style={styles.pricingIcon}>✨</Text>
            <Text style={styles.pricingText}>
              Upgrade to Rootwise Plus for advanced features
            </Text>
            <Text style={styles.pricingLink}>View Plans →</Text>
          </TouchableOpacity>

          {/* Footer disclaimer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Educational wellness information only. Not a substitute for medical care.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
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
    paddingTop: 60,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 36,
  },
  logoutButton: {
    padding: spacing.sm,
  },
  logoutText: {
    fontSize: 14,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.glass,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.md,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textLight,
    letterSpacing: 2,
  },
  energyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  energyEmoji: {
    fontSize: 48,
  },
  energyContent: {
    flex: 1,
    gap: spacing.sm,
  },
  energyBar: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  energyFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  energyScore: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  updateButton: {
    alignSelf: 'flex-start',
  },
  updateButtonText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  logButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  logButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statCardSleep: {
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  statCardWater: {
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  statIcon: {
    fontSize: 24,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  statLink: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  symptomRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  symptomIcon: {
    fontSize: 16,
  },
  symptomContent: {
    flex: 1,
    gap: 4,
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
  chatIcon: {
    fontSize: 32,
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
  pricingIcon: {
    fontSize: 24,
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
});


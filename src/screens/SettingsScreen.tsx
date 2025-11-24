import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI, conditionsAPI } from '../services/api';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [conditions, setConditions] = useState<any[]>([]);
  const [healthSyncEnabled, setHealthSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'syncing'>('disconnected');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load profile and conditions
      const [profileData, conditionsData] = await Promise.all([
        profileAPI.getProfile(),
        conditionsAPI.getConditions(),
      ]);

      setProfile(profileData.profile);
      setPatientProfile(profileData.patientProfile);
      setConditions(conditionsData.conditions || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load settings data');
    } finally {
      setLoading(false);
    }
  };

  const handleHealthSyncToggle = async () => {
    try {
      setSyncStatus('syncing');
      // TODO: Implement actual health sync API call
      // For now, just toggle the state
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHealthSyncEnabled(!healthSyncEnabled);
      setSyncStatus(healthSyncEnabled ? 'disconnected' : 'connected');
      
      Alert.alert(
        'Success',
        healthSyncEnabled ? 'Health sync disabled' : 'Health sync enabled'
      );
    } catch (error) {
      console.error('Failed to toggle health sync:', error);
      setSyncStatus('disconnected');
      Alert.alert('Error', 'Failed to toggle health sync');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient colors={[colors.background, '#ffffff']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your profile and preferences</Text>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>👤</Text>
            <Text style={styles.sectionTitle}>Account Information</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user?.name || 'Not set'}</Text>
            </View>
            <View style={styles.dividerLine} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Patient Profile */}
        {patientProfile && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>💚</Text>
              <Text style={styles.sectionTitle}>Health Profile</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.profileGrid}>
                {patientProfile.dateOfBirth && (
                  <View style={styles.profileItem}>
                    <Text style={styles.profileLabel}>Date of Birth</Text>
                    <Text style={styles.profileValue}>
                      {new Date(patientProfile.dateOfBirth).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {patientProfile.sex && (
                  <View style={styles.profileItem}>
                    <Text style={styles.profileLabel}>Sex</Text>
                    <Text style={styles.profileValue}>
                      {patientProfile.sex.toLowerCase()}
                    </Text>
                  </View>
                )}
                {patientProfile.heightCm && (
                  <View style={styles.profileItem}>
                    <Text style={styles.profileLabel}>Height</Text>
                    <Text style={styles.profileValue}>{patientProfile.heightCm} cm</Text>
                  </View>
                )}
                {patientProfile.weightKg && (
                  <View style={styles.profileItem}>
                    <Text style={styles.profileLabel}>Weight</Text>
                    <Text style={styles.profileValue}>{patientProfile.weightKg} kg</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Health Device Integration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>⌚</Text>
            <Text style={styles.sectionTitle}>Health Device Integration</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Connect your Apple Health or Google Fit to track metrics automatically
          </Text>

          {/* Apple Health */}
          <View style={styles.card}>
            <View style={styles.deviceRow}>
              <View style={styles.deviceInfo}>
                <View style={styles.deviceIconContainer}>
                  <Text style={styles.deviceIcon}>❤️</Text>
                </View>
                <View>
                  <Text style={styles.deviceName}>Apple Health</Text>
                  <Text style={styles.devicePlatform}>iOS devices</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.syncButton,
                  syncStatus === 'connected' && styles.syncButtonActive
                ]}
                onPress={handleHealthSyncToggle}
                disabled={syncStatus === 'syncing'}
              >
                {syncStatus === 'syncing' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[
                    styles.syncButtonText,
                    syncStatus === 'connected' && styles.syncButtonTextActive
                  ]}>
                    {syncStatus === 'connected' ? '✓ Connected' : 'Connect'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            {syncStatus === 'connected' && (
              <View style={styles.syncInfo}>
                <Text style={styles.syncInfoText}>
                  ✓ Syncing: Steps, Heart Rate, Sleep, Activity
                </Text>
              </View>
            )}
          </View>

          {/* Google Fit */}
          <View style={styles.card}>
            <View style={styles.deviceRow}>
              <View style={styles.deviceInfo}>
                <View style={[styles.deviceIconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={styles.deviceIcon}>📱</Text>
                </View>
                <View>
                  <Text style={styles.deviceName}>Google Fit</Text>
                  <Text style={styles.devicePlatform}>Android devices</Text>
                </View>
              </View>
              <View style={[styles.syncButton, styles.comingSoonButton]}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            </View>
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyTitle}>Privacy Note</Text>
              <Text style={styles.privacyText}>
                Your health data is encrypted and never shared without your permission.
              </Text>
            </View>
          </View>
        </View>

        {/* Clinic History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📋</Text>
            <Text style={styles.sectionTitle}>Clinic History</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>View Only</Text>
            </View>
          </View>

          {conditions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>No clinic history recorded yet</Text>
              <Text style={styles.emptyText}>
                Your healthcare provider can add records to your account
              </Text>
            </View>
          ) : (
            <View style={styles.conditionsList}>
              {conditions.map((condition) => (
                <View
                  key={condition.id}
                  style={[
                    styles.conditionCard,
                    !condition.isActive && styles.conditionCardInactive
                  ]}
                >
                  <View style={styles.conditionHeader}>
                    <Text style={styles.conditionName}>{condition.name}</Text>
                    <View style={[
                      styles.statusBadge,
                      condition.isActive ? styles.statusActive : styles.statusResolved
                    ]}>
                      <Text style={[
                        styles.statusText,
                        condition.isActive ? styles.statusTextActive : styles.statusTextResolved
                      ]}>
                        {condition.isActive ? 'Active' : 'Resolved'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.conditionDetails}>
                    {condition.diagnosedAt && (
                      <Text style={styles.conditionDetail}>
                        📅 {new Date(condition.diagnosedAt).toLocaleDateString()}
                      </Text>
                    )}
                    {condition.diagnosedBy && (
                      <Text style={styles.conditionDetail}>
                        📍 {condition.diagnosedBy}
                      </Text>
                    )}
                  </View>

                  {condition.notes && (
                    <Text style={styles.conditionNotes}>{condition.notes}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.warningNote}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              This information is provided by your healthcare provider and cannot be edited directly.
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  badge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.glassBorder,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  profileItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  profileLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textTransform: 'capitalize',
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  deviceIcon: {
    fontSize: 20,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  devicePlatform: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  syncButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  syncButtonActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  syncButtonTextActive: {
    color: '#059669',
  },
  comingSoonButton: {
    backgroundColor: colors.background,
  },
  comingSoonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
  },
  syncInfo: {
    marginTop: spacing.md,
    backgroundColor: '#D1FAE5',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  syncInfoText: {
    fontSize: 12,
    color: '#059669',
  },
  privacyNote: {
    flexDirection: 'row',
    backgroundColor: '#DBEAFE',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  privacyIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 2,
  },
  privacyText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  conditionsList: {
    gap: spacing.md,
  },
  conditionCard: {
    backgroundColor: '#D1FAE5',
    borderWidth: 2,
    borderColor: '#6EE7B7',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  conditionCardInactive: {
    backgroundColor: colors.background,
    borderColor: colors.glassBorder,
    opacity: 0.7,
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  conditionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  statusActive: {
    backgroundColor: '#A7F3D0',
  },
  statusResolved: {
    backgroundColor: colors.background,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#047857',
  },
  statusTextResolved: {
    color: colors.textSecondary,
  },
  conditionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  conditionDetail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  conditionNotes: {
    fontSize: 14,
    color: colors.text,
    borderLeftWidth: 2,
    borderLeftColor: colors.glassBorder,
    paddingLeft: spacing.sm,
    marginTop: spacing.xs,
  },
  warningNote: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
});


import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  Linking,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI, conditionsAPI } from '../services/api';
import {
  initializeHealthData,
  isHealthDataAvailable,
  syncHealthData,
  getHealthPlatformName,
  HealthDataType,
} from '../services/healthData';
import {
  areRemindersEnabled,
  setRemindersEnabled,
  requestSystemPermissions,
  checkNotificationPermissions,
  scheduleDailyReminders,
} from '../services/notifications';
import { colors, spacing, borderRadius } from '../constants/theme';

type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';

export default function SettingsScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [conditions, setConditions] = useState<any[]>([]);
  
  // Health sync state
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const [lastSyncedData, setLastSyncedData] = useState<HealthDataType | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Reminders state
  const [remindersEnabled, setRemindersEnabledState] = useState(true);

  useEffect(() => {
    loadData();
    checkHealthAvailability();
    loadReminderSettings();
  }, []);
  
  const loadReminderSettings = async () => {
    // Check both app setting AND system permission
    const appEnabled = await areRemindersEnabled();
    const { granted: systemEnabled } = await checkNotificationPermissions();
    
    // Toggle should only be ON if both app setting is enabled AND system allows it
    // If system permissions are off but app setting is on, the toggle shows on
    // but will prompt user to enable system permissions when they interact
    setRemindersEnabledState(appEnabled);
    
    // If system permissions were revoked, let user know on next toggle attempt
    if (appEnabled && !systemEnabled) {
      console.log('Note: App reminders enabled but system notifications are off');
    }
  };
  
  const handleToggleReminders = async (value: boolean) => {
    if (value) {
      // Check if system permissions are already granted
      const { granted, canAskAgain } = await checkNotificationPermissions();
      
      if (!granted) {
        // Try to request permissions
        const permissionGranted = await requestSystemPermissions();
        
        if (!permissionGranted) {
          // Permissions denied - show appropriate message
          if (canAskAgain) {
            Alert.alert(
              'Permissions Required',
              'Notifications are needed to send you health reminders. Please allow notifications when prompted.',
              [{ text: 'OK' }]
            );
          } else {
            // User has permanently denied - need to go to settings
            Alert.alert(
              'Notifications Disabled',
              Platform.OS === 'ios'
                ? 'To enable reminders, go to Settings > Rootwise > Notifications and turn them on.'
                : 'To enable reminders, go to Settings > Apps > Rootwise > Notifications and turn them on.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() },
              ]
            );
          }
          return;
        }
      }
    }
    
    // Update app state and schedule/cancel reminders
    setRemindersEnabledState(value);
    await setRemindersEnabled(value);
    
    if (value) {
      Alert.alert(
        'Reminders Enabled 🔔',
        'You\'ll receive smart reminders for:\n\n• Hydration (throughout the day)\n• Sleep logging (mornings)\n• Food tracking (meal times)'
      );
    }
  };

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

  const checkHealthAvailability = async () => {
    const available = await isHealthDataAvailable();
    setHealthAvailable(available);
  };

  const handleConnectHealth = async () => {
    try {
      setSyncStatus('connecting');

      // Initialize and request permissions
      const result = await initializeHealthData() as any;

      if (result.authorized) {
        setSyncStatus('connected');
        Alert.alert(
          'Connected!',
          `${getHealthPlatformName()} is now connected. Your health data will sync automatically.`,
          [{ text: 'Sync Now', onPress: handleSyncHealth }]
        );
      } else if (result.expoGo) {
        // Running in Expo Go - HealthKit requires development build
        setSyncStatus('error');
        Alert.alert(
          'Development Build Required',
          'Apple Health integration requires a development build. Expo Go does not support HealthKit.\n\nPlease install the app from TestFlight or build it locally with:\n\nnpx expo run:ios',
          [{ text: 'OK' }]
        );
      } else if (result.shouldRequest) {
        setSyncStatus('disconnected');
        
        if (Platform.OS === 'ios') {
          Alert.alert(
            'Permission Required',
            'To connect Apple Health:\n\n1. Open the Health app\n2. Tap your profile icon (top right)\n3. Tap "Privacy"\n4. Tap "Apps"\n5. Find Rootwise and enable permissions',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Health App', onPress: openHealthSettings },
            ]
          );
        } else {
          Alert.alert(
            'Permission Required',
            `Please allow ${getHealthPlatformName()} access in your device settings to sync health data.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openHealthSettings },
            ]
          );
        }
      } else {
        setSyncStatus('error');
        const errorMsg = result.deniedPermissions.join(', ');
        
        // Check if Health Connect needs to be installed
        if (Platform.OS === 'android' && errorMsg.includes('install')) {
          Alert.alert(
            'Health Connect Required',
            'Please install Google Health Connect from the Play Store to sync your health data.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Play Store', 
                onPress: () => {
                  // Open Play Store to Health Connect
                  const url = 'market://details?id=com.google.android.apps.healthdata';
                  Linking.openURL(url).catch(() => {
                    // Fallback to web URL
                    Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata');
                  });
                }
              },
            ]
          );
        } else {
          Alert.alert(
            'Not Available',
            `${getHealthPlatformName()} is not available on this device.\n\n${errorMsg}`,
          );
        }
      }
    } catch (error: any) {
      console.error('Health connect error:', error);
      setSyncStatus('error');
      Alert.alert('Connection Failed', error.message || 'Could not connect to health data');
    }
  };

  const handleSyncHealth = async () => {
    if (syncStatus !== 'connected') {
      await handleConnectHealth();
      return;
    }

    try {
      setSyncStatus('syncing');

      const result = await syncHealthData();

      if (result.success && result.data) {
        setLastSyncedData(result.data);
        setLastSyncTime(new Date());
        setSyncStatus('connected');
        
        // Show what was synced to database
        if (result.syncedItems && result.syncedItems.length > 0) {
      Alert.alert(
            '✅ Synced to Database',
            `The following data was saved:\n\n${result.syncedItems.join('\n')}`,
            [{ text: 'Great!' }]
          );
        } else {
          Alert.alert('Sync Complete', 'No new data found to sync');
        }
      } else {
        setSyncStatus('connected');
        Alert.alert('Sync Issue', result.error || 'No data available to sync');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      Alert.alert('Sync Failed', error.message || 'Could not sync health data');
    }
  };

  const handleDisconnectHealth = () => {
    Alert.alert(
      'Disconnect Health Data?',
      `This will stop syncing from ${getHealthPlatformName()}. Your existing data will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
      setSyncStatus('disconnected');
            setLastSyncedData(null);
            setLastSyncTime(null);
          },
        },
      ]
    );
  };

  const openHealthSettings = () => {
    if (Platform.OS === 'ios') {
      // Open iOS Health app settings
      const { Linking } = require('react-native');
      Linking.openURL('x-apple-health://');
    } else {
      // Open Android Health Connect settings
      const { Linking } = require('react-native');
      Linking.openSettings();
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

  const formatLastSync = (date: Date | null) => {
    if (!date) return null;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const platformName = getHealthPlatformName();
  const isIOS = Platform.OS === 'ios';

  const hasProfileData = patientProfile && (
    patientProfile.dateOfBirth || 
    patientProfile.sex || 
    patientProfile.heightCm || 
    patientProfile.weightKg
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your profile and preferences</Text>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="person-circle-outline"
              size={24}
              color={colors.primary}
              style={styles.sectionIcon}
            />
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
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="fitness-outline"
                size={24}
                color={colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionTitle}>Health Profile</Text>
            </View>
          {hasProfileData ? (
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
          ) : (
            <View style={styles.emptyProfileCard}>
              <Ionicons name="body-outline" size={32} color={colors.textLight} />
              <Text style={styles.emptyProfileText}>
                Connect your health app to sync profile data
              </Text>
          </View>
        )}
        </View>

        {/* Health Device Integration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="watch-outline"
              size={24}
              color={colors.primary}
              style={styles.sectionIcon}
            />
            <Text style={styles.sectionTitle}>Health Device Integration</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Connect {platformName} to automatically sync your health data
          </Text>

          {/* Primary Health Platform (iOS or Android) */}
          <View style={styles.card}>
            <View style={styles.deviceRow}>
              <View style={styles.deviceInfo}>
                <Image
                  source={
                    isIOS
                      ? require('../../assets/health_apps/Health_icon_iOS_12.png')
                      : require('../../assets/health_apps/Google_fitng.png')
                  }
                  style={styles.healthAppIcon}
                />
                <View style={styles.deviceTextWrap}>
                  <Text style={styles.deviceName}>{platformName}</Text>
                  <Text style={styles.devicePlatform}>Steps, Sleep, Heart Rate, Weight</Text>
                </View>
              </View>
              
              {syncStatus === 'disconnected' && (
                healthAvailable ? (
                  <TouchableOpacity
                    style={styles.connectButton}
                    onPress={handleConnectHealth}
                  >
                    <Text style={styles.connectButtonText}>Connect</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.notAvailableContainer}>
                    <Text style={styles.notAvailableText}>Requires Dev Build</Text>
                    <Text style={styles.notAvailableHint}>
                      {Platform.OS === 'ios' 
                        ? 'HealthKit needs a native build. Run: npx expo run:ios' 
                        : 'Install Health Connect from Play Store'}
                    </Text>
                  </View>
                )
              )}

              {syncStatus === 'connecting' && (
                <View style={styles.syncButton}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}

              {(syncStatus === 'connected' || syncStatus === 'syncing') && (
                <TouchableOpacity
                  style={[styles.syncButton, styles.syncButtonActive]}
                  onPress={handleSyncHealth}
                  disabled={syncStatus === 'syncing'}
                >
                  {syncStatus === 'syncing' ? (
                    <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <View style={styles.syncButtonContent}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      <Text style={styles.syncButtonTextActive}>Connected</Text>
                  </View>
                )}
              </TouchableOpacity>
              )}

              {syncStatus === 'error' && (
                <TouchableOpacity
                  style={[styles.syncButton, styles.errorButton]}
                  onPress={handleConnectHealth}
                >
                  <Ionicons name="alert-circle" size={16} color="#dc2626" />
                  <Text style={styles.errorButtonText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Connected Status Info */}
            {syncStatus === 'connected' && (
              <View style={styles.syncInfo}>
                <View style={styles.syncInfoRow}>
                  <Ionicons name="sync" size={16} color="#059669" />
                  <Text style={styles.syncInfoText}>
                    Auto-syncing enabled
                    {lastSyncTime && ` • Last sync: ${formatLastSync(lastSyncTime)}`}
                  </Text>
                </View>

                {/* Synced Data Summary */}
                {lastSyncedData && (
                  <View style={styles.syncedDataGrid}>
                    {lastSyncedData.steps !== undefined && (
                      <View style={styles.syncedDataItem}>
                        <Ionicons name="footsteps-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.syncedDataText}>{lastSyncedData.steps.toLocaleString()} steps</Text>
                      </View>
                    )}
                    {lastSyncedData.sleepHours !== undefined && (
                      <View style={styles.syncedDataItem}>
                        <Ionicons name="moon-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.syncedDataText}>{lastSyncedData.sleepHours} hrs sleep</Text>
                      </View>
                    )}
                    {lastSyncedData.heartRate !== undefined && (
                      <View style={styles.syncedDataItem}>
                        <Ionicons name="heart-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.syncedDataText}>{lastSyncedData.heartRate} bpm</Text>
                      </View>
                    )}
                    {lastSyncedData.weight !== undefined && (
                      <View style={styles.syncedDataItem}>
                        <Ionicons name="scale-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.syncedDataText}>{lastSyncedData.weight} kg</Text>
              </View>
            )}
          </View>
                )}

                {/* Action Buttons */}
                <View style={styles.syncActions}>
                  <TouchableOpacity
                    style={styles.syncActionButton}
                    onPress={handleSyncHealth}
                    disabled={syncStatus as string === 'syncing'}
                  >
                    <Ionicons name="refresh" size={16} color={colors.primary} />
                    <Text style={styles.syncActionText}>Sync Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.syncActionButton, styles.disconnectButton]}
                    onPress={handleDisconnectHealth}
                  >
                    <Ionicons name="unlink" size={16} color="#dc2626" />
                    <Text style={[styles.syncActionText, { color: '#dc2626' }]}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Reminders Toggle */}
          <View style={styles.reminderSection}>
            <View style={styles.reminderRow}>
              <View style={styles.reminderInfo}>
                <Ionicons name="notifications-outline" size={22} color={colors.primary} />
                <View style={styles.reminderTextWrap}>
                  <Text style={styles.reminderTitle}>Smart Reminders</Text>
                  <Text style={styles.reminderSubtitle}>
                    Hydration, sleep & food reminders
                  </Text>
                </View>
              </View>
              <Switch
                value={remindersEnabled}
                onValueChange={handleToggleReminders}
                trackColor={{ false: '#e2e8f0', true: colors.primaryLight }}
                thumbColor={remindersEnabled ? colors.primary : '#f4f3f4'}
                ios_backgroundColor="#e2e8f0"
              />
            </View>
            {remindersEnabled && (
              <View style={styles.reminderDetails}>
                <View style={styles.reminderDetailItem}>
                  <Ionicons name="water-outline" size={14} color={colors.textLight} />
                  <Text style={styles.reminderDetailText}>Hydration: 10:30 AM, 2:30 PM, 6 PM</Text>
                </View>
                <View style={styles.reminderDetailItem}>
                  <Ionicons name="moon-outline" size={14} color={colors.textLight} />
                  <Text style={styles.reminderDetailText}>Sleep log: 9:30 AM</Text>
                </View>
                <View style={styles.reminderDetailItem}>
                  <Ionicons name="restaurant-outline" size={14} color={colors.textLight} />
                  <Text style={styles.reminderDetailText}>Smart meal reminders</Text>
                </View>
              </View>
            )}
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed-outline" size={18} color="#1E40AF" style={styles.privacyIcon} />
            <View style={styles.privacyTextWrap}>
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
            <Ionicons
              name="clipboard-outline"
              size={24}
              color={colors.primary}
              style={styles.sectionIcon}
            />
            <Text style={styles.sectionTitle}>Clinic History</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>View Only</Text>
            </View>
          </View>

          {conditions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={48} color={colors.textLight} />
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
                      <View style={styles.conditionDetailRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.conditionDetail}>
                          {new Date(condition.diagnosedAt).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    {condition.diagnosedBy && (
                      <View style={styles.conditionDetailRow}>
                        <Ionicons
                          name="location-outline"
                          size={14}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.conditionDetail}>
                          {condition.diagnosedBy}
                        </Text>
                      </View>
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
            <Ionicons name="warning-outline" size={18} color="#92400E" style={styles.warningIcon} />
            <Text style={styles.warningText}>
              This information is provided by your healthcare provider and cannot be edited directly.
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
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
  emptyProfileCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderStyle: 'dashed',
  },
  emptyProfileText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
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
  healthAppIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: spacing.sm,
  },
  deviceTextWrap: {
    flex: 1,
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
  connectButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  syncButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minWidth: 100,
    alignItems: 'center',
  },
  syncButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  syncButtonActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
  },
  syncButtonTextActive: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 14,
  },
  errorButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  errorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  syncInfo: {
    marginTop: spacing.md,
    backgroundColor: '#D1FAE5',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#6EE7B7',
    gap: spacing.sm,
  },
  syncInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  syncInfoText: {
    fontSize: 12,
    color: '#059669',
    flex: 1,
  },
  syncedDataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  syncedDataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  syncedDataText: {
    fontSize: 12,
    color: colors.text,
  },
  syncActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  syncActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: borderRadius.md,
  },
  syncActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  disconnectButton: {
    backgroundColor: 'rgba(254,226,226,0.8)',
  },
  reminderSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  reminderTextWrap: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  reminderSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  reminderDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    gap: spacing.xs,
  },
  reminderDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reminderDetailText: {
    fontSize: 12,
    color: colors.textLight,
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
    marginRight: spacing.sm,
    marginTop: 2,
  },
  privacyTextWrap: {
    flex: 1,
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
    marginBottom: spacing.sm,
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
    marginBottom: spacing.sm,
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
  conditionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    marginTop: spacing.lg,
  },
  warningIcon: {
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
  bottomSpacer: {
    height: 48,
  },
  notAvailableContainer: {
    alignItems: 'flex-end',
  },
  notAvailableText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning,
  },
  notAvailableHint: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
    textAlign: 'right',
    maxWidth: 180,
  },
});

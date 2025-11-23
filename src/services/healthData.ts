import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
} from 'react-native-health';
import { healthAPI } from './api';

// Health permissions
const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.Height,
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.DateOfBirth,
      AppleHealthKit.Constants.Permissions.BiologicalSex,
    ],
    write: [],
  },
};

// ==================== iOS HealthKit ====================

export const initializeHealthKit = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(permissions, (error: string) => {
      if (error) {
        console.error('HealthKit initialization failed:', error);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};

export const getHealthKitData = async (): Promise<any> => {
  if (Platform.OS !== 'ios') return null;

  return new Promise((resolve) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get sleep analysis
    const sleepOptions = {
      startDate: yesterday.toISOString(),
      endDate: today.toISOString(),
    };

    AppleHealthKit.getSleepSamples(sleepOptions, (err: any, results: any[]) => {
      if (err) {
        console.error('Failed to fetch sleep data:', err);
        resolve(null);
        return;
      }

      let sleepHours = null;
      if (results && results.length > 0) {
        const totalMinutes = results.reduce((sum, sample) => {
          const start = new Date(sample.startDate).getTime();
          const end = new Date(sample.endDate).getTime();
          return sum + (end - start) / 1000 / 60;
        }, 0);
        sleepHours = `${(totalMinutes / 60).toFixed(1)}hr`;
      }

      resolve({
        sleepHours,
        steps: 0, // Will implement separately
      });
    });
  });
};

// ==================== Android Health Connect ====================
// Note: Android Health Connect requires additional native setup
// For now, Android users will log manually

export const initializeHealthConnect = async () => {
  if (Platform.OS !== 'android') return false;
  
  // TODO: Implement Google Fit / Health Connect
  // Requires: react-native-google-fit or similar
  console.log('Android Health Connect not yet implemented');
  return false;
};

export const getHealthConnectData = async () => {
  if (Platform.OS !== 'android') return null;
  
  // TODO: Implement when Health Connect SDK available
  return null;
};

// ==================== Unified Interface ====================

export const initializeHealthData = async () => {
  if (Platform.OS === 'ios') {
    return await initializeHealthKit();
  } else if (Platform.OS === 'android') {
    return await initializeHealthConnect();
  }
  return false;
};

export const syncHealthData = async () => {
  try {
    const healthData = Platform.OS === 'ios' 
      ? await getHealthKitData()
      : await getHealthConnectData();

    if (!healthData) return null;

    // Auto-log sleep if available
    if (healthData.sleepHours) {
      await healthAPI.logMetric({ sleepHours: healthData.sleepHours });
    }

    // Trigger symptom analysis
    await healthAPI.analyzeSymptoms();

    return healthData;
  } catch (error) {
    console.error('Failed to sync health data:', error);
    return null;
  }
};

export const updateProfileFromHealthData = async (healthData: any) => {
  try {
    if (healthData.biologicalSex || healthData.dateOfBirth || healthData.height || healthData.weight) {
      // Update profile with biological data
      const profileUpdate: any = {};
      
      if (healthData.biologicalSex) {
        profileUpdate.sex = healthData.biologicalSex === 'male' ? 'MALE' : 
                           healthData.biologicalSex === 'female' ? 'FEMALE' : 'OTHER';
      }
      if (healthData.dateOfBirth) {
        profileUpdate.dateOfBirth = healthData.dateOfBirth;
      }
      if (healthData.height) {
        profileUpdate.heightCm = healthData.height;
      }
      if (healthData.weight) {
        profileUpdate.weightKg = healthData.weight;
      }

      // This would be called during onboarding
      return profileUpdate;
    }
  } catch (error) {
    console.error('Failed to update profile from health data:', error);
  }
  return null;
};


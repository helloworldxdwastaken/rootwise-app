import { Platform } from 'react-native';
import * as AppleHealthKit from 'expo-apple-health';
import * as HealthConnect from 'expo-health-connect';
import { healthAPI } from './api';

// ==================== iOS HealthKit ====================

export const initializeHealthKit = async () => {
  if (Platform.OS !== 'ios') return false;

  try {
    const isAvailable = await AppleHealthKit.isAvailable();
    if (!isAvailable) return false;

    await AppleHealthKit.requestPermissions([
      'STEPS',
      'SLEEP_ANALYSIS',
      'HEIGHT',
      'WEIGHT',
      'DATE_OF_BIRTH',
      'BIOLOGICAL_SEX',
      'HEART_RATE',
    ]);

    return true;
  } catch (error) {
    console.error('HealthKit initialization failed:', error);
    return false;
  }
};

export const getHealthKitData = async () => {
  if (Platform.OS !== 'ios') return null;

  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get sleep (last night)
    const sleepData = await AppleHealthKit.getSleepSamples({
      startDate: yesterday.toISOString(),
      endDate: today.toISOString(),
    });

    let sleepHours = null;
    if (sleepData && sleepData.length > 0) {
      const totalMinutes = sleepData.reduce((sum: number, sample: any) => {
        const start = new Date(sample.startDate).getTime();
        const end = new Date(sample.endDate).getTime();
        return sum + (end - start) / 1000 / 60;
      }, 0);
      sleepHours = `${(totalMinutes / 60).toFixed(1)}hr`;
    }

    // Get steps (today)
    const stepsData = await AppleHealthKit.getStepCount({
      startDate: today.toISOString(),
    });

    // Get biological data (one-time)
    const bioData = await AppleHealthKit.getBiologicalSex();
    const dateOfBirth = await AppleHealthKit.getDateOfBirth();
    const height = await AppleHealthKit.getLatestHeight();
    const weight = await AppleHealthKit.getLatestWeight();

    return {
      sleepHours,
      steps: stepsData?.value || 0,
      biologicalSex: bioData?.value,
      dateOfBirth: dateOfBirth?.value,
      height: height?.value, // in cm
      weight: weight?.value, // in kg
    };
  } catch (error) {
    console.error('Failed to fetch HealthKit data:', error);
    return null;
  }
};

// ==================== Android Health Connect ====================

export const initializeHealthConnect = async () => {
  if (Platform.OS !== 'android') return false;

  try {
    const isAvailable = await HealthConnect.isAvailable();
    if (!isAvailable) return false;

    await HealthConnect.requestPermissions([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'Height' },
      { accessType: 'read', recordType: 'Weight' },
    ]);

    return true;
  } catch (error) {
    console.error('Health Connect initialization failed:', error);
    return false;
  }
};

export const getHealthConnectData = async () => {
  if (Platform.OS !== 'android') return null;

  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get sleep
    const sleepData = await HealthConnect.readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: yesterday.toISOString(),
        endTime: today.toISOString(),
      },
    });

    let sleepHours = null;
    if (sleepData && sleepData.length > 0) {
      const totalMinutes = sleepData.reduce((sum: number, session: any) => {
        const duration = session.endTime - session.startTime;
        return sum + duration / 1000 / 60;
      }, 0);
      sleepHours = `${(totalMinutes / 60).toFixed(1)}hr`;
    }

    // Get steps
    const stepsData = await HealthConnect.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: today.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    const totalSteps = stepsData.reduce((sum: number, record: any) => sum + record.count, 0);

    return {
      sleepHours,
      steps: totalSteps,
    };
  } catch (error) {
    console.error('Failed to fetch Health Connect data:', error);
    return null;
  }
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


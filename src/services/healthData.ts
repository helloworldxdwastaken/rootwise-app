import { Platform } from 'react-native';
import { healthAPI } from './api';

// ==================== TYPE DEFINITIONS ====================

export type HealthDataType = {
  steps?: number;
  sleepHours?: number;
  sleepStartTime?: Date;
  sleepEndTime?: Date;
  heartRate?: number;
  heartRateVariability?: number;
  activeEnergy?: number;
  weight?: number;
  height?: number;
  dateOfBirth?: Date;
  biologicalSex?: 'male' | 'female' | 'other';
  bloodOxygen?: number;
  restingHeartRate?: number;
};

export type HealthPermissionStatus = {
  authorized: boolean;
  shouldRequest: boolean;
  deniedPermissions: string[];
};

// ==================== iOS HealthKit ====================

let AppleHealthKit: any = null;

// Lazy load HealthKit only on iOS
const getHealthKit = () => {
  if (Platform.OS !== 'ios') return null;
  if (!AppleHealthKit) {
    try {
      const healthModule = require('react-native-health');
      AppleHealthKit = healthModule.default || healthModule;
      console.log('HealthKit module loaded:', !!AppleHealthKit);
    } catch (error) {
      console.log('HealthKit not available - this is normal in Expo Go. Use a development build for HealthKit:', error);
      return null;
    }
  }
  return AppleHealthKit;
};

// HealthKit permissions configuration
const HEALTHKIT_PERMISSIONS = {
  permissions: {
    read: [
      'Steps',
      'StepCount',
      'SleepAnalysis',
      'HeartRate',
      'HeartRateVariabilitySDNN',
      'ActiveEnergyBurned',
      'Weight',
      'Height',
      'DateOfBirth',
      'BiologicalSex',
      'OxygenSaturation',
      'RestingHeartRate',
    ],
    write: [
      'Steps',
      'SleepAnalysis',
      'Weight',
    ],
  },
};

/**
 * Initialize Apple HealthKit and request permissions
 */
export const initializeHealthKit = async (): Promise<HealthPermissionStatus & { expoGo?: boolean }> => {
  if (Platform.OS !== 'ios') {
    return { authorized: false, shouldRequest: false, deniedPermissions: [] };
  }

  const HealthKit = getHealthKit();
  if (!HealthKit) {
    // HealthKit module not available - likely running in Expo Go
    console.log('HealthKit module not loaded - this requires a development build, not Expo Go');
    return { 
      authorized: false, 
      shouldRequest: false, 
      deniedPermissions: ['HealthKit requires a development build. Expo Go does not support HealthKit.'],
      expoGo: true
    };
  }

  // First check if HealthKit is available on this device
  const available = await isHealthKitAvailable();
  if (!available) {
    console.log('HealthKit not available on this device');
    return { 
      authorized: false, 
      shouldRequest: false, 
      deniedPermissions: ['HealthKit is not available on this device'] 
    };
  }

  return new Promise((resolve) => {
    console.log('Requesting HealthKit permissions...');
    HealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, (error: string) => {
      if (error) {
        console.log('HealthKit init error:', error);
        // Check if user denied or if there's an actual error
        const isDenied = error.toLowerCase().includes('denied') || error.toLowerCase().includes('not determined');
        resolve({
          authorized: false,
          shouldRequest: isDenied,
          deniedPermissions: [isDenied ? 'Please allow access in Health app' : error],
        });
      } else {
        console.log('HealthKit initialized successfully');
        resolve({
          authorized: true,
          shouldRequest: false,
          deniedPermissions: [],
        });
      }
    });
  });
};

/**
 * Check if HealthKit is available on this device
 */
export const isHealthKitAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    console.log('HealthKit: Not iOS platform');
    return false;
  }

  const HealthKit = getHealthKit();
  if (!HealthKit) {
    console.log('HealthKit: Module not loaded - requires development build, not Expo Go');
    return false;
  }

  return new Promise((resolve) => {
    try {
      if (typeof HealthKit.isAvailable === 'function') {
        HealthKit.isAvailable((error: any, available: boolean) => {
          console.log('HealthKit.isAvailable result:', { error, available });
          resolve(!error && available);
        });
      } else {
        // Some versions don't have isAvailable, try to init directly
        console.log('HealthKit: isAvailable not found, assuming available');
        resolve(true);
      }
    } catch (error) {
      console.log('HealthKit availability check error:', error);
      resolve(false);
    }
  });
};

/**
 * Get today's step count from HealthKit
 */
export const getStepsToday = async (): Promise<number | null> => {
  if (Platform.OS !== 'ios') return null;
  
  const HealthKit = getHealthKit();
  if (!HealthKit) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Promise((resolve) => {
    HealthKit.getStepCount(
      { date: today.toISOString() },
      (error: any, results: { value: number }) => {
        if (error) {
          console.log('Error getting steps:', error);
          resolve(null);
        } else {
          resolve(results?.value || 0);
        }
      }
    );
  });
};

/**
 * Get last night's sleep data from HealthKit
 */
export const getSleepData = async (): Promise<{ hours: number; startTime: Date; endTime: Date } | null> => {
  if (Platform.OS !== 'ios') return null;
  
  const HealthKit = getHealthKit();
  if (!HealthKit) return null;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(18, 0, 0, 0); // Start from 6 PM yesterday

  const now = new Date();
  now.setHours(12, 0, 0, 0); // Until noon today

  return new Promise((resolve) => {
    HealthKit.getSleepSamples(
      {
        startDate: yesterday.toISOString(),
        endDate: now.toISOString(),
        limit: 10,
      },
      (error: any, results: Array<{ value: string; startDate: string; endDate: string }>) => {
        if (error || !results || results.length === 0) {
          console.log('No sleep data found:', error);
          resolve(null);
          return;
        }

        // Filter for actual sleep (not "InBed")
        const sleepSamples = results.filter(
          (sample) => sample.value === 'ASLEEP' || sample.value === 'INBED'
        );

        if (sleepSamples.length === 0) {
          resolve(null);
          return;
        }

        // Calculate total sleep duration
        let totalMinutes = 0;
        let earliestStart = new Date(sleepSamples[0].startDate);
        let latestEnd = new Date(sleepSamples[0].endDate);

        sleepSamples.forEach((sample) => {
          const start = new Date(sample.startDate);
          const end = new Date(sample.endDate);
          const duration = (end.getTime() - start.getTime()) / (1000 * 60);
          totalMinutes += duration;

          if (start < earliestStart) earliestStart = start;
          if (end > latestEnd) latestEnd = end;
        });

        resolve({
          hours: Math.round((totalMinutes / 60) * 10) / 10, // Round to 1 decimal
          startTime: earliestStart,
          endTime: latestEnd,
        });
      }
    );
  });
};

/**
 * Get heart rate data from HealthKit
 */
export const getHeartRateData = async (): Promise<{ current: number; resting: number | null } | null> => {
  if (Platform.OS !== 'ios') return null;
  
  const HealthKit = getHealthKit();
  if (!HealthKit) return null;

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  return new Promise((resolve) => {
    HealthKit.getHeartRateSamples(
      {
        startDate: hourAgo.toISOString(),
        endDate: now.toISOString(),
        ascending: false,
        limit: 1,
      },
      (error: any, results: Array<{ value: number }>) => {
        if (error || !results || results.length === 0) {
          resolve(null);
          return;
        }

        // Also get resting heart rate
        HealthKit.getRestingHeartRate(
          { startDate: hourAgo.toISOString(), endDate: now.toISOString() },
          (restError: any, restResults: Array<{ value: number }>) => {
            resolve({
              current: results[0].value,
              resting: restResults?.[0]?.value || null,
            });
          }
        );
      }
    );
  });
};

/**
 * Get biological data (DOB, sex, height, weight) from HealthKit
 */
export const getBiologicalData = async (): Promise<{
  dateOfBirth: Date | null;
  biologicalSex: 'male' | 'female' | 'other' | null;
  height: number | null;
  weight: number | null;
} | null> => {
  if (Platform.OS !== 'ios') return null;

  const HealthKit = getHealthKit();
  if (!HealthKit) return null;

  const result: {
    dateOfBirth: Date | null;
    biologicalSex: 'male' | 'female' | 'other' | null;
    height: number | null;
    weight: number | null;
  } = {
    dateOfBirth: null,
    biologicalSex: null,
    height: null,
    weight: null,
  };

  // Get Date of Birth
  await new Promise<void>((resolve) => {
    HealthKit.getDateOfBirth({}, (error: any, results: { value: string; age: number }) => {
      if (!error && results?.value) {
        result.dateOfBirth = new Date(results.value);
      }
      resolve();
    });
  });

  // Get Biological Sex
  await new Promise<void>((resolve) => {
    HealthKit.getBiologicalSex({}, (error: any, results: { value: string }) => {
      if (!error && results?.value) {
        const sex = results.value.toLowerCase();
        if (sex === 'male' || sex === 'female') {
          result.biologicalSex = sex;
        } else {
          result.biologicalSex = 'other';
        }
      }
      resolve();
    });
  });

  // Get Height (most recent)
  await new Promise<void>((resolve) => {
    HealthKit.getLatestHeight({}, (error: any, results: { value: number }) => {
      if (!error && results?.value) {
        // Convert to cm if needed (HealthKit returns in inches by default)
        result.height = Math.round(results.value * 2.54);
      }
      resolve();
    });
  });

  // Get Weight (most recent)
  await new Promise<void>((resolve) => {
    HealthKit.getLatestWeight({}, (error: any, results: { value: number }) => {
      if (!error && results?.value) {
        // Convert to kg if needed (HealthKit returns in pounds by default)
        result.weight = Math.round(results.value * 0.453592 * 10) / 10;
      }
      resolve();
    });
  });

  return result;
};

/**
 * Get all available health data from HealthKit
 */
export const getHealthKitData = async (): Promise<HealthDataType | null> => {
  if (Platform.OS !== 'ios') return null;

  try {
    const [steps, sleep, heartRate, biological] = await Promise.all([
      getStepsToday(),
      getSleepData(),
      getHeartRateData(),
      getBiologicalData(),
    ]);

    const data: HealthDataType = {};

    if (steps !== null) data.steps = steps;
    if (sleep) {
      data.sleepHours = sleep.hours;
      data.sleepStartTime = sleep.startTime;
      data.sleepEndTime = sleep.endTime;
    }
    if (heartRate) {
      data.heartRate = heartRate.current;
      if (heartRate.resting) data.restingHeartRate = heartRate.resting;
    }
    if (biological) {
      if (biological.dateOfBirth) data.dateOfBirth = biological.dateOfBirth;
      if (biological.biologicalSex) data.biologicalSex = biological.biologicalSex;
      if (biological.height) data.height = biological.height;
      if (biological.weight) data.weight = biological.weight;
    }

    return Object.keys(data).length > 0 ? data : null;
  } catch (error) {
    console.error('Error getting HealthKit data:', error);
  return null;
  }
};

// ==================== Android Health Connect ====================

let HealthConnect: any = null;

// Lazy load Health Connect only on Android
const getHealthConnect = () => {
  if (Platform.OS !== 'android') return null;
  if (!HealthConnect) {
    try {
      HealthConnect = require('react-native-health-connect');
    } catch (error) {
      console.log('Health Connect not available:', error);
      return null;
    }
  }
  return HealthConnect;
};

/**
 * Initialize Android Health Connect and request permissions
 */
export const initializeHealthConnect = async (): Promise<HealthPermissionStatus> => {
  if (Platform.OS !== 'android') {
    return { authorized: false, shouldRequest: false, deniedPermissions: [] };
  }

  const HC = getHealthConnect();
  if (!HC) {
    return { authorized: false, shouldRequest: false, deniedPermissions: ['Health Connect not available'] };
  }

  try {
    // Check if Health Connect is available
    const isAvailable = await HC.getSdkStatus();
    console.log('Health Connect SDK status:', isAvailable);
    
    if (isAvailable !== HC.SdkAvailabilityStatus.SDK_AVAILABLE) {
      // Provide helpful message based on SDK status
      let message = 'Health Connect not available';
      
      if (isAvailable === HC.SdkAvailabilityStatus.SDK_UNAVAILABLE) {
        message = 'Please install Google Health Connect from the Play Store';
      } else if (isAvailable === HC.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
        message = 'Please update Google Health Connect in the Play Store';
      }
      
      return {
        authorized: false,
        shouldRequest: false,
        deniedPermissions: [message],
      };
    }

    // Initialize the SDK first
    console.log('Initializing Health Connect SDK...');
    await HC.initialize();

    // Request permissions with additional error handling for lateinit crash
    const permissions = [
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'Weight' },
      { accessType: 'read', recordType: 'Height' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      { accessType: 'write', recordType: 'Steps' },
      { accessType: 'write', recordType: 'Weight' },
    ];

    console.log('Requesting Health Connect permissions...');
    try {
      const granted = await HC.requestPermission(permissions);
      
      const deniedPerms = permissions
        .filter((p) => !granted.some((g: any) => g.recordType === p.recordType && g.accessType === p.accessType))
        .map((p) => `${p.accessType}:${p.recordType}`);

      return {
        authorized: deniedPerms.length === 0,
        shouldRequest: deniedPerms.length > 0,
        deniedPermissions: deniedPerms,
      };
    } catch (permError: any) {
      // Handle the "lateinit property requestPermission has not been initialized" crash
      if (permError.message?.includes('lateinit') || permError.message?.includes('requestPermission')) {
        console.error('Health Connect permission delegate not properly initialized.');
        console.log('This may require rebuilding the app after running: npx expo prebuild --clean');
        return {
          authorized: false,
          shouldRequest: false,
          deniedPermissions: ['Health Connect setup incomplete - rebuild required'],
        };
      }
      throw permError;
    }
  } catch (error: any) {
    console.error('Health Connect init error:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Unknown error';
    if (error.message?.includes('lateinit')) {
      errorMessage = 'Health Connect not properly configured. Please rebuild the app.';
    }
    
    return {
      authorized: false,
      shouldRequest: true,
      deniedPermissions: [errorMessage],
    };
  }
};

/**
 * Check if Health Connect is available on this Android device
 */
export const isHealthConnectAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  
  const HC = getHealthConnect();
  if (!HC) return false;

  try {
    const status = await HC.getSdkStatus();
    return status === HC.SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
  return false;
  }
};

/**
 * Get today's step count from Health Connect
 */
export const getHealthConnectSteps = async (): Promise<number | null> => {
  if (Platform.OS !== 'android') return null;
  
  const HC = getHealthConnect();
  if (!HC) return null;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const result = await HC.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: today.toISOString(),
        endTime: now.toISOString(),
      },
    });

    let totalSteps = 0;
    result.records.forEach((record: any) => {
      totalSteps += record.count || 0;
    });

    return totalSteps;
  } catch (error) {
    console.error('Error getting Health Connect steps:', error);
    return null;
  }
};

/**
 * Get sleep data from Health Connect
 */
export const getHealthConnectSleep = async (): Promise<{ hours: number; startTime: Date; endTime: Date } | null> => {
  if (Platform.OS !== 'android') return null;
  
  const HC = getHealthConnect();
  if (!HC) return null;

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(18, 0, 0, 0);

    const now = new Date();
    now.setHours(12, 0, 0, 0);

    const result = await HC.readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: yesterday.toISOString(),
        endTime: now.toISOString(),
      },
    });

    if (!result.records || result.records.length === 0) {
      return null;
    }

    let totalMinutes = 0;
    let earliestStart = new Date(result.records[0].startTime);
    let latestEnd = new Date(result.records[0].endTime);

    result.records.forEach((session: any) => {
      const start = new Date(session.startTime);
      const end = new Date(session.endTime);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);
      totalMinutes += duration;

      if (start < earliestStart) earliestStart = start;
      if (end > latestEnd) latestEnd = end;
    });

    return {
      hours: Math.round((totalMinutes / 60) * 10) / 10,
      startTime: earliestStart,
      endTime: latestEnd,
    };
  } catch (error) {
    console.error('Error getting Health Connect sleep:', error);
    return null;
  }
};

/**
 * Get heart rate from Health Connect
 */
export const getHealthConnectHeartRate = async (): Promise<number | null> => {
  if (Platform.OS !== 'android') return null;
  
  const HC = getHealthConnect();
  if (!HC) return null;

  try {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const result = await HC.readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: hourAgo.toISOString(),
        endTime: now.toISOString(),
      },
    });

    if (!result.records || result.records.length === 0) {
      return null;
    }

    // Get the most recent reading
    const latestRecord = result.records[result.records.length - 1];
    return latestRecord.samples?.[0]?.beatsPerMinute || null;
  } catch (error) {
    console.error('Error getting Health Connect heart rate:', error);
    return null;
  }
};

/**
 * Get weight and height from Health Connect
 */
export const getHealthConnectBodyData = async (): Promise<{ weight: number | null; height: number | null }> => {
  if (Platform.OS !== 'android') return { weight: null, height: null };
  
  const HC = getHealthConnect();
  if (!HC) return { weight: null, height: null };

  const result: { weight: number | null; height: number | null } = { weight: null, height: null };

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const now = new Date();

    // Get weight
    const weightResult = await HC.readRecords('Weight', {
      timeRangeFilter: {
        operator: 'between',
        startTime: thirtyDaysAgo.toISOString(),
        endTime: now.toISOString(),
      },
    });

    if (weightResult.records?.length > 0) {
      const latestWeight = weightResult.records[weightResult.records.length - 1];
      result.weight = Math.round(latestWeight.weight.inKilograms * 10) / 10;
    }

    // Get height
    const heightResult = await HC.readRecords('Height', {
      timeRangeFilter: {
        operator: 'between',
        startTime: thirtyDaysAgo.toISOString(),
        endTime: now.toISOString(),
      },
    });

    if (heightResult.records?.length > 0) {
      const latestHeight = heightResult.records[heightResult.records.length - 1];
      result.height = Math.round(latestHeight.height.inMeters * 100); // Convert to cm
    }
  } catch (error) {
    console.error('Error getting Health Connect body data:', error);
  }

  return result;
};

/**
 * Get all available health data from Health Connect
 */
export const getHealthConnectData = async (): Promise<HealthDataType | null> => {
  if (Platform.OS !== 'android') return null;

  try {
    const [steps, sleep, heartRate, bodyData] = await Promise.all([
      getHealthConnectSteps(),
      getHealthConnectSleep(),
      getHealthConnectHeartRate(),
      getHealthConnectBodyData(),
    ]);

    const data: HealthDataType = {};

    if (steps !== null) data.steps = steps;
    if (sleep) {
      data.sleepHours = sleep.hours;
      data.sleepStartTime = sleep.startTime;
      data.sleepEndTime = sleep.endTime;
    }
    if (heartRate !== null) data.heartRate = heartRate;
    if (bodyData.weight !== null) data.weight = bodyData.weight;
    if (bodyData.height !== null) data.height = bodyData.height;

    return Object.keys(data).length > 0 ? data : null;
  } catch (error) {
    console.error('Error getting Health Connect data:', error);
  return null;
  }
};

// ==================== Unified Interface ====================

/**
 * Initialize health data access for the current platform
 */
export const initializeHealthData = async (): Promise<HealthPermissionStatus> => {
  if (Platform.OS === 'ios') {
    return await initializeHealthKit();
  } else if (Platform.OS === 'android') {
    return await initializeHealthConnect();
  }
  return { authorized: false, shouldRequest: false, deniedPermissions: ['Unsupported platform'] };
};

/**
 * Check if health data access is available on this device
 */
export const isHealthDataAvailable = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    return await isHealthKitAvailable();
  } else if (Platform.OS === 'android') {
    return await isHealthConnectAvailable();
  }
  return false;
};

/**
 * Get health data from the appropriate platform
 */
export const getHealthData = async (): Promise<HealthDataType | null> => {
  if (Platform.OS === 'ios') {
    return await getHealthKitData();
  } else if (Platform.OS === 'android') {
    return await getHealthConnectData();
  }
  return null;
};

/**
 * Sync health data from device to Rootwise backend
 * Sends: sleep, steps (via symptoms), weight, height to database
 */
export const syncHealthData = async (): Promise<{
  success: boolean;
  data: HealthDataType | null;
  syncedItems: string[];
  error?: string;
}> => {
  try {
    const healthData = await getHealthData();
    const syncedItems: string[] = [];

    if (!healthData) {
      return { success: false, data: null, syncedItems: [], error: 'No health data available' };
    }

    // 1. Sync daily health metrics (sleep, steps, heart rate) → /api/health/today
    const dailyMetrics: any = {};
    
    if (healthData.sleepHours) {
      dailyMetrics.sleepHours = healthData.sleepHours.toString();
      syncedItems.push(`Sleep: ${healthData.sleepHours} hrs`);
    }
    
    if (healthData.steps !== undefined) {
      dailyMetrics.steps = healthData.steps;
      syncedItems.push(`Steps: ${healthData.steps.toLocaleString()}`);
    }
    
    if (healthData.heartRate) {
      dailyMetrics.heartRate = healthData.heartRate;
      syncedItems.push(`Heart Rate: ${healthData.heartRate} bpm`);
    }
    
    if (healthData.activeEnergy) {
      dailyMetrics.activeCalories = Math.round(healthData.activeEnergy);
      syncedItems.push(`Active Calories: ${Math.round(healthData.activeEnergy)}`);
    }
    
    if (Object.keys(dailyMetrics).length > 0) {
      await healthAPI.logMetric(dailyMetrics);
    }

    // 2. Sync profile data (weight, height, DOB, sex) → /api/me/profile
    const profileUpdate: any = {};
    
    if (healthData.weight) {
      profileUpdate.weightKg = healthData.weight;
      syncedItems.push(`Weight: ${healthData.weight} kg`);
    }
    
    if (healthData.height) {
      profileUpdate.heightCm = healthData.height;
      syncedItems.push(`Height: ${healthData.height} cm`);
    }
    
    if (healthData.dateOfBirth) {
      profileUpdate.dateOfBirth = healthData.dateOfBirth.toISOString().split('T')[0];
      syncedItems.push('Date of Birth');
    }
    
    if (healthData.biologicalSex) {
      profileUpdate.sex = healthData.biologicalSex === 'male' ? 'MALE' :
                         healthData.biologicalSex === 'female' ? 'FEMALE' : 'OTHER';
      syncedItems.push(`Sex: ${healthData.biologicalSex}`);
    }

    // Update profile if we have any profile data
    if (Object.keys(profileUpdate).length > 0) {
      const { profileAPI } = await import('./api');
      await profileAPI.updateProfile(profileUpdate);
    }

    // 3. Trigger AI symptom analysis with all the new data
    await healthAPI.analyzeSymptoms();

    return { success: true, data: healthData, syncedItems };
  } catch (error: any) {
    console.error('Failed to sync health data:', error);
    return { success: false, data: null, syncedItems: [], error: error.message || 'Sync failed' };
  }
};

/**
 * Update user profile from health data (for onboarding)
 */
export const updateProfileFromHealthData = async (healthData: HealthDataType): Promise<{
  sex?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  heightCm?: number;
  weightKg?: number;
} | null> => {
  try {
    const profileUpdate: {
      sex?: 'MALE' | 'FEMALE' | 'OTHER';
      dateOfBirth?: string;
      heightCm?: number;
      weightKg?: number;
    } = {};
      
      if (healthData.biologicalSex) {
        profileUpdate.sex = healthData.biologicalSex === 'male' ? 'MALE' : 
                           healthData.biologicalSex === 'female' ? 'FEMALE' : 'OTHER';
      }
      if (healthData.dateOfBirth) {
      profileUpdate.dateOfBirth = healthData.dateOfBirth.toISOString().split('T')[0];
      }
      if (healthData.height) {
        profileUpdate.heightCm = healthData.height;
      }
      if (healthData.weight) {
        profileUpdate.weightKg = healthData.weight;
      }

    return Object.keys(profileUpdate).length > 0 ? profileUpdate : null;
  } catch (error) {
    console.error('Failed to update profile from health data:', error);
  return null;
  }
};

/**
 * Get the platform name for display
 */
export const getHealthPlatformName = (): string => {
  if (Platform.OS === 'ios') return 'Apple Health';
  if (Platform.OS === 'android') return 'Health Connect';
  return 'Health Data';
};

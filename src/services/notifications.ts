import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== NOTIFICATION CONFIGURATION ====================

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Notification identifiers for cancellation
const NOTIFICATION_IDS = {
  HYDRATION_REMINDER: 'hydration-reminder',
  SLEEP_LOG_REMINDER: 'sleep-log-reminder',
  FOOD_LOG_REMINDER: 'food-log-reminder',
};

// Storage keys for tracking
const STORAGE_KEYS = {
  LAST_HYDRATION_REMINDER: 'last_hydration_reminder',
  LAST_SLEEP_REMINDER: 'last_sleep_reminder',
  REMINDERS_ENABLED: 'reminders_enabled',
};

// ==================== PERMISSION HANDLING ====================

// Request push permissions and return Expo push token if granted
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      // Create notification channels for Android
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
      });
      
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Health Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Reminders for hydration, sleep logging, and food tracking',
        sound: 'default',
      });
    }

    // Try to get Expo push token, but handle Firebase/FCM not being configured
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      const token = tokenResponse.data;
      console.log('Expo push token:', token);
      return token;
    } catch (tokenError: any) {
      // Firebase/FCM not configured - log but don't crash
      if (Platform.OS === 'android' && tokenError.message?.includes('FirebaseApp')) {
        console.log('Push notifications require Firebase setup on Android. Skipping token registration.');
        console.log('See: https://docs.expo.dev/push-notifications/fcm-credentials/');
        return null;
      }
      throw tokenError;
    }
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return null;
  }
}

// ==================== SMART REMINDER SYSTEM ====================

interface HealthData {
  hydrationGlasses?: number;
  sleepHours?: string | number | null;
  energyScore?: number | null;
  caloriesConsumed?: number;
}

/**
 * Check health data and schedule appropriate reminders
 * Call this when the app opens or when health data changes
 */
export async function checkAndScheduleReminders(healthData: HealthData) {
  const remindersEnabled = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS_ENABLED);
  if (remindersEnabled === 'false') {
    console.log('Reminders are disabled');
    return;
  }

  const now = new Date();
  const currentHour = now.getHours();

  console.log(`Checking reminders at ${currentHour}:00, healthData:`, healthData);

  // Check hydration
  await checkHydrationReminder(healthData.hydrationGlasses || 0, currentHour);

  // Check sleep logging
  await checkSleepLogReminder(healthData.sleepHours, currentHour);

  // Check food logging
  await checkFoodLogReminder(healthData.caloriesConsumed || 0, currentHour);
}

/**
 * Hydration reminder logic:
 * - 10 AM: Should have at least 2 glasses
 * - 12 PM (noon): Should have at least 3 glasses
 * - 2 PM: Should have at least 4 glasses
 * - 4 PM: Should have at least 5 glasses
 * - 6 PM: Should have at least 6 glasses
 */
async function checkHydrationReminder(glasses: number, currentHour: number) {
  // Only check during waking hours (8 AM - 9 PM)
  if (currentHour < 8 || currentHour > 21) return;

  // Calculate expected glasses based on time
  // Target: 8 glasses by 9 PM, starting from 8 AM
  const hoursAwake = currentHour - 8;
  const expectedGlasses = Math.min(Math.floor(hoursAwake * 0.6) + 1, 8);

  // Check if user is behind on hydration
  if (glasses < expectedGlasses - 1) {
    // Check if we already sent a reminder in the last 2 hours
    const lastReminder = await AsyncStorage.getItem(STORAGE_KEYS.LAST_HYDRATION_REMINDER);
    const lastReminderTime = lastReminder ? parseInt(lastReminder) : 0;
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);

    if (lastReminderTime < twoHoursAgo) {
      const deficit = expectedGlasses - glasses;
      await scheduleHydrationReminder(glasses, deficit);
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_HYDRATION_REMINDER, Date.now().toString());
    }
  }
}

/**
 * Sleep log reminder logic:
 * - If it's between 9 AM and 12 PM and sleep hasn't been logged, remind
 */
async function checkSleepLogReminder(sleepHours: string | number | null | undefined, currentHour: number) {
  // Only remind between 9 AM and 12 PM
  if (currentHour < 9 || currentHour > 12) return;

  // Check if sleep has been logged
  const sleepLogged = sleepHours !== null && sleepHours !== undefined && sleepHours !== '';

  if (!sleepLogged) {
    // Check if we already sent a reminder today
    const lastReminder = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SLEEP_REMINDER);
    const lastReminderDate = lastReminder ? new Date(parseInt(lastReminder)).toDateString() : '';
    const today = new Date().toDateString();

    if (lastReminderDate !== today) {
      await scheduleSleepLogReminder();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SLEEP_REMINDER, Date.now().toString());
    }
  }
}

/**
 * Food log reminder logic:
 * - 12:30 PM: Remind to log lunch if no food logged since morning
 * - 7 PM: Remind to log dinner if low calories for the day
 */
async function checkFoodLogReminder(caloriesConsumed: number, currentHour: number) {
  // Lunch reminder around 12:30 PM
  if (currentHour === 12 || currentHour === 13) {
    if (caloriesConsumed < 300) {
      await scheduleFoodReminder('lunch');
    }
  }
  
  // Dinner reminder around 7 PM
  if (currentHour === 19 || currentHour === 20) {
    if (caloriesConsumed < 1000) {
      await scheduleFoodReminder('dinner');
    }
  }
}

// ==================== SCHEDULE NOTIFICATIONS ====================

async function scheduleHydrationReminder(currentGlasses: number, deficit: number) {
  // Cancel any existing hydration reminder
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.HYDRATION_REMINDER);

  const messages = [
    `💧 Time to hydrate! You've had ${currentGlasses} glasses today. Try to drink ${deficit} more!`,
    `🥤 Stay hydrated! Only ${currentGlasses} glasses so far. Your body needs more water!`,
    `💦 Quick reminder: Drink some water! You're ${deficit} glasses behind for today.`,
    `🌊 Hydration check! ${currentGlasses}/8 glasses. Keep drinking!`,
  ];

  const message = messages[Math.floor(Math.random() * messages.length)];

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.HYDRATION_REMINDER,
    content: {
      title: 'Hydration Reminder 💧',
      body: message,
      sound: 'default',
      data: { type: 'hydration_reminder' },
    },
    trigger: {
      seconds: 5, // Show almost immediately
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    },
  });

  console.log('Scheduled hydration reminder:', message);
}

async function scheduleSleepLogReminder() {
  // Cancel any existing sleep reminder
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.SLEEP_LOG_REMINDER);

  const messages = [
    "🌙 Good morning! Don't forget to log how you slept last night.",
    "😴 How did you sleep? Take a moment to log your sleep hours.",
    "🛏️ Quick check-in: Log your sleep to track your rest patterns!",
    "✨ Start your day right - log your sleep hours!",
  ];

  const message = messages[Math.floor(Math.random() * messages.length)];

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.SLEEP_LOG_REMINDER,
    content: {
      title: 'Log Your Sleep 😴',
      body: message,
      sound: 'default',
      data: { type: 'sleep_reminder' },
    },
    trigger: {
      seconds: 5,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    },
  });

  console.log('Scheduled sleep log reminder:', message);
}

async function scheduleFoodReminder(meal: 'lunch' | 'dinner') {
  // Cancel any existing food reminder
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.FOOD_LOG_REMINDER);

  const messages = {
    lunch: [
      "🍽️ Lunchtime! Don't forget to scan or log your meal.",
      "🥗 Time for lunch? Log what you eat to track your nutrition!",
      "🍴 Reminder: Log your lunch to keep your calorie tracking accurate.",
    ],
    dinner: [
      "🌙 Evening check: Have you logged your meals today?",
      "🍽️ Don't forget to log your dinner!",
      "📊 Your food log is looking light. Remember to track your meals!",
    ],
  };

  const mealMessages = messages[meal];
  const message = mealMessages[Math.floor(Math.random() * mealMessages.length)];

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.FOOD_LOG_REMINDER,
    content: {
      title: meal === 'lunch' ? 'Log Your Lunch 🍽️' : 'Log Your Dinner 🌙',
      body: message,
      sound: 'default',
      data: { type: 'food_reminder', meal },
    },
    trigger: {
      seconds: 5,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    },
  });

  console.log(`Scheduled ${meal} reminder:`, message);
}

// ==================== SCHEDULED DAILY REMINDERS ====================

/**
 * Schedule recurring daily reminders at specific times
 * Call this once when the app starts or when user enables reminders
 */
export async function scheduleDailyReminders() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    console.log('Cannot schedule reminders - permissions not granted');
    return;
  }

  // Cancel all existing scheduled notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Morning sleep reminder at 9:30 AM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Log Your Sleep 😴',
      body: "Good morning! How did you sleep last night? Take a moment to log it.",
      sound: 'default',
      data: { type: 'sleep_reminder' },
    },
    trigger: {
      hour: 9,
      minute: 30,
      repeats: true,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    },
  });

  // Mid-morning hydration reminder at 10:30 AM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hydration Check 💧',
      body: "Have you had enough water this morning? Stay hydrated!",
      sound: 'default',
      data: { type: 'hydration_reminder' },
    },
    trigger: {
      hour: 10,
      minute: 30,
      repeats: true,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    },
  });

  // Afternoon hydration reminder at 2:30 PM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Afternoon Hydration 💦',
      body: "Quick reminder to drink some water! Keep your energy up.",
      sound: 'default',
      data: { type: 'hydration_reminder' },
    },
    trigger: {
      hour: 14,
      minute: 30,
      repeats: true,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    },
  });

  // Evening hydration reminder at 6 PM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Evening Hydration 🌅',
      body: "How's your water intake today? A few more glasses before bed!",
      sound: 'default',
      data: { type: 'hydration_reminder' },
    },
    trigger: {
      hour: 18,
      minute: 0,
      repeats: true,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    },
  });

  console.log('Daily reminders scheduled successfully');
}

// ==================== TOGGLE REMINDERS ====================

export async function setRemindersEnabled(enabled: boolean) {
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS_ENABLED, enabled.toString());
  
  if (enabled) {
    await scheduleDailyReminders();
  } else {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  
  console.log(`Reminders ${enabled ? 'enabled' : 'disabled'}`);
}

export async function areRemindersEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS_ENABLED);
  return value !== 'false'; // Default to enabled
}

// ==================== CANCEL SPECIFIC REMINDERS ====================

export async function cancelHydrationReminder() {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.HYDRATION_REMINDER);
}

export async function cancelSleepReminder() {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.SLEEP_LOG_REMINDER);
}

export async function cancelFoodReminder() {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.FOOD_LOG_REMINDER);
}

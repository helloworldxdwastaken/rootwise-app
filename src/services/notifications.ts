import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

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
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
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

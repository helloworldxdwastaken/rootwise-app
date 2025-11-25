import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermissions } from './src/services/notifications';

// Error Boundary to catch crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorHeader}>
            <Ionicons name="warning-outline" size={24} color="#e74c3c" />
            <Text style={styles.errorTitle}>App Crashed</Text>
          </View>
          <Text style={styles.errorSubtitle}>Don't worry, here's what happened:</Text>
          <ScrollView style={styles.errorScroll}>
            <Text style={styles.errorText}>
              {this.state.error?.toString()}
              {'\n\n'}
              Stack:
              {'\n'}
              {this.state.error?.stack}
            </Text>
          </ScrollView>
          <Text style={styles.errorHelp}>
            Screenshot this and send to the developer!
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  // Log startup
  React.useEffect(() => {
    console.log('App started successfully');
    console.log('Environment:', __DEV__ ? 'Development' : 'Production');
  }, []);

  // Ask for push notification permission on entry
  React.useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    requestNotificationPermissions();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SafeAreaProvider>
          <View style={styles.appWrapper}>
            <StatusBar style="dark" />
            <AppNavigator />
          </View>
        </SafeAreaProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  appWrapper: {
    flex: 1,
    paddingTop: 15,
    backgroundColor: '#fdf8f3',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorScroll: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#2c3e50',
  },
  errorHelp: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

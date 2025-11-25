import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../constants/theme';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OverviewScreen from '../screens/OverviewScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab icons component
function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  const icons: { [key: string]: { focused: string; default: string } } = {
    Home: { focused: 'home', default: 'home-outline' },
    Chat: { focused: 'chatbubbles', default: 'chatbubbles-outline' },
    Settings: { focused: 'settings', default: 'settings-outline' },
  };

  const iconName = (focused ? icons[name].focused : icons[name].default) as keyof typeof Ionicons.glyphMap;

  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <Ionicons name={iconName} size={focused ? 28 : 24} color={color} />
    </View>
  );
}

// Main tabs (after login)
function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => (
          <TabIcon name={route.name} focused={focused} color={color} />
        ),
        tabBarLabel: ({ color }) => (
          <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
            {route.name}
          </Text>
        ),
        tabBarItemStyle: styles.tabItem,
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: Math.max(bottomInset, 12),
            paddingTop: 12,
            marginBottom: 0,
            paddingHorizontal: 16,
            height: 64 + bottomInset,
          },
        ],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
      })}
    >
      <Tab.Screen name="Home" component={OverviewScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Auth stack (before login)
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Root navigator
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="leaf" size={56} color={colors.primary} />
        <Text style={styles.loadingText}>Loading Rootwise...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: 16,
  },
  loadingIcon: {
    fontSize: 60,
  },
  loadingText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  tabBar: {
    minHeight: 70,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    elevation: 10,
    shadowColor: '#0f2822',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabIconFocused: {
    transform: [{ scale: 1.1 }],
  },
  tabIconText: {
    fontSize: 24,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
});

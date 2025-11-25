import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Backend URL: default to production, allow override via Expo config/env
const ENV_API_BASE =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  // eslint-disable-next-line no-undef
  (typeof process !== 'undefined' ? (process as any).env?.EXPO_PUBLIC_API_BASE_URL : undefined);

const API_BASE_URL = ENV_API_BASE || 'https://rootwise.vercel.app/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear session and trigger logout
      await AsyncStorage.removeItem('session_token');
      await AsyncStorage.removeItem('user_data');
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================

export const authAPI = {
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },

  login: async (email: string, password: string) => {
    try {
      console.log('Logging in via mobile endpoint...');
      
      // Use the mobile-specific login endpoint (returns JWT token)
      const response = await api.post('/auth/mobile-login', { 
        email: email.toLowerCase().trim(), 
        password 
      });

      console.log('Login successful');

      // Store the JWT token
      if (response.data.token) {
        await AsyncStorage.setItem('session_token', response.data.token);
      }
      
      return {
        user: response.data.user,
        success: true,
      };
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Invalid email or password');
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('session_token');
    await AsyncStorage.removeItem('user_data');
    try {
      await api.post('/auth/signout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
};

// ==================== PROFILE ====================

export const profileAPI = {
  getProfile: async () => {
    const response = await api.get('/me/profile');
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.put('/me/profile', data);
    return response.data;
  },
};

// ==================== HEALTH TRACKING ====================

export const healthAPI = {
  getToday: async () => {
    const response = await api.get('/health/today');
    return response.data;
  },

  logMetric: async (data: {
    energyScore?: number;
    sleepHours?: string;
    hydrationGlasses?: number;
    moodScore?: number;
  }) => {
    const response = await api.post('/health/today', data);
    return response.data;
  },

  getWeekly: async () => {
    const response = await api.get('/health/weekly');
    return response.data;
  },

  analyzeSymptoms: async () => {
    const response = await api.post('/health/analyze-symptoms');
    return response.data;
  },
};

// ==================== CHAT ====================

export const chatAPI = {
  sendQuickMessage: async (message: string, context?: any) => {
    const response = await api.post('/chat/quick', { message, context });
    return response.data;
  },

  createSession: async () => {
    const response = await api.post('/chat/session', { source: 'mobile' });
    return response.data;
  },

  getSessions: async () => {
    const response = await api.get('/chat/session');
    return response.data;
  },
};

// ==================== ONBOARDING ====================

export const onboardingAPI = {
  sendMessage: async (message: string, currentProgress: any) => {
    const response = await api.post('/onboarding/chat', { message, currentProgress });
    return response.data;
  },
};

// ==================== CONDITIONS ====================

export const conditionsAPI = {
  getConditions: async () => {
    const response = await api.get('/me/conditions');
    return response.data;
  },

  addCondition: async (data: any) => {
    const response = await api.post('/me/conditions', data);
    return response.data;
  },
};

// ==================== MEMORY ====================

export const memoryAPI = {
  getMemories: async (importance?: string) => {
    const response = await api.get('/memory', { params: { importance } });
    return response.data;
  },
};

export default api;

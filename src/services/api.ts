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
    try {
      const response = await api.get('/health/today');
      console.log('Health today data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('Get today error:', error.response?.data || error.message);
      throw error;
    }
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
    try {
      console.log('Requesting AI health analysis...');
      const response = await api.post('/health/analyze-symptoms');
      console.log('AI analysis response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('AI analysis error:', error.response?.data || error.message);
      throw error;
    }
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

// ==================== FOOD ====================

export const foodAPI = {
  analyze: async (imageBase64: string, mealType?: string) => {
    try {
      console.log('Analyzing food image...');
      const response = await api.post('/food/analyze', { imageBase64, mealType });
      console.log('Food analysis response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('Food analysis error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Estimate nutrition from text description using AI
  estimateFromText: async (description: string, mealType?: string) => {
    try {
      console.log('Estimating nutrition for:', description);
      const response = await api.post('/food/estimate', { description, mealType });
      console.log('Estimation response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('Food estimation error:', error.response?.data || error.message);
      throw error;
    }
  },

  log: async (data: {
    description: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number | null;
    mealType?: string;
    portionSize?: string;
    confidence?: number;
  }) => {
    try {
      console.log('Logging food:', JSON.stringify(data, null, 2));
      const response = await api.post('/food/log', data);
      console.log('Food log response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('Food log error:', error.response?.data || error.message);
      throw error;
    }
  },

  getLogs: async (date?: string, days?: number) => {
    try {
      const params: any = {};
      if (date) params.date = date;
      if (days) params.days = days;
      
      console.log('Fetching food logs...');
      const response = await api.get('/food/log', { params });
      console.log('Food logs:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('Food logs fetch error:', error.response?.data || error.message);
      throw error;
    }
  },

  delete: async (id: string) => {
    const response = await api.delete(`/food/log?id=${id}`);
    return response.data;
  },
};

export default api;

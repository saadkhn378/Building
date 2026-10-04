import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// In development, replace localhost with your machine's local IP if testing on physical phone
// e.g. 'http://192.168.1.100:5000/api/v1'
export const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api/v1',
  ios: 'http://localhost:5000/api/v1',
  default: 'http://localhost:5000/api/v1',
});

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor to attach JWT token from expo-secure-store
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('society_member_access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // SecureStore not available in web preview
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    return Promise.reject(error.response?.data?.error || { message: error.message });
  }
);

export default client;

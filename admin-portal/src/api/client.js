import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach access token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('society_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry
client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        if (res.data?.data?.accessToken) {
          localStorage.setItem('society_admin_token', res.data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
          return client(originalRequest);
        }
      } catch (refreshErr) {
        localStorage.removeItem('society_admin_token');
        localStorage.removeItem('society_admin_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data?.error || { message: error.message });
  }
);

export default client;

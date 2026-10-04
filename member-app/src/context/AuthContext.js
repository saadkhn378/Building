import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import client from '../api/client';

// Remote push notifications are removed from Expo Go in SDK 53+.
// We only load expo-notifications in standalone/development builds.
const isExpoGo =
  Constants?.appOwnership === 'expo' ||
  Constants?.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (err) {
    // expo-notifications not loaded in Expo Go
  }
}

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check saved session on app startup
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedUserStr = await SecureStore.getItemAsync('society_member_user');
        const token = await SecureStore.getItemAsync('society_member_access_token');
        if (savedUserStr && token) {
          setUser(JSON.parse(savedUserStr));
          // Refresh profile in background
          try {
            const res = await client.get('/auth/me');
            if (res.data) {
              setUser(res.data);
              await SecureStore.setItemAsync('society_member_user', JSON.stringify(res.data));
            }
          } catch (e) {
            // Ignore background refresh failure
          }
        }
      } catch (err) {
        console.warn('Failed to restore session:', err);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Register push notifications
  const registerPushToken = async () => {
    try {
      if (Platform.OS === 'web' || !Notifications) return;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      if (tokenData?.data) {
        await client.post('/notifications/register-token', { expoPushToken: tokenData.data });
      }
    } catch (e) {
      console.warn('Push notification setup warning:', e.message);
    }
  };

  // Login with mobile + 4-digit PIN
  const loginWithPin = async (mobile, pin) => {
    let pushToken = null;
    try {
      if (Platform.OS !== 'web' && Notifications) {
        const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
        pushToken = tokenData?.data;
      }
    } catch (e) {}

    const res = await client.post('/auth/login-owner', {
      mobile,
      pin,
      expoPushToken: pushToken,
    });

    if (res.success && res.data) {
      const { accessToken, refreshToken, user: userData } = res.data;
      await SecureStore.setItemAsync('society_member_access_token', accessToken);
      await SecureStore.setItemAsync('society_member_refresh_token', refreshToken);
      await SecureStore.setItemAsync('society_member_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
    throw new Error(res.message || 'Login failed.');
  };

  // Step 1: Verify 6-digit Invite Code
  const verifyInviteCode = async (mobile, inviteCode) => {
    const res = await client.post('/auth/verify-invite', { mobile, inviteCode });
    if (res.success && res.data) {
      return res.data; // { ticket, member }
    }
    throw new Error(res.message || 'Invalid invite code.');
  };

  // Step 2: Set 4-digit PIN
  const completePinSetup = async (ticket, pin) => {
    const res = await client.post('/auth/set-pin', { ticket, pin });
    if (res.success && res.data) {
      const { accessToken, refreshToken, user: userData } = res.data;
      await SecureStore.setItemAsync('society_member_access_token', accessToken);
      await SecureStore.setItemAsync('society_member_refresh_token', refreshToken);
      await SecureStore.setItemAsync('society_member_user', JSON.stringify(userData));
      setUser(userData);
      registerPushToken();
      return userData;
    }
    throw new Error(res.message || 'Failed to initialize PIN.');
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('society_member_access_token');
      await SecureStore.deleteItemAsync('society_member_refresh_token');
      await SecureStore.deleteItemAsync('society_member_user');
    } catch (e) {}
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        loginWithPin,
        verifyInviteCode,
        completePinSetup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useMemberAuth = () => useContext(AuthContext);

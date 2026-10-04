import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('society_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('society_admin_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await client.get('/auth/me');
        if (res.data) {
          setUser(res.data);
          localStorage.setItem('society_admin_user', JSON.stringify(res.data));
        }
      } catch (err) {
        localStorage.removeItem('society_admin_token');
        localStorage.removeItem('society_admin_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (identifier, password) => {
    const res = await client.post('/auth/login-chairman', { identifier, password });
    if (res.success && res.data) {
      const { accessToken, user: userData } = res.data;
      localStorage.setItem('society_admin_token', accessToken);
      localStorage.setItem('society_admin_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
    throw new Error(res.message || 'Login failed.');
  };

  const logout = () => {
    localStorage.removeItem('society_admin_token');
    localStorage.removeItem('society_admin_user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

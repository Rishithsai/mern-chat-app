import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

axios.defaults.baseURL = 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set axios default auth header
  const setAuthHeader = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('chatUser');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setAuthHeader(parsed.token);
    }
    setLoading(false);
  }, []);

  const register = async (username, email, password) => {
    const { data } = await axios.post('/api/auth/register', {
      username,
      email,
      password,
    });
    setUser(data);
    setAuthHeader(data.token);
    localStorage.setItem('chatUser', JSON.stringify(data));
    return data;
  };

  const login = async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password });
    setUser(data);
    setAuthHeader(data.token);
    localStorage.setItem('chatUser', JSON.stringify(data));
    return data;
  };

  const logout = () => {
    setUser(null);
    setAuthHeader(null);
    localStorage.removeItem('chatUser');
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
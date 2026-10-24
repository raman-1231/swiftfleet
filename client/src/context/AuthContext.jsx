import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('swiftfleet_token'));
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.user);
      setProfile(res.profile);
    } catch (err) {
      console.warn('Session expired or invalid, logging out.');
      localStorage.removeItem('swiftfleet_token');
      setToken(null);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchCurrentUser]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('swiftfleet_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setProfile(res.profile);
    return res;
  };

  const registerBusiness = async (formData) => {
    const res = await api.post('/auth/register-business', formData);
    localStorage.setItem('swiftfleet_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setProfile(res.profile);
    return res;
  };

  const registerPartner = async (formData) => {
    const res = await api.post('/auth/register-partner', formData);
    localStorage.setItem('swiftfleet_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setProfile(res.profile);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('swiftfleet_token');
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  const updateProfileState = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        login,
        registerBusiness,
        registerPartner,
        logout,
        refreshUser: fetchCurrentUser,
        updateProfileState,
        isAuthenticated: !!user,
        isBusiness: user?.role === 'business',
        isPartner: user?.role === 'partner',
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

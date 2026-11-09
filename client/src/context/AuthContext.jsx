import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('swiftfleet_token'));
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  // Restore session on initial mount only
  useEffect(() => {
    isMountedRef.current = true;
    const storedToken = localStorage.getItem('swiftfleet_token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    const initSession = async () => {
      try {
        const res = await api.get('/auth/me');
        if (isMountedRef.current) {
          setUser(res.user);
          setProfile(res.profile);
        }
      } catch (err) {
        console.warn('Session expired or invalid, clearing stored credentials.');
        if (isMountedRef.current) {
          localStorage.removeItem('swiftfleet_token');
          setToken(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    initSession();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      if (isMountedRef.current) {
        setUser(res.user);
        setProfile(res.profile);
      }
      return res;
    } catch (err) {
      console.warn('Session expired or invalid, logging out.');
      if (isMountedRef.current) {
        localStorage.removeItem('swiftfleet_token');
        setToken(null);
        setUser(null);
        setProfile(null);
      }
      throw err;
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (!res || !res.token || !res.user) {
      throw new Error('Authentication response is missing user session data.');
    }
    localStorage.setItem('swiftfleet_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setProfile(res.profile || null);
    setLoading(false);
    return res;
  };

  const registerBusiness = async (formData) => {
    const res = await api.post('/auth/register-business', formData);
    if (!res || !res.token || !res.user) {
      throw new Error('Registration response is missing user session data.');
    }
    localStorage.setItem('swiftfleet_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setProfile(res.profile || null);
    setLoading(false);
    return res;
  };

  const registerPartner = async (formData) => {
    const res = await api.post('/auth/register-partner', formData);
    if (!res || !res.token || !res.user) {
      throw new Error('Registration response is missing user session data.');
    }
    localStorage.setItem('swiftfleet_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setProfile(res.profile || null);
    setLoading(false);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('swiftfleet_token');
    setToken(null);
    setUser(null);
    setProfile(null);
    setLoading(false);
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
        refreshUser,
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

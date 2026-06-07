import React, { createContext, useContext, useEffect, useState } from 'react';
import { clearAuth, getAuthToken, verifyAuthSession } from '../services/apiService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!getAuthToken()) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        return;
      }
      const valid = await verifyAuthSession();
      if (!cancelled) {
        setIsAuthenticated(valid);
        setIsLoading(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = () => setIsAuthenticated(true);

  const logout = () => {
    clearAuth();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

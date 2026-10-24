import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanyProfile = useCallback(async () => {
    try {
      const res = await api.get('/companies/me');
      let comp = res.data;
      if (comp && typeof comp.declared_products === 'string') {
        try {
          comp.declared_products = JSON.parse(comp.declared_products);
        } catch (e) {
          comp.declared_products = comp.declared_products.split(',').map((p) => p.trim()).filter(Boolean);
        }
      }
      if (comp && !Array.isArray(comp.declared_products)) {
        comp.declared_products = [];
      }
      setCompany(comp);
    } catch (err) {
      setCompany(null);
    }
  }, []);

  const initAuth = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Check if token expired
        if (decoded.exp * 1000 < Date.now()) {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            const res = await api.post('/auth/refresh', { refresh_token: refreshToken });
            localStorage.setItem('access_token', res.data.access_token);
            const newDecoded = jwtDecode(res.data.access_token);
            setUser({
              id: newDecoded.sub,
              email: newDecoded.email,
              role: newDecoded.role,
              company_id: newDecoded.company_id,
              full_name: newDecoded.full_name || 'User',
            });
            if (newDecoded.role !== 'admin') {
              await fetchCompanyProfile();
            }
          } else {
            logout();
          }
        } else {
          setUser({
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
            company_id: decoded.company_id,
            full_name: decoded.full_name || 'User',
          });
          if (decoded.role !== 'admin') {
            await fetchCompanyProfile();
          }
        }
      } catch (e) {
        logout();
      }
    }
    setLoading(false);
  }, [fetchCompanyProfile]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    const decoded = jwtDecode(access_token);
    const currentUser = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      company_id: decoded.company_id,
      full_name: decoded.full_name || 'User',
    };
    setUser(currentUser);
    if (currentUser.role !== 'admin') {
      await fetchCompanyProfile();
    }
    return currentUser;
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    const { access_token, refresh_token } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    const decoded = jwtDecode(access_token);
    const currentUser = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      company_id: decoded.company_id,
      full_name: decoded.full_name || 'User',
    };
    setUser(currentUser);
    await fetchCompanyProfile();
    return currentUser;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setCompany(null);
  };

  const reloadCompany = async () => {
    await fetchCompanyProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        loading,
        login,
        register,
        logout,
        reloadCompany,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isSeller: user?.role === 'seller',
        isBuyer: user?.role === 'buyer',
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

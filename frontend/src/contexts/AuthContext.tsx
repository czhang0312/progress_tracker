'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { RAILS_API_BASE } from '@/lib/config';

export interface User {
  id: number | null;
  email: string;
  is_guest: boolean;
}

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, password_confirmation: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, password: string, password_confirmation: string) => Promise<{ success: boolean; errors?: string[] }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const guestUser: User = {
    id: null,
    email: 'guest',
    is_guest: true,
  };

  const checkAuth = async () => {
    try {
      const response = await fetch(`${RAILS_API_BASE}/api/auth/current_user`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser({
            id: data.user.id ?? null,
            email: data.user.email,
            is_guest: Boolean(data.user.is_guest),
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${RAILS_API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          is_guest: Boolean(data.user.is_guest),
        });
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  };

  const register = async (email: string, password: string, password_confirmation: string): Promise<boolean> => {
    try {
      const response = await fetch(`${RAILS_API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, password_confirmation }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          is_guest: Boolean(data.user.is_guest),
        });
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch(`${RAILS_API_BASE}/api/auth/forgot_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });
      const data = await response.json();
      return data.success === true;
    } catch {
      return false;
    }
  };

  const resetPassword = async (
    token: string,
    password: string,
    password_confirmation: string
  ): Promise<{ success: boolean; errors?: string[] }> => {
    try {
      const response = await fetch(`${RAILS_API_BASE}/api/auth/reset_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, password_confirmation }),
        credentials: 'include',
      });
      const data = await response.json();
      return { success: data.success === true, errors: data.errors };
    } catch {
      return { success: false, errors: ['Something went wrong. Please try again.'] };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${RAILS_API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors during logout
    } finally {
      setUser(guestUser);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    isGuest: user?.is_guest === true,
    loading,
    login,
    register,
    logout,
    checkAuth,
    forgotPassword,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
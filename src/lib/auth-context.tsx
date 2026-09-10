'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, TenantInfo } from './types';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (email: string) => Promise<void>;
  updateTenantConfig: (updates: Partial<TenantInfo>) => void;
  availableUsers: UserSession[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<UserSession[]>([]);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setUser(data.currentUser);
        setAvailableUsers(data.users || []);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        await fetchSession();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Error al iniciar sesión' };
      }
    } catch (err) {
      return { success: false, error: 'Error de conexión con el servidor.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const switchUser = async (email: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.currentUser);
      }
    } catch (err) {
      console.error('Error switching user:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTenantConfig = (updates: Partial<TenantInfo>) => {
    if (!user || !user.tenant) return;
    const updatedTenant = { ...user.tenant, ...updates };
    setUser({ ...user, tenant: updatedTenant });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        switchUser,
        updateTenantConfig,
        availableUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

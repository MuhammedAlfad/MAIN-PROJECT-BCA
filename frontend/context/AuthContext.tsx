'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthApiResponse, authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  profile: {
    bio: string;
    profile_picture: string | null;
    followers: number;
    following: number;
  };
  created_at: string;
}

interface ProfileUpdatePayload {
  username?: string;
  bio?: string;
  profile_picture?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, otp?: string) => Promise<AuthApiResponse>;
  register: (email: string, username: string, password: string, otp?: string) => Promise<AuthApiResponse>;
  updateProfile: (profileData: ProfileUpdatePayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Try to verify token
      authApi.verifyToken(token)
        .then((response) => {
          setUser(response.data.user);
        })
        .catch(() => {
          localStorage.removeItem('access_token');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, otp?: string) => {
    const response = await authApi.login(email, password, otp);
    const { access_token, user: userData } = response.data;
    if (access_token && userData) {
      localStorage.setItem('access_token', access_token);
      setUser(userData);
    }
    return response.data;
  };

  const register = async (email: string, username: string, password: string, otp?: string) => {
    const response = await authApi.register(email, username, password, otp);
    const { access_token, user: userData } = response.data;
    if (access_token && userData) {
      localStorage.setItem('access_token', access_token);
      setUser(userData);
    }
    return response.data;
  };

  const updateProfile = async (profileData: ProfileUpdatePayload) => {
    const response = await authApi.updateProfile(profileData);
    setUser(response.data);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

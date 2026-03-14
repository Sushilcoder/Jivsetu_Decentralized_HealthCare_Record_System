// Doctor Auth Context for React
// Provides doctor authentication state and methods to components

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  getDoctorSession, 
  logoutDoctor, 
  isDoctorLoggedIn, 
  signUpDoctor, 
  loginDoctor,
  updateDoctorWallet,
  type DoctorSession 
} from '@/lib/doctor-auth';

interface DoctorAuthContextType {
  session: DoctorSession | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  signup: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateWallet: (walletAddress: string) => Promise<{ success: boolean; error?: string }>;
}

const DoctorAuthContext = createContext<DoctorAuthContextType | undefined>(undefined);

export function DoctorAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<DoctorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const existingSession = getDoctorSession();
    setSession(existingSession);
    setIsLoading(false);
  }, []);

  const signup = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = signUpDoctor(username, password);
    
    if (result.success) {
      // Auto-login after signup
      const loginResult = loginDoctor(username, password);
      if (loginResult.success) {
        const newSession = getDoctorSession();
        setSession(newSession);
      }
    }
    
    return result;
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = loginDoctor(username, password);
    
    if (result.success) {
      const newSession = getDoctorSession();
      setSession(newSession);
    }
    
    return result;
  };

  const logout = () => {
    logoutDoctor();
    setSession(null);
  };

  const updateWallet = async (walletAddress: string): Promise<{ success: boolean; error?: string }> => {
    if (!session) {
      return { success: false, error: 'Not logged in' };
    }

    const result = updateDoctorWallet(session.doctorId, walletAddress);
    
    if (result.success) {
      const updatedSession = getDoctorSession();
      setSession(updatedSession);
    }
    
    return result;
  };

  return (
    <DoctorAuthContext.Provider
      value={{
        session,
        isLoggedIn: isDoctorLoggedIn(),
        isLoading,
        signup,
        login,
        logout,
        updateWallet,
      }}
    >
      {children}
    </DoctorAuthContext.Provider>
  );
}

export function useDoctorAuth() {
  const context = useContext(DoctorAuthContext);
  if (context === undefined) {
    throw new Error('useDoctorAuth must be used within DoctorAuthProvider');
  }
  return context;
}

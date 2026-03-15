// Doctor Auth Context for React - Using Server Actions for Supabase
// Provides doctor authentication state and methods to components

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { serverSignupDoctor, serverLoginDoctor, type SignupResult, type LoginResult } from '@/lib/doctor-server-actions';

interface DoctorSession {
  doctorId: string;
  username: string;
}

interface DoctorAuthContextType {
  session: DoctorSession | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  signup: (username: string, password: string, email?: string) => Promise<{ success: boolean; message: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const DoctorAuthContext = createContext<DoctorAuthContextType | undefined>(undefined);

export function DoctorAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<DoctorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedSessionId = localStorage.getItem('doctor_session_id');
        const storedUsername = localStorage.getItem('doctor_username');
        
        if (storedSessionId && storedUsername) {
          setSession({
            doctorId: storedSessionId,
            username: storedUsername,
          });
          console.log('[v0] Restored session for doctor:', storedUsername);
        }
      } catch (error) {
        console.error('[v0] Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const signup = async (username: string, password: string, email?: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      console.log('[v0] Signup attempt:', { username, email });
      const result: SignupResult = await serverSignupDoctor(username, password, email);
      
      if (result.success && result.doctorId) {
        const newSession: DoctorSession = {
          doctorId: result.doctorId,
          username: username,
        };
        setSession(newSession);
        localStorage.setItem('doctor_session_id', result.doctorId);
        localStorage.setItem('doctor_username', username);
        console.log('[v0] Doctor signed up and logged in:', username);
      }
      return { success: result.success, message: result.message };
    } catch (error) {
      console.error('[v0] Signup error:', error);
      return { success: false, message: 'An error occurred during signup' };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      console.log('[v0] Login attempt:', { username });
      const result: LoginResult = await serverLoginDoctor(username, password);
      
      if (result.success && result.doctorId) {
        const newSession: DoctorSession = {
          doctorId: result.doctorId,
          username: result.username || username,
        };
        setSession(newSession);
        localStorage.setItem('doctor_session_id', result.doctorId);
        localStorage.setItem('doctor_username', result.username || username);
        console.log('[v0] Doctor logged in:', username);
      }
      return { success: result.success, message: result.message };
    } catch (error) {
      console.error('[v0] Login error:', error);
      return { success: false, message: 'An error occurred during login' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem('doctor_session_id');
    localStorage.removeItem('doctor_username');
    console.log('[v0] Doctor logged out');
  };

  return (
    <DoctorAuthContext.Provider
      value={{
        session,
        isLoggedIn: !!session,
        isLoading,
        signup,
        login,
        logout,
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

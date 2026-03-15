// Doctor Auth Context for React - Using Supabase
// Provides doctor authentication state and methods to components

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  loginDoctor, 
  signupDoctor,
  getDoctorById,
  updateDoctorWallet,
  type DoctorAccount
} from '@/lib/supabase-doctor-auth';

interface DoctorSession extends DoctorAccount {
  doctorId: string;
}

interface DoctorAuthContextType {
  session: DoctorSession | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  signup: (username: string, password: string, email?: string) => Promise<{ success: boolean; message: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateWallet: (walletAddress: string) => Promise<boolean>;
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
        if (storedSessionId) {
          // Verify the session exists in Supabase
          const doctor = await getDoctorById(storedSessionId);
          if (doctor) {
            setSession({
              ...doctor,
              doctorId: doctor.id,
            });
            console.log('[v0] Restored session for doctor:', doctor.username);
          } else {
            // Clear invalid session
            localStorage.removeItem('doctor_session_id');
          }
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
      const result = await signupDoctor(username, password, email);
      if (result.success && result.data) {
        const newSession: DoctorSession = {
          ...result.data,
          doctorId: result.data.id,
        };
        setSession(newSession);
        localStorage.setItem('doctor_session_id', result.data.id);
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
      const result = await loginDoctor(username, password);
      if (result.success && result.data) {
        const newSession: DoctorSession = {
          ...result.data,
          doctorId: result.data.id,
        };
        setSession(newSession);
        localStorage.setItem('doctor_session_id', result.data.id);
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
    console.log('[v0] Doctor logged out');
  };

  const updateWallet = async (walletAddress: string): Promise<boolean> => {
    if (!session) {
      console.error('[v0] Cannot update wallet: not logged in');
      return false;
    }
    
    try {
      const success = await updateDoctorWallet(session.doctorId, walletAddress);
      if (success) {
        setSession({
          ...session,
          wallet_address: walletAddress,
        });
        console.log('[v0] Wallet updated for doctor:', session.username);
      }
      return success;
    } catch (error) {
      console.error('[v0] Error updating wallet:', error);
      return false;
    }
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

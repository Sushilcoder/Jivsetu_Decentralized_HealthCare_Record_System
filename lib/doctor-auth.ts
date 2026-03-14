// Doctor Authentication System
// Handles username/password login and signup without email verification

const DOCTOR_CREDENTIALS_KEY = 'doctor-credentials';
const DOCTOR_SESSION_KEY = 'doctor-session';

export interface DoctorCredential {
  id: string;
  username: string;
  passwordHash: string;
  walletAddress?: string;
  createdAt: number;
}

export interface DoctorSession {
  doctorId: string;
  username: string;
  walletAddress?: string;
  loginTime: number;
  expiresAt: number;
}

// Simple hash function (NOT production-grade - for demo only)
function hashPassword(password: string): string {
  if (typeof window === 'undefined') return '';
  
  // Create a simple hash using TextEncoder and subtle crypto
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// Sign up a new doctor
export function signUpDoctor(username: string, password: string, walletAddress?: string): { success: boolean; error?: string } {
  if (typeof window === 'undefined') return { success: false, error: 'Not in browser' };

  try {
    // Validate inputs
    if (!username || username.trim().length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Get existing credentials
    const existing = getStoredCredentials();

    // Check if username already exists
    if (existing.some(c => c.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, error: 'Username already exists' };
    }

    // Create new credential
    const credential: DoctorCredential = {
      id: `doctor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username,
      passwordHash: hashPassword(password),
      walletAddress,
      createdAt: Date.now(),
    };

    // Store credential
    const credentials = [...existing, credential];
    localStorage.setItem(DOCTOR_CREDENTIALS_KEY, JSON.stringify(credentials));

    console.log('[v0] Doctor signed up:', { username, id: credential.id });

    return { success: true };
  } catch (e) {
    console.error('[v0] Signup error:', e);
    return { success: false, error: 'Signup failed' };
  }
}

// Login doctor with username and password
export function loginDoctor(username: string, password: string): { success: boolean; error?: string; doctorId?: string } {
  if (typeof window === 'undefined') return { success: false, error: 'Not in browser' };

  try {
    const credentials = getStoredCredentials();
    const credential = credentials.find(c => c.username.toLowerCase() === username.toLowerCase());

    if (!credential) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Verify password
    if (credential.passwordHash !== hashPassword(password)) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Create session (24 hour expiry)
    const session: DoctorSession = {
      doctorId: credential.id,
      username: credential.username,
      walletAddress: credential.walletAddress,
      loginTime: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    localStorage.setItem(DOCTOR_SESSION_KEY, JSON.stringify(session));

    console.log('[v0] Doctor logged in:', { username, id: credential.id });

    return { success: true, doctorId: credential.id };
  } catch (e) {
    console.error('[v0] Login error:', e);
    return { success: false, error: 'Login failed' };
  }
}

// Get current doctor session
export function getDoctorSession(): DoctorSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const sessionData = localStorage.getItem(DOCTOR_SESSION_KEY);
    if (!sessionData) return null;

    const session = JSON.parse(sessionData) as DoctorSession;

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem(DOCTOR_SESSION_KEY);
      return null;
    }

    return session;
  } catch (e) {
    console.error('[v0] Error getting session:', e);
    return null;
  }
}

// Logout doctor
export function logoutDoctor(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(DOCTOR_SESSION_KEY);
    console.log('[v0] Doctor logged out');
  } catch (e) {
    console.error('[v0] Logout error:', e);
  }
}

// Check if doctor is logged in
export function isDoctorLoggedIn(): boolean {
  return getDoctorSession() !== null;
}

// Update doctor's wallet address
export function updateDoctorWallet(doctorId: string, walletAddress: string): { success: boolean; error?: string } {
  if (typeof window === 'undefined') return { success: false, error: 'Not in browser' };

  try {
    const credentials = getStoredCredentials();
    const credentialIndex = credentials.findIndex(c => c.id === doctorId);

    if (credentialIndex === -1) {
      return { success: false, error: 'Doctor not found' };
    }

    credentials[credentialIndex].walletAddress = walletAddress;
    localStorage.setItem(DOCTOR_CREDENTIALS_KEY, JSON.stringify(credentials));

    // Update session with new wallet
    const session = getDoctorSession();
    if (session) {
      session.walletAddress = walletAddress;
      localStorage.setItem(DOCTOR_SESSION_KEY, JSON.stringify(session));
    }

    console.log('[v0] Wallet updated for doctor:', doctorId);

    return { success: true };
  } catch (e) {
    console.error('[v0] Error updating wallet:', e);
    return { success: false, error: 'Failed to update wallet' };
  }
}

// Get all stored credentials (for debugging only)
function getStoredCredentials(): DoctorCredential[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(DOCTOR_CREDENTIALS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('[v0] Error getting credentials:', e);
    return [];
  }
}

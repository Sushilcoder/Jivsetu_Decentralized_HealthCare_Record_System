// Emergency Access Management for Healthcare Records
// Implements time-limited emergency break-glass access for critical situations

const EMERGENCY_ACCESS_KEY = 'emergencyAccess';
const EMERGENCY_ACCESS_LOG_KEY = 'emergencyAccessLog';
const EMERGENCY_ACCESS_DURATION = 3600000; // 1 hour in milliseconds

export interface EmergencyAccess {
  doctorAddress: string;
  doctorName?: string;
  patientAddress: string;
  patientName?: string;
  grantedAt: number;
  expiresAt: number;
  reason: string;
  isActive: boolean;
}

/**
 * Request emergency access to a patient's records
 * Creates a time-limited (1 hour) access token for critical situations
 */
export function requestEmergencyAccess(
  doctorAddress: string,
  doctorName: string,
  patientAddress: string,
  patientName: string,
  reason: string
): { success: boolean; message: string; expiresAt?: number } {
  try {
    console.log('[v0] Emergency access requested:', {
      doctor: doctorName,
      patient: patientName,
      reason: reason
    });

    if (!doctorAddress || !patientAddress || !reason.trim()) {
      return {
        success: false,
        message: 'Missing required fields for emergency access'
      };
    }

    const now = Date.now();
    const expiresAt = now + EMERGENCY_ACCESS_DURATION;

    const emergencyAccess: EmergencyAccess = {
      doctorAddress,
      doctorName,
      patientAddress,
      patientName,
      grantedAt: now,
      expiresAt,
      reason: reason.trim(),
      isActive: true
    };

    // Store in localStorage
    const existingAccess = getEmergencyAccessLog();
    existingAccess.push(emergencyAccess);
    localStorage.setItem(EMERGENCY_ACCESS_LOG_KEY, JSON.stringify(existingAccess));

    console.log('[v0] Emergency access granted:', {
      expiresAt: new Date(expiresAt).toISOString(),
      durationMinutes: EMERGENCY_ACCESS_DURATION / 60000
    });

    return {
      success: true,
      message: `Emergency access granted for ${EMERGENCY_ACCESS_DURATION / 60000} minutes`,
      expiresAt
    };
  } catch (error) {
    console.error('[v0] Error requesting emergency access:', error);
    return {
      success: false,
      message: 'Failed to request emergency access'
    };
  }
}

/**
 * Check if emergency access is still valid
 */
export function isEmergencyAccessValid(
  doctorAddress: string,
  patientAddress: string
): boolean {
  try {
    const log = getEmergencyAccessLog();
    const now = Date.now();

    const validAccess = log.find(
      access =>
        access.doctorAddress === doctorAddress &&
        access.patientAddress === patientAddress &&
        access.expiresAt > now &&
        access.isActive
    );

    if (validAccess) {
      console.log('[v0] Emergency access is valid, expires at:', new Date(validAccess.expiresAt).toISOString());
      return true;
    }

    console.log('[v0] Emergency access not found or expired');
    return false;
  } catch (error) {
    console.error('[v0] Error checking emergency access:', error);
    return false;
  }
}

/**
 * Get all emergency access records for audit trail
 */
export function getEmergencyAccessLog(): EmergencyAccess[] {
  try {
    const stored = localStorage.getItem(EMERGENCY_ACCESS_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[v0] Error reading emergency access log:', error);
    return [];
  }
}

/**
 * Get emergency access records for a specific patient
 */
export function getPatientEmergencyAccessLog(patientAddress: string): EmergencyAccess[] {
  try {
    const log = getEmergencyAccessLog();
    return log.filter(access => access.patientAddress === patientAddress);
  } catch (error) {
    console.error('[v0] Error getting patient emergency access log:', error);
    return [];
  }
}

/**
 * Get active emergency access for a doctor viewing patient records
 */
export function getActiveEmergencyAccess(
  doctorAddress: string,
  patientAddress: string
): EmergencyAccess | null {
  try {
    const log = getEmergencyAccessLog();
    const now = Date.now();

    const activeAccess = log.find(
      access =>
        access.doctorAddress === doctorAddress &&
        access.patientAddress === patientAddress &&
        access.expiresAt > now &&
        access.isActive
    );

    return activeAccess || null;
  } catch (error) {
    console.error('[v0] Error getting active emergency access:', error);
    return null;
  }
}

/**
 * Revoke emergency access (immediate termination)
 */
export function revokeEmergencyAccess(
  doctorAddress: string,
  patientAddress: string
): { success: boolean; message: string } {
  try {
    const log = getEmergencyAccessLog();
    const updated = log.map(access => {
      if (
        access.doctorAddress === doctorAddress &&
        access.patientAddress === patientAddress
      ) {
        return { ...access, isActive: false };
      }
      return access;
    });

    localStorage.setItem(EMERGENCY_ACCESS_LOG_KEY, JSON.stringify(updated));

    console.log('[v0] Emergency access revoked for:', doctorAddress);
    return {
      success: true,
      message: 'Emergency access has been revoked'
    };
  } catch (error) {
    console.error('[v0] Error revoking emergency access:', error);
    return {
      success: false,
      message: 'Failed to revoke emergency access'
    };
  }
}

/**
 * Get time remaining for active emergency access
 */
export function getEmergencyAccessTimeRemaining(expiresAt: number): {
  remaining: number;
  formattedTime: string;
  isExpired: boolean;
} {
  const now = Date.now();
  const remaining = Math.max(0, expiresAt - now);
  const isExpired = remaining === 0;

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return {
    remaining,
    formattedTime: isExpired ? 'Expired' : `${minutes}m ${seconds}s`,
    isExpired
  };
}

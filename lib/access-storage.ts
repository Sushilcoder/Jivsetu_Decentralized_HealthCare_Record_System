// Access storage service to persist permissions across sessions
// This uses localStorage to simulate blockchain storage

export interface PatientAccess {
  patientAddress: string;
  patientName: string;
  doctorAddress: string;
  grantedAt: number;
  files: string[];
}

export interface DoctorAccess {
  doctorAddress: string;
  patientAddress: string;
  patientName: string;
  grantedAt: number;
  recordCount: number;
}

// Store patient's permissions to doctors
export function grantAccessToDoctor(
  patientAddress: string,
  patientName: string,
  doctorAddress: string,
  fileHashes: string[] = []
) {
  if (typeof window === 'undefined') return;

  try {
    // Store in patient's access list (keyed by patient address)
    const patientKey = `patient-access-${patientAddress.toLowerCase()}`;
    const existing = JSON.parse(localStorage.getItem(patientKey) || '[]') as PatientAccess[];
    
    const normalizedDoctorAddress = doctorAddress.toLowerCase();
    const existingIndex = existing.findIndex(p => p.doctorAddress.toLowerCase() === normalizedDoctorAddress);
    
    const accessRecord: PatientAccess = {
      patientAddress,
      patientName: patientName || 'Unknown Patient',
      doctorAddress,
      grantedAt: Date.now(),
      files: fileHashes,
    };
    
    if (existingIndex >= 0) {
      existing[existingIndex] = {
        ...accessRecord,
        files: [...new Set([...existing[existingIndex].files, ...fileHashes])],
      };
    } else {
      existing.push(accessRecord);
    }
    
    localStorage.setItem(patientKey, JSON.stringify(existing));
    
    // Also store in doctor's patient list for quick lookup (keyed by doctor address)
    const doctorKey = `doctor-patients-${normalizedDoctorAddress}`;
    const doctorPatients = JSON.parse(localStorage.getItem(doctorKey) || '[]') as DoctorAccess[];
    
    const existingPatientIndex = doctorPatients.findIndex(
      p => p.patientAddress.toLowerCase() === patientAddress.toLowerCase()
    );
    
    const doctorAccessRecord: DoctorAccess = {
      doctorAddress,
      patientAddress,
      patientName: patientName || 'Unknown Patient',
      grantedAt: Date.now(),
      recordCount: fileHashes.length || 1,
    };
    
    if (existingPatientIndex >= 0) {
      doctorPatients[existingPatientIndex] = {
        ...doctorAccessRecord,
        recordCount: fileHashes.length || doctorPatients[existingPatientIndex].recordCount,
      };
    } else {
      doctorPatients.push(doctorAccessRecord);
    }
    
    localStorage.setItem(doctorKey, JSON.stringify(doctorPatients));
  } catch (e) {
    console.error('Error granting access:', e);
  }
}

// Revoke doctor's access to patient's records
export function revokeAccessFromDoctor(patientAddress: string, doctorAddress: string) {
  if (typeof window === 'undefined') return;

  try {
    const normalizedPatientAddress = patientAddress.toLowerCase();
    const normalizedDoctorAddress = doctorAddress.toLowerCase();
    
    // Remove from patient's access list
    const patientKey = `patient-access-${normalizedPatientAddress}`;
    const existing = JSON.parse(localStorage.getItem(patientKey) || '[]') as PatientAccess[];
    const filtered = existing.filter(p => p.doctorAddress.toLowerCase() !== normalizedDoctorAddress);
    localStorage.setItem(patientKey, JSON.stringify(filtered));
    
    // Remove from doctor's patient list
    const doctorKey = `doctor-patients-${normalizedDoctorAddress}`;
    const doctorPatients = JSON.parse(localStorage.getItem(doctorKey) || '[]') as DoctorAccess[];
    const filteredDoctorPatients = doctorPatients.filter(
      p => p.patientAddress.toLowerCase() !== normalizedPatientAddress
    );
    localStorage.setItem(doctorKey, JSON.stringify(filteredDoctorPatients));
  } catch (e) {
    console.error('Error revoking access:', e);
  }
}

// Get all doctors with access to a patient's records
export function getDoctorsWithAccessToPatient(patientAddress: string): PatientAccess[] {
  if (typeof window === 'undefined') return [];

  try {
    // Try normalized key first, then original
    const normalizedKey = `patient-access-${patientAddress.toLowerCase()}`;
    const originalKey = `patient-access-${patientAddress}`;
    
    let data = localStorage.getItem(normalizedKey);
    if (!data) {
      data = localStorage.getItem(originalKey);
    }
    
    return JSON.parse(data || '[]') as PatientAccess[];
  } catch (e) {
    console.error('Error getting doctors with access:', e);
    return [];
  }
}

// Get all patients who have granted a doctor access
export function getPatientsWhoGrantedAccess(doctorAddress: string): DoctorAccess[] {
  if (typeof window === 'undefined') return [];

  try {
    const normalizedDoctorAddress = doctorAddress.toLowerCase();
    
    // First, try the optimized doctor-indexed storage
    const doctorKey = `doctor-patients-${normalizedDoctorAddress}`;
    const doctorPatients = JSON.parse(localStorage.getItem(doctorKey) || '[]') as DoctorAccess[];
    
    if (doctorPatients.length > 0) {
      return doctorPatients;
    }
    
    // Fallback: Scan all localStorage keys for patient access records
    const results: DoctorAccess[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('patient-access-')) {
        const accesses = JSON.parse(localStorage.getItem(key) || '[]') as PatientAccess[];
        
        accesses.forEach(access => {
          // Case-insensitive comparison for Ethereum addresses
          if (access.doctorAddress.toLowerCase() === normalizedDoctorAddress) {
            results.push({
              doctorAddress: access.doctorAddress,
              patientAddress: access.patientAddress,
              patientName: access.patientName || 'Unknown Patient',
              grantedAt: access.grantedAt,
              recordCount: access.files?.length || 1,
            });
          }
        });
      }
    }
    
    // If we found results via fallback, store them in the optimized index
    if (results.length > 0) {
      localStorage.setItem(doctorKey, JSON.stringify(results));
    }
    
    return results;
  } catch (e) {
    console.error('Error getting patients with access:', e);
    return [];
  }
}

// Add mock data for demonstration - DISABLED: Only real IPFS uploads should be shown
export function initializeMockAccessData() {
  if (typeof window === 'undefined') return;
  // Mock data disabled - only real grants from patients will be used
}

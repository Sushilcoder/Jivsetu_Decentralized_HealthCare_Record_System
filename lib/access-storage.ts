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
    const key = `patient-access-${patientAddress}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as PatientAccess[];
    
    const existingIndex = existing.findIndex(p => p.doctorAddress === doctorAddress);
    if (existingIndex >= 0) {
      existing[existingIndex] = {
        ...existing[existingIndex],
        grantedAt: Date.now(),
        files: [...new Set([...existing[existingIndex].files, ...fileHashes])],
      };
    } else {
      existing.push({
        patientAddress,
        patientName,
        doctorAddress,
        grantedAt: Date.now(),
        files: fileHashes,
      });
    }
    
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {
    console.error('Error granting access:', e);
  }
}

// Revoke doctor's access to patient's records
export function revokeAccessFromDoctor(patientAddress: string, doctorAddress: string) {
  if (typeof window === 'undefined') return;

  try {
    const key = `patient-access-${patientAddress}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as PatientAccess[];
    const filtered = existing.filter(p => p.doctorAddress !== doctorAddress);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error revoking access:', e);
  }
}

// Get all doctors with access to a patient's records
export function getDoctorsWithAccessToPatient(patientAddress: string): PatientAccess[] {
  if (typeof window === 'undefined') return [];

  try {
    const key = `patient-access-${patientAddress}`;
    return JSON.parse(localStorage.getItem(key) || '[]') as PatientAccess[];
  } catch (e) {
    console.error('Error getting doctors with access:', e);
    return [];
  }
}

// Get all patients who have granted a doctor access
export function getPatientsWhoGrantedAccess(doctorAddress: string): DoctorAccess[] {
  if (typeof window === 'undefined') return [];

  try {
    const results: DoctorAccess[] = [];
    
    // Scan all localStorage keys for patient access records
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('patient-access-')) {
        const patientAddress = key.replace('patient-access-', '');
        const accesses = JSON.parse(localStorage.getItem(key) || '[]') as PatientAccess[];
        
        accesses.forEach(access => {
          if (access.doctorAddress === doctorAddress) {
            results.push({
              doctorAddress: access.doctorAddress,
              patientAddress: access.patientAddress,
              patientName: access.patientName,
              grantedAt: access.grantedAt,
              recordCount: access.files.length || 1,
            });
          }
        });
      }
    }
    
    return results;
  } catch (e) {
    console.error('Error getting patients with access:', e);
    return [];
  }
}

// Add mock data for demonstration
export function initializeMockAccessData() {
  if (typeof window === 'undefined') return;

  try {
    // Only add if empty
    if (localStorage.getItem('patient-access-0xf006cfce70f32e3e741e7173e4d0173f54c8fba9')) {
      return; // Already initialized
    }

    // Mock patient grants access to doctor
    const mockPatientAddr = '0xf006cfce70f32e3e741e7173e4d0173f54c8fba9';
    const mockDoctorAddr = '0x742d35Cc6634C0532925a3b844Bc3e703AeeFf70';
    
    grantAccessToDoctor(
      mockPatientAddr,
      'John Doe',
      mockDoctorAddr,
      ['QmHash1', 'QmHash2', 'QmHash3', 'QmHash4', 'QmHash5']
    );
  } catch (e) {
    console.error('Error initializing mock data:', e);
  }
}

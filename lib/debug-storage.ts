// Debug utility to inspect and clear localStorage data

export function getAllStorageData() {
  if (typeof window === 'undefined') return {};

  const data: Record<string, any> = {};
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || '');
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
  }
  
  return data;
}

export function clearAllStorage() {
  if (typeof window === 'undefined') return;
  
  const keysToKeep = ['wallet-address', 'user-name', 'user-role'];
  
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && !keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  }
  
  console.log('[v0] Cleared all non-essential storage');
}

export function clearReportsOnly() {
  if (typeof window === 'undefined') return;
  
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('jivsetu-reports') || key.includes('mock'))) {
      localStorage.removeItem(key);
    }
  }
  
  console.log('[v0] Cleared report storage');
}

export function printStorageInfo() {
  if (typeof window === 'undefined') return;
  
  const data = getAllStorageData();
  console.log('[v0] Current Storage:', data);
  
  // Count different data types
  const patientAccess = Object.keys(data).filter(k => k.startsWith('patient-access-')).length;
  const doctorPatients = Object.keys(data).filter(k => k.startsWith('doctor-patients-')).length;
  const reports = data['jivsetu-reports'] ? (Array.isArray(data['jivsetu-reports']) ? data['jivsetu-reports'].length : 1) : 0;
  
  console.log(`[v0] Storage Summary: ${patientAccess} patient access records, ${doctorPatients} doctor patient lists, ${reports} reports`);
}

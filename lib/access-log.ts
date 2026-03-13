// Access log storage service - tracks all access events for audit purposes

export interface AccessLogEntry {
  id: string;
  patientAddress: string;
  doctorAddress: string;
  action: 'granted' | 'revoked' | 'viewed' | 'downloaded' | 'uploaded';
  timestamp: number;
  fileHash?: string;
  fileName?: string;
  details?: string;
}

const ACCESS_LOG_KEY = 'jivsetu-access-logs';

/**
 * Log an access event
 */
export function logAccessEvent(entry: Omit<AccessLogEntry, 'id' | 'timestamp'>): AccessLogEntry {
  if (typeof window === 'undefined') {
    return { ...entry, id: '', timestamp: Date.now() };
  }

  try {
    const logs = getAccessLogs();
    const newEntry: AccessLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    logs.unshift(newEntry); // Add to beginning

    // Keep only last 1000 entries
    const trimmedLogs = logs.slice(0, 1000);
    localStorage.setItem(ACCESS_LOG_KEY, JSON.stringify(trimmedLogs));

    return newEntry;
  } catch (e) {
    console.error('Error logging access event:', e);
    return { ...entry, id: '', timestamp: Date.now() };
  }
}

/**
 * Get all access logs
 */
export function getAccessLogs(): AccessLogEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const logs = localStorage.getItem(ACCESS_LOG_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (e) {
    console.error('Error getting access logs:', e);
    return [];
  }
}

/**
 * Get access logs for a specific patient
 */
export function getPatientAccessLogs(patientAddress: string): AccessLogEntry[] {
  const logs = getAccessLogs();
  return logs.filter(log => 
    log.patientAddress.toLowerCase() === patientAddress.toLowerCase()
  );
}

/**
 * Get access logs for a specific doctor
 */
export function getDoctorAccessLogs(doctorAddress: string): AccessLogEntry[] {
  const logs = getAccessLogs();
  return logs.filter(log => 
    log.doctorAddress.toLowerCase() === doctorAddress.toLowerCase()
  );
}

/**
 * Get access logs for a specific file
 */
export function getFileAccessLogs(fileHash: string): AccessLogEntry[] {
  const logs = getAccessLogs();
  return logs.filter(log => log.fileHash === fileHash);
}

/**
 * Log access grant event
 */
export function logAccessGrant(
  patientAddress: string,
  doctorAddress: string,
  fileHashes?: string[]
): AccessLogEntry {
  return logAccessEvent({
    patientAddress,
    doctorAddress,
    action: 'granted',
    details: fileHashes ? `Granted access to ${fileHashes.length} files` : 'Granted full access',
  });
}

/**
 * Log access revoke event
 */
export function logAccessRevoke(
  patientAddress: string,
  doctorAddress: string
): AccessLogEntry {
  return logAccessEvent({
    patientAddress,
    doctorAddress,
    action: 'revoked',
    details: 'All access revoked',
  });
}

/**
 * Log file view event
 */
export function logFileView(
  patientAddress: string,
  doctorAddress: string,
  fileHash: string,
  fileName: string
): AccessLogEntry {
  return logAccessEvent({
    patientAddress,
    doctorAddress,
    action: 'viewed',
    fileHash,
    fileName,
    details: `Viewed file: ${fileName}`,
  });
}

/**
 * Log file download event
 */
export function logFileDownload(
  patientAddress: string,
  doctorAddress: string,
  fileHash: string,
  fileName: string
): AccessLogEntry {
  return logAccessEvent({
    patientAddress,
    doctorAddress,
    action: 'downloaded',
    fileHash,
    fileName,
    details: `Downloaded file: ${fileName}`,
  });
}

/**
 * Log file upload event
 */
export function logFileUpload(
  patientAddress: string,
  doctorAddress: string,
  fileHash: string,
  fileName: string
): AccessLogEntry {
  return logAccessEvent({
    patientAddress,
    doctorAddress,
    action: 'uploaded',
    fileHash,
    fileName,
    details: `Uploaded file: ${fileName}`,
  });
}

/**
 * Format log entry for display
 */
export function formatLogEntry(entry: AccessLogEntry): string {
  const date = new Date(entry.timestamp).toLocaleString();
  const doctor = `${entry.doctorAddress.slice(0, 6)}...${entry.doctorAddress.slice(-4)}`;
  
  switch (entry.action) {
    case 'granted':
      return `${date}: Access granted to Dr. ${doctor}`;
    case 'revoked':
      return `${date}: Access revoked from Dr. ${doctor}`;
    case 'viewed':
      return `${date}: Dr. ${doctor} viewed ${entry.fileName || 'a file'}`;
    case 'downloaded':
      return `${date}: Dr. ${doctor} downloaded ${entry.fileName || 'a file'}`;
    case 'uploaded':
      return `${date}: Dr. ${doctor} uploaded ${entry.fileName || 'a file'}`;
    default:
      return `${date}: ${entry.action} by Dr. ${doctor}`;
  }
}

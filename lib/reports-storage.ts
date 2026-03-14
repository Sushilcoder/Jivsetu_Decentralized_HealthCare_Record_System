
export interface StoredReport {
  id: string;
  ipfsHash: string;
  patientAddress: string;
  patientName: string;
  doctorAddress: string;
  doctorName: string;
  reportTitle: string;
  description: string;
  uploadedAt: string;
  uploadTimestamp: number;
  fileSize: string;
  contentType?: string;
}

const REPORTS_STORAGE_KEY = 'jivsetu-reports';

export function storeReport(report: StoredReport): void {
  if (typeof window === 'undefined') return;

  try {
    const reports = getStoredReports();
    reports.push(report);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  } catch (e) {
    console.error('Error storing report:', e);
  }
}

export function getStoredReports(): StoredReport[] {
  if (typeof window === 'undefined') return [];

  try {
    const reports = localStorage.getItem(REPORTS_STORAGE_KEY);
    return reports ? JSON.parse(reports) : [];
  } catch (e) {
    console.error('Error retrieving reports:', e);
    return [];
  }
}

export function getPatientReports(patientAddress: string): StoredReport[] {
  if (typeof window === 'undefined') return [];

  const reports = getStoredReports();
  return reports.filter(r => r.patientAddress.toLowerCase() === patientAddress.toLowerCase());
}

export function getDoctorUploadedReports(doctorAddress: string): StoredReport[] {
  if (typeof window === 'undefined') return [];

  const reports = getStoredReports();
  return reports.filter(r => r.doctorAddress.toLowerCase() === doctorAddress.toLowerCase());
}

export function deleteReport(reportId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const reports = getStoredReports();
    const filtered = reports.filter(r => r.id !== reportId);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error deleting report:', e);
  }
}

// Clear all reports - useful for resetting to only IPFS-uploaded data
export function clearAllReports(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(REPORTS_STORAGE_KEY);
    console.log('[v0] All local reports cleared');
  } catch (e) {
    console.error('Error clearing reports:', e);
  }
}

// Count only IPFS-uploaded reports (those with valid IPFS hashes)
export function countIPFSReports(patientAddress: string): number {
  if (typeof window === 'undefined') return 0;

  const reports = getPatientReports(patientAddress);
  return reports.filter(r => r.ipfsHash && r.ipfsHash.startsWith('Qm')).length;
}

export function downloadReport(report: StoredReport): void {
  try {
    // Get IPFS gateway URL for the file
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${report.ipfsHash}`;
    
    // Map content type to file extension
    const contentTypeToExt: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'text/plain': 'txt',
      'application/json': 'json',
    };

    const extension = contentTypeToExt[report.contentType || ''] || 'bin';
    
    // Fetch the file from IPFS
    fetch(ipfsUrl)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch file from IPFS');
        return response.blob();
      })
      .then(blob => {
        // Create download link
        const element = document.createElement('a');
        const url = URL.createObjectURL(blob);
        element.href = url;
        element.download = `${report.reportTitle.replace(/\s+/g, '_')}_${report.uploadTimestamp}.${extension}`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(url);
        console.log('[v0] Downloaded file from IPFS:', element.download);
      })
      .catch(error => {
        console.error('[v0] Error downloading from IPFS:', error);
        // Fallback to text report
        downloadAsText(report);
      });
  } catch (e) {
    console.error('[v0] Error initiating download:', e);
    downloadAsText(report);
  }
}

function downloadAsText(report: StoredReport): void {
  try {
    const content = `
MEDICAL REPORT
====================
Patient Name: ${report.patientName}
Patient Address: ${report.patientAddress}
Doctor Name: ${report.doctorName}
Doctor Address: ${report.doctorAddress}
Report Title: ${report.reportTitle}
Date: ${report.uploadedAt}
IPFS Hash: ${report.ipfsHash}

Description:
${report.description}

This report is stored on IPFS and verified by blockchain.
    `.trim();

    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${report.reportTitle.replace(/\s+/g, '_')}_${report.uploadTimestamp}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  } catch (e) {
    console.error('[v0] Error downloading as text:', e);
  }
}

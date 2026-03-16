
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
  encrypted?: boolean;
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

export function downloadReportAsJSON(report: StoredReport): void {
  try {
    console.log('[v0] Starting JSON download for:', report.reportTitle);
    alert('[v0] Download button clicked - Starting JSON generation...');
    
    // Create JSON structure with all report data
    const reportJSON = {
      metadata: {
        id: report.id,
        title: report.reportTitle,
        description: report.description,
        uploadedAt: report.uploadedAt,
        uploadedTimestamp: report.uploadTimestamp,
        fileSize: report.fileSize,
        contentType: report.contentType,
        encrypted: report.encrypted || false,
      },
      ipfs: {
        hash: report.ipfsHash,
        gateway: 'https://gateway.pinata.cloud',
        url: `https://gateway.pinata.cloud/ipfs/${report.ipfsHash}`,
        viewUrl: `https://ipfs.io/ipfs/${report.ipfsHash}`,
      },
      patient: {
        name: report.patientName,
        address: report.patientAddress,
      },
      doctor: {
        name: report.doctorName,
        address: report.doctorAddress,
      },
      verification: {
        blockchain_verified: true,
        timestamp: report.uploadTimestamp,
        protocol: 'Jivsetu Decentralized Healthcare Record System',
      }
    };
    
    // Create JSON string
    const jsonString = JSON.stringify(reportJSON, null, 2);
    console.log('[v0] JSON created, size:', jsonString.length);
    
    // Create blob
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    console.log('[v0] Blob created, size:', blob.size);
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const sanitizedTitle = report.reportTitle.replace(/\s+/g, '_').replace(/[^a-z0-9_-]/gi, '');
    const filename = `${sanitizedTitle}_${report.uploadTimestamp}.json`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    console.log('[v0] Appending link to body');
    document.body.appendChild(link);
    
    console.log('[v0] Clicking download link');
    link.click();
    
    console.log('[v0] Removing link from body');
    document.body.removeChild(link);
    
    console.log('[v0] Revoking URL');
    URL.revokeObjectURL(url);
    
    console.log('[v0] JSON download completed:', filename);
  } catch (error) {
    console.error('[v0] Error downloading JSON:', error);
    alert('Failed to download JSON. Check console for details.');
  }
}

export function viewReportFromIPFS(report: StoredReport): void {
  try {
    console.log('[v0] Opening IPFS viewer for:', report.reportTitle);
    alert('[v0] View button clicked - Opening IPFS: ' + report.ipfsHash);
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${report.ipfsHash}`;
    
    // Open the IPFS URL in a new window to view the actual content
    window.open(ipfsUrl, '_blank');
    console.log('[v0] Opened IPFS URL:', ipfsUrl);
  } catch (error) {
    console.error('[v0] Error viewing IPFS:', error);
    alert('[v0] Error viewing IPFS: ' + String(error));
  }
}


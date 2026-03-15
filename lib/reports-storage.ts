
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

export function downloadReport(report: StoredReport): void {
  try {
    // Get IPFS gateway URL for the file
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${report.ipfsHash}`;
    
    // Map content type to file extension - prioritize images
    const contentTypeToExt: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'text/plain': 'txt',
      'application/json': 'json',
    };

    // Use the stored content type
    let mimeType = report.contentType || 'application/octet-stream';
    let extension = contentTypeToExt[mimeType] || 'bin';
    
    // Log what we're downloading
    console.log('[v0] Downloading report:', {
      title: report.reportTitle,
      storedContentType: report.contentType,
      resolvedMimeType: mimeType,
      extension: extension,
      ipfsHash: report.ipfsHash
    });
    
    // Fetch the file from IPFS
    fetch(ipfsUrl)
      .then(response => {
        if (!response.ok) {
          console.error('[v0] Failed response from IPFS:', response.status, response.statusText);
          throw new Error(`Failed to fetch file from IPFS: ${response.statusText}`);
        }
        
        // Try to get content type from response headers
        const responseContentType = response.headers.get('content-type');
        if (responseContentType && responseContentType !== 'application/octet-stream') {
          const cleanContentType = responseContentType.split(';')[0].trim();
          mimeType = cleanContentType;
          extension = contentTypeToExt[mimeType] || extension;
          console.log('[v0] Updated MIME type from response:', { mimeType, extension });
        }
        
        return response.blob();
      })
      .then(blob => {
        // Ensure proper MIME type for common formats
        if (report.contentType?.startsWith('image/')) {
          // For images, use the stored MIME type directly
          mimeType = report.contentType;
        } else if (report.contentType === 'application/pdf') {
          mimeType = 'application/pdf';
        }
        
        // Create a typed blob with correct MIME type
        const typedBlob = new Blob([blob], { type: mimeType });
        
        // Create download link
        const element = document.createElement('a');
        const url = URL.createObjectURL(typedBlob);
        element.href = url;
        
        // Construct filename with proper extension
        const sanitizedTitle = report.reportTitle.replace(/\s+/g, '_').replace(/[^a-z0-9_-]/gi, '');
        element.download = `${sanitizedTitle}_${report.uploadTimestamp}.${extension}`;
        
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        
        // Cleanup
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
        
        console.log('[v0] Successfully downloaded file from IPFS:', {
          filename: element.download,
          size: `${(blob.size / 1024).toFixed(2)}KB`,
          mimeType: mimeType,
          originalContentType: report.contentType
        });
      })
      .catch(error => {
        console.error('[v0] Error downloading from IPFS:', error);
        // Fallback: Try direct blob download
        downloadBlob(report, mimeType, extension);
      });
  } catch (e) {
    console.error('[v0] Error initiating download:', e);
  }
}

function downloadBlob(report: StoredReport, mimeType: string, extension: string): void {
  try {
    console.log('[v0] Attempting direct blob download fallback');
    
    const element = document.createElement('a');
    const sanitizedTitle = report.reportTitle.replace(/\s+/g, '_').replace(/[^a-z0-9_-]/gi, '');
    element.download = `${sanitizedTitle}_${report.uploadTimestamp}.${extension}`;
    
    // Create a simple text file with report metadata as fallback
    const reportMetadata = `
MEDICAL REPORT
==================
Title: ${report.reportTitle}
Patient: ${report.patientName} (${report.patientAddress})
Doctor: ${report.doctorName} (${report.doctorAddress})
Date: ${report.uploadedAt}
IPFS Hash: ${report.ipfsHash}

Description:
${report.description}

Note: Original file format was ${report.contentType || 'unknown'}
This report is stored on IPFS at: https://gateway.pinata.cloud/ipfs/${report.ipfsHash}
    `.trim();
    
    const file = new Blob([reportMetadata], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
    
    console.log('[v0] Downloaded fallback text file');
  } catch (e) {
    console.error('[v0] Error in blob download fallback:', e);
  }
}

# File Upload System - Format Preservation

## Overview
The file upload system automatically detects file types and preserves the original format when processing and downloading files. Images remain images, PDFs remain PDFs, and documents remain documents.

## Supported File Types

### Images
- **JPEG** (.jpg, .jpeg) - `image/jpeg`, `image/jpg`
- **PNG** (.png) - `image/png`
- **GIF** (.gif) - `image/gif`
- **WebP** (.webp) - `image/webp`
- **BMP** (.bmp) - `image/bmp`
- **TIFF** (.tiff) - `image/tiff`

### Documents
- **PDF** (.pdf) - `application/pdf`
- **Word** (.doc, .docx) - `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Excel** (.xls, .xlsx) - `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Text** (.txt) - `text/plain`

## Architecture

### Core Components

#### 1. `lib/file-handler.ts` - File Validation & Format Management
Main utility for file operations with format preservation.

**Key Functions:**
- `validateFileType(file: File)` - Validates MIME type
- `validateFileSize(file: File)` - Checks file size limits
- `validateFileUpload(file: File)` - Complete validation (type + size)
- `createTypedBlob(data, mimeType)` - Creates blob with correct MIME type
- `downloadFile(blob, mimeType, filename)` - Downloads with format preservation
- `generateDownloadFilename(name, extension)` - Creates proper filename

**Example Usage:**
```typescript
import { validateFileUpload, downloadFile } from '@/lib/file-handler'

// Validate on upload
const validation = validateFileUpload(file, 50) // 50MB max
if (validation.valid) {
  console.log(`File type: ${validation.category}`)
  console.log(`Extension: ${validation.extension}`)
}

// Download with format preservation
fetch(ipfsUrl)
  .then(res => res.blob())
  .then(blob => downloadFile(blob, 'image/jpeg', 'report_12345.jpg'))
```

#### 2. `components/file-upload-input.tsx` - Upload UI Component
Reusable file upload component with validation feedback.

**Features:**
- Drag & drop support
- Real-time file validation
- Visual feedback (success/error alerts)
- File size and name display
- Configurable file type restrictions

**Example Usage:**
```typescript
import { FileUploadInput } from '@/components/file-upload-input'

<FileUploadInput
  onFileSelect={(file, validation) => {
    console.log(`Selected: ${file.name}`)
    console.log(`Type: ${validation.category}`)
  }}
  onError={(error) => setError(error)}
  maxSizeMB={50}
  label="Upload Medical Report"
/>
```

#### 3. `lib/reports-storage.ts` - Report Storage & Download
Manages report metadata and implements format-preserving downloads.

**Key Functions:**
- `storeReport(report)` - Save report metadata with content type
- `getPatientReports(patientAddress)` - Retrieve patient's reports
- `downloadReport(report)` - Download with original format

**Report Interface:**
```typescript
interface StoredReport {
  id: string
  ipfsHash: string
  patientAddress: string
  patientName: string
  doctorAddress: string
  doctorName: string
  reportTitle: string
  description: string
  uploadedAt: string
  uploadTimestamp: number
  fileSize: string
  contentType?: string    // MIME type - KEY for format preservation
  encrypted?: boolean
}
```

## How Format Preservation Works

### Upload Flow
1. **User selects file** → `handleFileChange` validates it
2. **Validation** → `validateFileUpload()` checks MIME type & size
3. **File stored** → `storeReport()` saves with `contentType` metadata
4. **Upload to IPFS** → `uploadFileToPinata()` sends file + metadata

### Download Flow
1. **User clicks Download** → `downloadReport()` starts
2. **Fetch from IPFS** → Retrieves original file bytes
3. **Detect format** → Uses stored `contentType`
4. **Create typed blob** → `new Blob([data], { type: mimeType })`
5. **Generate filename** → Uses correct extension (.jpg, .pdf, etc.)
6. **Download** → Browser downloads in original format

**Example: JPG File**
```
Upload:   user_report.jpg (image/jpeg)
↓
IPFS:     QmXxxx... (bytes stored)
↓
Storage:  { contentType: "image/jpeg", ... }
↓
Download: Create blob with type: "image/jpeg"
          Generate: "user_report_1710000000.jpg"
          Result:   JPG file (not .bin!)
```

## Integration with Doctor Dashboard

### In `app/doctor/page.tsx`
```typescript
import { validateFileUpload } from '@/lib/file-handler'

const handleFileChange = (e) => {
  const file = e.target.files?.[0]
  
  // Validate file before upload
  const validation = validateFileUpload(file, 50)
  if (!validation.valid) {
    setError(validation.error)
    return
  }
  
  setFormData(prev => ({ ...prev, file }))
}
```

### Storage with Content Type
```typescript
const report: StoredReport = {
  id: generateId(),
  contentType: formData.file.type,  // Preserve MIME type
  uploadedAt: new Date().toLocaleString(),
  // ... other fields
}
```

## Integration with Patient Dashboard

### Download with Format Preservation
```typescript
// When patient clicks Download button
downloadReport(report)  // Automatically handles format

// Behind the scenes:
// 1. Fetches blob from IPFS
// 2. Uses stored contentType (e.g., "image/jpeg")
// 3. Creates Blob with correct MIME type
// 4. Downloads as proper file (report_1710000000.jpg)
```

## Validation Examples

### Valid File
```
File: prescription.pdf
Type: application/pdf
Size: 2.5MB
Result: ✓ Accepted (PDF document)
```

### Invalid File - Unsupported Format
```
File: script.exe
Type: application/octet-stream
Size: 1MB
Result: ✗ Rejected (not supported)
Error: "File type is not supported"
```

### Invalid File - Too Large
```
File: large_video.mp4
Type: video/mp4
Size: 150MB
Result: ✗ Rejected (exceeds 50MB limit)
Error: "File size exceeds maximum allowed size (50MB)"
```

## Error Messages

| Scenario | Error Message |
|----------|--------------|
| Unsupported format | `File type "text/html" is not supported. Supported types: Images (JPG, PNG, GIF, WebP, BMP, TIFF) and Documents (PDF, DOC, DOCX, XLS, XLSX, TXT)` |
| File too large | `File size (125.50MB) exceeds maximum allowed size (50MB)` |
| No file selected | `Please select a file to upload` |
| Invalid patient address | `Please enter a valid Ethereum address for the patient` |

## Security Considerations

1. **MIME Type Validation** - Checked both at upload and download
2. **File Size Limits** - 50MB default maximum (configurable)
3. **Type Mapping** - Uses official IANA MIME type registry
4. **Blob Type Setting** - Ensures browser handles file correctly
5. **Filename Sanitization** - Removes special characters from download names

## Future Enhancements

1. **File Processing**
   - Image resizing/compression
   - PDF text extraction
   - Document OCR

2. **Format Conversion**
   - Optional: Convert PDF to images
   - Optional: Compress images

3. **Virus Scanning**
   - Integration with VirusTotal API

4. **Archiving**
   - Support for .zip, .rar formats

## References

- IANA Media Types: https://www.iana.org/assignments/media-types/media-types.xhtml
- MDN Blob Documentation: https://developer.mozilla.org/en-US/docs/Web/API/Blob
- File API Specification: https://w3c.github.io/FileAPI/

// File Handler Utility - Validates and manages file uploads with format preservation
// Ensures input format matches output format (JPG→JPG, PNG→PNG, PDF→PDF, etc.)

'use client'

// Supported file types with their MIME types and extensions
export const SUPPORTED_FILE_TYPES = {
  image: {
    'image/jpeg': { ext: 'jpg', name: 'JPEG Image' },
    'image/jpg': { ext: 'jpg', name: 'JPEG Image' },
    'image/png': { ext: 'png', name: 'PNG Image' },
    'image/gif': { ext: 'gif', name: 'GIF Image' },
    'image/webp': { ext: 'webp', name: 'WebP Image' },
    'image/bmp': { ext: 'bmp', name: 'BMP Image' },
    'image/tiff': { ext: 'tiff', name: 'TIFF Image' },
  },
  document: {
    'application/pdf': { ext: 'pdf', name: 'PDF Document' },
    'application/msword': { ext: 'doc', name: 'Word Document' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', name: 'Word Document' },
    'application/vnd.ms-excel': { ext: 'xls', name: 'Excel Spreadsheet' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', name: 'Excel Spreadsheet' },
    'text/plain': { ext: 'txt', name: 'Text File' },
  },
}

// All supported MIME types
const ALL_MIME_TYPES = Object.values(SUPPORTED_FILE_TYPES).reduce((acc, category) => {
  return { ...acc, ...category }
}, {} as Record<string, { ext: string; name: string }>)

// Get all supported extensions
export const SUPPORTED_EXTENSIONS = Object.values(ALL_MIME_TYPES).map(info => `.${info.ext}`)

export interface FileValidationResult {
  valid: boolean
  error?: string
  mimeType?: string
  extension?: string
  category?: 'image' | 'document'
}

/**
 * Validate file type based on MIME type and file extension
 */
export function validateFileType(file: File): FileValidationResult {
  const mimeType = file.type
  const fileName = file.name.toLowerCase()
  
  // Check if MIME type is supported
  if (!ALL_MIME_TYPES[mimeType]) {
    return {
      valid: false,
      error: `File type "${mimeType}" is not supported. Supported types: Images (JPG, PNG, GIF, WebP, BMP, TIFF) and Documents (PDF, DOC, DOCX, XLS, XLSX, TXT)`,
    }
  }

  // Get file info
  const fileInfo = ALL_MIME_TYPES[mimeType]
  
  // Determine category
  let category: 'image' | 'document' = 'document'
  if (mimeType.startsWith('image/')) {
    category = 'image'
  }

  return {
    valid: true,
    mimeType,
    extension: fileInfo.ext,
    category,
  }
}

/**
 * Get file info including display name and category
 */
export function getFileInfo(mimeType: string) {
  return ALL_MIME_TYPES[mimeType] || { ext: 'bin', name: 'Binary File' }
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeMB: number = 50): FileValidationResult {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
    }
  }

  return { valid: true }
}

/**
 * Validate file upload (type and size)
 */
export function validateFileUpload(
  file: File,
  maxSizeMB: number = 50
): FileValidationResult {
  // Validate type
  const typeValidation = validateFileType(file)
  if (!typeValidation.valid) {
    return typeValidation
  }

  // Validate size
  const sizeValidation = validateFileSize(file, maxSizeMB)
  if (!sizeValidation.valid) {
    return sizeValidation
  }

  return {
    valid: true,
    mimeType: typeValidation.mimeType,
    extension: typeValidation.extension,
    category: typeValidation.category,
  }
}

/**
 * Create a typed blob with the correct MIME type to ensure format preservation
 */
export function createTypedBlob(data: Blob | ArrayBuffer | string, mimeType: string): Blob {
  if (data instanceof Blob) {
    // If already a blob, create a new one with the correct MIME type
    return new Blob([data], { type: mimeType })
  }
  
  return new Blob([data], { type: mimeType })
}

/**
 * Generate download filename with correct extension
 */
export function generateDownloadFilename(
  originalName: string,
  extension: string,
  timestamp?: number
): string {
  // Remove existing extension
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
  // Sanitize filename
  const sanitized = nameWithoutExt.replace(/\s+/g, '_').replace(/[^a-z0-9_-]/gi, '')
  
  const timestamp_suffix = timestamp ? `_${timestamp}` : ''
  return `${sanitized}${timestamp_suffix}.${extension}`
}

/**
 * Download file with correct format preservation
 */
export function downloadFile(
  blob: Blob,
  mimeType: string,
  filename: string
): void {
  try {
    // Create typed blob with correct MIME type
    const typedBlob = createTypedBlob(blob, mimeType)
    
    // Create download link
    const url = URL.createObjectURL(typedBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 100)
    
    console.log('[v0] File downloaded:', {
      filename,
      mimeType,
      size: `${(blob.size / 1024).toFixed(2)}KB`,
    })
  } catch (error) {
    console.error('[v0] Error downloading file:', error)
    throw error
  }
}

/**
 * Get file category display info
 */
export function getFileCategory(mimeType: string): 'image' | 'document' | 'unknown' {
  if (mimeType.startsWith('image/')) return 'image'
  if (Object.keys(SUPPORTED_FILE_TYPES.document).includes(mimeType)) return 'document'
  return 'unknown'
}

'use client'

import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, FileText, Upload } from 'lucide-react'
import { SUPPORTED_FILE_TYPES, validateFileUpload, SUPPORTED_EXTENSIONS } from '@/lib/file-handler'

interface FileUploadInputProps {
  onFileSelect: (file: File, validation: any) => void
  onError?: (error: string) => void
  maxSizeMB?: number
  accept?: string
  multiple?: boolean
  label?: string
  description?: string
}

export function FileUploadInput({
  onFileSelect,
  onError,
  maxSizeMB = 50,
  accept,
  multiple = false,
  label = 'Upload File',
  description = 'Supported formats: Images (JPG, PNG, GIF, WebP, BMP, TIFF) and Documents (PDF, DOC, DOCX, XLS, XLSX, TXT)',
}: FileUploadInputProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileValidation = (selectedFile: File) => {
    const validation = validateFileUpload(selectedFile, maxSizeMB)

    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      setFile(null)
      onError?.(validation.error || 'Invalid file')
      return
    }

    setFile(selectedFile)
    setError(null)
    onFileSelect(selectedFile, validation)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileValidation(selectedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      handleFileValidation(droppedFile)
    }
  }

  const acceptExtensions = accept || SUPPORTED_EXTENSIONS.join(',')

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input
          type="file"
          onChange={handleFileChange}
          accept={acceptExtensions}
          multiple={multiple}
          className="hidden"
          id="file-upload-input"
        />
        <label htmlFor="file-upload-input" className="cursor-pointer">
          <div className="flex flex-col items-center gap-2 py-4">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">{label}</p>
              <p className="text-sm text-muted-foreground">
                Drag and drop your file here, or click to select
              </p>
            </div>
            <Button variant="outline" size="sm" type="button" className="mt-2">
              Select File
            </Button>
          </div>
        </label>
      </div>

      {error && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <div className="ml-2 text-sm text-destructive">{error}</div>
        </Alert>
      )}

      {file && !error && (
        <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <div className="ml-2">
            <p className="text-sm font-medium text-green-700">File selected</p>
            <p className="text-xs text-green-600">
              {file.name} • {(file.size / 1024 / 1024).toFixed(2)}MB
            </p>
          </div>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground">{description}</p>
      <p className="text-xs text-muted-foreground">
        Maximum file size: {maxSizeMB}MB
      </p>
    </div>
  )
}

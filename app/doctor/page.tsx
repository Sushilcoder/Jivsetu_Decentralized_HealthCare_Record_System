'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { useDoctorAuth } from '@/context/doctor-auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, AlertCircle, CheckCircle, File as FileIcon, Trash2, Loader, User, Search, FileText, Eye, Download, Share2, Clock, Lock, Shield, RefreshCw, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FieldGroup, FieldLabel } from '@/components/ui/field'
import { uploadFileToPinata, getIPFSUrl } from '@/lib/pinata'
import { getPatientsWhoGrantedAccess, grantAccessToDoctor } from '@/lib/access-storage'
import { storeReport, getPatientReports, downloadReport, countIPFSReports, clearAllReports } from '@/lib/reports-storage'
import { Badge } from '@/components/ui/badge'
import { encryptFileToBlob, storeEncryptionMetadata } from '@/lib/encryption'
import { logFileUpload, logFileView, logFileDownload } from '@/lib/access-log'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { validateFileUpload, downloadFile, generateDownloadFilename } from '@/lib/file-handler'

interface UploadedReport {
  id: string
  ipfsHash?: string
  patientName: string
  patientAddress: string
  reportTitle: string
  description: string
  uploadedAt: string
  fileSize: string
}

export default function DoctorDashboard() {
  const { user, isConnected } = useAuth()
  const { session, isLoggedIn } = useDoctorAuth()
  const router = useRouter()
  const [reports, setReports] = useState<UploadedReport[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'wallet' | 'name'>('wallet')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [patientsWithAccess, setPatientsWithAccess] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)
  const [patientRecords, setPatientRecords] = useState<any[]>([])
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    patientName: '',
    patientAddress: '',
    reportTitle: '',
    description: '',
    file: null as File | null,
  })
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedUploadPatient, setSelectedUploadPatient] = useState<any | null>(null)
  const [encryptionEnabled, setEncryptionEnabled] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const loadPatientsWithAccess = () => {
    if (user?.address) {
      const patients = getPatientsWhoGrantedAccess(user.address)
      
      // Update record count to only count IPFS-uploaded reports
      const patientsWithIPFSCounts = patients.map(patient => ({
        ...patient,
        recordCount: countIPFSReports(patient.patientAddress),
      }))
      
      setPatientsWithAccess(patientsWithIPFSCounts)
      console.log('[v0] Loaded patients with IPFS report counts:', patientsWithIPFSCounts)
    }
  }

  const handleRefreshPatients = async () => {
    setIsRefreshing(true)
    try {
      // Add a small delay to ensure data is updated
      await new Promise(resolve => setTimeout(resolve, 300))
      loadPatientsWithAccess()
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    // Redirect to login if not authenticated as a doctor
    if (!isLoggedIn) {
      console.log('[v0] Doctor not logged in, redirecting to login');
      router.push('/doctor/login');
    } else {
      setIsCheckingAuth(false);
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (user?.address && !isCheckingAuth) {
      // Don't initialize mock data - only load real patient grants
      // initializeMockAccessData()
      // Load patients who granted access
      loadPatientsWithAccess()
    }
  }, [user?.address, isCheckingAuth])

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying doctor access...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <span>Please connect your wallet to access the doctor dashboard</span>
          </Alert>
          <Button onClick={() => router.push('/')}>Return to Home</Button>
        </div>
      </div>
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    if (!file) {
      setFormData(prev => ({ ...prev, file: null }))
      setError(null)
      return
    }

    // Validate file type and size
    const validation = validateFileUpload(file, 50) // 50MB max
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      setFormData(prev => ({ ...prev, file: null }))
      return
    }

    setFormData(prev => ({ ...prev, file }))
    setError(null)
    console.log('[v0] File selected and validated:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      extension: validation.extension,
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setUploadProgress(0)

    try {
      console.log('[v0] Submit form data:', formData);
      
      if (!formData.file) {
        throw new Error('Please select a file to upload')
      }

      if (!formData.patientAddress.startsWith('0x')) {
        throw new Error('Please enter a valid Ethereum address for the patient')
      }

      // Since the patient was selected from the "Upload Record" button in the My Patients tab,
      // we trust that they have already been verified as having granted access.
      // No additional permission check needed here.
      console.log('[v0] Uploading for patient:', formData.patientAddress);

      let fileToUpload: File | Blob = formData.file
      let encryptionMetadata = null

      // Encrypt the file if encryption is enabled
      if (encryptionEnabled) {
        const { blob, encryptionMetadata: metadata } = await encryptFileToBlob(
          formData.file,
          formData.patientAddress
        )
        fileToUpload = new File([blob], formData.file.name + '.encrypted', { type: 'application/octet-stream' })
        encryptionMetadata = metadata
      }

      const uploadedFile = await uploadFileToPinata(
        fileToUpload as File,
        {
          name: formData.reportTitle,
          patientAddress: formData.patientAddress,
          doctorAddress: user?.address || '',
          description: formData.description,
          contentType: encryptionEnabled ? 'application/encrypted' : formData.file.type,
        },
        (progress) => {
          setUploadProgress(progress)
        }
      )

      // Store encryption metadata if encrypted
      if (encryptionMetadata) {
        storeEncryptionMetadata(uploadedFile.hash, encryptionMetadata)
      }

      const newReport: UploadedReport = {
        id: uploadedFile.hash,
        ipfsHash: uploadedFile.hash,
        patientName: formData.patientName,
        patientAddress: formData.patientAddress,
        reportTitle: formData.reportTitle,
        description: formData.description,
        uploadedAt: new Date().toLocaleString(),
        fileSize: `${(formData.file.size / 1024 / 1024).toFixed(2)}MB`,
      }

      setReports([newReport, ...reports])
      
      // Store report with real doctor details
      storeReport({
        id: uploadedFile.hash,
        ipfsHash: uploadedFile.hash,
        patientAddress: formData.patientAddress,
        patientName: formData.patientName,
        doctorAddress: user?.address || '',
        doctorName: user?.name || 'Unknown Doctor',
        reportTitle: formData.reportTitle,
        description: formData.description,
        uploadedAt: new Date().toLocaleString(),
        uploadTimestamp: Date.now(),
        fileSize: `${(formData.file.size / 1024 / 1024).toFixed(2)}MB`,
        contentType: formData.file.type || 'application/octet-stream',
        encrypted: encryptionEnabled,
      } as any)

      // Log the upload event
      logFileUpload(
        formData.patientAddress,
        user?.address || '',
        uploadedFile.hash,
        formData.reportTitle
      )

      setFormData({
        patientName: '',
        patientAddress: '',
        reportTitle: '',
        description: '',
        file: null,
      })
      setShowUploadDialog(false)
      setSelectedUploadPatient(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      // Refresh patient list to ensure UI is updated
      loadPatientsWithAccess()
    } catch (err) {
      console.error('[v0] Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload report')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  const deleteReport = (id: string) => {
    setReports(reports.filter(r => r.id !== id))
  }

  const handleSearchPatient = () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    // Search in patients with granted access + mock patients
    const allPatients = [
      ...patientsWithAccess.map(p => ({
        address: p.patientAddress,
        name: p.patientName,
        records: p.recordCount,
        hasAccess: true,
      })),
      { address: '0x1234567890123456789012345678901234567890', name: 'Jane Smith', records: 2, hasAccess: false },
      { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Robert Johnson', records: 5, hasAccess: false },
    ]

    let results = []
    if (searchType === 'wallet') {
      results = allPatients.filter(p => p.address.toLowerCase().includes(searchQuery.toLowerCase()))
    } else {
      results = allPatients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    setSearchResults(results)
  }

  const handleViewRecords = (patient: any) => {
    // Get real stored reports for this patient
    const storedReports = getPatientReports(patient.address)
    
    // Map stored reports to display format
    const displayRecords = storedReports.map(report => ({
      id: report.id,
      title: report.reportTitle,
      date: report.uploadedAt,
      fileHash: report.ipfsHash,
      details: report.description,
      doctor: report.doctorName,
      doctorAddress: report.doctorAddress,
      patientName: report.patientName,
      patientAddress: report.patientAddress,
    }))

    setSelectedPatient(patient)
    setPatientRecords(displayRecords)
    setSelectedRecord(null)
  }

  const handleUploadForPatient = (patient: any) => {
    setSelectedUploadPatient(patient)
    const patientAddr = patient.patientAddress || patient.address;
    const patientName = patient.patientName || patient.name;
    
    console.log('[v0] Upload for patient - patient data:', { patientAddr, patientName, fullPatient: patient });
    
    setFormData({
      ...formData,
      patientName: patientName,
      patientAddress: patientAddr,
    })
    setShowUploadDialog(true)
  }

  const handleDownloadWithLogging = (record: any) => {
    // Log the download
    logFileDownload(
      record.patientAddress,
      user?.address || '',
      record.fileHash,
      record.title
    )
    
    // Create downloadable report
    const fullReport = {
      id: record.id,
      ipfsHash: record.fileHash,
      patientAddress: record.patientAddress,
      patientName: record.patientName,
      doctorAddress: record.doctorAddress,
      doctorName: record.doctor,
      reportTitle: record.title,
      description: record.details,
      uploadedAt: record.date,
      uploadTimestamp: Date.now(),
      fileSize: 'N/A',
    }
    downloadReport(fullReport)
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Doctor Dashboard</h1>
            <p className="text-muted-foreground">Upload and manage patient medical reports securely to IPFS</p>
            <p className="text-xs text-muted-foreground mt-2">Connected Wallet: {user?.address?.slice(0, 10)}...</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/doctor/profile')} className="gap-2">
            <User className="w-4 h-4" />
            My Profile
          </Button>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-500/10 border-green-500/20">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-green-700 dark:text-green-400">Report uploaded successfully to IPFS!</span>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </Alert>
        )}

        <Tabs defaultValue="patients" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="patients">My Patients</TabsTrigger>
            <TabsTrigger value="upload">Upload Reports</TabsTrigger>
            <TabsTrigger value="view">Search Patients</TabsTrigger>
          </TabsList>

          {/* My Patients Tab - Shows patients who granted access */}
          <TabsContent value="patients" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Authorized Patients</h2>
                <p className="text-muted-foreground">Patients who have granted you access to their records</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{patientsWithAccess.length} Patients</Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefreshPatients}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {patientsWithAccess.length === 0 ? (
              <Card className="p-12 text-center">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No patients have granted you access yet</p>
                <p className="text-sm text-muted-foreground mt-2">When patients grant you access, they will appear here</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {patientsWithAccess.map((patient) => (
                  <Card key={patient.patientAddress} className="p-6 hover:shadow-lg transition border-green-500/30 bg-green-500/5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{patient.patientName}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{patient.patientAddress.slice(0, 10)}...{patient.patientAddress.slice(-6)}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-600 hover:bg-green-700">Access Granted</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {patient.recordCount} Records
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Since {new Date(patient.grantedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1 gap-2"
                        onClick={() => handleViewRecords({
                          address: patient.patientAddress,
                          name: patient.patientName,
                          hasAccess: true,
                        })}
                      >
                        <Eye className="w-4 h-4" />
                        View Records
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-2"
                        onClick={() => handleUploadForPatient(patient)}
                      >
                        <Upload className="w-4 h-4" />
                        Upload Record
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Upload Reports Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-8">
            <Card className="p-6 sticky top-24">
              <h2 className="text-2xl font-bold mb-6">Upload Report</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FieldGroup>
                  <FieldLabel>Patient Name</FieldLabel>
                  <Input
                    name="patientName"
                    value={formData.patientName}
                    onChange={handleInputChange}
                    placeholder="Enter patient name"
                    required
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel>Patient Wallet Address</FieldLabel>
                  <Input
                    name="patientAddress"
                    value={formData.patientAddress}
                    onChange={handleInputChange}
                    placeholder="0x..."
                    required
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel>Report Title</FieldLabel>
                  <Input
                    name="reportTitle"
                    value={formData.reportTitle}
                    onChange={handleInputChange}
                    placeholder="e.g., Blood Test Report"
                    required
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Add notes about this report..."
                    rows={3}
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel>Upload File</FieldLabel>
                  <label className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:border-primary cursor-pointer transition">
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOC, JPG up to 100MB</p>
                    </div>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                  </label>
                  {formData.file && (
                    <p className="text-sm text-green-600 mt-2">✓ {formData.file.name}</p>
                  )}
                </FieldGroup>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="bg-secondary rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">Upload Progress</span>
                      <span className="text-xs">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !formData.file}
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Report'
                  )}
                </Button>
              </form>
            </Card>
          </div>

          {/* Reports List */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Recent Uploads</h2>
            {reports.length === 0 ? (
              <Card className="p-12 text-center">
                <FileIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No reports uploaded yet</p>
                <p className="text-sm text-muted-foreground mt-2">Upload your first patient report to get started</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {reports.map(report => (
                  <Card key={report.id} className="p-6 hover:shadow-lg transition">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{report.reportTitle}</h3>
                        <p className="text-sm text-muted-foreground">Patient: {report.patientName}</p>
                        <p className="text-xs text-muted-foreground break-all">{report.patientAddress}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReport(report.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    {report.description && (
                      <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span>Size: {report.fileSize}</span>
                      <span>Uploaded: {report.uploadedAt}</span>
                    </div>
                    {report.ipfsHash && (
                      <div className="flex items-center gap-3">
                        <div className="bg-secondary/50 rounded p-3 text-xs break-all flex-1">
                          <span className="font-mono">IPFS Hash: {report.ipfsHash}</span>
                        </div>
                        <a
                          href={getIPFSUrl(report.ipfsHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm flex items-center gap-1"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadReport(report)}
                          className="gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
            </div>
          </TabsContent>

          {/* View Patient Records Tab */}
          <TabsContent value="view" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-6">Search Patient Records</h2>
              <Card className="p-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <FieldLabel className="mb-2 block">Search By</FieldLabel>
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={searchType === 'wallet' ? 'default' : 'outline'}
                        onClick={() => setSearchType('wallet')}
                        size="sm"
                      >
                        Wallet Address
                      </Button>
                      <Button
                        variant={searchType === 'name' ? 'default' : 'outline'}
                        onClick={() => setSearchType('name')}
                        size="sm"
                      >
                        Patient Name
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder={searchType === 'wallet' ? 'Enter wallet address (0x...)' : 'Enter patient name'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchPatient()}
                    />
                    <Button onClick={handleSearchPatient} className="gap-2">
                      <Search className="w-4 h-4" />
                      Search
                    </Button>
                  </div>
                </div>
              </Card>

              {searchResults.length === 0 && searchQuery ? (
                <Card className="p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No patients found</p>
                  <p className="text-sm text-muted-foreground mt-2">Try searching with a different query</p>
                </Card>
              ) : searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((patient) => (
                    <Card key={patient.address} className={`p-6 hover:shadow-lg transition ${patient.hasAccess ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{patient.name}</h3>
                            <Badge variant="secondary">{patient.records} Records</Badge>
                            {patient.hasAccess && (
                              <Badge className="bg-green-600 hover:bg-green-700">Access Granted</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono break-all">{patient.address}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                        <Button 
                          variant={patient.hasAccess ? 'default' : 'outline'}
                          size="sm" 
                          className="gap-2"
                          disabled={!patient.hasAccess}
                          onClick={() => patient.hasAccess && handleViewRecords(patient)}
                        >
                          <Eye className="w-4 h-4" />
                          View Records
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          disabled={patient.hasAccess}
                        >
                          <FileText className="w-4 h-4" />
                          {patient.hasAccess ? 'Access Active' : 'Request Access'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Search for patients to view their records</p>
                  <p className="text-sm text-muted-foreground mt-2">Enter a wallet address or patient name above</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Patient Records Modal */}
        {selectedPatient && !selectedRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-8 border-b sticky top-0 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{selectedPatient.name}</h2>
                    <p className="text-primary-foreground/80 font-mono text-sm">{selectedPatient.address}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    onClick={() => setSelectedPatient(null)}
                    className="text-primary-foreground hover:bg-primary-foreground/20"
                  >
                    ✕
                  </Button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">Medical Records</h3>
                  <Badge className="bg-green-600 hover:bg-green-700 text-lg px-3 py-1">
                    ✓ Access Granted
                  </Badge>
                </div>

                {patientRecords.length > 0 ? (
                  <div className="grid gap-4">
                    {patientRecords.map((record) => (
                      <Card 
                        key={record.id} 
                        className="p-6 hover:shadow-lg hover:border-primary transition cursor-pointer group"
                        onClick={() => setSelectedRecord(record)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold flex items-center gap-3 group-hover:text-primary transition">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              {record.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-2">
                              <span className="font-medium">Uploaded:</span> {record.date}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono mt-1 bg-muted p-2 rounded mt-3">
                              {record.fileHash}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRecord(record)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center bg-muted/30">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                    <p className="text-lg text-muted-foreground">No records available</p>
                  </Card>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Record Detail Modal */}
        {selectedRecord && selectedPatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-8 border-b bg-gradient-to-r from-primary to-primary/90 text-primary-foreground sticky top-0">
                <div className="flex items-start justify-between mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedRecord(null)}
                    className="text-primary-foreground hover:bg-primary-foreground/20"
                  >
                    {'\u2190'} Back to Records
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    onClick={() => setSelectedRecord(null)}
                    className="text-primary-foreground hover:bg-primary-foreground/20"
                  >
                    ✕
                  </Button>
                </div>
                <h2 className="text-3xl font-bold">{selectedRecord.title}</h2>
              </div>

              <div className="p-8 space-y-6">
                {/* Patient Info */}
                <div className="grid grid-cols-2 gap-4 pb-6 border-b">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Patient Name</p>
                    <p className="text-lg font-semibold">{selectedPatient.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Report Date</p>
                    <p className="text-lg font-semibold">{selectedRecord.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Treating Doctor</p>
                    <p className="text-lg font-semibold">{selectedRecord.doctor}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Record Type</p>
                    <Badge variant="secondary">{selectedRecord.title}</Badge>
                  </div>
                </div>

                {/* Report Details */}
                <div>
                  <h3 className="text-xl font-bold mb-4">Report Details</h3>
                  <div className="bg-muted/50 p-6 rounded-lg border">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedRecord.details}
                    </p>
                  </div>
                </div>

                {/* File Info */}
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-mono text-muted-foreground">
                    <span className="font-semibold">IPFS Hash:</span> {selectedRecord.fileHash}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    className="flex-1" 
                    size="lg"
                    onClick={() => handleDownloadWithLogging(selectedRecord)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                  <Button variant="outline" size="lg" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Upload Record Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Medical Record
              </DialogTitle>
              <DialogDescription>
                Upload a new medical record for {selectedUploadPatient?.patientName || selectedUploadPatient?.name}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FieldGroup>
                <FieldLabel>Patient</FieldLabel>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{formData.patientName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{formData.patientAddress}</p>
                  </div>
                </div>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Report Title</FieldLabel>
                <Input
                  name="reportTitle"
                  value={formData.reportTitle}
                  onChange={handleInputChange}
                  placeholder="e.g., Blood Test Report, X-Ray Results"
                  required
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Add notes about this report..."
                  rows={3}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Upload File</FieldLabel>
                <label className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:border-primary cursor-pointer transition">
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {formData.file ? formData.file.name : 'Click to upload or drag and drop'}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, JPG up to 100MB</p>
                  </div>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                </label>
                {formData.file && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {formData.file.name}
                  </p>
                )}
              </FieldGroup>

              {/* Encryption Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">AES-256 Encryption</p>
                    <p className="text-xs text-muted-foreground">Encrypt file before upload</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={encryptionEnabled}
                    onChange={(e) => setEncryptionEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="bg-secondary rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">Uploading...</span>
                    <span className="text-xs">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <Alert className="bg-red-500/10 border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-700 dark:text-red-400">{error}</span>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowUploadDialog(false)
                    setSelectedUploadPatient(null)
                    setError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !formData.file}
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Record
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

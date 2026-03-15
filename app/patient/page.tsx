'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Eye, EyeOff, CheckCircle, Clock, FileText, Lock, ExternalLink, Plus, Share2, User, Upload, Download, Shield, Loader, Trash2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { grantFileAccess, revokeFileAccess, getDoctorsWithAccess, getAccessLog } from '@/lib/alchemy'
import { listPatientFiles, getIPFSUrl, uploadFileToPinata } from '@/lib/pinata'
import { grantAccessToDoctor, revokeAccessFromDoctor, getDoctorsWithAccessToPatient } from '@/lib/access-storage'
import { getPatientAccessLogs, logAccessGrant, logAccessRevoke } from '@/lib/access-log'
import { storeReport, getPatientReports, downloadReport } from '@/lib/reports-storage'
import { encryptFileToBlob, storeEncryptionMetadata } from '@/lib/encryption'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, FieldLabel } from '@/components/ui/field'
import type { BrowserProvider } from 'ethers'

interface AccessLog {
  id: string
  doctorAddress: string
  action: string
  timestamp: number
  fileName?: string
  fileHash?: string
}

interface Report {
  id: string
  hash: string
  doctorAddress: string
  reportTitle: string
  description: string
  timestamp: number
  isAccessGranted: boolean
}

interface DoctorPermission {
  address: string
  files: string[]
  grantedAt: number
}

export default function PatientDashboard() {
  const { user, isConnected, provider } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [doctorPermissions, setDoctorPermissions] = useState<DoctorPermission[]>([])
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newDoctorAddress, setNewDoctorAddress] = useState('')
  const [isGranting, setIsGranting] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [encryptionEnabled, setEncryptionEnabled] = useState(true)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [formData, setFormData] = useState({
    reportTitle: '',
    description: '',
    file: null as File | null,
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadDoctorPermissions = () => {
    if (user?.address) {
      const doctors = getDoctorsWithAccessToPatient(user.address)
      setDoctorPermissions(doctors.map(access => ({
        address: access.doctorAddress,
        files: access.files || [],
        grantedAt: access.grantedAt,
      })))
    }
  }

  const handleRefreshPermissions = async () => {
    setIsRefreshing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      loadDoctorPermissions()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!isConnected || !user || !provider) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Load patient's reports from IPFS
        const patientReports = await listPatientFiles(user.address)
        const formattedReports: Report[] = patientReports.map((report, index) => {
          // Create a stable unique key using report properties and a unique counter
          const stableId = `report-${index}-${Math.random().toString(36).substr(2, 9)}`
          return {
            id: stableId,
            hash: report.hash,
            doctorAddress: report.doctorAddress,
            reportTitle: report.name,
            description: report.description,
            timestamp: report.timestamp,
            isAccessGranted: true,
          }
        })

        setReports(formattedReports)

        // Load permissions
        const permissions = await getDoctorsWithAccess(provider, user.address)
        setDoctorPermissions(permissions)

        // Load access logs from local storage
        const localLogs = getPatientAccessLogs(user.address)
        const formattedLogs: AccessLog[] = localLogs.map(log => ({
          id: log.id,
          doctorAddress: log.doctorAddress,
          action: log.action,
          timestamp: log.timestamp,
          fileName: log.fileName,
          fileHash: log.fileHash,
        }))
        
        // If no local logs, try blockchain logs
        if (formattedLogs.length === 0) {
          const blockchainLogs = await getAccessLog(provider, user.address)
          setAccessLogs(blockchainLogs && blockchainLogs.length > 0 ? blockchainLogs : [])
        } else {
          setAccessLogs(formattedLogs)
        }
        
        // Also load locally stored reports
        const storedReports = getPatientReports(user.address)
        if (storedReports.length > 0) {
          const localReports: Report[] = storedReports.map((report, index) => ({
            id: report.id,
            hash: report.ipfsHash,
            doctorAddress: report.doctorAddress,
            reportTitle: report.reportTitle,
            description: report.description,
            timestamp: report.uploadTimestamp,
            isAccessGranted: true,
          }))
          // Merge with IPFS reports, avoiding duplicates
          const allReports = [...formattedReports]
          localReports.forEach(lr => {
            if (!allReports.find(r => r.hash === lr.hash)) {
              allReports.push(lr)
            }
          })
          setReports(allReports)
        }
      } catch (err) {
        console.error('[v0] Error loading patient data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isConnected, user, provider])

  if (!isConnected) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <span>Please connect your wallet to access the patient dashboard</span>
          </Alert>
          <Button onClick={() => router.push('/')}>Return to Home</Button>
        </div>
      </div>
    )
  }

  const toggleAccess = async (doctorAddress: string, reportHash: string, shouldGrant: boolean) => {
    if (!provider) return

    try {
      if (shouldGrant) {
        await grantFileAccess(provider, doctorAddress, user.address, reportHash, reports.find(r => r.hash === reportHash)?.reportTitle || 'Report')
      } else {
        await revokeFileAccess(provider, doctorAddress, user.address, reportHash)
      }

      // Reload permissions
      const updatedPermissions = await getDoctorsWithAccess(provider, user.address)
      setDoctorPermissions(updatedPermissions)
    } catch (err) {
      console.error('[v0] Error toggling access:', err)
    }
  }

  const revokeAllAccess = async (doctorAddress: string) => {
    if (!user) return

    try {
      revokeAccessFromDoctor(user.address, doctorAddress)

      // Reload permissions
      const updatedPermissions = getDoctorsWithAccessToPatient(user.address).map(access => ({
        address: access.doctorAddress,
        files: access.files || [],
        grantedAt: access.grantedAt,
      }))
      setDoctorPermissions(updatedPermissions)
    } catch (err) {
      console.error('[v0] Error revoking access:', err)
    }
  }

  const handleGrantAccess = async () => {
    if (!newDoctorAddress.trim() || !provider || !user) return

    if (!newDoctorAddress.startsWith('0x')) {
      alert('Please enter a valid Ethereum address')
      return
    }

    setIsGranting(true)
    try {
      // Grant access to all patient's files
      const fileHashes = reports.map(r => r.hash)
      grantAccessToDoctor(user.address, user.name || 'Patient', newDoctorAddress, fileHashes)

      // Log the access grant event
      logAccessGrant(user.address, newDoctorAddress, fileHashes)

      // Reload permissions
      const updatedPermissions = getDoctorsWithAccessToPatient(user.address).map(access => ({
        address: access.doctorAddress,
        files: access.files || [],
        grantedAt: access.grantedAt,
      }))
      setDoctorPermissions(updatedPermissions)
      
      // Reload access logs
      const updatedLogs = getPatientAccessLogs(user.address).map(log => ({
        id: log.id,
        doctorAddress: log.doctorAddress,
        action: log.action,
        timestamp: log.timestamp,
        fileName: log.fileName,
        fileHash: log.fileHash,
      }))
      setAccessLogs(updatedLogs)
      
      setNewDoctorAddress('')
      alert('Access granted successfully!')
      // Refresh doctor permissions to ensure immediate UI update
      loadDoctorPermissions()
    } catch (err) {
      console.error('[v0] Error granting access:', err)
      alert('Failed to grant access. Please try again.')
    } finally {
      setIsGranting(false)
    }
  }

  const handleRevokeAccess = async (doctorAddress: string) => {
    if (!user) return

    try {
      revokeAccessFromDoctor(user.address, doctorAddress)
      
      // Log the revoke event
      logAccessRevoke(user.address, doctorAddress)

      // Reload permissions
      const updatedPermissions = getDoctorsWithAccessToPatient(user.address).map(access => ({
        address: access.doctorAddress,
        files: access.files || [],
        grantedAt: access.grantedAt,
      }))
      setDoctorPermissions(updatedPermissions)
      
      // Reload access logs
      const updatedLogs = getPatientAccessLogs(user.address).map(log => ({
        id: log.id,
        doctorAddress: log.doctorAddress,
        action: log.action,
        timestamp: log.timestamp,
        fileName: log.fileName,
        fileHash: log.fileHash,
      }))
      setAccessLogs(updatedLogs)
    } catch (err) {
      console.error('[v0] Error revoking access:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setFormData(prev => ({ ...prev, file: file || null }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleUploadRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.file || !user) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      let fileToUpload: File | Blob = formData.file
      let encryptionMetadata = null

      // Encrypt the file if encryption is enabled
      if (encryptionEnabled) {
        const { blob, encryptionMetadata: metadata } = await encryptFileToBlob(
          formData.file,
          user.address
        )
        fileToUpload = new File([blob], formData.file.name + '.encrypted', { type: 'application/octet-stream' })
        encryptionMetadata = metadata
      }

      const uploadedFile = await uploadFileToPinata(
        fileToUpload as File,
        {
          name: formData.reportTitle,
          patientAddress: user.address,
          doctorAddress: user.address, // Self-uploaded
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

      // Store the report
      storeReport({
        id: uploadedFile.hash,
        ipfsHash: uploadedFile.hash,
        patientAddress: user.address,
        patientName: user.name || 'Patient',
        doctorAddress: user.address,
        doctorName: 'Self-Uploaded',
        reportTitle: formData.reportTitle,
        description: formData.description,
        uploadedAt: new Date().toLocaleString(),
        uploadTimestamp: Date.now(),
        fileSize: `${(formData.file.size / 1024 / 1024).toFixed(2)}MB`,
        contentType: formData.file.type || 'application/octet-stream',
      })

      // Add to local reports state
      const newReport: Report = {
        id: uploadedFile.hash,
        hash: uploadedFile.hash,
        doctorAddress: user.address,
        reportTitle: formData.reportTitle,
        description: formData.description,
        timestamp: Date.now(),
        isAccessGranted: true,
      }
      setReports([newReport, ...reports])

      // Reset form
      setFormData({
        reportTitle: '',
        description: '',
        file: null,
      })
      setShowUploadDialog(false)
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (err) {
      console.error('[v0] Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload record')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Patient Dashboard</h1>
            <p className="text-muted-foreground">Manage your medical records and control access permissions</p>
            <p className="text-xs text-muted-foreground mt-2">Connected Wallet: {user?.address?.slice(0, 10)}...</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/patient/profile')} className="gap-2">
            <User className="w-4 h-4" />
            My Profile
          </Button>
        </div>

        {error && (
          <Alert className="mb-6 bg-amber-500/10 border-amber-500/20">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-400">{error}</span>
          </Alert>
        )}

        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="reports">My Reports</TabsTrigger>
            <TabsTrigger value="access">Access Logs</TabsTrigger>
            <TabsTrigger value="permissions">Active Permissions</TabsTrigger>
            <TabsTrigger value="grant">Grant Access</TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            {uploadSuccess && (
              <Alert className="mb-6 bg-green-500/10 border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-700 dark:text-green-400">Record uploaded successfully to IPFS!</span>
              </Alert>
            )}
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Medical Reports</h2>
                <p className="text-muted-foreground">View and manage all your uploaded medical records</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{reports.length} Reports</Badge>
                <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Record
                </Button>
              </div>
            </div>

            {isLoading ? (
              <Card className="p-12 text-center">
                <div className="animate-pulse">
                  <div className="h-8 bg-secondary rounded w-1/3 mx-auto mb-4"></div>
                  <div className="h-4 bg-secondary rounded w-1/2 mx-auto"></div>
                </div>
              </Card>
            ) : reports.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No reports available</p>
                <p className="text-sm text-muted-foreground mt-2">Your doctors will upload reports here</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {reports.map(report => (
                  <Card key={report.id} className="p-6 hover:shadow-lg transition">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{report.reportTitle}</h3>
                          <Badge variant="default">On IPFS</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">From: {report.doctorAddress.slice(0, 10)}...</p>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t">
                      <a
                        href={getIPFSUrl(report.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                      >
                        View on IPFS
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          // Find the stored report to get full details for download
                          const storedReports = getPatientReports(user?.address || '');
                          const storedReport = storedReports.find(r => r.ipfsHash === report.hash);
                          if (storedReport) {
                            downloadReport(storedReport);
                          }
                        }}
                        className="gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                      <span className="text-xs text-muted-foreground">Hash: {report.hash.slice(0, 10)}...</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Access Logs Tab */}
          <TabsContent value="access" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Access Logs</h2>
                <p className="text-muted-foreground">Track who has accessed your medical records</p>
              </div>
              <Badge variant="secondary">{accessLogs.length} Events</Badge>
            </div>

            {isLoading ? (
              <Card className="p-12 text-center">
                <div className="animate-pulse">
                  <div className="h-8 bg-secondary rounded w-1/3 mx-auto mb-4"></div>
                  <div className="h-4 bg-secondary rounded w-1/2 mx-auto"></div>
                </div>
              </Card>
            ) : accessLogs.length === 0 ? (
              <Card className="p-12 text-center">
                <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No access logs yet</p>
                <p className="text-sm text-muted-foreground mt-2">Activity will appear here</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {accessLogs.map((log, idx) => (
                  <Card key={log.id || idx} className="p-6 hover:shadow-lg transition">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          {log.action === 'granted' && <CheckCircle className="w-5 h-5 text-green-500" />}
                          {log.action === 'revoked' && <Lock className="w-5 h-5 text-red-500" />}
                          {log.action === 'viewed' && <Eye className="w-5 h-5 text-blue-500" />}
                          {log.action === 'downloaded' && <Download className="w-5 h-5 text-purple-500" />}
                          {log.action === 'uploaded' && <Upload className="w-5 h-5 text-green-500" />}
                          {log.action === 'granted' ? 'Access Granted' : 
                           log.action === 'revoked' ? 'Access Revoked' :
                           log.action === 'viewed' ? 'Record Viewed' :
                           log.action === 'downloaded' ? 'Record Downloaded' :
                           log.action === 'uploaded' ? 'Record Uploaded' : log.action}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Doctor: {log.doctorAddress.slice(0, 10)}...{log.doctorAddress.slice(-6)}
                        </p>
                        {log.fileName && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {log.fileName}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant={log.action === 'granted' || log.action === 'uploaded' ? 'default' : 'secondary'}
                        className={
                          log.action === 'revoked' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                          log.action === 'viewed' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          log.action === 'downloaded' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                          ''
                        }
                      >
                        {log.action}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Active Permissions</h2>
                <p className="text-muted-foreground">Manage which doctors can access your records</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{doctorPermissions.length} Doctors</Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefreshPermissions}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {isLoading ? (
              <Card className="p-12 text-center">
                <div className="animate-pulse">
                  <div className="h-8 bg-secondary rounded w-1/3 mx-auto mb-4"></div>
                  <div className="h-4 bg-secondary rounded w-1/2 mx-auto"></div>
                </div>
              </Card>
            ) : doctorPermissions.length === 0 ? (
              <Card className="p-12 text-center">
                <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active permissions</p>
                <p className="text-sm text-muted-foreground mt-2">Grant permissions to doctors to share your records</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {doctorPermissions.map((permission) => (
                  <Card key={permission.address} className="p-6 hover:shadow-lg transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <h3 className="text-lg font-semibold">{permission.address}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Can access {permission.files.length} file{permission.files.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex gap-4 mt-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Since {new Date(permission.grantedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeAccess(permission.address)}
                      >
                        Revoke All
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Grant Access Tab */}
          <TabsContent value="grant" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Grant Doctor Access</h2>
              <p className="text-muted-foreground">Give a doctor access to your medical records</p>
            </div>

            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Doctor Wallet Address</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newDoctorAddress}
                      onChange={(e) => setNewDoctorAddress(e.target.value)}
                      placeholder="0x..."
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground"
                    />
                    <Button
                      onClick={handleGrantAccess}
                      disabled={isGranting || !newDoctorAddress.trim()}
                      className="gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      {isGranting ? 'Granting...' : 'Grant Access'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This will grant access to all your {reports.length} medical record{reports.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </Card>

            {/* Quick Grant Instructions */}
            <Card className="p-6 bg-secondary/50">
              <h3 className="font-semibold mb-3">How it works</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="font-bold text-primary min-w-fit">1.</span>
                  <span>Enter the doctor's wallet address (starts with 0x)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary min-w-fit">2.</span>
                  <span>Click "Grant Access" to share your records</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary min-w-fit">3.</span>
                  <span>Doctor appears in "Active Permissions" tab</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary min-w-fit">4.</span>
                  <span>You can revoke access anytime</span>
                </li>
              </ol>
            </Card>

            {/* Already Granted Doctors */}
            {doctorPermissions.length > 0 && (
              <>
                <h3 className="text-lg font-semibold mt-8">Doctors with Current Access</h3>
                <div className="space-y-3">
                  {doctorPermissions.map(permission => (
                    <Card key={permission.address} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm">{permission.address}</p>
                        <p className="text-xs text-muted-foreground">
                          Can access {permission.files.length} file{permission.files.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeAccess(permission.address)}
                      >
                        Revoke
                      </Button>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Upload Record Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Medical Record
              </DialogTitle>
              <DialogDescription>
                Upload your own medical record securely to IPFS
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUploadRecord} className="space-y-4">
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
                    setError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || !formData.file || !formData.reportTitle}
                >
                  {isUploading ? (
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

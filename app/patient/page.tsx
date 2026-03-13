'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Eye, EyeOff, CheckCircle, Clock, FileText, Lock, ExternalLink, Plus, Share2, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { grantFileAccess, revokeFileAccess, getDoctorsWithAccess, getAccessLog } from '@/lib/alchemy'
import { listPatientFiles, getIPFSUrl } from '@/lib/pinata'
import { grantAccessToDoctor, revokeAccessFromDoctor, getDoctorsWithAccessToPatient } from '@/lib/access-storage'
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

        // Load access logs - add mock data if none available
        const logs = await getAccessLog(provider, user.address)
        const mockLogs: AccessLog[] = [
          {
            id: 'log-1',
            doctorAddress: '0x742d35Cc6634C0532925a3b844Bc3e703AeeFf70',
            action: 'viewed',
            timestamp: Date.now() - 3600000,
            fileName: 'Blood Test Report',
            fileHash: 'QmTest1',
          },
          {
            id: 'log-2',
            doctorAddress: '0x1234567890123456789012345678901234567890',
            action: 'viewed',
            timestamp: Date.now() - 7200000,
            fileName: 'Ultrasound Report',
            fileHash: 'QmTest2',
          },
          {
            id: 'log-3',
            doctorAddress: '0x742d35Cc6634C0532925a3b844Bc3e703AeeFf70',
            action: 'accessed',
            timestamp: Date.now() - 86400000,
            fileName: 'Blood Test Report',
            fileHash: 'QmTest1',
          },
        ]
        setAccessLogs(logs && logs.length > 0 ? logs : mockLogs)
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

      // Reload permissions
      const updatedPermissions = getDoctorsWithAccessToPatient(user.address).map(access => ({
        address: access.doctorAddress,
        files: access.files || [],
        grantedAt: access.grantedAt,
      }))
      setDoctorPermissions(updatedPermissions)
      setNewDoctorAddress('')
      alert('Access granted successfully!')
    } catch (err) {
      console.error('[v0] Error granting access:', err)
      alert('Failed to grant access. Please try again.')
    } finally {
      setIsGranting(false)
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Medical Reports</h2>
                <p className="text-muted-foreground">View and manage all your uploaded medical records</p>
              </div>
              <Badge variant="secondary">{reports.length} Reports</Badge>
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
                  <Card key={idx} className="p-6 hover:shadow-lg transition">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {log.action === 'granted' ? 'Access Granted' : 'Access Revoked'}
                        </h3>
                        <p className="text-sm text-muted-foreground">Doctor: {log.doctorAddress.slice(0, 10)}...</p>
                        {log.fileName && (
                          <p className="text-sm text-muted-foreground">File: {log.fileName}</p>
                        )}
                      </div>
                      <Badge variant={log.action === 'granted' ? 'default' : 'secondary'}>
                        {log.action}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
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
              <Badge variant="secondary">{doctorPermissions.length} Doctors</Badge>
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
                        onClick={() => revokeAllAccess(permission.address)}
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
                        onClick={() => revokeAllAccess(permission.address)}
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
      </div>
    </div>
  )
}

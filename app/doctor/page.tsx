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
import { Upload, AlertCircle, CheckCircle, File as FileIcon, Loader, User, Search, FileText, Eye, Download, Lock, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FieldGroup, FieldLabel } from '@/components/ui/field'
import { uploadFileToPinata } from '@/lib/pinata'
import { getPatientsWhoGrantedAccess } from '@/lib/access-storage'
import { storeReport, getPatientReports, downloadReportAsJSON } from '@/lib/reports-storage'
import { Badge } from '@/components/ui/badge'
import { logFileUpload } from '@/lib/access-log'

export default function DoctorDashboard() {
  const { user } = useAuth()
  const { session, isLoggedIn } = useDoctorAuth()
  const router = useRouter()
  const [patientsWithAccess, setPatientsWithAccess] = useState<any[]>([])
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emergencyPatientAddress, setEmergencyPatientAddress] = useState('')
  const [emergencyReason, setEmergencyReason] = useState('')
  const [emergencyAccessLog, setEmergencyAccessLog] = useState<any[]>([])
  const [emergencyAccessRecords, setEmergencyAccessRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/doctor')
    }
  }, [isLoggedIn, router])

  useEffect(() => {
    const stored = localStorage.getItem('doctor_emergency_access_log')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setEmergencyAccessLog(parsed)
        const records: any[] = []
        parsed.forEach((log: any) => {
          if (!log.isExpired) {
            const patientReports = getPatientReports(log.patientAddress)
            records.push(...patientReports.map(r => ({ ...r, emergencyAccess: true, accessedAt: log.requestTime, accessReason: log.reason })))
          }
        })
        setEmergencyAccessRecords(records)
      } catch (e) {
        console.log('[v0] Failed to parse emergency access log')
      }
    }
  }, [])

  useEffect(() => {
    if (session?.username) {
      const patients = getPatientsWhoGrantedAccess(session.username)
      setPatientsWithAccess(patients)
    }
  }, [session])

  const handleRequestEmergencyAccess = async () => {
    if (!emergencyPatientAddress || !emergencyReason) {
      setError('Please provide both patient address and clinical reason')
      return
    }

    setIsLoading(true)
    try {
      const now = new Date()
      const newLog = {
        patientAddress: emergencyPatientAddress,
        reason: emergencyReason,
        requestTime: now.toLocaleString(),
        timeRemaining: '59:59',
        isExpired: false,
      }

      const updated = [...emergencyAccessLog, newLog]
      setEmergencyAccessLog(updated)
      localStorage.setItem('doctor_emergency_access_log', JSON.stringify(updated))

      const patientReports = getPatientReports(emergencyPatientAddress)
      const newRecords = patientReports.map(r => ({
        ...r,
        emergencyAccess: true,
        accessedAt: now.toLocaleString(),
        accessReason: emergencyReason
      }))
      setEmergencyAccessRecords(prev => [...prev, ...newRecords])

      logFileUpload(emergencyPatientAddress, user?.address || '', `EMERGENCY_ACCESS_${Date.now()}`, 'Emergency Access Request', emergencyReason)

      setSuccess('Emergency access granted for 1 hour')
      setEmergencyPatientAddress('')
      setEmergencyReason('')

      let secondsRemaining = 3600
      const interval = setInterval(() => {
        secondsRemaining--
        if (secondsRemaining <= 0) {
          clearInterval(interval)
          setEmergencyAccessLog(prev => prev.map((log, idx) => idx === updated.length - 1 ? { ...log, isExpired: true, timeRemaining: '00:00' } : log))
        } else {
          const minutes = Math.floor(secondsRemaining / 60)
          const seconds = secondsRemaining % 60
          const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          setEmergencyAccessLog(prev => prev.map((log, idx) => idx === updated.length - 1 ? { ...log, timeRemaining: timeStr } : log))
        }
      }, 1000)

      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError('Failed to request emergency access: ' + String(err))
    } finally {
      setIsLoading(false)
    }
  }

  if (!isLoggedIn) {
    return <div className="flex items-center justify-center min-h-screen"><Card className="p-8"><p className="text-muted-foreground">Redirecting to login...</p></Card></div>
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Doctor Dashboard</h1>

        {success && <Alert className="mb-6 bg-green-500/10 border-green-500/30"><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-green-700">{success}</span></Alert>}
        {error && <Alert className="mb-6 bg-red-500/10 border-red-500/30"><AlertCircle className="h-4 w-4 text-red-600" /><span className="text-red-700">{error}</span></Alert>}

        <Tabs defaultValue="patients" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="patients">My Patients</TabsTrigger>
            <TabsTrigger value="emergency" className="text-red-600">Emergency Access</TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">My Patients</h2>
            {patientsWithAccess.length === 0 ? (
              <Card className="p-8 text-center"><User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No patients have granted access</p></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patientsWithAccess.map(patient => (
                  <Card key={patient.address} className="p-6">
                    <h3 className="font-semibold mb-2">{patient.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4 font-mono truncate">{patient.address}</p>
                    <Button className="w-full"><Eye className="w-4 h-4 mr-2" />View Records</Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="emergency" className="space-y-6">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Emergency Access</h2>

            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div className="ml-4"><span className="font-semibold text-red-700 block">Critical Access Only</span><span className="text-sm text-red-700">Limited to 1 hour. All requests logged for audit.</span></div>
            </Alert>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Patient Address</label>
                <Input placeholder="Wallet address" value={emergencyPatientAddress} onChange={(e) => setEmergencyPatientAddress(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Clinical Reason</label>
                <Textarea placeholder="Medical emergency reason..." value={emergencyReason} onChange={(e) => setEmergencyReason(e.target.value)} rows={4} />
              </div>
              <Button onClick={handleRequestEmergencyAccess} disabled={!emergencyPatientAddress || !emergencyReason || isLoading} className="w-full bg-red-600 hover:bg-red-700">
                {isLoading ? <><Loader className="w-4 h-4 mr-2 animate-spin" />Requesting...</> : <><Lock className="w-4 h-4 mr-2" />Request Emergency Access</>}
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Audit Log</h3>
              {emergencyAccessLog.length === 0 ? (
                <Card className="p-8 text-center"><Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No requests yet</p></Card>
              ) : (
                <div className="space-y-3">
                  {emergencyAccessLog.map((log, idx) => (
                    <Card key={idx} className="p-4 border-l-4 border-l-red-500">
                      <div className="flex justify-between items-center">
                        <div><p className="text-sm font-mono">{log.patientAddress}</p><p className="text-xs text-muted-foreground">{log.requestTime}</p></div>
                        <div><Badge variant={log.isExpired ? "secondary" : "destructive"}>{log.isExpired ? 'Expired' : 'Active'}</Badge><p className="text-sm font-semibold text-red-600">{log.timeRemaining}</p></div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-8 border-t">
              <h3 className="text-lg font-semibold mb-4">Records via Emergency Access</h3>
              {emergencyAccessRecords.length === 0 ? (
                <Card className="p-8 text-center"><FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" /><p className="text-muted-foreground">No records accessible</p></Card>
              ) : (
                <div className="space-y-3">
                  {emergencyAccessRecords.map((record, idx) => (
                    <Card key={idx} className="p-4 border-l-4 border-l-orange-500">
                      <div className="flex justify-between items-start">
                        <div><h4 className="font-semibold">{record.reportTitle}</h4><p className="text-sm text-muted-foreground">{record.patientName} - {record.uploadedAt}</p></div>
                        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`, '_blank')}><Eye className="w-3 h-3" />View</Button><Button variant="outline" size="sm" onClick={() => downloadReportAsJSON(record)}><Download className="w-3 h-3" />JSON</Button></div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

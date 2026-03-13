'use client'

import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FieldGroup, FieldLabel } from '@/components/ui/field'
import { FileCheck, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'

export default function DoctorConnectPage() {
  const { connectWallet, isConnected, setUserRole, setUserName } = useAuth()
  const router = useRouter()
  const [doctorName, setDoctorName] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleConnect = async () => {
    if (!doctorName.trim() || !specialization.trim()) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      if (!isConnected) {
        await connectWallet()
      }

      setUserRole('doctor')
      setUserName(doctorName)
      setSuccess(true)

      setTimeout(() => {
        router.push('/doctor')
      }, 1000)
    } catch (err) {
      setError('Failed to connect. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-muted-foreground hover:text-foreground mb-4 inline-block">
            {'\u2190'} Back to Home
          </Link>
          <h1 className="text-5xl font-bold mb-3">Healthcare Provider Setup</h1>
          <p className="text-xl text-muted-foreground">Upload and manage encrypted medical reports securely</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Connection Card */}
          <Card className="p-8 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Connect & Setup</h2>
            </div>

            <div className="space-y-6">
              {success ? (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-700 dark:text-green-400">Redirecting to dashboard...</span>
                </Alert>
              ) : (
                <>
                  <FieldGroup>
                    <FieldLabel>Full Name</FieldLabel>
                    <Input
                      placeholder="Dr. John Smith"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      disabled={isLoading}
                    />
                  </FieldGroup>

                  <FieldGroup>
                    <FieldLabel>Specialization</FieldLabel>
                    <Input
                      placeholder="e.g., Cardiology, General Medicine"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      disabled={isLoading}
                    />
                  </FieldGroup>

                  {error && (
                    <Alert className="bg-red-500/10 border-red-500/20">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-700 dark:text-red-400">{error}</span>
                    </Alert>
                  )}

                  <Button
                    onClick={handleConnect}
                    size="lg"
                    className="w-full"
                    disabled={isLoading || !doctorName.trim() || !specialization.trim()}
                  >
                    {isLoading ? 'Connecting...' : 'Connect MetaMask Wallet'}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Make sure MetaMask is installed and connected to Polygon network
                  </p>
                </>
              )}
            </div>
          </Card>

          {/* Benefits Section */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-4">Why Connect as a Doctor?</h3>
              <div className="space-y-4">
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Secure Upload</h4>
                  <p className="text-sm text-muted-foreground">Upload encrypted medical reports directly to IPFS with blockchain verification</p>
                </div>
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Patient Control</h4>
                  <p className="text-sm text-muted-foreground">Patients maintain complete control over who can access their records</p>
                </div>
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Audit Trail</h4>
                  <p className="text-sm text-muted-foreground">Track access logs and maintain compliance with healthcare regulations</p>
                </div>
                <div className="bg-secondary/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">No Central Authority</h4>
                  <p className="text-sm text-muted-foreground">Decentralized storage means no single point of failure</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Getting Started</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="font-bold text-primary min-w-fit">1.</span>
                  <span>Fill in your professional information</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary min-w-fit">2.</span>
                  <span>Connect your MetaMask wallet</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary min-w-fit">3.</span>
                  <span>Access your dashboard to upload reports</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary min-w-fit">4.</span>
                  <span>Share patient wallet address to assign records</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

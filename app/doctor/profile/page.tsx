'use client'

import { useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FieldGroup, FieldLabel } from '@/components/ui/field'

export default function DoctorProfile() {
  const { user, isConnected } = useAuth()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [profile, setProfile] = useState({
    name: user?.name || '',
    specialization: 'General Medicine',
    license: 'MD123456',
    hospital: 'City Hospital',
    experience: '10 years',
    phone: '+91-9876543210',
    email: 'doctor@example.com',
  })

  if (!isConnected) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <span>Please connect your wallet to view profile</span>
          </Alert>
          <Button onClick={() => router.push('/doctor')}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSuccess(false), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.push('/doctor')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold">Doctor Profile</h1>
          <p className="text-muted-foreground mt-2">Manage your professional information</p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-500/10 border-green-500/20">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-green-700 dark:text-green-400">Profile updated successfully!</span>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Wallet Info */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Wallet Information</h2>
            <div className="space-y-4">
              <FieldGroup>
                <FieldLabel>Wallet Address</FieldLabel>
                <Input value={user?.address || ''} disabled className="font-mono text-sm" />
              </FieldGroup>
            </div>
          </Card>

          {/* Professional Info */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Professional Information</h2>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <FieldGroup>
                <FieldLabel>Full Name</FieldLabel>
                <Input
                  name="name"
                  value={profile.name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Dr. Name"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Specialization</FieldLabel>
                <Input
                  name="specialization"
                  value={profile.specialization}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="e.g., Cardiology"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Medical License</FieldLabel>
                <Input
                  name="license"
                  value={profile.license}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="License number"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Hospital/Clinic</FieldLabel>
                <Input
                  name="hospital"
                  value={profile.hospital}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Institution name"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Years of Experience</FieldLabel>
                <Input
                  name="experience"
                  value={profile.experience}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="e.g., 10 years"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Email</FieldLabel>
                <Input
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="doctor@example.com"
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Phone</FieldLabel>
                <Input
                  name="phone"
                  value={profile.phone}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="+91-9876543210"
                />
              </FieldGroup>

              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Statistics */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-6">Activity Overview</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">24</div>
                <p className="text-sm text-muted-foreground">Reports Uploaded</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">15</div>
                <p className="text-sm text-muted-foreground">Patients</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">156</div>
                <p className="text-sm text-muted-foreground">Access Requests</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

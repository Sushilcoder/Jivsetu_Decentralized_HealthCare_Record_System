'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, LogOut } from 'lucide-react'
import { FieldGroup, FieldLabel } from '@/components/ui/field'

export function RoleSelection() {
  const router = useRouter()
  const { user, setUserRole, setUserName, disconnectWallet, isConnected } = useAuth()
  const [open, setOpen] = useState(isConnected && !user?.role)
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'patient'>('doctor')
  const [name, setName] = useState('')

  const handleSelectRole = () => {
    if (name) {
      setUserRole(selectedRole)
      setUserName(name)
      setOpen(false)
      // Redirect to appropriate dashboard
      setTimeout(() => {
        if (selectedRole === 'doctor') {
          router.push('/doctor')
        } else {
          router.push('/patient')
        }
      }, 100)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Your Role</DialogTitle>
          <DialogDescription>
            Choose whether you're a doctor uploading reports or a patient managing access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <FieldGroup>
            <FieldLabel>Your Full Name</FieldLabel>
            <Input
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>Role</FieldLabel>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as 'doctor' | 'patient')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor">Doctor / Healthcare Provider</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>

          <div className="bg-secondary/50 p-4 rounded-lg">
            {selectedRole === 'doctor' ? (
              <div>
                <p className="font-semibold text-sm mb-2">Doctor Mode</p>
                <p className="text-sm text-muted-foreground">Upload encrypted medical reports and manage your patient database</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-sm mb-2">Patient Mode</p>
                <p className="text-sm text-muted-foreground">View your reports and control who can access your medical records</p>
              </div>
            )}
          </div>

          <Button
            onClick={handleSelectRole}
            disabled={!name}
            className="w-full"
          >
            Continue as {selectedRole === 'doctor' ? 'Doctor' : 'Patient'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

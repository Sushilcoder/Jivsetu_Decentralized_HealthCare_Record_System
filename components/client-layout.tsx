'use client'

import { AuthProvider } from '@/context/auth-context'
import { DoctorAuthProvider } from '@/context/doctor-auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { Navbar } from '@/components/navbar'
import { HydrationSafeRoleSelection } from '@/components/hydration-safe-role-selection'
import { useEffect, useState } from 'react'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
    >
      <DoctorAuthProvider>
        <AuthProvider>
          {mounted && <Navbar />}
          {mounted && <HydrationSafeRoleSelection />}
          {children}
        </AuthProvider>
      </DoctorAuthProvider>
    </ThemeProvider>
  )
}

'use client'

import { AuthProvider } from '@/context/auth-context'
import { DoctorAuthProvider } from '@/context/doctor-auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { Navbar } from '@/components/navbar'
import { HydrationSafeRoleSelection } from '@/components/hydration-safe-role-selection'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <DoctorAuthProvider>
        <AuthProvider>
          <Navbar />
          <HydrationSafeRoleSelection />
          {children}
        </AuthProvider>
      </DoctorAuthProvider>
    </ThemeProvider>
  )
}

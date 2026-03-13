'use client'

import { AuthProvider } from '@/context/auth-context'
import { Navbar } from '@/components/navbar'
import { HydrationSafeRoleSelection } from '@/components/hydration-safe-role-selection'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <HydrationSafeRoleSelection />
      {children}
    </AuthProvider>
  )
}

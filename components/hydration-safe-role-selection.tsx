'use client'

import { useEffect, useState } from 'react'
import { RoleSelection } from '@/components/role-selection'

export function HydrationSafeRoleSelection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <RoleSelection />
}

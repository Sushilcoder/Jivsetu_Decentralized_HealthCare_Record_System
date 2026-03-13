'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { BrowserProvider } from 'ethers'

export type UserRole = 'doctor' | 'patient' | null

export interface User {
  address: string
  role: UserRole
  name: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isConnected: boolean
  provider: BrowserProvider | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  setUserRole: (role: UserRole) => void
  setUserName: (name: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts && accounts.length > 0) {
            const ethersProvider = new BrowserProvider(window.ethereum)
            setProvider(ethersProvider)
            setUser({
              address: accounts[0],
              role: null,
              name: '',
            })
            setIsConnected(true)
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error)
        }
      }
    }

    checkWalletConnection()
  }, [])

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet')
      return
    }

    setIsLoading(true)
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts && accounts.length > 0) {
        const ethersProvider = new BrowserProvider(window.ethereum)
        setProvider(ethersProvider)

        setUser({
          address: accounts[0],
          role: null,
          name: '',
        })
        setIsConnected(true)
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      alert('Failed to connect wallet. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setUser(null)
    setIsConnected(false)
    setProvider(null)
  }, [])

  const setUserRole = useCallback((role: UserRole) => {
    setUser(prev => prev ? { ...prev, role } : null)
  }, [])

  const setUserName = useCallback((name: string) => {
    setUser(prev => prev ? { ...prev, name } : null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isConnected, provider, connectWallet, disconnectWallet, setUserRole, setUserName }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

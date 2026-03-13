'use client'

import { BrowserProvider, Contract, ZeroAddress } from 'ethers'

// Simple access control contract ABI for managing permissions
const ACCESS_CONTROL_ABI = [
  'function grantAccess(address doctor, address patient, bytes32 fileHash) external',
  'function revokeAccess(address doctor, address patient, bytes32 fileHash) external',
  'function hasAccess(address doctor, address patient, bytes32 fileHash) external view returns (bool)',
  'function getAccessLog(address patient) external view returns (tuple(address,uint256,bool)[])',
]

// Mock contract address - will be deployed on Polygon
const ACCESS_CONTROL_ADDRESS = '0x0000000000000000000000000000000000000000'

interface AccessRecord {
  doctorAddress: string
  timestamp: number
  hasAccess: boolean
}

/**
 * Check if a doctor has access to a patient's file
 */
export const checkFileAccess = async (
  provider: BrowserProvider,
  doctorAddress: string,
  patientAddress: string,
  fileHash: string
): Promise<boolean> => {
  try {
    console.log('[v0] Checking access for doctor:', doctorAddress, 'patient:', patientAddress)

    if (!provider) {
      throw new Error('Provider not available')
    }

    // For MVP, we'll store permissions in localStorage
    // In production, this would interact with smart contract
    const permissionsKey = `permissions_${patientAddress}`
    const permissions = JSON.parse(localStorage.getItem(permissionsKey) || '{}')
    
    return permissions[doctorAddress]?.files?.includes(fileHash) || false
  } catch (error) {
    console.error('[v0] Error checking file access:', error)
    return false
  }
}

/**
 * Grant access to a doctor for a patient's file
 */
export const grantFileAccess = async (
  provider: BrowserProvider,
  doctorAddress: string,
  patientAddress: string,
  fileHash: string,
  fileName: string
): Promise<boolean> => {
  try {
    console.log('[v0] Granting access for doctor:', doctorAddress)

    if (!provider) {
      throw new Error('Provider not available')
    }

    const permissionsKey = `permissions_${patientAddress}`
    const permissions = JSON.parse(localStorage.getItem(permissionsKey) || '{}')

    if (!permissions[doctorAddress]) {
      permissions[doctorAddress] = {
        grantedAt: Date.now(),
        files: [],
        accessLog: [],
      }
    }

    if (!permissions[doctorAddress].files.includes(fileHash)) {
      permissions[doctorAddress].files.push(fileHash)
    }

    // Log the access grant
    permissions[doctorAddress].accessLog.push({
      action: 'granted',
      timestamp: Date.now(),
      fileName,
      fileHash,
    })

    localStorage.setItem(permissionsKey, JSON.stringify(permissions))

    console.log('[v0] Access granted successfully')
    return true
  } catch (error) {
    console.error('[v0] Error granting access:', error)
    return false
  }
}

/**
 * Revoke access from a doctor for a patient's file
 */
export const revokeFileAccess = async (
  provider: BrowserProvider,
  doctorAddress: string,
  patientAddress: string,
  fileHash?: string
): Promise<boolean> => {
  try {
    console.log('[v0] Revoking access for doctor:', doctorAddress)

    if (!provider) {
      throw new Error('Provider not available')
    }

    const permissionsKey = `permissions_${patientAddress}`
    const permissions = JSON.parse(localStorage.getItem(permissionsKey) || '{}')

    if (fileHash) {
      // Revoke specific file access
      if (permissions[doctorAddress]) {
        permissions[doctorAddress].files = permissions[doctorAddress].files.filter(
          (hash: string) => hash !== fileHash
        )
        permissions[doctorAddress].accessLog.push({
          action: 'revoked',
          timestamp: Date.now(),
          fileHash,
        })
      }
    } else {
      // Revoke all access
      delete permissions[doctorAddress]
    }

    localStorage.setItem(permissionsKey, JSON.stringify(permissions))

    console.log('[v0] Access revoked successfully')
    return true
  } catch (error) {
    console.error('[v0] Error revoking access:', error)
    return false
  }
}

/**
 * Get all doctors with access to a patient's files
 */
export const getDoctorsWithAccess = async (
  provider: BrowserProvider,
  patientAddress: string
): Promise<Array<{ address: string; files: string[]; grantedAt: number }>> => {
  try {
    console.log('[v0] Getting doctors with access for patient:', patientAddress)

    const permissionsKey = `permissions_${patientAddress}`
    const permissions = JSON.parse(localStorage.getItem(permissionsKey) || '{}')

    return Object.entries(permissions).map(([address, data]: [string, any]) => ({
      address,
      files: data.files || [],
      grantedAt: data.grantedAt || Date.now(),
    }))
  } catch (error) {
    console.error('[v0] Error getting doctors with access:', error)
    return []
  }
}

/**
 * Get access log for a patient
 */
export const getAccessLog = async (
  provider: BrowserProvider,
  patientAddress: string
): Promise<any[]> => {
  try {
    console.log('[v0] Getting access log for patient:', patientAddress)

    const permissionsKey = `permissions_${patientAddress}`
    const permissions = JSON.parse(localStorage.getItem(permissionsKey) || '{}')

    const logs: any[] = []
    Object.entries(permissions).forEach(([address, data]: [string, any]) => {
      if (data.accessLog) {
        logs.push(
          ...data.accessLog.map((log: any) => ({
            doctorAddress: address,
            ...log,
          }))
        )
      }
    })

    return logs.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error('[v0] Error getting access log:', error)
    return []
  }
}

/**
 * Get Alchemy RPC provider
 */
export const getAlchemyProvider = (): BrowserProvider | null => {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null
  }

  try {
    return new BrowserProvider(window.ethereum)
  } catch (error) {
    console.error('[v0] Error creating Alchemy provider:', error)
    return null
  }
}

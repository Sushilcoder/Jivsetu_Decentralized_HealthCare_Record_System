'use client'

import axios from 'axios'

const PINATA_API_URL = 'https://api.pinata.cloud'

interface PinataFile {
  hash: string
  name: string
  patientAddress: string
  doctorAddress: string
  description: string
  timestamp: number
  contentType: string
}

interface PinataUploadResponse {
  IpfsHash: string
  PinSize: number
  Timestamp: string
}

interface PinataMetadata {
  name: string
  patientAddress: string
  doctorAddress: string
  description: string
  timestamp: number
  contentType: string
}

const getAuthHeaders = () => {
  const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY
  const apiSecret = process.env.NEXT_PUBLIC_PINATA_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('Pinata API credentials not found in environment variables')
  }

  return {
    'pinata_api_key': apiKey,
    'pinata_secret_api_key': apiSecret,
  }
}

/**
 * Upload a file to Pinata IPFS with metadata
 */
export const uploadFileToPinata = async (
  file: File,
  metadata: Omit<PinataMetadata, 'timestamp'>,
  onProgress?: (progress: number) => void
): Promise<PinataFile> => {
  try {
    console.log('[v0] Starting Pinata upload for file:', file.name)
    
    const formData = new FormData()
    formData.append('file', file)

    // Add metadata
    const metadataWithTimestamp: PinataMetadata = {
      ...metadata,
      timestamp: Date.now(),
    }

    formData.append('pinataMetadata', JSON.stringify({
      name: metadataWithTimestamp.name,
      keyvalues: {
        patientAddress: metadataWithTimestamp.patientAddress,
        doctorAddress: metadataWithTimestamp.doctorAddress,
        description: metadataWithTimestamp.description,
        timestamp: metadataWithTimestamp.timestamp.toString(),
        contentType: metadataWithTimestamp.contentType,
      },
    }))

    const config = {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(percentCompleted)
        }
      },
    }

    const response = await axios.post<PinataUploadResponse>(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      config
    )

    console.log('[v0] Pinata upload successful:', response.data.IpfsHash)

    return {
      hash: response.data.IpfsHash,
      name: metadataWithTimestamp.name,
      patientAddress: metadataWithTimestamp.patientAddress,
      doctorAddress: metadataWithTimestamp.doctorAddress,
      description: metadataWithTimestamp.description,
      timestamp: metadataWithTimestamp.timestamp,
      contentType: metadataWithTimestamp.contentType,
    }
  } catch (error) {
    console.error('[v0] Pinata upload error:', error)
    throw error
  }
}

/**
 * Retrieve file metadata from Pinata
 */
export const getPinataFileMetadata = async (hash: string): Promise<PinataFile | null> => {
  try {
    console.log('[v0] Fetching Pinata metadata for hash:', hash)

    const config = {
      headers: getAuthHeaders(),
    }

    const response = await axios.get(
      `${PINATA_API_URL}/data/pinList?hashFilter=${hash}&pageLimit=1`,
      config
    )

    if (response.data.rows && response.data.rows.length > 0) {
      const row = response.data.rows[0]
      return {
        hash: row.ipfs_pin_hash,
        name: row.metadata?.name || 'Unknown',
        patientAddress: row.metadata?.keyvalues?.patientAddress || '',
        doctorAddress: row.metadata?.keyvalues?.doctorAddress || '',
        description: row.metadata?.keyvalues?.description || '',
        timestamp: parseInt(row.metadata?.keyvalues?.timestamp || '0'),
        contentType: row.metadata?.keyvalues?.contentType || '',
      }
    }

    return null
  } catch (error) {
    console.error('[v0] Error fetching Pinata metadata:', error)
    throw error
  }
}

/**
 * Get IPFS URL for a file
 */
export const getIPFSUrl = (hash: string): string => {
  return `https://gateway.pinata.cloud/ipfs/${hash}`
}

/**
 * List all files for a patient
 */
export const listPatientFiles = async (patientAddress: string): Promise<PinataFile[]> => {
  try {
    console.log('[v0] Listing files for patient:', patientAddress)

    const config = {
      headers: getAuthHeaders(),
    }

    const response = await axios.get(
      `${PINATA_API_URL}/data/pinList?metadata.keyvalues.patientAddress=${patientAddress}&pageLimit=100`,
      config
    )

    if (response.data.rows) {
      return response.data.rows.map((row: any) => ({
        hash: row.ipfs_pin_hash,
        name: row.metadata?.name || 'Unknown',
        patientAddress: row.metadata?.keyvalues?.patientAddress || '',
        doctorAddress: row.metadata?.keyvalues?.doctorAddress || '',
        description: row.metadata?.keyvalues?.description || '',
        timestamp: parseInt(row.metadata?.keyvalues?.timestamp || '0'),
        contentType: row.metadata?.keyvalues?.contentType || '',
      }))
    }

    return []
  } catch (error) {
    console.error('[v0] Error listing patient files:', error)
    throw error
  }
}

/**
 * Unpin a file from Pinata
 */
export const unpinFile = async (hash: string): Promise<void> => {
  try {
    console.log('[v0] Unpinning file:', hash)

    const config = {
      headers: getAuthHeaders(),
    }

    await axios.delete(
      `${PINATA_API_URL}/pinning/unpin/${hash}`,
      config
    )

    console.log('[v0] File unpinned successfully')
  } catch (error) {
    console.error('[v0] Error unpinning file:', error)
    throw error
  }
}

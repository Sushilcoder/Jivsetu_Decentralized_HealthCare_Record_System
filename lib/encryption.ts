// AES-256 encryption/decryption utility for medical files
// Uses the Web Crypto API for browser-based encryption

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Generate a random encryption key
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive an encryption key from a password/wallet address
 */
export async function deriveKeyFromPassword(
  password: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  // Generate or use provided salt
  const usedSalt = salt || crypto.getRandomValues(new Uint8Array(16));

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES key from password
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: usedSalt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  return { key, salt: usedSalt };
}

/**
 * Export a CryptoKey to a base64 string for storage
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Import a CryptoKey from a base64 string
 */
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(keyString);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a file using AES-256-GCM
 */
export async function encryptFile(
  file: File,
  key: CryptoKey
): Promise<{ encryptedData: ArrayBuffer; iv: Uint8Array; originalName: string; contentType: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const fileData = await file.arrayBuffer();

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    fileData
  );

  return {
    encryptedData,
    iv,
    originalName: file.name,
    contentType: file.type,
  };
}

/**
 * Decrypt a file using AES-256-GCM
 */
export async function decryptFile(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
  originalName: string,
  contentType: string
): Promise<File> {
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    encryptedData
  );

  return new File([decryptedData], originalName, { type: contentType });
}

/**
 * Encrypt file data and return as a blob with metadata header
 */
export async function encryptFileToBlob(
  file: File,
  patientAddress: string
): Promise<{ blob: Blob; encryptionMetadata: EncryptionMetadata }> {
  // Derive key from patient's wallet address
  const { key, salt } = await deriveKeyFromPassword(patientAddress);
  
  // Encrypt the file
  const { encryptedData, iv, originalName, contentType } = await encryptFile(file, key);

  // Create metadata
  const metadata: EncryptionMetadata = {
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    originalName,
    contentType,
    encryptedAt: Date.now(),
  };

  // Create blob from encrypted data
  const blob = new Blob([encryptedData], { type: 'application/octet-stream' });

  return { blob, encryptionMetadata: metadata };
}

/**
 * Decrypt file from blob using patient's wallet address
 */
export async function decryptFileFromBlob(
  encryptedBlob: Blob,
  metadata: EncryptionMetadata,
  patientAddress: string
): Promise<File> {
  // Derive the same key from patient's wallet address
  const salt = base64ToArrayBuffer(metadata.salt);
  const { key } = await deriveKeyFromPassword(patientAddress, new Uint8Array(salt));

  // Get IV
  const iv = new Uint8Array(base64ToArrayBuffer(metadata.iv));

  // Get encrypted data
  const encryptedData = await encryptedBlob.arrayBuffer();

  // Decrypt
  return await decryptFile(
    encryptedData,
    key,
    iv,
    metadata.originalName,
    metadata.contentType
  );
}

// Metadata interface for encrypted files
export interface EncryptionMetadata {
  salt: string;
  iv: string;
  originalName: string;
  contentType: string;
  encryptedAt: number;
}

// Utility functions for ArrayBuffer/Base64 conversion
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Storage for encryption metadata (maps IPFS hash to metadata)
const ENCRYPTION_METADATA_KEY = 'jivsetu-encryption-metadata';

export function storeEncryptionMetadata(ipfsHash: string, metadata: EncryptionMetadata): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = JSON.parse(localStorage.getItem(ENCRYPTION_METADATA_KEY) || '{}');
    stored[ipfsHash] = metadata;
    localStorage.setItem(ENCRYPTION_METADATA_KEY, JSON.stringify(stored));
  } catch (e) {
    console.error('Error storing encryption metadata:', e);
  }
}

export function getEncryptionMetadata(ipfsHash: string): EncryptionMetadata | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = JSON.parse(localStorage.getItem(ENCRYPTION_METADATA_KEY) || '{}');
    return stored[ipfsHash] || null;
  } catch (e) {
    console.error('Error getting encryption metadata:', e);
    return null;
  }
}

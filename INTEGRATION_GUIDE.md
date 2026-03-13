# Jivsetu - Integration Setup Guide

## Overview
Jivsetu is a decentralized healthcare records system that integrates three key services:
- **MetaMask**: Web3 wallet authentication
- **Pinata**: IPFS decentralized file storage
- **Alchemy**: Blockchain RPC provider and permission management

## Environment Variables Setup

Add these variables to your `.env.local` file:

```bash
# Pinata IPFS Configuration
NEXT_PUBLIC_PINATA_API_KEY=your_pinata_api_key
NEXT_PUBLIC_PINATA_API_SECRET=your_pinata_api_secret

# Alchemy Configuration (Polygon network)
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/your_alchemy_api_key
```

## Getting API Keys

### 1. Pinata IPFS Setup

1. Go to [pinata.cloud](https://pinata.cloud)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key with the following permissions:
   - `pinFileToIPFS`
   - `pinList`
   - `unpin`
5. Copy your API Key and API Secret

**What Pinata Does:**
- Stores encrypted medical reports on IPFS
- Provides persistent file storage with metadata
- Allows decentralized file management
- In production: Files should be encrypted client-side before upload

### 2. Alchemy Setup

1. Go to [alchemy.com](https://alchemy.com)
2. Sign up for a free account
3. Create a new app on Polygon network (recommended for low fees)
4. Copy your API Key

**What Alchemy Provides:**
- RPC endpoint for blockchain interaction
- Gas estimation and transaction simulation
- Network reliability and redundancy

### 3. MetaMask Setup

MetaMask is browser-based and auto-detects when installed. No API key needed.

**Setup Steps:**
1. Install MetaMask browser extension
2. Create or import a wallet
3. Add Polygon network (optional, for production):
   - Network Name: Polygon
   - RPC URL: `https://polygon-rpc.com`
   - Chain ID: 137
   - Currency: MATIC

## How It Works

### Doctor Workflow
1. Connect MetaMask wallet
2. Select "Doctor" role
3. Upload medical report file
4. Enter patient's wallet address
5. File encrypted and uploaded to Pinata IPFS
6. IPFS hash stored with metadata
7. Patient notified of new report

### Patient Workflow
1. Connect MetaMask wallet
2. Select "Patient" role
3. View all reports uploaded by doctors
4. Manage permissions for each doctor
5. View access logs showing who accessed what and when
6. Revoke access permissions anytime

### Permission System

Uses localStorage with Ethereum addresses (can be upgraded to smart contracts):
- Grant/revoke access to specific files
- Track access logs per doctor
- Support multiple doctors
- Instant revocation capability

## File Structure

```
lib/
  ├── pinata.ts          # IPFS file upload/download
  ├── alchemy.ts         # Permission management & access control
context/
  ├── auth-context.tsx   # MetaMask wallet connection
app/
  ├── doctor/
  │   └── page.tsx       # Doctor dashboard with upload
  ├── patient/
  │   └── page.tsx       # Patient dashboard with permissions
```

## Future Enhancements

### Phase 2: Smart Contracts
- Deploy access control contract on Polygon
- Immutable permission records on-chain
- Gas-optimized batch operations
- Event logging for compliance

### Phase 3: Encryption
- Client-side file encryption (TweetNaCl.js)
- Key management system
- Encrypted metadata storage
- HIPAA compliance

### Phase 4: Advanced Features
- Multi-signature approvals
- Delegated access management
- Audit trail analytics
- Integration with healthcare providers

## Testing Locally

1. Install MetaMask on your browser
2. Create a test wallet
3. Get testnet tokens (if needed)
4. Run the dev server: `pnpm dev`
5. Connect wallet and test uploads/permissions

## Troubleshooting

### "Pinata API credentials not found"
- Check `.env.local` has `NEXT_PUBLIC_PINATA_API_KEY` and `NEXT_PUBLIC_PINATA_API_SECRET`
- Ensure they're valid and not expired

### "Please install MetaMask"
- Install MetaMask extension from browser store
- Refresh the page after installation

### IPFS file not accessible
- Wait 30-60 seconds for Pinata to pin the file
- Check file hash in browser console
- Verify gateway URL: `https://gateway.pinata.cloud/ipfs/{hash}`

### Wallet not connecting
- Ensure MetaMask is unlocked
- Check correct network is selected
- Try reconnecting wallet

## Security Notes

⚠️ **Important for Production:**
- Files should be encrypted client-side before upload
- Use secure key management for encryption keys
- Deploy smart contracts for permission management
- Implement proper access control on backend
- Add rate limiting and DDoS protection
- Conduct security audit before launch

## Support

For issues or questions:
- Pinata Docs: https://docs.pinata.cloud
- Alchemy Docs: https://docs.alchemy.com
- MetaMask Docs: https://docs.metamask.io

# SolanaLab - Solana dApp

A comprehensive Solana decentralized application built with Next.js, featuring wallet integration, SOL operations, and SPL token management.

## Features

### 🔗 Wallet Integration

- Connect with Phantom, Solflare, and other Solana wallets
- Real-time balance display
- Devnet support for testing

### 💰 SOL Operations

- **Balance Display**: View your current SOL balance in real-time
- **Airdrop**: Request devnet SOL for testing
- **Transfer**: Send SOL to other addresses

### 🪙 Token Management

- **Create Token**: Mint new SPL tokens with metadata stored on IPFS via Pinata
- **Burn Token**: Burn SPL tokens and close token accounts

### 📋 Token Metadata Display

**Important**: After creating a token, it will appear in your wallet but may not show the name, symbol, or image initially. This is because Solana tokens require on-chain metadata to display properly in wallets and block explorers.

The app will automatically show instructions for adding metadata using:

#### Option 1: Metaplex CLI

```bash
# Install the CLI
npm install -g @metaplex-foundation/js-cli

# Create metadata (the app provides the exact command)
metaplex create-metadata --mint YOUR_MINT_ADDRESS --uri YOUR_METADATA_URI
```

#### Option 2: Metaplex Studio

Visit [metaplex.com](https://www.metaplex.com/) to create metadata through their web interface.

## Setup

### 1. Install Dependencies

```bash
bun install
# or
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure Pinata settings:

```bash
cp .env.example .env.local
```

Add your Pinata JWT token to `.env.local`:

```env
PINATA_JWT=your_pinata_jwt_token_here
```

### 3. Run the Development Server

```bash
bun dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

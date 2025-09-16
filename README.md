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

# SolanaLab

SolanaLab is a developer-focused example dApp built with Next.js and React for interacting with the Solana blockchain. It demonstrates wallet integration, SOL operations, SPL token creation/management, and metadata workflows using Pinata and Metaplex.

**Tech stack:** Next.js 15 · React 19 · Tailwind CSS · Solana Web3 · Metaplex · Pinata

## Features

- Wallet integration (Phantom, other Wallet Adapter providers)
- View SOL balance, request devnet airdrops, and transfer SOL
- Create, mint, burn SPL tokens and close token accounts
- Upload token metadata to IPFS via Pinata and provide Metaplex metadata helpers
- Small set of UI components and utilities for common Solana flows

## Quick Start

Prerequisites

- Node.js 18+ (or Bun) installed locally
- A Solana wallet (Phantom recommended) for testing on Devnet

Install dependencies

```bash
cd /path/to/solanalab
bun install
# or
npm install
```

Copy environment variables

```bash
cp .env.example .env.local
# Edit .env.local and add your Pinata JWT:
# PINATA_JWT=your_pinata_jwt_token_here
```

Run the dev server

```bash
bun dev
# or
npm run dev
```

Open http://localhost:3000 (Next may choose a different free port if 3000 is in use).

## Available NPM Scripts

- `dev` — start Next.js in development mode (`next dev`)
- `build` — build the production app (`next build`)
- `start` — start the production server (`next start`)
- `lint` — run ESLint (`eslint`)

Run a script:

```bash
npm run dev
```

or with Bun:

```bash
bun dev
```

## Environment Variables

- `PINATA_JWT` — (required for Pinata uploads) your Pinata JWT token

Add any other environment-specific keys to `.env.local` as needed.

## Metaplex / Token Metadata

When you create an SPL token, wallets may show only the mint address until on-chain metadata is associated. This repo provides helpers and API routes to upload images/metadata to Pinata and create metadata via Metaplex. Use the Metaplex CLI or Studio to register metadata if required.

## Deployment

This is a standard Next.js app and can be deployed to Vercel, Netlify (via adapter), or any Node host that supports Next.js.

Basic build and start steps for production:

```bash
npm run build
npm run start
```

## Contributing

Contributions and bug reports are welcome. Please open issues or PRs with clear descriptions and reproduction steps.

## License

This repository currently has no license file. Add a `LICENSE` if you intend to publish under an open-source license.

## Contact

If you need help running or extending this project, open an issue or contact the maintainer.

---

Generated README updated for clarity and developer-friendliness.

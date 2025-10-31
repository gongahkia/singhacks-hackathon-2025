# 🟡🟠 Frontend Directory

**Developers 3 & 4 - Your Workspace**

## Quick Start

1. Read **[FRONTEND_GUIDE.md](../FRONTEND_GUIDE.md)** first
2. Choose your framework (React, Vue, Svelte, etc.)
3. Copy `.env.example` from root, adapt for your framework:
   - Next.js: Use `NEXT_PUBLIC_*` prefix
   - Vite: Use `VITE_*` prefix
   - Other: Adapt as needed
4. Install dependencies for your chosen framework

## Framework-Agnostic Structure

```
frontend/
├── src/ (or app/, pages/, etc.)
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   └── lib/
│       ├── api-client.ts   # REQUIRED: Backend API client
│       └── wallet.ts       # Wallet connection helper
└── package.json
```

## Required Integration

You **must** implement:
- `lib/api-client.ts` - Exact interface specified in FRONTEND_GUIDE.md
- Wallet connection - HashPack/Blade/WalletConnect
- HashScan links - All transaction hashes must link to HashScan

## 📚 Full Guide

See **[FRONTEND_GUIDE.md](../FRONTEND_GUIDE.md)** for complete instructions and API client specification.


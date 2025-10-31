# ✅ Pre-Hackathon Checklist
## Final Preparation Before Coding Starts

---

## 🎯 Quick Verification (5 minutes)

### Repository Structure
- [x] All folders exist: `contracts/`, `backend/`, `frontend/`, `tests/`
- [x] `.env.example` template ready
- [x] `.gitignore` properly configured
- [x] Setup scripts created (`setup.sh` / `setup.bat`)
- [x] README files in each subdirectory

### Documentation
- [x] QUICKSTART.md - Complete setup guide
- [x] WEB3_GUIDE.md - Smart contracts roadmap
- [x] WEB2_GUIDE.md - Backend API roadmap
- [x] FRONTEND_GUIDE.md - Framework-agnostic frontend guide
- [x] README.md - Main overview with roadmap

---

## 📋 Developer Setup Verification

### Each Developer Should Have:

#### Account Setup
- [ ] Hedera testnet account created (https://portal.hedera.com/)
- [ ] Ed25519 private key saved (`302e...` format)
- [ ] ECDSA private key generated (`0x...` format) - OR use HashPack/Blade
- [ ] Testnet HBAR received (https://portal.hedera.com/faucet)
- [ ] Account verified on HashScan (https://hashscan.io/testnet)

#### Software Installed
- [ ] Node.js v18+ installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)
- [ ] Browser with wallet extension (HashPack or Blade)

#### Environment Ready
- [ ] Repository cloned
- [ ] `.env` file created from `.env.example`
- [ ] All environment variables filled:
  - `HEDERA_ACCOUNT_ID`
  - `HEDERA_PRIVATE_KEY` (Ed25519)
  - `EVM_PRIVATE_KEY` (ECDSA, if using ethers.js directly)
  - `RPC_URL`
  - `MIRROR_NODE_URL`
  - Frontend env vars (API_URL, WC_PROJECT_ID, etc.)

#### Dependencies Installed
- [ ] Run `./setup.sh` (Linux/Mac) or `setup.bat` (Windows)
- [ ] OR manually install:
  - Contracts: `cd contracts && npm install`
  - Backend: `cd backend && npm install`
  - Frontend: Framework-specific setup (see FRONTEND_GUIDE.md)

---

## 🔍 Last-Minute Checks

### Technical Readiness
- [ ] Can access Hedera Portal: https://portal.hedera.com/
- [ ] Can access HashScan: https://hashscan.io/testnet
- [ ] WalletConnect project ID obtained (for frontend): https://cloud.walletconnect.com
- [ ] Backend can start: `cd backend && npm run dev` → `http://localhost:3001/api/health` works

### Team Coordination
- [ ] Roles confirmed (Dev 1: Web3, Dev 2: Backend, Dev 3 & 4: Frontend)
- [ ] Communication channel established (Slack/Discord/etc.)
- [ ] Everyone has read their role-specific guide
- [ ] Sync times agreed (Hour 12, 24, 36)

---

## 🚨 Common Issues to Pre-empt

### Key Format Issues
- **Problem**: `ethers.Wallet()` fails with Ed25519 key
- **Solution**: Use `EVM_PRIVATE_KEY` (ECDSA) for ethers.js, `HEDERA_PRIVATE_KEY` (Ed25519) for Hedera SDK

### Missing Dependencies
- **Problem**: `npm install` fails
- **Solution**: Run setup script in each directory separately

### Port Conflicts
- **Problem**: Backend port 3001 already in use
- **Solution**: Change `PORT` in `.env` or kill existing process

### CORS Issues
- **Problem**: Frontend can't connect to backend
- **Solution**: Backend should have CORS enabled for frontend origin

---

## 📞 Quick Reference

### Important URLs
- **Hedera Portal**: https://portal.hedera.com/
- **HashScan Testnet**: https://hashscan.io/testnet
- **Mirror Node Docs**: https://testnet.mirrornode.hedera.com/api/v1/docs/
- **WalletConnect Cloud**: https://cloud.walletconnect.com

### Key Commands
```bash
# Backend health check
curl http://localhost:3001/api/health

# Test Hedera connection (if you create a test script)
node test-hedera.js

# Generate ECDSA key (if needed)
npx ethers wallet generate
```

---

## ✨ You're Ready!

Everything is prepared. Developers can:
1. Run setup scripts
2. Fill in `.env`
3. Start coding following their role-specific guides

**Good luck team! 🚀**


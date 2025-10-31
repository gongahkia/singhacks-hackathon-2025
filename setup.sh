#!/bin/bash
# Quick setup script for hackathon developers
# Run: chmod +x setup.sh && ./setup.sh

set -e

echo "🚀 Hedera Agent Economy - Quick Setup"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version should be 18+. Current: $(node -v)"
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Create .env from example if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Edit .env and fill in your Hedera account details!"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Setup contracts
echo "📦 Setting up contracts..."
cd contracts
if [ ! -f package.json ]; then
    npm init -y
    npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
    npm install @openzeppelin/contracts
    echo "✅ Contracts dependencies installed"
else
    echo "✅ Contracts already initialized"
fi
cd ..
echo ""

# Setup backend
echo "📦 Setting up backend..."
cd backend
if [ ! -f package.json ]; then
    npm init -y
    npm install express cors dotenv @hashgraph/sdk ethers axios
    npm install --save-dev nodemon
    echo "✅ Backend dependencies installed"
else
    echo "✅ Backend already initialized"
fi
cd ..
echo ""

# Frontend - user choice
echo "📦 Frontend setup..."
echo "⚠️  Frontend framework is YOUR CHOICE (React, Vue, Svelte, etc.)"
echo "   See FRONTEND_GUIDE.md for framework-agnostic instructions"
echo ""

echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Edit .env file with your Hedera account details"
echo "   2. Read your role-specific guide:"
echo "      - Dev 1 (Web3): WEB3_GUIDE.md"
echo "      - Dev 2 (Web2): WEB2_GUIDE.md"
echo "      - Dev 3 & 4 (Frontend): FRONTEND_GUIDE.md"
echo "   3. Start building! 🚀"


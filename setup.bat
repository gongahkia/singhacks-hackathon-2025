@echo off
REM Quick setup script for Windows
REM Run: setup.bat

echo 🚀 Hedera Agent Economy - Quick Setup
echo ======================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Install from https://nodejs.org/
    exit /b 1
)

echo ✅ Node.js detected
echo.

REM Create .env from example if it doesn't exist
if not exist .env (
    echo 📝 Creating .env from .env.example...
    copy .env.example .env
    echo ⚠️  IMPORTANT: Edit .env and fill in your Hedera account details!
    echo.
) else (
    echo ✅ .env file already exists
    echo.
)

REM Setup contracts
echo 📦 Setting up contracts...
cd contracts
if not exist package.json (
    call npm init -y
    call npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
    call npm install @openzeppelin/contracts
    echo ✅ Contracts dependencies installed
) else (
    echo ✅ Contracts already initialized
)
cd ..
echo.

REM Setup backend
echo 📦 Setting up backend...
cd backend
if not exist package.json (
    call npm init -y
    call npm install express cors dotenv @hashgraph/sdk ethers axios
    call npm install --save-dev nodemon
    echo ✅ Backend dependencies installed
) else (
    echo ✅ Backend already initialized
)
cd ..
echo.

REM Frontend - user choice
echo 📦 Frontend setup...
echo ⚠️  Frontend framework is YOUR CHOICE (React, Vue, Svelte, etc.)
echo    See FRONTEND_GUIDE.md for framework-agnostic instructions
echo.

echo ✅ Setup complete!
echo.
echo 📚 Next steps:
echo    1. Edit .env file with your Hedera account details
echo    2. Read your role-specific guide:
echo       - Dev 1 (Web3): WEB3_GUIDE.md
echo       - Dev 2 (Web2): WEB2_GUIDE.md
echo       - Dev 3 ^& 4 (Frontend): FRONTEND_GUIDE.md
echo    3. Start building! 🚀


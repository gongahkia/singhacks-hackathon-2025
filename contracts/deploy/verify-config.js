const hre = require("hardhat");
require("dotenv").config({ path: '../.env' });

async function main() {
  console.log("🔍 Verifying Hardhat Configuration...\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  // Check .env file location
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '..', '.env');
  const envExists = fs.existsSync(envPath);
  
  console.log("📁 .env File:");
  console.log(`   Path: ${envPath}`);
  console.log(`   Exists: ${envExists ? '✅ Yes' : '❌ No'}\n`);
  
  if (!envExists) {
    console.log("⚠️  .env file not found in project root!");
    console.log("   Create it at:", envPath);
    console.log("   Required: EVM_PRIVATE_KEY=0x...\n");
  }
  
  // Check environment variables
  console.log("🔑 Environment Variables:");
  const evmKey = process.env.EVM_PRIVATE_KEY;
  const hederaKey = process.env.HEDERA_PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL;
  
  console.log(`   EVM_PRIVATE_KEY: ${evmKey ? '✅ Set' : '❌ Missing'}`);
  if (evmKey) {
    const isValid = evmKey.startsWith('0x') && evmKey.length === 66;
    console.log(`   Format: ${isValid ? '✅ Valid (0x...)' : '⚠️  Check format (should be 0x + 64 hex chars)'}`);
    console.log(`   Preview: ${evmKey.substring(0, 10)}...${evmKey.substring(evmKey.length - 4)}`);
  }
  
  console.log(`   HEDERA_PRIVATE_KEY: ${hederaKey ? '✅ Set' : '⚠️  Not required for Hardhat'}`);
  console.log(`   RPC_URL: ${rpcUrl || '⚠️  Using default: https://testnet.hashio.io/api'}\n`);
  
  // Try to get signers
  console.log("👤 Account Configuration:");
  try {
    const signers = await hre.ethers.getSigners();
    if (signers && signers.length > 0) {
      const signer = signers[0];
      console.log(`   ✅ Found ${signers.length} signer(s)`);
      console.log(`   Address: ${signer.address}`);
      
      try {
        const balance = await hre.ethers.provider.getBalance(signer.address);
        const balanceInHbar = hre.ethers.formatEther(balance);
        console.log(`   Balance: ${balanceInHbar} HBAR`);
        
        if (parseFloat(balanceInHbar) < 0.1) {
          console.log(`   ⚠️  Low balance! You may need more HBAR for deployment.`);
        } else {
          console.log(`   ✅ Sufficient balance for deployment`);
        }
      } catch (err) {
        console.log(`   ⚠️  Could not fetch balance: ${err.message}`);
      }
    } else {
      console.log(`   ❌ No signers found`);
      console.log(`   This means EVM_PRIVATE_KEY is not configured correctly`);
    }
  } catch (error) {
    console.log(`   ❌ Error getting signers: ${error.message}`);
  }
  
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  // Summary
  const hasEvmKey = !!evmKey && evmKey.startsWith('0x');
  if (hasEvmKey && envExists) {
    console.log("\n✅ Configuration looks good! Try deploying now:");
    console.log("   npx hardhat run deploy/deploy.js --network hedera_testnet");
  } else {
    console.log("\n❌ Issues found:");
    if (!envExists) {
      console.log("   1. Create .env file in project root");
    }
    if (!hasEvmKey) {
      console.log("   2. Add EVM_PRIVATE_KEY=0x... to .env file");
      console.log("      (Get your EVM private key from your wallet)");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔑 Generating EVM-Compatible Wallet...\n");

  // Generate a new random wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log("✅ New wallet generated!");
  console.log("\n📋 Wallet Details:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📍 EVM Address:", wallet.address);
  console.log("🔑 Private Key:", wallet.privateKey);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📝 Add this to your .env file (in project root):");
  console.log(`EVM_PRIVATE_KEY=${wallet.privateKey}\n`);

  console.log("⚠️  IMPORTANT:");
  console.log("1. This is a NEW wallet with NO HBAR balance");
  console.log("2. Fund this wallet with testnet HBAR before deploying");
  console.log("3. Get HBAR from: https://portal.hedera.com/");
  console.log("4. Use HashPack/Blade wallet to transfer HBAR to this address\n");

  // Optionally save to a file (not .env, but a temporary file)
  const keyFile = path.join(__dirname, "..", "evm-key.txt");
  fs.writeFileSync(keyFile, `EVM_PRIVATE_KEY=${wallet.privateKey}\nEVM_ADDRESS=${wallet.address}\n`);
  console.log(`💾 Also saved to: ${keyFile} (DO NOT commit this file to git!)\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

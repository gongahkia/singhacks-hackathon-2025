const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Verifying contracts on HashScan...\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, '..', 'deployment.json');
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("Error: deployment.json not found. Please deploy contracts first.");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

  if (deploymentInfo.network !== 'hedera_testnet') {
    console.error("Error: Contract verification only supported for hedera_testnet");
    process.exit(1);
  }

  console.log("Contract Addresses:");
  console.log(`AgentRegistry: ${deploymentInfo.contracts.AgentRegistry}`);
  console.log(`PaymentProcessor: ${deploymentInfo.contracts.PaymentProcessor}\n`);

  console.log("Manual Verification Instructions:");
  console.log("1. Visit https://hashscan.io/testnet");
  console.log("2. Search for each contract address");
  console.log("3. Click 'Contract' tab");
  console.log("4. Click 'Verify & Publish'");
  console.log("5. Upload source code files:");
  console.log("   - contracts/src/AgentRegistry.sol");
  console.log("   - contracts/src/PaymentProcessor.sol");
  console.log("6. Include compiler settings:");
  console.log("   - Solidity version: 0.8.20");
  console.log("   - Optimization: Enabled (200 runs)");
  console.log("\nHashScan Links:");
  console.log(`AgentRegistry: https://hashscan.io/testnet/contract/${deploymentInfo.contracts.AgentRegistry}`);
  console.log(`PaymentProcessor: https://hashscan.io/testnet/contract/${deploymentInfo.contracts.PaymentProcessor}`);
  
  console.log("\nNote: Hedera testnet uses manual verification via HashScan web interface.");
  console.log("Automated verification requires additional HashScan API configuration.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification check failed:", error);
    process.exit(1);
  });


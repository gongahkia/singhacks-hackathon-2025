const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying Hedera Agent Economy Contracts...\n");

  // Get deployer account
  const signers = await hre.ethers.getSigners();
  
  if (!signers || signers.length === 0) {
    console.error("❌ No deployer account found!");
    console.error("\n📋 To fix this:");
    console.error("1. Ensure you have EVM_PRIVATE_KEY in your .env file (project root)");
    console.error("2. EVM_PRIVATE_KEY should be in ECDSA format (starts with 0x)");
    console.error("3. Generate a new key: npx hardhat run deploy/generate-evm-key.js");
    console.error("\n💡 Example .env entry:");
    console.error("   EVM_PRIVATE_KEY=0x1234567890abcdef...");
    console.error("\n⚠️  Note: Hedera Ed25519 keys (302e...) won't work with Hardhat");
    console.error("   You need an ECDSA key (0x...) for EVM transactions");
    process.exit(1);
  }
  
  const [deployer] = signers;
  console.log("📍 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "HBAR\n");

  // Deploy AgentRegistry
  console.log("📝 Deploying AgentRegistry...");
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(deployer.address);
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("✅ AgentRegistry deployed to:", agentRegistryAddress);

  // Deploy PaymentProcessor
  console.log("\n💰 Deploying PaymentProcessor...");
  const PaymentProcessor = await hre.ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy(deployer.address);
  await paymentProcessor.waitForDeployment();
  const paymentProcessorAddress = await paymentProcessor.getAddress();
  console.log("✅ PaymentProcessor deployed to:", paymentProcessorAddress);

  // Save deployment info
  const network = await hre.ethers.provider.getNetwork();
  const deploymentInfo = {
    network: hre.network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    contracts: {
      AgentRegistry: agentRegistryAddress,
      PaymentProcessor: paymentProcessorAddress
    },
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };

  const deploymentPath = path.join(__dirname, '..', 'deployment.json');
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n✅ Deployment complete! Info saved to deployment.json");
  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n🔍 Verify on HashScan:");
  console.log(`AgentRegistry: https://hashscan.io/testnet/contract/${agentRegistryAddress}`);
  console.log(`PaymentProcessor: https://hashscan.io/testnet/contract/${paymentProcessorAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });


require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: '../.env' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hedera_testnet: {
      url: process.env.RPC_URL || "https://testnet.hashio.io/api",
      // Hardhat/ethers expects ECDSA key (hex format starting with 0x)
      // Use EVM_PRIVATE_KEY if available, fallback to HEDERA_PRIVATE_KEY
      accounts: process.env.EVM_PRIVATE_KEY 
        ? [process.env.EVM_PRIVATE_KEY]
        : process.env.HEDERA_PRIVATE_KEY
          ? [process.env.HEDERA_PRIVATE_KEY]
          : [],
      chainId: 296,
      timeout: 60000
    }
  },
  paths: {
    sources: "./src",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};


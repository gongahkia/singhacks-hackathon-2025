// scripts/seed-demo-agents-alice-bob.js
// This script registers Alice and Bob as permissionless agents with their own wallets
// IMPORTANT: Set ALICE_PRIVATE_KEY and BOB_PRIVATE_KEY in .env file (or use .env.alice/.env.bob)
// These keys will be loaded by the backend on startup to enable agent wallet payments

require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Load from .env.alice and .env.bob files (persistent accounts)
function loadEnvFile(envFileName) {
  const envPath = path.resolve(__dirname, '../../', envFileName);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
    return env;
  }
  return null;
}

// Load Alice and Bob credentials from .env files or main .env
const aliceEnv = loadEnvFile('.env.alice') || {};
const bobEnv = loadEnvFile('.env.bob') || {};

// Get private keys - prioritize .env.alice/.env.bob, then main .env, then EVM_PRIVATE_KEY from respective files
const getAlicePrivateKey = () => {
  return aliceEnv.ALICE_PRIVATE_KEY || 
         aliceEnv.EVM_PRIVATE_KEY || 
         process.env.ALICE_PRIVATE_KEY || 
         process.env.EVM_PRIVATE_KEY;
};

const getBobPrivateKey = () => {
  return bobEnv.BOB_PRIVATE_KEY || 
         bobEnv.EVM_PRIVATE_KEY || 
         process.env.BOB_PRIVATE_KEY || 
         process.env.EVM_PRIVATE_KEY;
};

// Demo agents with persistent wallets (permissionless mode)
const DEMO_AGENTS = [
  {
    agentId: 'alice',
    name: 'Alice',
    capabilities: ['payment', 'agent-negotiation', 'autonomous-transactions', 'multi-agent-coordination'],
    metadata: 'Autonomous agent with permissionless payment capabilities. Alice can receive funds and pay other agents autonomously.',
    paymentMode: 'permissionless',
    // Load from .env.alice (persistent) or main .env
    privateKey: getAlicePrivateKey(),
    accountId: aliceEnv.HEDERA_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID,
    envFile: '.env.alice'
  },
  {
    agentId: 'bob',
    name: 'Bob',
    capabilities: ['payment', 'agent-negotiation', 'autonomous-transactions', 'data-processing'],
    metadata: 'Autonomous agent with permissionless payment capabilities. Bob can receive funds and pay other agents autonomously.',
    paymentMode: 'permissionless',
    // Load from .env.bob (persistent) or main .env
    privateKey: getBobPrivateKey(),
    accountId: bobEnv.HEDERA_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID,
    envFile: '.env.bob'
  }
];

async function seedDemoAgents() {
  console.log('🤖 Seeding demo agents (Alice & Bob) with permissionless wallets...\n');
  
  // Check if backend is running
  try {
    const healthCheck = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    console.log('✅ Backend is running\n');
  } catch (error) {
    console.error('❌ Backend is not running or not accessible.');
    console.error(`   Make sure backend is started: cd backend && npm start`);
    console.error(`   Backend URL: ${BASE_URL}\n`);
    process.exit(1);
  }
  
  for (const agent of DEMO_AGENTS) {
    try {
      // Check if private key is available
      if (!agent.privateKey) {
        console.log(`⚠️  Skipping ${agent.name}: No private key found`);
        console.log(`   💡 Expected in ${agent.envFile} or .env as ${agent.agentId.toUpperCase()}_PRIVATE_KEY or EVM_PRIVATE_KEY\n`);
        continue;
      }
      
      // Generate wallet from private key to get address
      const wallet = new ethers.Wallet(agent.privateKey);
      const walletAddress = wallet.address;
      
      console.log(`📝 Registering ${agent.name} (${agent.agentId})...`);
      console.log(`   Wallet Address: ${walletAddress}`);
      if (agent.accountId) {
        console.log(`   Hedera Account ID: ${agent.accountId}`);
      }
      console.log(`   Payment Mode: ${agent.paymentMode}`);
      console.log(`   Capabilities: ${agent.capabilities.join(', ')}`);
      console.log(`   Source: ${agent.envFile || '.env'} (persistent account)`);
      
      // Check if already registered
      try {
        const existingAgent = await axios.get(`${BASE_URL}/api/agents/${walletAddress}`, { timeout: 5000 });
        if (existingAgent.data && existingAgent.data.address === walletAddress) {
          console.log(`✅ Already registered: ${agent.name} (${agent.agentId})`);
          console.log(`   Address: ${walletAddress}`);
          if (existingAgent.data.erc8004AgentId) {
            console.log(`   ERC-8004 Agent ID: ${existingAgent.data.erc8004AgentId}`);
          }
          console.log('');
          continue;
        }
      } catch (checkError) {
        // Not found, proceed with registration
      }
      
      const res = await axios.post(`${BASE_URL}/api/agents/register-agent`, {
        agentId: agent.agentId,
        name: agent.name,
        capabilities: agent.capabilities,
        metadata: agent.metadata,
        paymentMode: agent.paymentMode,
        agentPrivateKey: agent.privateKey
      }, {
        timeout: 60000
      });
      
      console.log(`✅ Registered: ${agent.name} (${agent.agentId})`);
      console.log(`   Agent Wallet: ${res.data.agentWalletAddress || walletAddress}`);
      console.log(`   Payment Mode: ${res.data.paymentMode}`);
      if (res.data.erc8004AgentId) {
        console.log(`   ERC-8004 Agent ID: ${res.data.erc8004AgentId}`);
      }
      console.log(`   ✅ Using persistent account from ${agent.envFile || '.env'}\n`);
    } catch (error) {
      if (error.response?.data?.error?.includes('Already registered') || 
          error.response?.data?.error?.includes('already')) {
        console.log(`✅ Already registered: ${agent.name} (using persistent account)\n`);
      } else {
        console.error(`❌ Failed: ${agent.name}`);
        if (error.response?.data?.error) {
          console.error(`   Error: ${error.response.data.error}`);
        } else if (error.message) {
          console.error(`   Error: ${error.message}`);
        }
        if (error.response?.data) {
          console.error(`   Details:`, JSON.stringify(error.response.data, null, 2));
        }
        console.error('');
      }
    }
  }
  
  console.log('✨ Demo agents seeding complete!');
  console.log('\n💡 Alice and Bob are now available with permissionless payment mode.');
  console.log('   Users can send funds to their wallet addresses, and they can pay autonomously.');
}

seedDemoAgents().catch(console.error);


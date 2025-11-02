// scripts/seed-demo-agents-alice-bob.js
// This script registers Alice and Bob as permissionless agents with their own wallets
// IMPORTANT: Set ALICE_PRIVATE_KEY and BOB_PRIVATE_KEY in .env file (or use .env.alice/.env.bob)
// These keys will be loaded by the backend on startup to enable agent wallet payments

require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const { ethers } = require('ethers');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Demo agents with hardcoded wallets (permissionless mode)
// In production, these would be securely stored
const DEMO_AGENTS = [
  {
    agentId: 'alice',
    name: 'Alice',
    capabilities: ['payment', 'agent-negotiation', 'autonomous-transactions', 'multi-agent-coordination'],
    metadata: 'Autonomous agent with permissionless payment capabilities. Alice can receive funds and pay other agents autonomously.',
    paymentMode: 'permissionless',
    // Use ALICE_PRIVATE_KEY from env, or generate random (not recommended for production)
    // IMPORTANT: Add ALICE_PRIVATE_KEY to .env file for persistence across restarts
    privateKey: process.env.ALICE_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey
  },
  {
    agentId: 'bob',
    name: 'Bob',
    capabilities: ['payment', 'agent-negotiation', 'autonomous-transactions', 'data-processing'],
    metadata: 'Autonomous agent with permissionless payment capabilities. Bob can receive funds and pay other agents autonomously.',
    paymentMode: 'permissionless',
    // Use BOB_PRIVATE_KEY from env, or generate random (not recommended for production)
    // IMPORTANT: Add BOB_PRIVATE_KEY to .env file for persistence across restarts
    privateKey: process.env.BOB_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey
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
      // Generate wallet from private key to get address
      const wallet = new ethers.Wallet(agent.privateKey);
      const walletAddress = wallet.address;
      
      console.log(`📝 Registering ${agent.name} (${agent.agentId})...`);
      console.log(`   Wallet Address: ${walletAddress}`);
      console.log(`   Payment Mode: ${agent.paymentMode}`);
      console.log(`   Capabilities: ${agent.capabilities.join(', ')}`);
      
      // Note: Store the private key in an env file for persistence
      // In production, use secure key management
      console.log(`   ⚠️  Private Key: ${agent.privateKey.substring(0, 10)}... (save this securely!)`);
      
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
      
      // Warn if using random key (not persisted)
      if (!process.env[`${agent.name.toUpperCase()}_PRIVATE_KEY`]) {
        console.log(`   ⚠️  WARNING: Using random private key. Add ${agent.name.toUpperCase()}_PRIVATE_KEY to .env for persistence!`);
        console.log(`   Private Key: ${agent.privateKey}`);
      }
      console.log('');
    } catch (error) {
      if (error.response?.data?.error?.includes('Already registered')) {
        console.log(`⏭️  Skipped: ${agent.name} (already registered)\n`);
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


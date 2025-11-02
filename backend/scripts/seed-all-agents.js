// scripts/seed-all-agents.js
// Combined seed script for both walletless agents and Alice/Bob
require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

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

const aliceEnv = loadEnvFile('.env.alice') || {};
const bobEnv = loadEnvFile('.env.bob') || {};

// Get private keys from .env files (persistent accounts)
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

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const WALLETLESS_AGENTS = [
  {
    agentId: 'data-analyst-pro',
    name: 'Data Analyst Pro',
    capabilities: ['data-analysis', 'visualization', 'reporting', 'sql'],
    metadata: 'Professional data analysis agent specializing in business intelligence and analytics'
  },
  {
    agentId: 'security-auditor',
    name: 'Smart Contract Auditor',
    capabilities: ['security-audit', 'smart-contracts', 'solidity', 'vulnerability-detection'],
    metadata: 'Expert blockchain security auditor for Solidity smart contracts'
  },
  {
    agentId: 'nft-marketplace',
    name: 'NFT Marketplace Agent',
    capabilities: ['nft-trading', 'marketplace', 'collection-management', 'pricing'],
    metadata: 'Automated NFT trading and collection management agent'
  },
  {
    agentId: 'defi-yield-optimizer',
    name: 'DeFi Yield Optimizer',
    capabilities: ['defi', 'yield-farming', 'liquidity-pools', 'portfolio-management'],
    metadata: 'DeFi yield optimization agent for automated liquidity provision'
  },
  {
    agentId: 'cross-chain-bridge',
    name: 'Cross-Chain Bridge Operator',
    capabilities: ['bridge', 'cross-chain', 'token-transfer', 'oracle'],
    metadata: 'Automated cross-chain asset bridge operator'
  },
  {
    agentId: 'governance-proposal',
    name: 'Governance Proposal Agent',
    capabilities: ['governance', 'voting', 'proposals', 'dao-management'],
    metadata: 'DAO governance and proposal management agent'
  },
  {
    agentId: 'price-oracle',
    name: 'Price Oracle Agent',
    capabilities: ['oracle', 'price-feed', 'data-aggregation', 'defi'],
    metadata: 'Decentralized price oracle for DeFi protocols'
  }
];

const PERMISSIONLESS_AGENTS = [
  {
    agentId: 'payment-processing-agent',
    name: 'Payment Processing Agent',
    capabilities: ['payment', 'agent-negotiation', 'autonomous-transactions', 'multi-agent-coordination'],
    metadata: 'Autonomous payment processing agent with permissionless payment capabilities. Can receive funds and pay other agents autonomously.',
    paymentMode: 'permissionless',
    privateKey: getAlicePrivateKey(),
    accountId: aliceEnv.HEDERA_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID,
    envFile: '.env.alice'
  },
  {
    agentId: 'ai-credits-agent',
    name: 'AI Credits Agent',
    capabilities: ['payment', 'agent-negotiation', 'autonomous-transactions', 'data-processing'],
    metadata: 'Autonomous AI credits agent with permissionless payment capabilities. Can receive funds and pay other agents autonomously.',
    paymentMode: 'permissionless',
    privateKey: getBobPrivateKey(),
    accountId: bobEnv.HEDERA_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID,
    envFile: '.env.bob'
  }
];

async function seedAllAgents() {
  console.log('🌱 Seeding all agents (walletless + permissionless)...\n');
  
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
  
  // Seed walletless agents (permissioned mode)
  console.log('📝 Seeding walletless agents (permissioned mode)...\n');
  for (const agent of WALLETLESS_AGENTS) {
    await registerAgent(agent, 'permissioned');
  }
  
  // Seed permissionless agents (Payment Processing Agent & AI Credits Agent) - using persistent accounts
  console.log('\n📝 Seeding permissionless agents (Payment Processing Agent & AI Credits Agent) with persistent accounts...\n');
  for (const agent of PERMISSIONLESS_AGENTS) {
    if (!agent.privateKey) {
      console.log(`⚠️  Skipping ${agent.name}: Private key not found in ${agent.envFile} or .env\n`);
      console.log(`   💡 Add ${agent.agentId.toUpperCase()}_PRIVATE_KEY or EVM_PRIVATE_KEY to ${agent.envFile}\n`);
      continue;
    }
    console.log(`   Using persistent account from ${agent.envFile || '.env'}`);
    if (agent.accountId) {
      console.log(`   Hedera Account ID: ${agent.accountId}`);
    }
    await registerAgent(agent, 'permissionless', agent.privateKey);
  }
  
  console.log('\n✨ Seeding complete!');
  console.log('\n💡 All agents are now available in the marketplace.');
  console.log('   Permissionless agents (Payment Processing Agent & AI Credits Agent) can receive funds and pay autonomously.');
}

async function registerAgent(agent, paymentMode, privateKey = null) {
  try {
    const payload = {
      agentId: agent.agentId,
      name: agent.name,
      capabilities: agent.capabilities,
      metadata: agent.metadata,
      paymentMode: paymentMode
    };
    
    if (privateKey) {
      payload.agentPrivateKey = privateKey;
    }
    
    console.log(`📝 Registering ${agent.name} (${agent.agentId})...`);
    if (paymentMode === 'permissionless') {
      const wallet = new ethers.Wallet(privateKey);
      console.log(`   Wallet Address: ${wallet.address}`);
    }
    
    const res = await axios.post(`${BASE_URL}/api/agents/register-agent`, payload, {
      timeout: 120000 // 120 second timeout
    });
    
    // Check if agent was already registered
    if (res.data.txHash === 'already-registered' || res.data.message?.includes('already')) {
      console.log(`✅ Already registered: ${agent.name} (${agent.agentId})`);
      if (res.data.erc8004AgentId) {
        console.log(`   ERC-8004 Agent ID: ${res.data.erc8004AgentId}`);
      }
      console.log('');
      return;
    }
    
    console.log(`✅ Registered: ${agent.name} (${agent.agentId})`);
    console.log(`   Payment Mode: ${res.data.paymentMode}`);
    if (res.data.registeredAddress || res.data.agentAddress) {
      console.log(`   Address: ${res.data.registeredAddress || res.data.agentAddress}`);
    }
    if (res.data.erc8004AgentId) {
      console.log(`   ERC-8004 Agent ID: ${res.data.erc8004AgentId}`);
    }
    console.log('');
  } catch (error) {
    if (error.response?.data?.error?.includes('already registered') || 
        error.response?.data?.error?.includes('Already registered')) {
      console.log(`⏭️  Skipped: ${agent.name} (already registered)`);
      if (error.response?.data?.erc8004AgentId) {
        console.log(`   ERC-8004 Agent ID: ${error.response.data.erc8004AgentId}`);
      }
      console.log('');
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error(`⏱️  Timeout: ${agent.name} (registration took too long, but may have succeeded)`);
      console.error(`   Check backend logs or marketplace to verify registration\n`);
    } else {
      console.error(`❌ Failed: ${agent.name}`);
      if (error.response?.data?.error) {
        console.error(`   Error: ${error.response.data.error}`);
      } else if (error.message) {
        console.error(`   Error: ${error.message}`);
      }
      console.error('');
    }
  }
}

seedAllAgents().catch(console.error);


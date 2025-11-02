// scripts/seed-all-agents.js
// Combined seed script for both walletless agents and Alice/Bob
require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const { ethers } = require('ethers');

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
  },
  {
    agentId: 'token-distributor',
    name: 'Token Distribution Agent',
    capabilities: ['token-distribution', 'airdrop', 'vesting', 'staking'],
    metadata: 'Automated token distribution and vesting management'
  }
];

const PERMISSIONLESS_AGENTS = [
  {
    agentId: 'alice',
    name: 'Alice',
    capabilities: ['payment', 'agent-negotiation', 'autonomous-transactions', 'multi-agent-coordination'],
    metadata: 'Autonomous agent with permissionless payment capabilities. Alice can receive funds and pay other agents autonomously.',
    paymentMode: 'permissionless',
    privateKey: process.env.ALICE_PRIVATE_KEY
  },
  {
    agentId: 'bob',
    name: 'Bob',
    capabilities: ['payment', 'agent-negotiation', 'autonomous-transactions', 'data-processing'],
    metadata: 'Autonomous agent with permissionless payment capabilities. Bob can receive funds and pay other agents autonomously.',
    paymentMode: 'permissionless',
    privateKey: process.env.BOB_PRIVATE_KEY
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
  
  // Seed permissionless agents (Alice/Bob)
  console.log('\n📝 Seeding permissionless agents (Alice & Bob)...\n');
  for (const agent of PERMISSIONLESS_AGENTS) {
    if (!agent.privateKey) {
      console.log(`⚠️  Skipping ${agent.name}: ${agent.agentId.toUpperCase()}_PRIVATE_KEY not set in .env\n`);
      continue;
    }
    await registerAgent(agent, 'permissionless', agent.privateKey);
  }
  
  console.log('\n✨ Seeding complete!');
  console.log('\n💡 All agents are now available in the marketplace.');
  console.log('   Permissionless agents (Alice/Bob) can receive funds and pay autonomously.');
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


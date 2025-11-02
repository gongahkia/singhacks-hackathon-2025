// scripts/seed-agents-walletless.js
require('dotenv').config({ path: '../.env' });
const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const AGENTS = [
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

async function seedAgents() {
  console.log('🌱 Seeding diverse agents (no wallets required)...\n');
  
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
  
  for (const agent of AGENTS) {
    try {
      const res = await axios.post(`${BASE_URL}/api/agents/register-agent`, {
        agentId: agent.agentId,
        name: agent.name,
        capabilities: agent.capabilities,
        metadata: agent.metadata
      }, {
        timeout: 60000 // 60 second timeout (ERC-8004 registration can take time)
      });
      
      // Check if agent was already registered
      if (res.data.txHash === 'already-registered' || res.data.message?.includes('already')) {
        console.log(`✅ Already registered: ${agent.name} (${agent.agentId})`);
        if (res.data.erc8004AgentId) {
          console.log(`   ERC-8004 Agent ID: ${res.data.erc8004AgentId}`);
        }
        console.log('');
      } else {
        console.log(`✅ Registered: ${agent.name} (${agent.agentId})`);
        console.log(`   Capabilities: ${agent.capabilities.join(', ')}`);
        console.log(`   Address: ${res.data.registeredAddress || res.data.agentAddress}`);
        if (res.data.erc8004AgentId) {
          console.log(`   ERC-8004 Agent ID: ${res.data.erc8004AgentId}`);
        }
        console.log('');
      }
    } catch (error) {
      if (error.response?.data?.error?.includes('already registered') || 
          error.response?.data?.error?.includes('Already registered')) {
        console.log(`⏭️  Skipped: ${agent.name} (already registered)`);
        if (error.response?.data?.erc8004AgentId) {
          console.log(`   ERC-8004 Agent ID: ${error.response.data.erc8004AgentId}`);
        }
        console.log('');
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
        if (error.code === 'ECONNREFUSED') {
          console.error(`   Backend is not running at ${BASE_URL}`);
        }
        console.error('');
      }
    }
  }
  
  console.log('✨ Seeding complete!');
  console.log('\n💡 Agents are now available. Users can connect their wallets to use them.');
}

seedAgents().catch(console.error);


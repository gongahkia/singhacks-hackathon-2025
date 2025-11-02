// scripts/register-existing-to-erc8004.js
// This script registers existing agents (from custom contract) with ERC-8004
// Useful when agents exist in custom contract but not in ERC-8004 or agentIdMapping

require('dotenv').config({ path: '../.env' });
const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function registerExistingToERC8004() {
  console.log('🔄 Registering existing agents with ERC-8004...\n');
  
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
  
  // Get all agents from backend
  try {
    const agentsRes = await axios.get(`${BASE_URL}/api/agents`);
    const agents = agentsRes.data.agents || [];
    
    console.log(`📊 Found ${agents.length} agents in backend\n`);
    
    if (agents.length === 0) {
      console.log('ℹ️  No agents found. Run seed-agents-walletless.js first.\n');
      return;
    }
    
    // Filter agents that don't have erc8004AgentId
    const agentsNeedingERC8004 = agents.filter(agent => !agent.erc8004AgentId);
    
    console.log(`🔍 ${agentsNeedingERC8004.length} agents need ERC-8004 registration\n`);
    
    if (agentsNeedingERC8004.length === 0) {
      console.log('✅ All agents already registered with ERC-8004!\n');
      return;
    }
    
    // Re-register each agent (will skip custom contract but register with ERC-8004)
    for (const agent of agentsNeedingERC8004) {
      try {
        console.log(`📝 Registering ${agent.name || agent.agentId} with ERC-8004...`);
        
        const res = await axios.post(`${BASE_URL}/api/agents/register-agent`, {
          agentId: agent.agentId || agent.name?.toLowerCase().replace(/\s+/g, '-'),
          name: agent.name || agent.agentId,
          capabilities: agent.capabilities || [],
          metadata: agent.metadata || ''
        }, {
          timeout: 30000
        });
        
        if (res.data.erc8004AgentId) {
          console.log(`   ✅ ERC-8004 Agent ID: ${res.data.erc8004AgentId}`);
        } else if (res.data.success) {
          console.log(`   ✅ Registration successful (may already exist)`);
        }
        console.log('');
      } catch (error) {
        if (error.response?.data?.error?.includes('ERC-8004')) {
          console.log(`   ⏭️  Already registered with ERC-8004\n`);
        } else {
          console.error(`   ❌ Failed: ${error.response?.data?.error || error.message}\n`);
        }
      }
    }
    
    console.log('✨ Registration complete!\n');
    console.log('💡 Refresh the marketplace to see all agents.\n');
  } catch (error) {
    console.error('❌ Failed to fetch agents:', error.message);
    process.exit(1);
  }
}

registerExistingToERC8004().catch(console.error);


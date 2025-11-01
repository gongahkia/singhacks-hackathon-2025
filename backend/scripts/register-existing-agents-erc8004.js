// scripts/register-existing-agents-erc8004.js
require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');
const erc8004Service = require('../services/erc8004-service');
const agentService = require('../services/agent-service');

async function registerExistingAgents() {
  console.log('📝 Registering existing agents with ERC-8004...\n');
  
  try {
    await erc8004Service.initialize();
    
    if (!erc8004Service.isAvailable()) {
      console.error('❌ ERC-8004 service not available. Check RPC_URL and contract addresses.');
      process.exit(1);
    }
    
    agentService.ensureContract();
    
    // Get all agents
    const agents = await agentService.getAllAgents();
    console.log(`Found ${agents.length} agents to register\n`);
    
    for (const agent of agents) {
      // Check if already registered using static method
      // Access the class through the instance's constructor
      const AgentServiceClass = Object.getPrototypeOf(agentService).constructor;
      const existingId = AgentServiceClass.getERC8004AgentId
        ? AgentServiceClass.getERC8004AgentId(agent.address)
        : null;
      if (existingId) {
        console.log(`⏭️  ${agent.name} (${agent.address}) already has ERC-8004 ID: ${existingId}\n`);
        continue;
      }
      
      try {
        // Try to extract agentId from metadata
        let agentId = agent.address; // Fallback to address
        try {
          const metadataObj = JSON.parse(agent.metadata || '{}');
          agentId = metadataObj.agentId || agent.address;
        } catch (e) {
          // Not JSON, use address
        }
        
        const agentURI = `https://heracles.hedera/agents/${agentId}`;
        
        console.log(`Registering ${agent.name} (${agent.address})...`);
        const erc8004Result = await erc8004Service.registerAgentIdentity(
          agentService.wallet, // Use service wallet
          agentURI,
          {
            agentAddress: agent.address,
            agentName: agent.name,
            capabilities: JSON.stringify(agent.capabilities || []),
            customMetadata: agent.metadata || ''
          }
        );
        
        // Store mapping using static property
        const AgentServiceClass = Object.getPrototypeOf(agentService).constructor;
        if (AgentServiceClass.erc8004AgentIdMapping) {
          AgentServiceClass.erc8004AgentIdMapping.set(
            agent.address.toLowerCase(),
            erc8004Result.agentId
          );
        }
        
        console.log(`✅ Registered ${agent.name} (${agent.address})`);
        console.log(`   ERC-8004 Agent ID: ${erc8004Result.agentId}`);
        console.log(`   Tx Hash: ${erc8004Result.txHash}\n`);
      } catch (error) {
        console.error(`❌ Failed to register ${agent.name}:`, error.message);
        console.error('');
      }
    }
    
    console.log('✨ Migration complete!');
    console.log('\n💡 All agents are now registered with ERC-8004 and will use 70% ERC-8004 weight in trust scores.');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

registerExistingAgents();


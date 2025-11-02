// scripts/test-feedback-submission.js
// Test script to submit sample feedback for agents and demonstrate trust score changes

require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const { ethers } = require('ethers');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Sample feedback data
const SAMPLE_FEEDBACK = [
  {
    rating: 5,
    comment: 'Excellent service! Very responsive and professional.',
    tag1: 'quality',
    tag2: 'reliability'
  },
  {
    rating: 4,
    comment: 'Good work, met expectations. Would use again.',
    tag1: 'quality',
    tag2: 'speed'
  },
  {
    rating: 5,
    comment: 'Outstanding performance, exceeded expectations.',
    tag1: 'excellence',
    tag2: 'reliability'
  },
  {
    rating: 3,
    comment: 'Average service, some improvements needed.',
    tag1: 'quality',
    tag2: null
  },
  {
    rating: 5,
    comment: 'Perfect! Fast delivery and high quality.',
    tag1: 'speed',
    tag2: 'quality'
  }
];

// Load Bob's account details from .env.bob to use as the client
function loadBobAccount() {
  const fs = require('fs');
  const path = require('path');
  
  // Try to load from .env.bob
  const bobEnvPath = path.resolve(__dirname, '../../.env.bob');
  if (fs.existsSync(bobEnvPath)) {
    const envContent = fs.readFileSync(bobEnvPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
    
    // Get Bob's private key (try BOB_PRIVATE_KEY or EVM_PRIVATE_KEY)
    const bobPrivateKey = env.BOB_PRIVATE_KEY || env.EVM_PRIVATE_KEY || process.env.BOB_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY;
    if (bobPrivateKey) {
      const bobWallet = new ethers.Wallet(bobPrivateKey);
      return {
        address: bobWallet.address,
        privateKey: bobWallet.privateKey,
        accountId: env.HEDERA_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID
      };
    }
  }
  
  // Fallback: use BOB_PRIVATE_KEY from main .env
  const bobPrivateKey = process.env.BOB_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY;
  if (bobPrivateKey) {
    const bobWallet = new ethers.Wallet(bobPrivateKey);
    return {
      address: bobWallet.address,
      privateKey: bobWallet.privateKey,
      accountId: null
    };
  }
  
  return null;
}

// Get Bob's account to use as the client
const bobAccount = loadBobAccount();

async function checkBackend() {
  try {
    await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('❌ Backend is not running or not accessible.');
    console.error(`   Make sure backend is started: cd backend && npm start`);
    console.error(`   Backend URL: ${BASE_URL}\n`);
    return false;
  }
}

async function getTrustScore(agentAddress) {
  try {
    const res = await axios.get(
      `${BASE_URL}/api/reputation/agents/${agentAddress}/hybrid-trust`,
      { timeout: 10000 }
    );
    return res.data;
  } catch (error) {
    console.warn(`   ⚠️  Could not fetch trust score: ${error.message}`);
    return null;
  }
}

async function submitFeedback(fromAgent, toAgent, rating, comment, tag1, tag2) {
  try {
    const payload = {
      fromAgent,
      toAgent,
      rating,
      comment,
      tag1: tag1 || undefined,
      tag2: tag2 || undefined
    };
    
    const res = await axios.post(
      `${BASE_URL}/api/reputation/feedback`,
      payload,
      { timeout: 60000 }
    );
    
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
}

async function getAgentReputation(agentAddress) {
  try {
    const res = await axios.get(
      `${BASE_URL}/api/reputation/agents/${agentAddress}/reputation`,
      { timeout: 10000 }
    );
    return res.data.reputation || [];
  } catch (error) {
    return [];
  }
}

async function testFeedbackSubmission() {
  console.log('🧪 Testing ERC-8004 Feedback Submission\n');
  console.log('This script will:');
  console.log('  1. Get all registered agents');
  console.log('  2. Check their current trust scores');
  console.log('  3. Submit sample feedback');
  console.log('  4. Show updated trust scores\n');
  
  // Check backend
  if (!(await checkBackend())) {
    process.exit(1);
  }
  
  console.log('✅ Backend is running\n');
  
  // Get all agents
  let agents = [];
  try {
    const res = await axios.get(`${BASE_URL}/api/agents`, { timeout: 10000 });
    agents = res.data.agents || res.data || [];
    
    if (!Array.isArray(agents)) {
      agents = [];
    }
  } catch (error) {
    console.error(`❌ Failed to fetch agents: ${error.message}`);
    process.exit(1);
  }
  
  if (agents.length === 0) {
    console.log('⚠️  No agents found. Register some agents first:');
    console.log('   node backend/scripts/seed-all-agents.js\n');
    process.exit(1);
  }
  
  console.log(`📋 Found ${agents.length} agent(s)\n`);
  
  // Filter to agents with ERC-8004 IDs
  const agentsWithERC8004 = agents.filter(agent => {
    const address = agent.address || agent.registeredAddress;
    if (!address) return false;
    
    // Try to get ERC-8004 ID from the agent data
    return agent.erc8004AgentId || agent.erc8004_agentId;
  });
  
  if (agentsWithERC8004.length === 0) {
    console.log('⚠️  No agents with ERC-8004 IDs found.');
    console.log('   Make sure agents are registered with ERC-8004 first.\n');
    console.log('   Using first agent anyway (will attempt to register if needed)...\n');
  }
  
  // Check if Bob account is available
  if (!bobAccount) {
    console.error('❌ Bob account not found!');
    console.error('   Please set up .env.bob file with BOB_PRIVATE_KEY or EVM_PRIVATE_KEY');
    console.error('   Or set BOB_PRIVATE_KEY in main .env file\n');
    process.exit(1);
  }
  
  console.log('👤 Using Bob as the client (feedback giver):');
  console.log(`   Bob Address: ${bobAccount.address}`);
  if (bobAccount.accountId) {
    console.log(`   Bob Account ID: ${bobAccount.accountId}`);
  }
  console.log('');
  
  // Find an agent that is NOT Bob to give feedback to
  // (ERC-8004 doesn't allow self-feedback)
  let testAgent = null;
  let agentAddress = null;
  let agentId = null;
  
  // Try to find an agent that is not Bob
  for (const agent of agents) {
    const addr = agent.address || agent.registeredAddress || agent.agentWalletAddress;
    if (addr && addr.toLowerCase() !== bobAccount.address.toLowerCase()) {
      testAgent = agent;
      agentAddress = addr;
      agentId = agent.erc8004AgentId || agent.erc8004_agentId;
      break;
    }
  }
  
  // If all agents are Bob (or no different agent found), try agents with ERC-8004
  if (!testAgent && agentsWithERC8004.length > 0) {
    for (const agent of agentsWithERC8004) {
      const addr = agent.address || agent.registeredAddress || agent.agentWalletAddress;
      if (addr && addr.toLowerCase() !== bobAccount.address.toLowerCase()) {
        testAgent = agent;
        agentAddress = addr;
        agentId = agent.erc8004AgentId || agent.erc8004_agentId;
        break;
      }
    }
  }
  
  // If still not found, use first agent (but warn if it's Bob)
  if (!testAgent && agents.length > 0) {
    testAgent = agents[0];
    agentAddress = testAgent.address || testAgent.registeredAddress;
    agentId = testAgent.erc8004AgentId || testAgent.erc8004_agentId;
    
    if (agentAddress && agentAddress.toLowerCase() === bobAccount.address.toLowerCase()) {
      console.error('⚠️  Warning: All agents appear to be Bob or share the same address!');
      console.error('   Cannot test feedback - ERC-8004 does not allow self-feedback.\n');
      console.error('   Solution: Register another agent with a different address.\n');
      process.exit(1);
    }
  }
  
  if (!testAgent || !agentAddress) {
    console.error('❌ No valid agent found to give feedback to');
    process.exit(1);
  }
  
  // Try to get ERC-8004 ID from backend if not in agent data
  if (!agentId) {
    try {
      const agentService = require('../services/agent-service');
      const AgentServiceClass = agentService.constructor;
      const mappedId = AgentServiceClass.getERC8004AgentId(agentAddress);
      agentId = mappedId ? parseInt(mappedId) : null;
    } catch (e) {
      // Ignore
    }
  }
  
  console.log(`🎯 Target agent (receiving feedback): ${testAgent.name || testAgent.agentId}`);
  console.log(`   Address: ${agentAddress}`);
  if (agentId) {
    console.log(`   ERC-8004 ID: ${agentId}`);
  } else {
    console.log(`   ⚠️  No ERC-8004 ID found - will use address instead`);
    console.log(`   💡 Agent may need to be registered with ERC-8004 first`);
  }
  console.log('');
  
  // Get initial trust score
  console.log('📊 Step 1: Checking initial trust score...\n');
  const initialTrust = await getTrustScore(agentAddress);
  
  if (initialTrust) {
    console.log('   Initial Trust Score:');
    console.log(`     Final: ${initialTrust.final}/100`);
    console.log(`     ERC-8004: ${initialTrust.official}/100`);
    console.log(`     ERC-8004 Reviews: ${initialTrust.officialFeedbackCount}`);
    console.log('');
  }
  
  // Get initial reputation
  const initialReputation = await getAgentReputation(agentAddress);
  console.log(`   Initial Feedback Count: ${initialReputation.length}\n`);
  
  // Submit sample feedback
  console.log('📝 Step 2: Submitting sample feedback...\n');
  
  let successCount = 0;
  let failCount = 0;
  const submittedFeedback = [];
  
  for (let i = 0; i < SAMPLE_FEEDBACK.length; i++) {
    const feedback = SAMPLE_FEEDBACK[i];
    // Use Bob's address as the client (feedback giver)
    const clientAddress = bobAccount.address;
    
    try {
      console.log(`   Submitting feedback ${i + 1}/${SAMPLE_FEEDBACK.length}...`);
      console.log(`     Rating: ${feedback.rating}/5 stars`);
      console.log(`     From: ${clientAddress} (Bob)`);
      console.log(`     To: ${testAgent.name || testAgent.agentId} (${agentAddress})`);
      console.log(`     Tags: ${feedback.tag1 || 'none'}${feedback.tag2 ? ', ' + feedback.tag2 : ''}`);
      
      // Verify we're not giving self-feedback
      if (agentAddress && agentAddress.toLowerCase() === clientAddress.toLowerCase()) {
        console.error(`     ❌ Error: Cannot give self-feedback!`);
        console.error(`        Client: ${clientAddress}`);
        console.error(`        Agent: ${agentAddress}`);
        failCount++;
        continue;
      }
      
      const result = await submitFeedback(
        clientAddress,
        agentId || agentAddress, // Use ERC-8004 ID if available, otherwise address
        feedback.rating,
        feedback.comment,
        feedback.tag1,
        feedback.tag2
      );
      
      console.log(`     ✅ Success! TxHash: ${result.txHash?.substring(0, 20)}...`);
      successCount++;
      submittedFeedback.push(result);
      
      // Small delay between submissions (ERC-8004 may have rate limits)
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('');
      
    } catch (error) {
      const errorMsg = error.message || error.toString();
      if (errorMsg.includes('Self-feedback')) {
        console.error(`     ❌ Failed: Self-feedback not allowed (ERC-8004 restriction)`);
        console.error(`        Client and Agent addresses match - this is not allowed`);
      } else {
        console.error(`     ❌ Failed: ${errorMsg}`);
      }
      failCount++;
      console.log('');
    }
  }
  
  console.log(`\n📊 Feedback Submission Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}\n`);
  
  if (successCount === 0) {
    console.log('⚠️  No feedback was submitted successfully.');
    console.log('   Check backend logs for errors.\n');
    return;
  }
  
  // Wait a moment for blockchain to update
  console.log('⏳ Waiting 3 seconds for blockchain to update...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get updated trust score
  console.log('📊 Step 3: Checking updated trust score...\n');
  
  let updatedTrust = null;
  let attempts = 0;
  const maxAttempts = 5;
  
  // Retry a few times as blockchain might need a moment to update
  while (attempts < maxAttempts && !updatedTrust) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    updatedTrust = await getTrustScore(agentAddress);
    attempts++;
    
    if (!updatedTrust) {
      console.log(`   ⏳ Attempt ${attempts}/${maxAttempts}... waiting for blockchain update...`);
    }
  }
  
  if (updatedTrust) {
    console.log('   Updated Trust Score:');
    console.log(`     Final: ${updatedTrust.final}/100`);
    console.log(`     ERC-8004: ${updatedTrust.official}/100`);
    console.log(`     ERC-8004 Reviews: ${updatedTrust.officialFeedbackCount}`);
    console.log('');
    
    if (initialTrust) {
      const scoreChange = updatedTrust.final - initialTrust.final;
      const reviewChange = updatedTrust.officialFeedbackCount - initialTrust.officialFeedbackCount;
      
      console.log('   📈 Changes:');
      console.log(`     Score Change: ${scoreChange >= 0 ? '+' : ''}${scoreChange} points`);
      console.log(`     Review Count Change: ${reviewChange >= 0 ? '+' : ''}${reviewChange} reviews`);
      console.log('');
      
      if (updatedTrust.breakdown && updatedTrust.breakdown.erc8004) {
        console.log('   🔍 ERC-8004 Breakdown:');
        console.log(`     Average Score: ${updatedTrust.breakdown.erc8004.score}/100`);
        console.log(`     Total Reviews: ${updatedTrust.breakdown.erc8004.count}`);
        console.log(`     Weight: ${(updatedTrust.breakdown.erc8004.weight * 100).toFixed(0)}%`);
        console.log('');
      }
    }
  } else {
    console.log('   ⚠️  Could not fetch updated trust score (may need more time for blockchain to update)');
    console.log('');
  }
  
  // Get updated reputation
  const updatedReputation = await getAgentReputation(agentAddress);
  console.log(`   Updated Feedback Count: ${updatedReputation.length}`);
  
  if (updatedReputation.length > initialReputation.length) {
    console.log(`   ✅ ${updatedReputation.length - initialReputation.length} new feedback entries added!`);
  }
  console.log('');
  
  // Show sample feedback entries
  if (updatedReputation.length > 0) {
    console.log('📋 Sample Feedback Entries:\n');
    updatedReputation.slice(-5).forEach((feedback, index) => {
      console.log(`   ${index + 1}. From: ${feedback.fromAgent}`);
      console.log(`      Score: ${feedback.score}/100 (Rating: ${feedback.rating})`);
      console.log(`      Revoked: ${feedback.isRevoked ? 'Yes' : 'No'}`);
      if (feedback.tag1) {
        console.log(`      Tag1: ${feedback.tag1}`);
      }
      if (feedback.tag2) {
        console.log(`      Tag2: ${feedback.tag2}`);
      }
      console.log('');
    });
  }
  
  console.log('✨ Test complete!');
  console.log('\n💡 Next steps:');
  console.log('   - Check the agent in the marketplace to see updated trust score');
  console.log('   - Submit more feedback to see score continue to change');
  console.log('   - Try filtering by tags: GET /api/reputation/agents/:address/reputation?tag1=quality\n');
}

testFeedbackSubmission().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});


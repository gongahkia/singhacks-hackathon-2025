// scripts/demo-feedback-fast.js
// Fast feedback simulation for demo purposes
// Quickly seeds multiple agents with ERC-8004 feedback to show range of trust scores

require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Generate multiple mock client addresses for faster simulation
// These simulate different users giving feedback
function generateMockClients(count = 10) {
  const clients = [];
  for (let i = 0; i < count; i++) {
    const seed = `demo-client-${i}-${Date.now()}`;
    const hash = ethers.keccak256(ethers.toUtf8Bytes(seed));
    const address = ethers.getAddress('0x' + hash.substring(2, 42));
    clients.push({
      address,
      name: `Client ${i + 1}`
    });
  }
  return clients;
}

// Diverse feedback data to create varied trust scores
const FEEDBACK_TEMPLATES = [
  // High ratings (5 stars) - creates high trust scores
  { rating: 5, comment: 'Excellent service!', tag1: 'quality', tag2: 'reliability', weight: 0.3 },
  { rating: 5, comment: 'Outstanding performance', tag1: 'speed', tag2: 'efficiency', weight: 0.2 },
  { rating: 5, comment: 'Perfect!', tag1: 'quality', tag2: null, weight: 0.1 },
  
  // Good ratings (4 stars) - creates good trust scores
  { rating: 4, comment: 'Good work, met expectations', tag1: 'reliability', tag2: 'quality', weight: 0.2 },
  { rating: 4, comment: 'Solid performance', tag1: 'speed', tag2: null, weight: 0.1 },
  
  // Average ratings (3 stars) - creates medium trust scores
  { rating: 3, comment: 'Average service', tag1: 'quality', tag2: null, weight: 0.05 },
  
  // Low ratings (1-2 stars) - creates lower trust scores
  { rating: 2, comment: 'Needs improvement', tag1: null, tag2: null, weight: 0.03 },
  { rating: 1, comment: 'Poor experience', tag1: null, tag2: null, weight: 0.02 },
];

// Generate weighted feedback list (more high ratings, fewer low ones)
function generateFeedbackPool(size = 20) {
  const pool = [];
  for (let i = 0; i < size; i++) {
    // Random selection weighted by template weights
    const rand = Math.random();
    let cumulative = 0;
    for (const template of FEEDBACK_TEMPLATES) {
      cumulative += template.weight;
      if (rand <= cumulative) {
        pool.push({ ...template });
        break;
      }
    }
    // Fallback to random if weights don't cover
    if (pool.length === i) {
      const randomTemplate = FEEDBACK_TEMPLATES[Math.floor(Math.random() * FEEDBACK_TEMPLATES.length)];
      pool.push({ ...randomTemplate });
    }
  }
  return pool;
}

// Load Bob's account for signing (required by ERC-8004)
function loadBobAccount() {
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
    const bobPrivateKey = env.BOB_PRIVATE_KEY || env.EVM_PRIVATE_KEY || process.env.BOB_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY;
    if (bobPrivateKey) {
      const bobWallet = new ethers.Wallet(bobPrivateKey);
      return {
        address: bobWallet.address,
        privateKey: bobWallet.privateKey
      };
    }
  }
  // Fallback
  const bobPrivateKey = process.env.BOB_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY;
  if (bobPrivateKey) {
    const bobWallet = new ethers.Wallet(bobPrivateKey);
    return { address: bobWallet.address, privateKey: bobWallet.privateKey };
  }
  return null;
}

const bobAccount = loadBobAccount();

async function checkBackend() {
  try {
    await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('❌ Backend is not running or not accessible.');
    console.error(`   Make sure backend is started: cd backend && npm start\n`);
    return false;
  }
}

async function getAllAgents() {
  try {
    const res = await axios.get(`${BASE_URL}/api/agents`, { timeout: 10000 });
    return res.data.agents || res.data || [];
  } catch (error) {
    console.error(`❌ Failed to fetch agents: ${error.message}`);
    return [];
  }
}

async function submitFeedbackBatch(feedbackList, agentAddress, agentId, clientAddress) {
  // Submit multiple feedback entries sequentially (faster but safer)
  // ERC-8004 requires each submission to be on-chain, so we do them one by one
  // but with minimal delays between submissions
  const results = [];
  
  for (let i = 0; i < feedbackList.length; i++) {
    const feedback = feedbackList[i];
    
    try {
      const payload = {
        fromAgent: clientAddress,
        toAgent: agentId || agentAddress,
        rating: feedback.rating,
        comment: feedback.comment,
        tag1: feedback.tag1 || undefined,
        tag2: feedback.tag2 || undefined
      };
      
      const res = await axios.post(
        `${BASE_URL}/api/reputation/feedback`,
        payload,
        { timeout: 30000 }
      );
      
      results.push({ success: true, feedback, result: res.data });
      
      // Minimal delay - just enough to avoid rate limits (100ms)
      if (i < feedbackList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      if (errorMsg.includes('Self-feedback')) {
        results.push({ success: false, feedback, error: 'Self-feedback (skipped)' });
      } else {
        results.push({ success: false, feedback, error: errorMsg });
        // If we hit an error, wait a bit longer before next attempt
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  return results;
}

async function getTrustScore(agentAddress) {
  try {
    const res = await axios.get(
      `${BASE_URL}/api/reputation/agents/${agentAddress}/hybrid-trust`,
      { timeout: 10000 }
    );
    return res.data;
  } catch (error) {
    return null;
  }
}

async function fastFeedbackDemo() {
  console.log('🚀 Fast Feedback Simulation for Demo\n');
  console.log('This script will quickly seed multiple agents with feedback to show');
  console.log('a range of trust scores achieved through ERC-8004.\n');
  
  if (!(await checkBackend())) {
    process.exit(1);
  }
  
  if (!bobAccount) {
    console.error('❌ Bob account not found!');
    console.error('   Please set up .env.bob file with BOB_PRIVATE_KEY\n');
    process.exit(1);
  }
  
  console.log('✅ Backend is running');
  console.log(`✅ Using Bob account: ${bobAccount.address.substring(0, 20)}...\n`);
  
  // Get all agents
  const agents = await getAllAgents();
  
  if (agents.length === 0) {
    console.error('❌ No agents found. Please seed agents first:');
    console.error('   node backend/scripts/seed-all-agents.js\n');
    process.exit(1);
  }
  
  // Filter to agents that are NOT Bob (to avoid self-feedback)
  const targetAgents = agents.filter(agent => {
    const addr = agent.address || agent.registeredAddress || agent.agentWalletAddress;
    return addr && addr.toLowerCase() !== bobAccount.address.toLowerCase();
  });
  
  if (targetAgents.length === 0) {
    console.error('⚠️  All agents appear to be Bob or share the same address!');
    console.error('   Please register agents with different addresses.\n');
    process.exit(1);
  }
  
  console.log(`📋 Found ${targetAgents.length} agent(s) to seed with feedback\n`);
  
  // Get initial trust scores
  console.log('📊 Fetching initial trust scores...\n');
  const initialScores = {};
  for (const agent of targetAgents) {
    const addr = agent.address || agent.registeredAddress;
    const score = await getTrustScore(addr);
    initialScores[addr] = score;
    
    console.log(`   ${agent.name || agent.agentId}: ${score?.final || 0}/100 (${score?.officialFeedbackCount || 0} reviews)`);
  }
  console.log('');
  
  // Create different feedback profiles for different agents
  // This will create a range of trust scores:
  // - Agents 0-2: High ratings (high trust scores)
  // - Agents 3-5: Mixed ratings (medium trust scores)  
  // - Agents 6+: Fewer/lower ratings (lower trust scores)
  
  console.log('📝 Submitting feedback batches (parallel processing)...\n');
  
  const results = [];
  
  for (let i = 0; i < targetAgents.length; i++) {
    const agent = targetAgents[i];
    const agentAddress = agent.address || agent.registeredAddress;
    const agentId = agent.erc8004AgentId || agent.erc8004_agentId;
    
    // Determine feedback profile based on agent index
    let feedbackCount = 10; // Default
    let ratingBias = 'high'; // Default
    
    if (i < 3) {
      // First 3 agents: High ratings (8-15 feedback, mostly 5 stars)
      feedbackCount = 8 + Math.floor(Math.random() * 8);
      ratingBias = 'high';
    } else if (i < 6) {
      // Next 3 agents: Mixed ratings (5-10 feedback, mix of 3-5 stars)
      feedbackCount = 5 + Math.floor(Math.random() * 6);
      ratingBias = 'mixed';
    } else {
      // Remaining agents: Lower ratings (3-7 feedback, mix including lower ratings)
      feedbackCount = 3 + Math.floor(Math.random() * 5);
      ratingBias = 'low';
    }
    
    // Generate feedback pool based on bias
    let feedbackPool = generateFeedbackPool(feedbackCount);
    if (ratingBias === 'high') {
      // Ensure mostly 4-5 star ratings
      feedbackPool = feedbackPool.map(f => {
        if (f.rating < 4 && Math.random() < 0.7) {
          return { ...f, rating: 4 + Math.floor(Math.random() * 2) };
        }
        return f;
      });
    } else if (ratingBias === 'low') {
      // Include some lower ratings
      feedbackPool = feedbackPool.map((f, idx) => {
        if (idx % 3 === 0 && Math.random() < 0.5) {
          return { ...f, rating: 1 + Math.floor(Math.random() * 3) };
        }
        return f;
      });
    }
    
    console.log(`   Agent ${i + 1}/${targetAgents.length}: ${agent.name || agent.agentId}`);
    console.log(`      Profile: ${ratingBias} (${feedbackCount} feedback)`);
    
    // Check if this agent is Bob (skip if self-feedback would occur)
    if (agentAddress && agentAddress.toLowerCase() === bobAccount.address.toLowerCase()) {
      console.log(`      ⚠️  Skipping (agent is Bob - cannot self-feedback)\n`);
      results.push({
        agent: agent.name || agent.agentId,
        address: agentAddress,
        submitted: 0,
        failed: feedbackCount,
        error: 'Self-feedback not allowed'
      });
      continue;
    }
    
    try {
      const feedbackResults = await submitFeedbackBatch(
        feedbackPool, 
        agentAddress, 
        agentId, 
        bobAccount.address
      );
      const successCount = feedbackResults.filter(r => r.success).length;
      const failCount = feedbackResults.filter(r => !r.success && !r.error?.includes('Self-feedback')).length;
      
      console.log(`      ✅ ${successCount} submitted, ❌ ${failCount} failed`);
      if (successCount > 0) {
        const avgRating = feedbackResults
          .filter(r => r.success)
          .reduce((sum, r) => sum + r.feedback.rating, 0) / successCount;
        console.log(`      📊 Average rating: ${avgRating.toFixed(1)}/5\n`);
      } else {
        console.log('');
      }
      
      results.push({
        agent: agent.name || agent.agentId,
        address: agentAddress,
        submitted: successCount,
        failed: failCount
      });
    } catch (error) {
      console.log(`      ❌ Error: ${error.message}\n`);
      results.push({
        agent: agent.name || agent.agentId,
        address: agentAddress,
        submitted: 0,
        failed: feedbackCount,
        error: error.message
      });
    }
    
    // Small delay between agents
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Wait for blockchain to update (reduced for faster demo)
  console.log('⏳ Waiting 3 seconds for blockchain updates...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get updated trust scores
  console.log('📊 Updated Trust Scores:\n');
  console.log('Agent Name                    | Address           | Score | Reviews | Change');
  console.log('─'.repeat(80));
  
  for (const agent of targetAgents) {
    const addr = agent.address || agent.registeredAddress;
    const updatedScore = await getTrustScore(addr);
    const initialScore = initialScores[addr];
    
    const name = (agent.name || agent.agentId).padEnd(25);
    const addressShort = addr.substring(0, 18).padEnd(18);
    const score = (updatedScore?.final || 0).toString().padStart(5);
    const reviews = (updatedScore?.officialFeedbackCount || 0).toString().padStart(7);
    const change = initialScore?.final 
      ? ((updatedScore?.final || 0) - (initialScore.final || 0)).toString().padStart(6)
      : 'N/A'.padStart(6);
    
    console.log(`${name} | ${addressShort} | ${score} | ${reviews} | ${change >= 0 ? '+' : ''}${change}`);
  }
  
  console.log('─'.repeat(80));
  console.log('\n✨ Demo feedback simulation complete!');
  console.log('\n💡 Your agents now have varied trust scores based on ERC-8004 feedback.');
  console.log('   Check the marketplace to see the trust score range!\n');
}

fastFeedbackDemo().catch(error => {
  console.error('\n❌ Demo failed:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});


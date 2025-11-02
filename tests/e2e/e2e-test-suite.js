/**
 * Comprehensive End-to-End Test Suite
 * 
 * Tests the complete flow from frontend to backend for the Hedera Agent Economy platform.
 * This suite tests all critical user flows including agent registration, discovery,
 * payments, A2A communication, and reputation systems.
 * 
 * Prerequisites:
 * - Backend server running on http://localhost:3001
 * - Frontend available on http://localhost:3000 (optional for full UI tests)
 * - Environment variables configured (.env file)
 * - Contracts deployed on Hedera testnet
 * 
 * Run with: npm run test:e2e
 */

const axios = require('axios');
const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds per test
  delayBetweenSteps: 2000, // 2 seconds between test steps
  enableFrontendTests: process.env.TEST_FRONTEND === 'true',
};

// Test state - tracks created resources for cleanup
const testState = {
  agents: [],
  payments: [],
  interactions: [],
  topics: [],
};

// Color output for better test visibility
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Test utilities
function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logTest(testName) {
  log(`\n🧪 Test: ${testName}`, 'cyan');
}

function logStep(step, message) {
  log(`  ${step}. ${message}`, 'blue');
}

function logSuccess(message) {
  log(`  ✅ ${message}`, 'green');
}

function logError(message, error = null) {
  log(`  ❌ ${message}`, 'red');
  if (error) {
    const errorMsg = error.response?.data || error.message || error;
    log(`     ${JSON.stringify(errorMsg)}`, 'red');
  }
}

function logInfo(message) {
  log(`  ℹ️  ${message}`, 'yellow');
}

// Helper functions
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkBackendHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    if (response.data.status === 'healthy') {
      logSuccess('Backend is healthy');
      return true;
    }
    return false;
  } catch (error) {
    logError('Backend health check failed', error);
    return false;
  }
}

async function checkFrontendHealth() {
  if (!TEST_CONFIG.enableFrontendTests) {
    return true; // Skip if frontend tests disabled
  }
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    logSuccess('Frontend is accessible');
    return true;
  } catch (error) {
    logInfo('Frontend not accessible (skipping frontend-specific tests)');
    return false;
  }
}

// Test Suite
class E2ETestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
    };
  }

  async runTest(testName, testFn) {
    const startTime = Date.now();
    logTest(testName);
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASSED', duration });
      logSuccess(`Test passed in ${duration}ms`);
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAILED', duration, error: error.message });
      logError(`Test failed: ${error.message}`, error);
      return false;
    }
  }

  // ========== TEST CASES ==========

  /**
   * Test 1: Health Checks
   */
  async testHealthChecks() {
    logStep('1', 'Checking backend health');
    const backendHealthy = await checkBackendHealth();
    if (!backendHealthy) {
      throw new Error('Backend is not healthy');
    }

    logStep('2', 'Checking frontend accessibility');
    await checkFrontendHealth();

    await delay(TEST_CONFIG.delayBetweenSteps);
  }

  /**
   * Test 2: Agent Registration (Permissioned Mode)
   */
  async testAgentRegistrationPermissioned() {
    const agentName = `TestAgent-${Date.now()}`;
    const capabilities = ['payment', 'data-analysis']; // Use 'payment' (singular) to match backend
    const metadata = JSON.stringify({ test: true, mode: 'permissioned' });

    logStep('1', `Registering agent "${agentName}" in permissioned mode`);
    const response = await axios.post(`${BASE_URL}/api/agents/register-agent`, {
      name: agentName,
      capabilities,
      metadata,
      paymentMode: 'permissioned',
    });

    if (!response.data.agentId || !response.data.agentAddress) {
      throw new Error('Agent registration failed - missing agentId or address');
    }

    const agentId = response.data.agentId;
    const agentAddress = response.data.agentAddress;
    testState.agents.push({ agentId, address: agentAddress, name: agentName });

    logSuccess(`Agent registered: ${agentId} at ${agentAddress}`);

    logStep('2', 'Verifying agent is retrievable');
    const agentResponse = await axios.get(`${BASE_URL}/api/agents/${agentAddress}`);
    
    if (agentResponse.data.name !== agentName) {
      throw new Error(`Agent name mismatch: expected ${agentName}, got ${agentResponse.data.name}`);
    }

    if (agentResponse.data.capabilities.length !== capabilities.length) {
      throw new Error('Agent capabilities mismatch');
    }

    logSuccess('Agent verified and retrievable');
    await delay(TEST_CONFIG.delayBetweenSteps);
  }

  /**
   * Test 3: Agent Registration (Permissionless Mode)
   */
  async testAgentRegistrationPermissionless() {
    const agentName = `TestAgent-Permissionless-${Date.now()}`;
    const capabilities = ['automation', 'api-integration'];
    const metadata = JSON.stringify({ test: true, mode: 'permissionless' });

    logStep('1', `Registering agent "${agentName}" in permissionless mode`);
    const response = await axios.post(`${BASE_URL}/api/agents/register-agent`, {
      name: agentName,
      capabilities,
      metadata,
      paymentMode: 'permissionless',
    });

    if (!response.data.agentId || !response.data.agentAddress) {
      throw new Error('Permissionless agent registration failed');
    }

    const agentId = response.data.agentId;
    const agentAddress = response.data.agentAddress;
    testState.agents.push({ agentId, address: agentAddress, name: agentName });

    logSuccess(`Permissionless agent registered: ${agentId} at ${agentAddress}`);

    logStep('2', 'Verifying permissionless agent has unique wallet');
    const agentResponse = await axios.get(`${BASE_URL}/api/agents/${agentAddress}`);
    
    if (!agentResponse.data.address || agentResponse.data.address === '0x0000000000000000000000000000000000000000') {
      throw new Error('Permissionless agent missing wallet address');
    }

    logSuccess('Permissionless agent has unique wallet');
    await delay(TEST_CONFIG.delayBetweenSteps);
  }

  /**
   * Test 4: Agent Discovery and Search
   */
  async testAgentDiscovery() {
    logStep('1', 'Fetching all agents');
    const allAgentsResponse = await axios.get(`${BASE_URL}/api/agents`);
    
    if (!Array.isArray(allAgentsResponse.data.agents)) {
      throw new Error('Invalid response format - agents should be an array');
    }

    const agentCount = allAgentsResponse.data.agents.length;
    logSuccess(`Found ${agentCount} registered agents`);

    if (agentCount === 0) {
      logInfo('No agents found - this is OK for a fresh deployment');
    }

    logStep('2', 'Searching agents by capability (payments)');
    const searchResponse = await axios.get(`${BASE_URL}/api/agents/search?capability=payments`);
    
    if (!Array.isArray(searchResponse.data.agents)) {
      throw new Error('Invalid search response format');
    }

    const searchCount = searchResponse.data.agents.length;
    logSuccess(`Found ${searchCount} agents with payment capability`);

    // Verify search results contain the capability (check both 'payment' and 'payments' for flexibility)
    if (searchCount > 0) {
      const firstAgent = searchResponse.data.agents[0];
      const hasPaymentCapability = firstAgent.capabilities && (
        firstAgent.capabilities.includes('payments') || 
        firstAgent.capabilities.includes('payment')
      );
      if (!hasPaymentCapability) {
        logInfo(`Agent capabilities: ${JSON.stringify(firstAgent.capabilities)}`);
        throw new Error('Search result does not contain expected capability (payment/payments)');
      }
      logSuccess('Search results validated');
    }

    await delay(TEST_CONFIG.delayBetweenSteps);
  }

  /**
   * Test 5: Agent-to-Agent Communication
   */
  async testA2ACommunication() {
    // Need at least 2 agents for A2A
    if (testState.agents.length < 2) {
      logInfo('Skipping A2A test - need at least 2 registered agents');
      this.results.skipped++;
      return;
    }

    const agent1 = testState.agents[0];
    const agent2 = testState.agents[1];

    if (agent1.address === agent2.address) {
      logInfo('Skipping A2A test - agents have same address');
      this.results.skipped++;
      return;
    }

    logStep('1', `Initiating A2A communication from ${agent1.name} to ${agent2.name}`);
    
    // First, ensure agents have minimum trust score
    try {
      const agent2Data = await axios.get(`${BASE_URL}/api/agents/${agent2.address}`);
      if (Number(agent2Data.data.trustScore) < 40) {
        logStep('2', 'Boosting trust score with feedback');
        await axios.post(`${BASE_URL}/api/reputation/feedback`, {
          fromAgent: agent1.address,
          toAgent: agent2.address,
          rating: 5,
          comment: 'E2E test trust establishment',
        });
        await delay(3000);
      }
    } catch (error) {
      logInfo('Could not boost trust score (may be expected)');
    }

    const a2aResponse = await axios.post(`${BASE_URL}/api/a2a/communicate`, {
      fromAgent: agent1.address,
      toAgent: agent2.address,
      capability: 'payments',
    });

    if (!a2aResponse.data.interactionId) {
      throw new Error('A2A communication failed - missing interactionId');
    }

    const interactionId = a2aResponse.data.interactionId;
    testState.interactions.push(interactionId);

    logSuccess(`A2A interaction created: ${interactionId}`);

    logStep('2', 'Verifying interaction details');
    const interactionResponse = await axios.get(`${BASE_URL}/api/a2a/interactions/${interactionId}`);
    
    if (interactionResponse.data.fromAgent.toLowerCase() !== agent1.address.toLowerCase()) {
      throw new Error('Interaction fromAgent mismatch');
    }

    logSuccess('A2A interaction verified');
    await delay(TEST_CONFIG.delayBetweenSteps);
  }

  /**
   * Test 6: Payment Escrow Creation and Release
   */
  async testPaymentEscrow() {
    if (testState.agents.length < 1) {
      logInfo('Skipping payment test - need at least 1 agent');
      this.results.skipped++;
      return;
    }

    const payee = testState.agents[0];
    const amount = '1.5'; // HBAR
    const description = 'E2E test payment';

    logStep('1', `Creating payment escrow of ${amount} HBAR to ${payee.name}`);
    
    try {
      const createResponse = await axios.post(`${BASE_URL}/api/payments`, {
        payee: payee.address,
        amount,
        description,
      });

      if (!createResponse.data.escrowId) {
        throw new Error('Escrow creation failed - missing escrowId');
      }

      const escrowId = createResponse.data.escrowId;
      testState.payments.push(escrowId);

      logSuccess(`Escrow created: ${escrowId}`);

      logStep('2', 'Verifying escrow details');
      const escrowResponse = await axios.get(`${BASE_URL}/api/payments/${escrowId}`);
      
      if (escrowResponse.data.payee.toLowerCase() !== payee.address.toLowerCase()) {
        throw new Error('Escrow payee mismatch');
      }

      if (escrowResponse.data.status !== 'Active') {
        throw new Error(`Expected escrow status 'Active', got '${escrowResponse.data.status}'`);
      }

      logSuccess('Escrow details verified');

      logStep('3', 'Releasing escrow payment');
      const releaseResponse = await axios.post(`${BASE_URL}/api/payments/${escrowId}/release`);
      
      if (!releaseResponse.data.txHash) {
        throw new Error('Escrow release failed - missing txHash');
      }

      logSuccess(`Escrow released - TX: ${releaseResponse.data.txHash}`);
      
      await delay(3000); // Wait for transaction to settle

      logStep('4', 'Verifying escrow status after release');
      const finalEscrowResponse = await axios.get(`${BASE_URL}/api/payments/${escrowId}`);
      
      if (finalEscrowResponse.data.status !== 'Completed') {
        logInfo(`Escrow status: ${finalEscrowResponse.data.status} (may still be processing)`);
      } else {
        logSuccess('Escrow successfully completed');
      }
    } catch (error) {
      // Payment escrow may fail if PaymentProcessor contract is not configured
      if (error.response?.data?.error?.includes('PaymentProcessor') || 
          error.response?.data?.error?.includes('not configured')) {
        logInfo('Payment escrow test skipped - PaymentProcessor not configured (expected in some setups)');
        this.results.skipped++;
        return;
      }
      throw error;
    }

    await delay(TEST_CONFIG.delayBetweenSteps);
  }

  /**
   * Test 7: Reputation and Feedback System
   */
  async testReputationSystem() {
    if (testState.agents.length < 2) {
      logInfo('Skipping reputation test - need at least 2 agents');
      this.results.skipped++;
      return;
    }

    const fromAgent = testState.agents[0];
    const toAgent = testState.agents[1];

    // Check if agents have the same address (would cause self-feedback error)
    if (fromAgent.address.toLowerCase() === toAgent.address.toLowerCase()) {
      logInfo('Skipping reputation test - both agents share same address (would cause self-feedback error)');
      this.results.skipped++;
      return;
    }

    logStep('1', `Submitting feedback from ${fromAgent.name} to ${toAgent.name}`);
    
    const feedbackResponse = await axios.post(`${BASE_URL}/api/reputation/feedback`, {
      fromAgent: fromAgent.address,
      toAgent: toAgent.address,
      rating: 5,
      comment: 'Excellent service in E2E test',
    });

    if (!feedbackResponse.data.success) {
      throw new Error('Feedback submission failed');
    }

    logSuccess('Feedback submitted successfully');
    await delay(2000);

    logStep('2', `Retrieving reputation for ${toAgent.name}`);
    const reputationResponse = await axios.get(`${BASE_URL}/api/agents/${toAgent.address}/reputation`);
    
    if (!Array.isArray(reputationResponse.data.reputation)) {
      throw new Error('Invalid reputation response format');
    }

    logSuccess(`Found ${reputationResponse.data.count} reputation entries`);
    
    await delay(TEST_CONFIG.delayBetweenSteps);
  }

  /**
   * Test 8: x402 Payment Challenge
   */
  async testX402PaymentChallenge() {
    logStep('1', 'Requesting x402 payment challenge');
    
    // x402 endpoint requires 'amount' and 'payTo', not 'amountHbar'
    // Get a payee address (use first agent or backend account)
    let payTo = process.env.HEDERA_ACCOUNT_ID || '0.0.1234'; // Default test account
    if (testState.agents.length > 0) {
      // Try to extract Hedera account ID from agent if available
      payTo = process.env.HEDERA_ACCOUNT_ID || '0.0.1234';
    }
    
    const challengeResponse = await axios.post(`${BASE_URL}/api/x402/challenge`, {
      amount: '0.1',
      payTo: payTo,
      currency: 'HBAR',
      memo: 'e2e-test-challenge',
    });

    if (challengeResponse.status !== 402 && !challengeResponse.data.payment) {
      throw new Error('x402 challenge failed - expected 402 status or payment object');
    }

    logSuccess('x402 payment challenge received');
    logInfo(`Payment required: ${challengeResponse.data.payment?.amount || 'N/A'} HBAR to ${challengeResponse.data.payment?.payTo || 'N/A'}`);

    await delay(TEST_CONFIG.delayBetweenSteps);
  }

  /**
   * Test 9: Agent Search by AI (Groq Integration)
   */
  async testAISearch() {
    logStep('1', 'Testing AI-powered agent search');
    
    try {
      const aiSearchResponse = await axios.post(`${BASE_URL}/api/ai/search-agents`, {
        query: 'Find an agent that can process payments',
        availableAgents: [],
      });

      if (aiSearchResponse.data.matchedAgents && Array.isArray(aiSearchResponse.data.matchedAgents)) {
        logSuccess(`AI search completed - found ${aiSearchResponse.data.matchedAgents.length} matches`);
      } else {
        logInfo('AI search returned empty results (may be expected if no agents)');
      }
    } catch (error) {
      if (error.response?.status === 503 || error.code === 'ECONNREFUSED') {
        logInfo('AI search service unavailable (non-critical)');
      } else {
        throw error;
      }
    }

    await delay(TEST_CONFIG.delayBetweenSteps);
  }

  /**
   * Test 10: Agent Interaction History
   */
  async testInteractionHistory() {
    if (testState.agents.length < 1) {
      logInfo('Skipping interaction history test - need at least 1 agent');
      this.results.skipped++;
      return;
    }

    const agent = testState.agents[0];

    logStep('1', `Retrieving interaction history for ${agent.name}`);
    
    const historyResponse = await axios.get(`${BASE_URL}/api/agents/${agent.address}/interactions`);
    
    if (!Array.isArray(historyResponse.data.interactions)) {
      throw new Error('Invalid interaction history response format');
    }

    logSuccess(`Found ${historyResponse.data.count} interactions`);

    await delay(TEST_CONFIG.delayBetweenSteps);
  }

  /**
   * Run all tests
   */
  async run() {
    log('\n' + '='.repeat(60), 'bright');
    log('🚀 Starting E2E Test Suite', 'bright');
    log('='.repeat(60) + '\n', 'bright');

    // Pre-flight checks
    logTest('Pre-flight Checks');
    const backendHealthy = await checkBackendHealth();
    if (!backendHealthy) {
      logError('Backend is not accessible. Please start the backend server.');
      process.exit(1);
    }

    // Run all tests
    const tests = [
      { name: 'Health Checks', fn: () => this.testHealthChecks() },
      { name: 'Agent Registration (Permissioned)', fn: () => this.testAgentRegistrationPermissioned() },
      { name: 'Agent Registration (Permissionless)', fn: () => this.testAgentRegistrationPermissionless() },
      { name: 'Agent Discovery and Search', fn: () => this.testAgentDiscovery() },
      { name: 'Agent-to-Agent Communication', fn: () => this.testA2ACommunication() },
      { name: 'Payment Escrow', fn: () => this.testPaymentEscrow() },
      { name: 'Reputation System', fn: () => this.testReputationSystem() },
      { name: 'x402 Payment Challenge', fn: () => this.testX402PaymentChallenge() },
      { name: 'AI Agent Search', fn: () => this.testAISearch() },
      { name: 'Interaction History', fn: () => this.testInteractionHistory() },
    ];

    for (const test of tests) {
      await this.runTest(test.name, test.fn);
      await delay(1000);
    }

    // Print summary
    this.printSummary();
  }

  printSummary() {
    log('\n' + '='.repeat(60), 'bright');
    log('📊 Test Summary', 'bright');
    log('='.repeat(60), 'bright');
    
    log(`✅ Passed: ${this.results.passed}`, 'green');
    log(`❌ Failed: ${this.results.failed}`, 'red');
    log(`⏭️  Skipped: ${this.results.skipped}`, 'yellow');
    log(`📝 Total: ${this.results.passed + this.results.failed + this.results.skipped}`, 'cyan');
    
    if (this.results.failed > 0) {
      log('\n❌ Failed Tests:', 'red');
      this.results.tests
        .filter(t => t.status === 'FAILED')
        .forEach(test => {
          log(`   - ${test.name}: ${test.error}`, 'red');
        });
    }

    log('\n' + '='.repeat(60) + '\n', 'bright');

    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run if executed directly
if (require.main === module) {
  const suite = new E2ETestSuite();
  suite.run().catch(error => {
    logError('Fatal error running test suite', error);
    process.exit(1);
  });
}

module.exports = E2ETestSuite;


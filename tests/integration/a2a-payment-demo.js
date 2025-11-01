/**
 * Agent-to-Agent Payment and Communication Demo
 * 
 * This script demonstrates the complete flow of:
 * 1. Agent registration (ERC-8004)
 * 2. Agent discovery and trust establishment
 * 3. Agent-to-agent communication initiation
 * 4. Payment escrow creation and release
 * 5. Trust establishment from successful payments
 * 6. Using Hedera MCP tools for direct blockchain operations
 * 
 * Prerequisites:
 * - Backend server running on http://localhost:3001
 * - Contracts deployed (deployment.json exists)
 * - Environment variables configured (.env)
 * - Hedera testnet accounts with HBAR balance
 */

const axios = require('axios');
const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(step, message, data = null) {
  const emoji = {
    '1': '🤖',
    '2': '🔍',
    '3': '💬',
    '4': '💰',
    '5': '✅',
    '6': '🔗',
    '7': '📊'
  }[step] || '▶';
  
  console.log(`${COLORS.cyan}${emoji} [Step ${step}]${COLORS.reset} ${COLORS.bright}${message}${COLORS.reset}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logSuccess(message) {
  console.log(`${COLORS.green}✓${COLORS.reset} ${message}`);
}

function logError(message, error) {
  console.error(`${COLORS.bright}✗${COLORS.reset} ${message}`);
  if (error) {
    console.error(error.response?.data || error.message || error);
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class A2APaymentDemo {
  constructor() {
    this.agent1 = null;
    this.agent2 = null;
    this.interactionId = null;
    this.escrowId = null;
    this.paymentTxHash = null;
  }

  /**
   * Step 1: Register two agents (or get existing ones)
   */
  async registerAgents() {
    log('1', 'Setting up Agent 1 (Alice)');
    try {
      // Try to get existing agents first
      const allAgents = await axios.get(`${BASE_URL}/api/agents`);
      const existingAgents = allAgents.data.agents || [];
      
      // Find Alice if she exists
      let alice = existingAgents.find(a => a.name === 'Alice');
      if (alice) {
        this.agent1 = alice.address;
        logSuccess(`Agent 1 (Alice) already registered: ${this.agent1}`);
      } else {
        log('1', 'Registering new Agent 1 (Alice)');
        const response = await axios.post(`${BASE_URL}/api/agents`, {
          name: 'Alice',
          capabilities: ['smart-contracts', 'payments', 'data-analysis'],
          metadata: JSON.stringify({
            specialization: 'Smart contract development',
            hourlyRate: '50 HBAR',
            location: 'Virtual'
          })
        });
        this.agent1 = response.data.agentAddress;
        logSuccess(`Agent 1 registered: ${this.agent1}`);
        await delay(2000); // Wait for transaction confirmation
      }
      
      // Find Bob if he exists
      let bob = existingAgents.find(a => a.name === 'Bob');
      if (bob && bob.address !== this.agent1) {
        this.agent2 = bob.address;
        logSuccess(`Agent 2 (Bob) already registered: ${this.agent2}`);
      } else if (bob && bob.address === this.agent1) {
        // Bob has same address as Alice, need a different agent or different wallet
        log('1', 'Warning: Bob would have same address as Alice. Using alternative approach.');
        // Look for any other agent
        const otherAgent = existingAgents.find(a => a.address !== this.agent1);
        if (otherAgent) {
          this.agent2 = otherAgent.address;
          logSuccess(`Using existing agent: ${otherAgent.name} (${this.agent2})`);
        } else {
          // Can't register Bob with same wallet, explain limitation
          logError('Cannot register second agent: Same wallet address already registered Alice. Please use a different EVM_PRIVATE_KEY or use an existing agent.', null);
          log('1', 'Alternative: Use a different wallet or manually create Agent 2 via API with a different private key.');
          return false;
        }
      } else {
        log('1', 'Registering Agent 2 (Bob)');
        try {
          const response2 = await axios.post(`${BASE_URL}/api/agents`, {
            name: 'Bob',
            capabilities: ['payments', 'api-integration', 'automation'],
            metadata: JSON.stringify({
              specialization: 'Payment processing and API automation',
              hourlyRate: '40 HBAR',
              location: 'Virtual'
            })
          });
          this.agent2 = response2.data.agentAddress;
          logSuccess(`Agent 2 registered: ${this.agent2}`);
          await delay(2000);
        } catch (error) {
          if (error.response?.data?.error?.includes('Already registered')) {
            // Same wallet issue - try to use existing agent
            const otherAgent = existingAgents.find(a => a.address !== this.agent1);
            if (otherAgent) {
              this.agent2 = otherAgent.address;
              logSuccess(`Using existing agent: ${otherAgent.name} (${this.agent2})`);
            } else {
              logError('Cannot register Bob: Same wallet already registered Alice. Using Alice as both agents (limited demo).', null);
              this.agent2 = this.agent1; // Fallback - this will fail later but show the error
              return false;
            }
          } else {
            throw error;
          }
        }
      }
      
      // Check trust scores
      const agent1Data = await axios.get(`${BASE_URL}/api/agents/${this.agent1}`);
      const agent2Data = await axios.get(`${BASE_URL}/api/agents/${this.agent2}`);
      log('1', 'Agent Details:', {
        'Alice': {
          address: this.agent1,
          trustScore: agent1Data.data.trustScore
        },
        'Bob': {
          address: this.agent2,
          trustScore: agent2Data.data.trustScore
        }
      });
      
      if (this.agent1 === this.agent2) {
        logError('Cannot proceed: Both agents have the same address. A2A communication requires different addresses.', null);
        return false;
      }
      
      return true;
    } catch (error) {
      logError('Failed to register agents', error);
      return false;
    }
  }

  /**
   * Step 2: Discover agents and check capabilities
   */
  async discoverAgents() {
    log('2', 'Discovering agents with payment capability');
    try {
      const response = await axios.get(`${BASE_URL}/api/agents/search?capability=payments`);
      logSuccess(`Found ${response.data.count} agents with payment capability`);
      response.data.agents.forEach(agent => {
        console.log(`  - ${agent.name} (${agent.address}) - Trust: ${agent.trustScore}`);
      });
      return true;
    } catch (error) {
      logError('Failed to discover agents', error);
      return false;
    }
  }

  /**
   * Step 3: Initiate Agent-to-Agent Communication
   */
  async initiateA2ACommunication() {
    log('3', 'Initiating A2A communication from Alice to Bob');
    try {
      // Check if agents are the same
      if (this.agent1 === this.agent2) {
        logError('Cannot initiate A2A: Agents have the same address. Please register Bob with a different wallet.', null);
        return false;
      }
      
      // First, ensure Bob has trust score >= 40
      const bobData = await axios.get(`${BASE_URL}/api/agents/${this.agent2}`);
      if (Number(bobData.data.trustScore) < 40) {
        log('3', 'Bob trust score too low, submitting feedback to boost trust');
        try {
          // Submit feedback to increase trust
          await axios.post(`${BASE_URL}/api/reputation/feedback`, {
            fromAgent: this.agent1,
            toAgent: this.agent2,
            rating: 5,
            comment: 'Initial trust establishment',
          });
          await delay(3000);
          // Check again
          const bobDataAfter = await axios.get(`${BASE_URL}/api/agents/${this.agent2}`);
          if (Number(bobDataAfter.data.trustScore) < 40) {
            log('3', `Warning: Trust score still below 40 (${bobDataAfter.data.trustScore}). A2A may fail.`);
          }
        } catch (feedbackError) {
          log('3', 'Could not submit feedback (may be same wallet). Continuing anyway...');
        }
      }

      const response = await axios.post(`${BASE_URL}/api/a2a/communicate`, {
        fromAgent: this.agent1,
        toAgent: this.agent2,
        capability: 'payments'
      });
      
      this.interactionId = response.data.interactionId;
      logSuccess(`A2A communication initiated - Interaction ID: ${this.interactionId}`);
      log('3', 'Interaction Details:', {
        txHash: response.data.txHash,
        fromAgent: response.data.fromAgent,
        toAgent: response.data.toAgent,
        capability: response.data.capability
      });
      
      return true;
    } catch (error) {
      logError('Failed to initiate A2A communication', error);
      // Check if it's because agents are the same
      if (error.response?.data?.error?.includes('yourself') || 
          error.response?.data?.error?.includes('same')) {
        log('3', 'Note: A2A requires different agent addresses. Both agents are using the same wallet.');
      }
      return false;
    }
  }

  /**
   * Step 4: Create Payment Escrow
   */
  async createPaymentEscrow() {
    log('4', 'Creating payment escrow (10 HBAR)');
    try {
      const response = await axios.post(`${BASE_URL}/api/payments`, {
        payee: this.agent2, // Bob receives payment
        amount: '10',
        description: 'Payment for API integration service completed by Bob'
      });
      
      this.escrowId = response.data.escrowId;
      logSuccess(`Escrow created - ID: ${this.escrowId}`);
      log('4', 'Escrow Details:', {
        escrowId: response.data.escrowId,
        txHash: response.data.txHash,
        amount: response.data.amount + ' HBAR'
      });
      
      // Get escrow details
      const escrowDetails = await axios.get(`${BASE_URL}/api/payments/${this.escrowId}`);
      log('4', 'Escrow Status:', escrowDetails.data);
      
      return true;
    } catch (error) {
      logError('Failed to create escrow', error);
      return false;
    }
  }

  /**
   * Step 5: Release Escrow and Establish Trust
   */
  async releaseEscrow() {
    log('5', 'Releasing escrow payment');
    try {
      const response = await axios.post(`${BASE_URL}/api/payments/${this.escrowId}/release`);
      this.paymentTxHash = response.data.txHash;
      logSuccess(`Escrow released - Transaction: ${this.paymentTxHash}`);
      
      // Wait for trust establishment
      await delay(3000);
      
      // Check updated trust scores
      const agent1Data = await axios.get(`${BASE_URL}/api/agents/${this.agent1}`);
      const agent2Data = await axios.get(`${BASE_URL}/api/agents/${this.agent2}`);
      log('5', 'Updated Trust Scores:', {
        'Alice': agent1Data.data.trustScore,
        'Bob': agent2Data.data.trustScore
      });
      
      // Complete the A2A interaction
      log('5', 'Completing A2A interaction');
      await axios.post(`${BASE_URL}/api/a2a/interactions/${this.interactionId}/complete`);
      logSuccess('A2A interaction completed');
      
      return true;
    } catch (error) {
      logError('Failed to release escrow', error);
      return false;
    }
  }

  /**
   * Step 6: Verify on Chain and Check HCS Messages
   */
  async verifyOnChain() {
    log('6', 'Verifying transactions on-chain');
    try {
      // Get interaction details
      const interaction = await axios.get(`${BASE_URL}/api/a2a/interactions/${this.interactionId}`);
      logSuccess('A2A Interaction verified:', interaction.data);
      
      // Get escrow details
      const escrow = await axios.get(`${BASE_URL}/api/payments/${this.escrowId}`);
      logSuccess('Escrow status:', escrow.data.status);
      
      // Get agent interactions
      const aliceInteractions = await axios.get(`${BASE_URL}/api/a2a/agents/${this.agent1}/interactions`);
      const bobInteractions = await axios.get(`${BASE_URL}/api/a2a/agents/${this.agent2}/interactions`);
      
      log('6', 'Interaction History:', {
        'Alice interactions': aliceInteractions.data.count,
        'Bob interactions': bobInteractions.data.count
      });
      
      // Check reputation
      const bobReputation = await axios.get(`${BASE_URL}/api/reputation/agents/${this.agent2}/reputation`);
      log('6', 'Bob\'s Reputation:', {
        feedbackCount: bobReputation.data.count,
        recentFeedback: bobReputation.data.reputation.slice(-2)
      });
      
      console.log(`\n${COLORS.magenta}📊 View on HashScan:${COLORS.reset}`);
      console.log(`   Interaction TX: ${interaction.data.interactionId}`);
      console.log(`   Payment TX: ${this.paymentTxHash}`);
      
      return true;
    } catch (error) {
      logError('Failed to verify on-chain', error);
      return false;
    }
  }

  /**
   * Step 7: Generate Summary Report
   */
  async generateSummary() {
    log('7', 'Generating summary report');
    try {
      const summary = {
        agents: {
          agent1: {
            address: this.agent1,
            name: 'Alice'
          },
          agent2: {
            address: this.agent2,
            name: 'Bob'
          }
        },
        interaction: {
          id: this.interactionId,
          capability: 'payments'
        },
        payment: {
          escrowId: this.escrowId,
          txHash: this.paymentTxHash,
          amount: '10 HBAR'
        },
        timestamp: new Date().toISOString()
      };
      
      console.log(`\n${COLORS.bright}${'='.repeat(60)}${COLORS.reset}`);
      console.log(`${COLORS.bright}✨ A2A Payment Demo Summary ✨${COLORS.reset}`);
      console.log(`${COLORS.bright}${'='.repeat(60)}${COLORS.reset}\n`);
      console.log(JSON.stringify(summary, null, 2));
      
      return true;
    } catch (error) {
      logError('Failed to generate summary', error);
      return false;
    }
  }

  /**
   * Run the complete demo flow
   */
  async run() {
    console.log(`\n${COLORS.bright}${'='.repeat(60)}${COLORS.reset}`);
    console.log(`${COLORS.bright}🚀 Agent-to-Agent Payment & Communication Demo${COLORS.reset}`);
    console.log(`${COLORS.bright}${'='.repeat(60)}${COLORS.reset}\n`);
    
    // Check backend health
    try {
      const health = await axios.get(`${BASE_URL}/api/health`);
      logSuccess(`Backend healthy - Network: ${health.data.network}`);
    } catch (error) {
      logError('Backend not reachable. Make sure the server is running on', error);
      console.log(`   Expected: ${BASE_URL}`);
      return;
    }
    
    const steps = [
      () => this.registerAgents(),
      () => this.discoverAgents(),
      () => this.initiateA2ACommunication(),
      () => this.createPaymentEscrow(),
      () => this.releaseEscrow(),
      () => this.verifyOnChain(),
      () => this.generateSummary()
    ];
    
    for (const step of steps) {
      const success = await step();
      if (!success) {
        console.error(`\n${COLORS.bright}Demo stopped due to error${COLORS.reset}`);
        return;
      }
      await delay(2000); // Pause between steps
    }
    
    console.log(`\n${COLORS.green}${'='.repeat(60)}${COLORS.reset}`);
    console.log(`${COLORS.green}✅ Demo completed successfully!${COLORS.reset}`);
    console.log(`${COLORS.green}${'='.repeat(60)}${COLORS.reset}\n`);
  }
}

// Run if executed directly
if (require.main === module) {
  const demo = new A2APaymentDemo();
  demo.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = A2APaymentDemo;


/**
 * Agent-to-Agent Payment and Communication Demo (Multi-Agent)
 * 
 * This script uses separate .env files for each agent to register
 * them with different wallet addresses, enabling full A2A testing.
 * 
 * Usage:
 *   node tests/integration/a2a-payment-demo-multi.js
 * 
 * Prerequisites:
 *   - .env.alice file with Alice's credentials
 *   - .env.bob file with Bob's credentials
 *   - Backend server running on http://localhost:3001
 *   - Contracts deployed (deployment.json exists)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Try to load ethers from backend/node_modules first, then root
let ethers;
try {
  ethers = require('ethers');
} catch {
  try {
    ethers = require('../../backend/node_modules/ethers');
  } catch {
    throw new Error('ethers not found. Please run: npm install ethers');
  }
}

require('dotenv').config({ path: path.resolve(__dirname, '../../.env.alice') });

// Load deployment info
let deploymentInfo;
try {
  deploymentInfo = require('../../contracts/deployment.json');
} catch {
  deploymentInfo = { contracts: { 
    AgentRegistry: process.env.AGENT_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
    PaymentProcessor: process.env.PAYMENT_PROCESSOR_ADDRESS || '0x0000000000000000000000000000000000000000'
  }};
}

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

/**
 * Register an agent using specific credentials
 */
async function registerAgentWithCredentials(name, capabilities, metadata, envFile) {
  // Load the specific .env file
  const envPath = path.resolve(__dirname, '../../', envFile);
  if (!fs.existsSync(envPath)) {
    throw new Error(`Environment file not found: ${envFile}. Run: npm run setup:agents`);
  }
  
  // Read and parse .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^#=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    }
  });
  
  // Validate required fields
  const evmKey = envVars.EVM_PRIVATE_KEY || envVars.HEDERA_PRIVATE_KEY;
  if (!evmKey || evmKey.includes('ALICE_') || evmKey.includes('BOB_') || evmKey.includes('xxxxx')) {
    throw new Error(`${envFile} has placeholder values. Please fill in actual credentials after creating Hedera accounts.`);
  }
  
  // Setup provider and wallet
  const rpcUrl = envVars.RPC_URL || process.env.RPC_URL || 'https://testnet.hashio.io/api';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Handle different key formats
  let privateKey = evmKey;
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // Load contract ABI
  let AgentRegistryABI;
  try {
    AgentRegistryABI = require('../../contracts/artifacts/src/AgentRegistry.sol/AgentRegistry.json').abi;
  } catch (error) {
    throw new Error('Contract artifacts not found. Run: npm run contracts:compile');
  }
  
  const agentRegistry = new ethers.Contract(
    deploymentInfo.contracts.AgentRegistry,
    AgentRegistryABI,
    wallet
  );
  
  // Register agent
  const tx = await agentRegistry.registerAgent(name, capabilities, metadata);
  const receipt = await tx.wait();
  
  return {
    agentAddress: wallet.address,
    txHash: receipt.hash,
    accountId: envVars.HEDERA_ACCOUNT_ID
  };
}

class MultiAgentDemo {
  constructor() {
    this.agent1 = null;
    this.agent2 = null;
    this.agent1PrivateKey = null; // Alice's private key
    this.agent2PrivateKey = null; // Bob's private key
    this.interactionId = null;
    this.escrowId = null;
    this.paymentTxHash = null;
  }

  /**
   * Load private key from environment file
   */
  loadPrivateKeyFromEnv(envFile) {
    const envPath = path.resolve(__dirname, '../../', envFile);
    if (!fs.existsSync(envPath)) {
      return null;
    }
    const envContent = fs.readFileSync(envPath, 'utf8');
    const evmKeyMatch = envContent.match(/EVM_PRIVATE_KEY=(0x[0-9a-fA-F]+)/);
    if (evmKeyMatch) {
      return evmKeyMatch[1];
    }
    return null;
  }

  /**
   * Step 1: Register two agents with different credentials
   */
  async registerAgents() {
    log('1', 'Registering Agent 1 (Alice) with .env.alice credentials');
    try {
      // Check if Alice already exists
      try {
        const allAgents = await axios.get(`${BASE_URL}/api/agents`);
        const alice = allAgents.data.agents?.find(a => a.name === 'Alice');
        if (alice) {
          this.agent1 = alice.address;
          logSuccess(`Alice already registered: ${this.agent1}`);
        } else {
          // Register using Alice's credentials
          const result = await registerAgentWithCredentials(
            'Alice',
            ['smart-contracts', 'payments', 'data-analysis'],
            JSON.stringify({
              specialization: 'Smart contract development',
              hourlyRate: '50 HBAR',
              location: 'Virtual'
            }),
            '.env.alice'
          );
          this.agent1 = result.agentAddress;
          logSuccess(`Alice registered: ${this.agent1}`);
          await delay(3000);
        }
      } catch (error) {
        if (error.message?.includes('Already registered')) {
          // Get the wallet address from .env.alice
          const envPath = path.resolve(__dirname, '../../.env.alice');
          const envContent = fs.readFileSync(envPath, 'utf8');
          const evmKeyMatch = envContent.match(/EVM_PRIVATE_KEY=(0x[0-9a-fA-F]+)/);
          if (evmKeyMatch) {
            const wallet = new ethers.Wallet(evmKeyMatch[1]);
            this.agent1 = wallet.address;
            logSuccess(`Alice already registered at: ${this.agent1}`);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
      
      log('1', 'Registering Agent 2 (Bob) with .env.bob credentials');
      try {
        // Check if Bob already exists
        const allAgents = await axios.get(`${BASE_URL}/api/agents`);
        const bob = allAgents.data.agents?.find(a => a.name === 'Bob');
        if (bob && bob.address !== this.agent1) {
          this.agent2 = bob.address;
          logSuccess(`Bob already registered: ${this.agent2}`);
        } else {
          // Register using Bob's credentials
          const result = await registerAgentWithCredentials(
            'Bob',
            ['payments', 'api-integration', 'automation'],
            JSON.stringify({
              specialization: 'Payment processing and API automation',
              hourlyRate: '40 HBAR',
              location: 'Virtual'
            }),
            '.env.bob'
          );
          this.agent2 = result.agentAddress;
          logSuccess(`Bob registered: ${this.agent2}`);
          await delay(3000);
        }
      } catch (error) {
        if (error.message?.includes('Already registered')) {
          // Get the wallet address from .env.bob
          const envPath = path.resolve(__dirname, '../../.env.bob');
          const envContent = fs.readFileSync(envPath, 'utf8');
          const evmKeyMatch = envContent.match(/EVM_PRIVATE_KEY=(0x[0-9a-fA-F]+)/);
          if (evmKeyMatch) {
            const wallet = new ethers.Wallet(evmKeyMatch[1]);
            this.agent2 = wallet.address;
            logSuccess(`Bob already registered at: ${this.agent2}`);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
      
      // Verify agents are different
      if (this.agent1 === this.agent2) {
        logError('Both agents have the same address! Please check .env.alice and .env.bob have different EVM_PRIVATE_KEY values.', null);
        return false;
      }
      
      // Load private keys for agent wallets
      this.agent1PrivateKey = this.loadPrivateKeyFromEnv('.env.alice');
      this.agent2PrivateKey = this.loadPrivateKeyFromEnv('.env.bob');
      
      if (!this.agent1PrivateKey || !this.agent2PrivateKey) {
        logError('Could not load private keys from .env files. Ensure EVM_PRIVATE_KEY is set in both .env.alice and .env.bob', null);
        return false;
      }
      
      log('1', 'Loaded agent wallet credentials for payments and A2A');
      
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
   * Step 3: Initiate Agent-to-Agent Communication (using Alice's wallet)
   */
  async initiateA2ACommunication() {
    log('3', 'Initiating A2A communication from Alice to Bob (using Alice\'s wallet)');
    try {
      // Ensure Bob has trust score >= 40
      const bobData = await axios.get(`${BASE_URL}/api/agents/${this.agent2}`);
      if (Number(bobData.data.trustScore) < 40) {
        log('3', 'Bob trust score too low, submitting feedback to boost trust');
        try {
          await axios.post(`${BASE_URL}/api/reputation/feedback`, {
            fromAgent: this.agent1,
            toAgent: this.agent2,
            rating: 5,
            comment: 'Initial trust establishment',
          });
          await delay(3000);
        } catch (feedbackError) {
          log('3', 'Could not submit feedback. Continuing anyway...');
        }
      }

      const response = await axios.post(`${BASE_URL}/api/a2a/communicate`, {
        fromAgent: this.agent1,
        fromAgentPrivateKey: this.agent1PrivateKey, // Use Alice's wallet
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
      return false;
    }
  }

  /**
   * Step 4: Create Payment Escrow (using Alice's wallet)
   */
  async createPaymentEscrow() {
    log('4', 'Creating payment escrow (10 HBAR) using Alice\'s wallet');
    try {
      const response = await axios.post(`${BASE_URL}/api/payments`, {
        payer: this.agent1, // Alice pays (must be registered agent)
        payerPrivateKey: this.agent1PrivateKey, // Alice's private key (DEMO ONLY)
        payee: this.agent2, // Bob receives payment
        amount: '10',
        description: 'Payment for API integration service completed by Bob'
      });
      
      this.escrowId = response.data.escrowId;
      logSuccess(`Escrow created - ID: ${this.escrowId}`);
      log('4', 'Escrow Details:', {
        escrowId: response.data.escrowId,
        txHash: response.data.txHash,
        amount: response.data.amount + ' HBAR',
        payer: response.data.payer || this.agent1
      });
      
      const escrowDetails = await axios.get(`${BASE_URL}/api/payments/${this.escrowId}`);
      log('4', 'Escrow Status:', escrowDetails.data);
      
      // Verify payer is Alice
      if (escrowDetails.data.payer.toLowerCase() !== this.agent1.toLowerCase()) {
        logError(`Payment payer mismatch! Expected ${this.agent1}, got ${escrowDetails.data.payer}`, null);
        return false;
      }
      logSuccess(`✓ Verified: Payment created by Alice (${this.agent1})`);
      
      return true;
    } catch (error) {
      logError('Failed to create escrow', error);
      return false;
    }
  }

  /**
   * Step 5: Release Escrow and Establish Trust (using Alice's wallet)
   * Note: According to x402 standard, only the payer can release escrow
   */
  async releaseEscrow() {
    log('5', 'Releasing escrow payment (using Alice\'s wallet - payer releases to payee)');
    try {
      const response = await axios.post(`${BASE_URL}/api/payments/${this.escrowId}/release`, {
        releaser: this.agent1, // Alice releases (she is the payer) - x402: only payer can release
        releaserPrivateKey: this.agent1PrivateKey // Alice's private key (DEMO ONLY)
      });
      this.paymentTxHash = response.data.txHash;
      logSuccess(`Escrow released by Alice (payer) to Bob (payee) - Transaction: ${this.paymentTxHash}`);
      
      await delay(3000);
      
      const agent1Data = await axios.get(`${BASE_URL}/api/agents/${this.agent1}`);
      const agent2Data = await axios.get(`${BASE_URL}/api/agents/${this.agent2}`);
      log('5', 'Updated Trust Scores:', {
        'Alice': agent1Data.data.trustScore,
        'Bob': agent2Data.data.trustScore
      });
      
      log('5', 'Completing A2A interaction (using Bob\'s wallet)');
      await axios.post(`${BASE_URL}/api/a2a/interactions/${this.interactionId}/complete`, {
        completer: this.agent2, // Bob completes (he is the toAgent)
        completerPrivateKey: this.agent2PrivateKey // Bob's private key (DEMO ONLY)
      });
      logSuccess('A2A interaction completed by Bob');
      
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
      const interaction = await axios.get(`${BASE_URL}/api/a2a/interactions/${this.interactionId}`);
      logSuccess('A2A Interaction verified:', interaction.data);
      
      const escrow = await axios.get(`${BASE_URL}/api/payments/${this.escrowId}`);
      logSuccess('Escrow status:', escrow.data.status);
      
      const aliceInteractions = await axios.get(`${BASE_URL}/api/a2a/agents/${this.agent1}/interactions`);
      const bobInteractions = await axios.get(`${BASE_URL}/api/a2a/agents/${this.agent2}/interactions`);
      
      log('6', 'Interaction History:', {
        'Alice interactions': aliceInteractions.data.count,
        'Bob interactions': bobInteractions.data.count
      });
      
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
            name: 'Alice',
            envFile: '.env.alice'
          },
          agent2: {
            address: this.agent2,
            name: 'Bob',
            envFile: '.env.bob'
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
    console.log(`${COLORS.bright}   (Multi-Agent with Separate Credentials)${COLORS.reset}`);
    console.log(`${COLORS.bright}${'='.repeat(60)}${COLORS.reset}\n`);
    
    // Check for required files
    const aliceEnv = path.resolve(__dirname, '../../.env.alice');
    const bobEnv = path.resolve(__dirname, '../../.env.bob');
    
    if (!fs.existsSync(aliceEnv)) {
      logError(`Missing .env.alice file. Run: node tests/integration/setup-agents.js`, null);
      return;
    }
    if (!fs.existsSync(bobEnv)) {
      logError(`Missing .env.bob file. Run: node tests/integration/setup-agents.js`, null);
      return;
    }
    
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
      await delay(2000);
    }
    
    console.log(`\n${COLORS.green}${'='.repeat(60)}${COLORS.reset}`);
    console.log(`${COLORS.green}✅ Demo completed successfully!${COLORS.reset}`);
    console.log(`${COLORS.green}${'='.repeat(60)}${COLORS.reset}\n`);
  }
}

// Run if executed directly
if (require.main === module) {
  const demo = new MultiAgentDemo();
  demo.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = MultiAgentDemo;


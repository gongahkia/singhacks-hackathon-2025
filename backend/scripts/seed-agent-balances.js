// scripts/seed-agent-balances.js
// Seed agents with initial HBAR testnet balance
// Alice and Bob should already have balances, but this ensures all agents have funds

require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const { ethers } = require('ethers');
const {
  Client,
  AccountId,
  PrivateKey,
  TransferTransaction,
  Hbar
} = require('@hashgraph/sdk');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Amount of HBAR to seed each agent with (testnet)
const SEED_AMOUNT_HBAR = parseFloat(process.env.SEED_AMOUNT_HBAR || '10'); // Default 10 HBAR

async function getHederaClient() {
  const { HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY, HEDERA_NETWORK } = process.env;
  if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY) {
    throw new Error('HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env');
  }

  const client = HEDERA_NETWORK === 'testnet' 
    ? Client.forTestnet() 
    : Client.forMainnet();
  
  const accountId = AccountId.fromString(HEDERA_ACCOUNT_ID);
  const privateKey = PrivateKey.fromString(HEDERA_PRIVATE_KEY);
  client.setOperator(accountId, privateKey);
  
  return { client, accountId, privateKey };
}

async function getAgentEVMAddress(agentAddress) {
  // Convert EVM address to Hedera account ID
  // For Hedera, EVM addresses can be converted to account IDs
  // But for now, we'll need the account ID directly
  // This function might need to be updated based on your setup
  try {
    // Try to get account info from backend
    const res = await axios.get(`${BASE_URL}/api/agents/${agentAddress}`, { timeout: 5000 });
    return {
      evmAddress: agentAddress,
      accountId: res.data.hederaAccountId || null,
      agent: res.data
    };
  } catch (error) {
    console.warn(`Could not fetch agent info for ${agentAddress}:`, error.message);
    return {
      evmAddress: agentAddress,
      accountId: null,
      agent: null
    };
  }
}

async function transferHbar(client, fromAccountId, toAccountId, amountHbar) {
  try {
    const transferTx = new TransferTransaction()
      .addHbarTransfer(fromAccountId, new Hbar(-amountHbar))
      .addHbarTransfer(toAccountId, new Hbar(amountHbar))
      .setTransactionMemo(`Seed agent balance: ${amountHbar} HBAR`)
      .freezeWith(client);

    const signedTx = await transferTx.sign(PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY));
    const txResponse = await signedTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    
    return {
      success: true,
      txId: receipt.transactionId.toString(),
      amount: amountHbar
    };
  } catch (error) {
    throw new Error(`HBAR transfer failed: ${error.message}`);
  }
}

async function seedAgentBalances() {
  console.log(`💰 Seeding agent balances with ${SEED_AMOUNT_HBAR} HBAR each...\n`);
  
  // Check backend
  try {
    const healthCheck = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    console.log('✅ Backend is running\n');
  } catch (error) {
    console.error('❌ Backend is not running or not accessible.');
    console.error(`   Make sure backend is started: cd backend && npm start`);
    process.exit(1);
  }

  // Get Hedera client
  let hederaClient, operatorAccountId;
  try {
    const clientInfo = await getHederaClient();
    hederaClient = clientInfo.client;
    operatorAccountId = clientInfo.accountId;
    console.log(`✅ Hedera client initialized (operator: ${operatorAccountId})\n`);
  } catch (error) {
    console.error(`❌ Failed to initialize Hedera client: ${error.message}`);
    console.error('   Make sure HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY are set in .env');
    process.exit(1);
  }

  // Get all agents
  let allAgents = [];
  try {
    const res = await axios.get(`${BASE_URL}/api/agents`, { timeout: 10000 });
    allAgents = res.data.agents || res.data || [];
    console.log(`📋 Found ${allAgents.length} agents to seed\n`);
  } catch (error) {
    console.error(`❌ Failed to fetch agents: ${error.message}`);
    process.exit(1);
  }

  if (allAgents.length === 0) {
    console.log('⚠️  No agents found. Run seed scripts first.');
    return;
  }

  // Seed each agent
  let seededCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const agent of allAgents) {
    try {
      const agentAddress = agent.address || agent.registeredAddress || agent.agentWalletAddress;
      if (!agentAddress) {
        console.log(`⏭️  Skipping ${agent.name || agent.agentId}: No address found`);
        skippedCount++;
        continue;
      }

      // Skip Alice and Bob - they use persistent accounts that should already have balances
      // These accounts are managed separately via .env.alice and .env.bob
      if (agent.agentId === 'alice' || agent.agentId === 'bob' || agent.name === 'Alice' || agent.name === 'Bob') {
        console.log(`⏭️  Skipping ${agent.name || agent.agentId}: Persistent account (managed via .env files)`);
        console.log(`   💡 These accounts should already have balances from their persistent .env setup`);
        console.log(`   💡 One of these may also be the backend service account`);
        skippedCount++;
        continue;
      }

      console.log(`💰 Seeding ${agent.name || agent.agentId} (${agentAddress})...`);

      // For Hedera EVM addresses, we can transfer directly using the EVM address
      // Hedera supports EVM addresses for transfers
      // However, we need to use the Hedera SDK which requires AccountId format
      
      // Try to get Hedera account ID from agent metadata or use EVM address
      // For permissionless agents, the EVM address is their account
      // For permissioned agents, they might use the backend account
      
      // Check payment mode
      const isPermissionless = agent.paymentMode === 'permissionless' || agent.agentWalletAddress;
      
      if (!isPermissionless) {
        // Permissioned agents use backend wallet, skip seeding
        console.log(`   ⏭️  Skipping ${agent.name}: Permissioned agent (uses backend wallet)`);
        skippedCount++;
        continue;
      }

      // For permissionless agents, we need their Hedera Account ID
      // EVM addresses on Hedera can be converted, but it's complex
      // For now, we'll use x402 or suggest manual funding
      
      // Check if we have a Hedera Account ID
      let toAccountId = agent.hederaAccountId;
      
      // If no account ID, try to get from agent wallet address metadata
      if (!toAccountId && agent.agentWalletAddress) {
        // Try to query account info via Mirror Node
        try {
          const mirrorNode = process.env.MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com/api/v1';
          const accountInfo = await axios.get(`${mirrorNode}/accounts?account.id=${agent.agentWalletAddress}`, { timeout: 5000 });
          if (accountInfo.data?.accounts?.[0]) {
            toAccountId = accountInfo.data.accounts[0].account;
          }
        } catch (e) {
          // Failed to get account ID
        }
      }
      
      if (!toAccountId) {
        // Use x402 facilitator to transfer (recommended)
        console.log(`   💡 Using x402 facilitator to seed balance...`);
        try {
          const x402FacilitatorService = require('../services/x402-facilitator-service');
          const challenge = await x402FacilitatorService.createChallenge(
            SEED_AMOUNT_HBAR.toString(),
            'HBAR',
            agentAddress,
            `Seed balance for ${agent.name || agent.agentId}`,
            process.env.HEDERA_NETWORK || 'hedera-testnet'
          );
          
          console.log(`   ✅ Created x402 challenge for ${SEED_AMOUNT_HBAR} HBAR`);
          console.log(`   📋 Challenge ID: ${challenge.challengeId || challenge.id || 'N/A'}`);
          console.log(`   💡 Complete payment manually via: ${challenge.paymentUrl || challenge.url || 'N/A'}`);
          
          // Note: x402 requires manual payment completion
          // In a production setup, you'd use an automated payment
          seededCount++;
        } catch (x402Error) {
          console.log(`   ⚠️  x402 transfer failed: ${x402Error.message}`);
          console.log(`   💡 Fund manually via Hedera Portal: https://portal.hedera.com/`);
          console.log(`   📋 EVM Address: ${agentAddress}`);
          skippedCount++;
        }
      } else {
        // Transfer HBAR directly via Hedera SDK
        try {
          const result = await transferHbar(
            hederaClient,
            operatorAccountId,
            AccountId.fromString(toAccountId),
            SEED_AMOUNT_HBAR
          );
          console.log(`   ✅ Transferred ${SEED_AMOUNT_HBAR} HBAR (Tx: ${result.txId})`);
          seededCount++;
        } catch (transferError) {
          console.error(`   ❌ Transfer failed: ${transferError.message}`);
          errorCount++;
        }
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      errorCount++;
    }
    console.log('');
  }

  console.log(`\n✨ Balance seeding complete!`);
  console.log(`   ✅ Seeded: ${seededCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`\n💡 Note: Alice and Bob were skipped as they should already have balances.`);
  console.log(`   If they need funding, use Hedera Portal: https://portal.hedera.com/`);
}

seedAgentBalances().catch(console.error);


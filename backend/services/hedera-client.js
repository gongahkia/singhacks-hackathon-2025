// services/hedera-client.js
const {
  Client,
  AccountId,
  PrivateKey,
  TopicId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  Hbar
} = require('@hashgraph/sdk');

class HederaClient {
  constructor() {
    this.client = null;
    this.accountId = null;
    this.privateKey = null;
    // Lazy init to avoid crashing server when env vars are missing at boot
  }

  ensureOperator() {
    if (this.client) return;
    const { HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY, HEDERA_NETWORK } = process.env;
    if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY) {
      throw new Error('Hedera operator not configured. Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in your environment.');
    }
    this.accountId = AccountId.fromString(HEDERA_ACCOUNT_ID);
    this.privateKey = PrivateKey.fromString(HEDERA_PRIVATE_KEY);

    if (HEDERA_NETWORK === 'testnet') {
      this.client = Client.forTestnet();
    } else if (HEDERA_NETWORK === 'mainnet') {
      this.client = Client.forMainnet();
    } else {
      throw new Error('Invalid HEDERA_NETWORK');
    }
    this.client.setOperator(this.accountId, this.privateKey);
  }

  /**
   * Validate topic ID format (not placeholder)
   */
  validateTopicId(topicId, topicName) {
    if (!topicId) {
      throw new Error(`${topicName} topic ID is required. Set ${topicName.toUpperCase()}_TOPIC_ID in environment or create topic via /api/messages/topics`);
    }
    
    // Check for placeholder values
    if (topicId.includes('xxxxx') || topicId.includes('yyyyy') || topicId === '0.0.0') {
      throw new Error(`${topicName} topic ID is a placeholder (${topicId}). Create a real topic via POST /api/messages/topics or set ${topicName.toUpperCase()}_TOPIC_ID to a valid topic ID (e.g., 0.0.12345)`);
    }
    
    // Validate format (0.0.xxxxx)
    try {
      TopicId.fromString(topicId);
    } catch (error) {
      throw new Error(`Invalid ${topicName} topic ID format: ${topicId}. Expected format: 0.0.xxxxx`);
    }
    
    return true;
  }

  /**
   * Ensure topic exists, create if missing
   */
  async ensureTopic(envVarName, topicName, memo) {
    let topicId = process.env[envVarName];
    
    // If no topic ID, create one
    if (!topicId || topicId.includes('xxxxx') || topicId.includes('yyyyy') || topicId === '0.0.0') {
      console.log(`📝 Creating ${topicName} topic (not found in ${envVarName})...`);
      topicId = await this.createTopic(memo || `${topicName} events`);
      console.log(`✅ Created ${topicName} topic: ${topicId}`);
      console.log(`⚠️  Set ${envVarName}=${topicId} in your .env file to persist this topic`);
      
      // Optionally save to config
      try {
        const configService = require('./config-service');
        configService.saveConfig({ [envVarName]: topicId });
      } catch (e) {
        // Config service may not be available
      }
    } else {
      // Validate existing topic ID
      this.validateTopicId(topicId, topicName);
    }
    
    return topicId;
  }

  async createTopic(memo) {
    this.ensureOperator();
    const tx = await new TopicCreateTransaction()
      .setTopicMemo(memo || 'Agent messages')
      .setMaxTransactionFee(new Hbar(2))
      .execute(this.client);
    const receipt = await tx.getReceipt(this.client);
    return receipt.topicId.toString();
  }

  async submitMessage(topicId, message) {
    this.ensureOperator();
    // Validate topic ID before submission (topicId is required)
    if (!topicId) {
      throw new Error('Topic ID is required for message submission');
    }
    this.validateTopicId(topicId, 'HCS');
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(typeof message === 'string' ? message : JSON.stringify(message))
      .execute(this.client);
    const receipt = await tx.getReceipt(this.client);
    return {
      topicId,
      sequenceNumber: receipt.topicSequenceNumber?.toString?.() || '0',
      status: receipt.status.toString()
    };
  }

  async subscribeToTopic(topicId, callback) {
    new TopicMessageQuery()
      .setTopicId(topicId)
      .setStartTime(0)
      .subscribe(this.client, null, (m) => {
        const msg = Buffer.from(m.contents).toString();
        callback({
          consensusTimestamp: m.consensusTimestamp.toString(),
          message: msg,
          sequenceNumber: m.sequenceNumber.toString()
        });
      });
  }

  async queryMirrorNode(endpoint) {
    const axios = require('axios');
    const base = process.env.MIRROR_NODE_URL;
    if (!base) throw new Error('MIRROR_NODE_URL not set');
    const url = `${base}${endpoint}`;
    const { data } = await axios.get(url);
    return data;
  }

  async getTransaction(transactionId) {
    return this.queryMirrorNode(`/transactions/${transactionId}`);
  }

  async getAccountTransactions(accountId, limit = 10) {
    return this.queryMirrorNode(`/accounts/${accountId}/transactions?limit=${limit}`);
  }

  async getTopicMessages(topicId, limit = 25) {
    return this.queryMirrorNode(`/topics/${topicId}/messages?limit=${limit}`);
  }
}

module.exports = new HederaClient();

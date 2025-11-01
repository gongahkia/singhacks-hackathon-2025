// services/hedera-client.js
const {
  Client,
  AccountId,
  PrivateKey,
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

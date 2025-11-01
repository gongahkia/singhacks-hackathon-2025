// routes/timeline.js
const express = require('express');
const router = express.Router();
const hederaClient = require('../services/hedera-client');

// Get timeline for a transaction
router.get('/:transactionId', async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    
    // Fetch HCS messages related to this transaction from all relevant topics
    const paymentTopicId = process.env.PAYMENT_TOPIC_ID;
    const a2aTopicId = process.env.A2A_TOPIC_ID;
    const agentTopicId = process.env.AGENT_TOPIC_ID;
    const mcpTopicId = process.env.MCP_TOPIC_ID;
    
    const allMessages = [];
    const topics = [
      { id: paymentTopicId, name: 'Payment' },
      { id: a2aTopicId, name: 'A2A' },
      { id: agentTopicId, name: 'Agent' },
      { id: mcpTopicId, name: 'MCP' }
    ];
    
    for (const topic of topics) {
      if (!topic.id || topic.id.includes('xxxxx')) continue;
      
      try {
        const response = await hederaClient.getTopicMessages(topic.id, 50);
        if (response.messages) {
          allMessages.push(...response.messages.map(m => ({
            ...m,
            topicName: topic.name,
            topicId: topic.id
          })));
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${topic.name} topic:`, error.message);
      }
    }
    
    // Parse and filter messages for this transaction
    const relevantMessages = [];
    for (const msg of allMessages) {
      try {
        const parsed = typeof msg.message === 'string' ? JSON.parse(Buffer.from(msg.message, 'base64').toString()) : msg.message;
        
        // Check if message relates to this transaction
        if (
          parsed.transactionId === transactionId ||
          parsed.escrowId === transactionId ||
          parsed.interactionId === transactionId ||
          parsed.txHash === transactionId
        ) {
          relevantMessages.push({
            ...parsed,
            consensusTimestamp: msg.consensus_timestamp,
            sequenceNumber: msg.sequence_number,
            topicName: msg.topicName
          });
        }
      } catch (parseError) {
        // Skip unparseable messages
      }
    }
    
    // Sort by timestamp
    relevantMessages.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.consensusTimestamp).getTime();
      const timeB = new Date(b.timestamp || b.consensusTimestamp).getTime();
      return timeA - timeB;
    });
    
    // Convert to timeline steps
    const steps = relevantMessages.map((msg, index) => {
      const isLast = index === relevantMessages.length - 1;
      const isFirst = index === 0;
      
      return {
        id: `step-${index}`,
        title: formatEventTitle(msg.event),
        description: formatEventDescription(msg),
        status: isLast ? 'active' : 'completed',
        timestamp: msg.timestamp,
        txHash: msg.txHash,
        hcsMessage: msg,
        topicName: msg.topicName
      };
    });
    
    res.json({ 
      steps,
      count: steps.length,
      transactionId
    });
  } catch (error) {
    console.error('Timeline fetch error:', error);
    next(error);
  }
});

function formatEventTitle(event) {
  const titles = {
    'AgentRegistered': '🤖 Agent Registered',
    'A2ACommunicationInitiated': '💬 A2A Communication Started',
    'A2ACommunicationCompleted': '✅ A2A Communication Completed',
    'EscrowCreated': '💰 Payment Escrow Created',
    'EscrowReleased': '✅ Payment Completed',
    'TokenEscrowCreated': '💵 USDC Payment Created',
    'TrustEstablishedFromPayment': '🤝 Trust Established',
    'ReputationFeedbackSubmitted': '⭐ Reputation Feedback',
    'MCPMessageSent': '📡 MCP Message Sent'
  };
  return titles[event] || event;
}

function formatEventDescription(msg) {
  // Create human-readable descriptions
  switch (msg.event) {
    case 'EscrowCreated':
      return `${msg.payer?.substring(0, 10)}... created escrow of ${msg.amount} HBAR to ${msg.payee?.substring(0, 10)}...`;
    case 'TokenEscrowCreated':
      return `${msg.payer?.substring(0, 10)}... created token escrow of ${msg.amount} USDC to ${msg.payee?.substring(0, 10)}...`;
    case 'EscrowReleased':
      return `Payment released from ${msg.payer?.substring(0, 10)}... to ${msg.payee?.substring(0, 10)}...`;
    case 'A2ACommunicationInitiated':
      return `${msg.fromAgent?.substring(0, 10)}... initiated communication with ${msg.toAgent?.substring(0, 10)}... for ${msg.capability}`;
    case 'A2ACommunicationCompleted':
      return `Communication completed between ${msg.fromAgent?.substring(0, 10)}... and ${msg.toAgent?.substring(0, 10)}...`;
    case 'TrustEstablishedFromPayment':
      return `Trust established between ${msg.agent1?.substring(0, 10)}... and ${msg.agent2?.substring(0, 10)}...`;
    case 'ReputationFeedbackSubmitted':
      return `${msg.fromAgent?.substring(0, 10)}... rated ${msg.toAgent?.substring(0, 10)}... (${msg.rating}/5)`;
    default:
      return JSON.stringify(msg).substring(0, 100);
  }
}

module.exports = router;


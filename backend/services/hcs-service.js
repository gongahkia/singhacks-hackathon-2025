// services/hcs-service.js
const hederaClient = require('./hedera-client');

module.exports = {
  sendMessage: async (topicId, message) => {
    // Use Hedera client to send message
    return await hederaClient.sendMessage(topicId, message);
  }
};

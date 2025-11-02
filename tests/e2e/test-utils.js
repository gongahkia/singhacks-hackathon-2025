/**
 * E2E Test Utilities
 * 
 * Shared utilities for e2e tests including API helpers,
 * assertion utilities, and test data generators.
 */

const axios = require('axios');

class TestUtils {
  constructor(baseUrl = process.env.API_URL || 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Wait for a condition to be true
   */
  async waitFor(condition, timeout = 10000, interval = 500) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await this.delay(interval);
    }
    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
  }

  /**
   * Delay helper
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`, { timeout: 5000 });
      return response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  /**
   * Register a test agent
   */
  async registerAgent(name, capabilities, options = {}) {
    const payload = {
      name,
      capabilities,
      metadata: options.metadata || JSON.stringify({ test: true }),
      paymentMode: options.paymentMode || 'permissioned',
      ...(options.agentPrivateKey && { agentPrivateKey: options.agentPrivateKey }),
    };

    const response = await axios.post(`${this.baseUrl}/api/agents/register-agent`, payload);
    return {
      agentId: response.data.agentId,
      address: response.data.agentAddress,
      ...response.data,
    };
  }

  /**
   * Get agent by address
   */
  async getAgent(address) {
    const response = await axios.get(`${this.baseUrl}/api/agents/${address}`);
    return response.data;
  }

  /**
   * Search agents by capability
   */
  async searchAgents(capability) {
    const response = await axios.get(`${this.baseUrl}/api/agents/search?capability=${encodeURIComponent(capability)}`);
    return response.data;
  }

  /**
   * Create A2A interaction
   */
  async createA2AInteraction(fromAgent, toAgent, capability = 'payments') {
    const response = await axios.post(`${this.baseUrl}/api/a2a/communicate`, {
      fromAgent,
      toAgent,
      capability,
    });
    return response.data;
  }

  /**
   * Create payment escrow
   */
  async createEscrow(payee, amount, description = 'Test payment') {
    const response = await axios.post(`${this.baseUrl}/api/payments`, {
      payee,
      amount,
      description,
    });
    return response.data;
  }

  /**
   * Release escrow
   */
  async releaseEscrow(escrowId) {
    const response = await axios.post(`${this.baseUrl}/api/payments/${escrowId}/release`);
    return response.data;
  }

  /**
   * Submit reputation feedback
   */
  async submitFeedback(fromAgent, toAgent, rating, comment = 'Test feedback') {
    const response = await axios.post(`${this.baseUrl}/api/reputation/feedback`, {
      fromAgent,
      toAgent,
      rating,
      comment,
    });
    return response.data;
  }

  /**
   * Get agent reputation
   */
  async getReputation(agentAddress) {
    const response = await axios.get(`${this.baseUrl}/api/agents/${agentAddress}/reputation`);
    return response.data;
  }

  /**
   * Get interaction history
   */
  async getInteractionHistory(agentAddress) {
    const response = await axios.get(`${this.baseUrl}/api/agents/${agentAddress}/interactions`);
    return response.data;
  }

  /**
   * Generate unique test name
   */
  generateTestName(prefix = 'Test') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Assert helper
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Assert equality
   */
  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
    }
  }

  /**
   * Assert array contains
   */
  assertContains(array, item, message) {
    if (!Array.isArray(array) || !array.includes(item)) {
      throw new Error(`Assertion failed: ${message}. Array does not contain ${item}`);
    }
  }

  /**
   * Cleanup test resources (placeholder - implement as needed)
   */
  async cleanup(resources) {
    // In a production system, you might want to delete test agents
    // For now, we'll just log what was created
    console.log('Test resources created:', JSON.stringify(resources, null, 2));
  }
}

module.exports = TestUtils;


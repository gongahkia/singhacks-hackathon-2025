// services/unified-agent-service.js
// Unified service combining ERC-8004 + custom capabilities with caching and optimization
const agentService = require('./agent-service');
const erc8004Service = require('./erc8004-service');
const reputationService = require('./reputation-service');

class UnifiedAgentService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get cached data or fetch fresh
   * @param {string} key - Cache key
   * @param {Function} fetcher - Function to fetch fresh data
   * @param {number} ttl - Time to live in ms (default: 5 minutes)
   * @returns {Promise<any>} Cached or fresh data
   */
  async getCached(key, fetcher, ttl = this.cacheTimeout) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < ttl) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Clear cache for a specific key or all
   * @param {string} key - Optional key to clear (clears all if not provided)
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get unified agent data (combines ERC-8004 + backend capabilities + reputation + validation)
   * @param {string} agentIdentifier - Agent address or agentId
   * @param {Object} options - Options (includeReputation, includeValidation, etc.)
   * @returns {Promise<Object>} Unified agent data
   */
  async getUnifiedAgent(agentIdentifier, options = {}) {
    const cacheKey = `unified:${agentIdentifier}:${JSON.stringify(options)}`;
    
    return this.getCached(cacheKey, async () => {
      try {
        // Get base agent data
        let agent = null;
        if (typeof agentIdentifier === 'string' && agentIdentifier.startsWith('0x')) {
          agent = await agentService.getAgent(agentIdentifier);
        } else {
          agent = await agentService.getAgentById(agentIdentifier);
        }

        if (!agent) {
          return null;
        }

        // Get ERC-8004 data
        let erc8004Data = null;
        const AgentServiceClass = agentService.constructor;
        const erc8004AgentId = AgentServiceClass.getERC8004AgentId(agent.address || agentIdentifier);
        
        if (erc8004AgentId && options.includeERC8004 !== false) {
          try {
            await erc8004Service.initialize();
            if (erc8004Service.isAvailable()) {
              erc8004Data = await erc8004Service.getAgentById(erc8004AgentId);
            }
          } catch (e) {
            console.warn(`Failed to fetch ERC-8004 data for agent ${agentIdentifier}:`, e.message);
          }
        }

        // Get reputation data
        let reputation = null;
        if (options.includeReputation !== false) {
          try {
            reputation = await reputationService.getHybridTrustScore(
              agent.address || agentIdentifier,
              erc8004AgentId
            );
            
            // Also get detailed feedback
            if (options.includeDetailedReputation) {
              reputation.feedback = await reputationService.getAgentReputation(
                agent.address || agentIdentifier
              );
            }
          } catch (e) {
            console.warn(`Failed to fetch reputation for agent ${agentIdentifier}:`, e.message);
          }
        }

        // Get validation data
        let validation = null;
        if (options.includeValidation !== false && erc8004AgentId) {
          try {
            await erc8004Service.initialize();
            if (erc8004Service.isAvailable()) {
              const validations = await erc8004Service.getAgentValidations(erc8004AgentId);
              const validationSummary = await erc8004Service.getValidationSummary(erc8004AgentId);
              
              validation = {
                count: validationSummary.count,
                averageScore: validationSummary.avgResponse,
                validations: validations.map(async (requestHash) => {
                  try {
                    return await erc8004Service.getValidationStatus(requestHash);
                  } catch (e) {
                    return { requestHash, error: e.message };
                  }
                })
              };
              
              // Resolve all validation promises
              validation.validations = await Promise.all(validation.validations);
            }
          } catch (e) {
            console.warn(`Failed to fetch validation for agent ${agentIdentifier}:`, e.message);
          }
        }

        // Combine all data
        return {
          // Base agent data
          agentId: agent.agentId || agentIdentifier,
          name: agent.name,
          address: agent.address || agentIdentifier,
          capabilities: agent.capabilities || [],
          metadata: agent.metadata || '',
          paymentMode: agent.paymentMode || 'permissioned',
          agentWalletAddress: agent.agentWalletAddress,
          
          // ERC-8004 data
          erc8004: erc8004Data ? {
            agentId: erc8004AgentId,
            owner: erc8004Data.owner,
            tokenURI: erc8004Data.tokenURI,
            metadata: erc8004Data.metadata
          } : null,
          
          // Reputation data
          reputation: reputation ? {
            trustScore: reputation.final || reputation.hybrid || 0,
            breakdown: reputation.breakdown,
            official: reputation.official || 0,
            officialFeedbackCount: reputation.officialFeedbackCount || 0,
            feedback: reputation.feedback || []
          } : null,
          
          // Validation data
          validation: validation ? {
            count: validation.count,
            averageScore: validation.averageScore,
            validations: validation.validations
          } : null,
          
          // Timestamps
          registeredAt: agent.registeredAt,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        throw new Error(`Failed to get unified agent data: ${error.message}`);
      }
    });
  }

  /**
   * Enhanced agent discovery with multi-criteria search
   * @param {Object} criteria - Search criteria
   * @param {string[]} criteria.capabilities - Required capabilities
   * @param {number} criteria.minTrustScore - Minimum trust score
   * @param {number} criteria.maxTrustScore - Maximum trust score
   * @param {boolean} criteria.validatedOnly - Only return validated agents
   * @param {number} criteria.minValidationScore - Minimum validation score
   * @param {string} criteria.paymentMode - Filter by payment mode (permissioned/permissionless)
   * @param {string} criteria.query - Free-text search query
   * @param {number} criteria.limit - Maximum results
   * @returns {Promise<Array>} Matching agents
   */
  async discoverAgents(criteria = {}) {
    try {
      // Get all agents
      const allAgents = await agentService.getAllAgentsWithIds();
      
      // Get unified data for all agents (with caching)
      const unifiedAgents = await Promise.all(
        allAgents.slice(0, criteria.limit || 50).map(async (agent) => {
          try {
            return await this.getUnifiedAgent(
              agent.agentId || agent.address,
              {
                includeReputation: true,
                includeValidation: criteria.validatedOnly || criteria.minValidationScore !== undefined,
                includeERC8004: true
              }
            );
          } catch (e) {
            // Return base agent if unified fetch fails
            return agent;
          }
        })
      );

      // Filter by criteria
      let filtered = unifiedAgents.filter(agent => {
        if (!agent) return false;

        // Capabilities filter
        if (criteria.capabilities && criteria.capabilities.length > 0) {
          const agentCaps = agent.capabilities || [];
          const hasAllCaps = criteria.capabilities.every(cap => 
            agentCaps.some(ac => ac.toLowerCase().includes(cap.toLowerCase()))
          );
          if (!hasAllCaps) return false;
        }

        // Trust score filter
        const trustScore = agent.reputation?.trustScore || 0;
        if (criteria.minTrustScore !== undefined && trustScore < criteria.minTrustScore) {
          return false;
        }
        if (criteria.maxTrustScore !== undefined && trustScore > criteria.maxTrustScore) {
          return false;
        }

        // Validation filter
        if (criteria.validatedOnly) {
          const validationCount = agent.validation?.count || 0;
          if (validationCount === 0) return false;
        }
        if (criteria.minValidationScore !== undefined) {
          const avgValidation = agent.validation?.averageScore || 0;
          if (avgValidation < criteria.minValidationScore) return false;
        }

        // Payment mode filter
        if (criteria.paymentMode) {
          if (agent.paymentMode !== criteria.paymentMode) return false;
        }

        // Free-text search
        if (criteria.query) {
          const query = criteria.query.toLowerCase();
          const searchableText = [
            agent.name,
            agent.metadata,
            ...(agent.capabilities || []),
            agent.agentId
          ].join(' ').toLowerCase();
          
          if (!searchableText.includes(query)) return false;
        }

        return true;
      });

      // Sort by relevance (trust score + validation score)
      filtered.sort((a, b) => {
        const scoreA = (a.reputation?.trustScore || 0) + (a.validation?.averageScore || 0) * 0.3;
        const scoreB = (b.reputation?.trustScore || 0) + (b.validation?.averageScore || 0) * 0.3;
        return scoreB - scoreA;
      });

      return filtered;
    } catch (error) {
      throw new Error(`Agent discovery failed: ${error.message}`);
    }
  }

  /**
   * Get agent recommendations based on criteria
   * @param {Object} criteria - Similar to discoverAgents criteria
   * @param {number} limit - Number of recommendations (default: 5)
   * @returns {Promise<Array>} Recommended agents
   */
  async getRecommendations(criteria = {}, limit = 5) {
    const agents = await this.discoverAgents({ ...criteria, limit: limit * 2 });
    
    // Prioritize: ERC-8004 registered > Validated > High trust score
    return agents
      .sort((a, b) => {
        // ERC-8004 boost
        const erc8004A = a.erc8004 ? 1 : 0;
        const erc8004B = b.erc8004 ? 1 : 0;
        if (erc8004A !== erc8004B) return erc8004B - erc8004A;

        // Validation boost
        const validatedA = (a.validation?.count || 0) > 0 ? 1 : 0;
        const validatedB = (b.validation?.count || 0) > 0 ? 1 : 0;
        if (validatedA !== validatedB) return validatedB - validatedA;

        // Trust score
        return (b.reputation?.trustScore || 0) - (a.reputation?.trustScore || 0);
      })
      .slice(0, limit);
  }
}

module.exports = new UnifiedAgentService();


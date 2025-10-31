// services/agent-service.js
const agents = [];

module.exports = {
  registerAgent: async (data) => {
    // Basic validation
    if (!data.name || !data.capabilities) throw new Error('Missing required fields');
    const agent = { id: agents.length + 1, ...data };
    agents.push(agent);
    return agent;
  },
  listAgents: async () => agents,
  searchAgents: async (capability) => {
    if (!capability) return agents;
    return agents.filter(a => a.capabilities.includes(capability));
  }
};

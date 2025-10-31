// services/payment-service.js
const escrows = [];

module.exports = {
  createEscrow: async (data) => {
    if (!data.agentId || !data.amount) throw new Error('Missing required fields');
    const escrow = { id: escrows.length + 1, ...data, status: 'pending' };
    escrows.push(escrow);
    return escrow;
  },
  releaseEscrow: async (id) => {
    const escrow = escrows.find(e => e.id == id);
    if (!escrow) throw new Error('Escrow not found');
    escrow.status = 'released';
    return escrow;
  }
};

// server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config({ path: '../.env' });

// Initialize config service to load saved settings
const configService = require('./services/config-service');
configService.initializeEnv();

const agentRoutes = require('./routes/agents');
const paymentRoutes = require('./routes/payments');
const messageRoutes = require('./routes/messages');
const x402Routes = require('./routes/x402');
const tokenRoutes = require('./routes/tokens');
const authRoutes = require('./routes/auth');
const a2aRoutes = require('./routes/a2a');
const reputationRoutes = require('./routes/reputation');
const validationRoutes = require('./routes/validation');
const x402EnhancedRoutes = require('./routes/x402-enhanced');
const unifiedAgentRoutes = require('./routes/unified-agents');
const settingsRoutes = require('./routes/settings');
const transactionRoutes = require('./routes/transactions');
const aiRoutes = require('./routes/ai');
const mcpRoutes = require('./routes/mcp');
const timelineRoutes = require('./routes/timeline');
const agentConnectionRoutes = require('./routes/agent-connection');
const errorHandler = require('./utils/error-handler');
const { version } = require('./package.json');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Make io available to routes and services
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/agents', agentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/x402', x402Routes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/a2a', a2aRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/x402-enhanced', x402EnhancedRoutes);
app.use('/api/unified-agents', unifiedAgentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/agent-connection', agentConnectionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    network: process.env.HEDERA_NETWORK,
    version
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use(errorHandler);

// WebSocket connection handling
io.on('connection', async (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Subscribe to agent updates
  socket.on('subscribe-agent', async (agentAddress) => {
    socket.join(`agent-${agentAddress}`);
    console.log(`📡 Client ${socket.id} subscribed to agent ${agentAddress}`);
    
    // Send AI-powered welcome message using Groq
    try {
      const groqService = require('./services/groq-service');
      const agentService = require('./services/agent-service');
      
      const agent = await agentService.getAgent(agentAddress);
      
      const welcomeMsg = await groqService.chat(
        `Create a brief, friendly welcome message for agent "${agent.name}" with trust score ${agent.trustScore}. Keep it under 50 words.`,
        'You create brief, professional welcome messages for blockchain agents. Be concise and highlight the agent\'s trust score.'
      );
      
      socket.emit('welcome', {
        message: welcomeMsg.data?.message || welcomeMsg.raw,
        agent: {
          name: agent.name,
          trustScore: agent.trustScore
        }
      });
    } catch (error) {
      console.warn('Could not send welcome message:', error.message);
    }
  });
  
  // Subscribe to transaction timeline updates
  socket.on('subscribe-timeline', (transactionId) => {
    socket.join(`timeline-${transactionId}`);
    console.log(`📊 Client ${socket.id} subscribed to timeline ${transactionId}`);
  });
  
  // Unsubscribe from agent
  socket.on('unsubscribe-agent', (agentAddress) => {
    socket.leave(`agent-${agentAddress}`);
    console.log(`📴 Client ${socket.id} unsubscribed from agent ${agentAddress}`);
  });
  
  // Unsubscribe from timeline
  socket.on('unsubscribe-timeline', (transactionId) => {
    socket.leave(`timeline-${transactionId}`);
    console.log(`📴 Client ${socket.id} unsubscribed from timeline ${transactionId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Initialize agent service and load Alice/Bob wallets from env on startup
const agentServiceInstance = require('./services/agent-service');
const AgentService = agentServiceInstance.constructor;
(async () => {
  try {
    await AgentService.loadAliceBobWalletsFromEnv();
    
    // Populate agentIdMapping from ERC-8004 on startup
    // This ensures agents registered in previous sessions are available
    try {
      const allAgents = await agentServiceInstance.getAllAgentsWithIds();
      console.log(`📦 Found ${allAgents.length} agents from ERC-8004, ensuring agentIdMapping is populated...`);
      
      // The getAllAgentsWithIds() already handles merging ERC-8004 with agentIdMapping
      // This log is just for confirmation
      console.log(`✅ Agent mapping ready: ${AgentService.agentIdMapping.size} agents in agentIdMapping\n`);
    } catch (error) {
      console.warn('⚠️  Could not populate agents from ERC-8004 on startup:', error.message);
    }
  } catch (error) {
    console.warn('⚠️  Failed to load Alice/Bob wallets on startup:', error.message);
  }
})();

// Start server
server.listen(PORT, () => {
  console.log('🚀 Hedera Agent Economy Backend');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌐 Network: ${process.env.HEDERA_NETWORK || 'unset'}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`⚡ WebSocket enabled for real-time updates`);
});

module.exports = { app, io, server };

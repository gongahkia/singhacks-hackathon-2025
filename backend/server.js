// server.js
const express = require('express');
const cors = require('cors');
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
const settingsRoutes = require('./routes/settings');
const errorHandler = require('./utils/error-handler');
const { version } = require('./package.json');

const app = express();
const PORT = process.env.PORT || 3001;

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
app.use('/api/settings', settingsRoutes);

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

// Start server
app.listen(PORT, () => {
  console.log('🚀 Hedera Agent Economy Backend');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌐 Network: ${process.env.HEDERA_NETWORK || 'unset'}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;

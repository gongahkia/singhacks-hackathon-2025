// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const agentRoutes = require('./routes/agents');
const paymentRoutes = require('./routes/payments');
const messageRoutes = require('./routes/messages');
const x402Routes = require('./routes/x402');
const tokenRoutes = require('./routes/tokens');
const authRoutes = require('./routes/auth');
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

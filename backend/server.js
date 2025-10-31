// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/agents', require('./routes/agents'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/x402', require('./routes/x402'));
app.use('/api/messages', require('./routes/messages'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

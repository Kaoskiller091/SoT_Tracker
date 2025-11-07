// api-server.js - REST API for external access
const express = require('express');
const app = express();
const port = process.env.API_PORT || 3000;
const dbManager = require('./database');
const sessionModel = require('./session-model');
const goldModel = require('./gold-model');
const userModel = require('./user-model');
const accessControl = require('./access-control');

// Middleware
app.use(express.json());

// Simple authentication middleware
const authMiddleware = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // For now, just check if API key is provided
  // In a production environment, you would validate this against stored API keys
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  next();
};

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// User endpoints
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const user = await userModel.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Gold endpoints
app.get('/api/gold/:userId', authMiddleware, async (req, res) => {
  try {
    const gold = await goldModel.getCurrentGold(req.params.userId);
    res.json({ userId: req.params.userId, gold });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/gold/:userId/history', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = await goldModel.getGoldHistory(req.params.userId, limit);
    res.json(history);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/gold/leaderboard', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await goldModel.getGoldLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Session endpoints
app.get('/api/sessions/:userId', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const sessions = await sessionModel.getUserSessions(req.params.userId, limit);
    res.json(sessions);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sessions/:userId/active', authMiddleware, async (req, res) => {
  try {
    const session = await sessionModel.getActiveSession(req.params.userId);
    if (!session) {
      return res.status(404).json({ error: 'No active session found' });
    }
    res.json(session);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sessions/:userId/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await sessionModel.getUserSessionStats(req.params.userId);
    res.json(stats);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start API server
function startApiServer() {
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

module.exports = { startApiServer };

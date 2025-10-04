require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connect } = require('./db');
const { generateNonce, issueJwt, verifyJwt, verifySiwe } = require('./auth');
const { ObjectId } = require('mongodb');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));

let users;

// MongoDB connection
connect()
  .then((db) => {
    users = db.collection('users');
    console.log('[DB] Connected to MongoDB');
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
  });

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Request nonce for SIWE login
app.post('/auth/nonce', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: 'address required' });

    const nonce = generateNonce();
    const now = new Date();
    const addr = address.toLowerCase();

    await users.updateOne(
      { address: addr },
      {
        $set: { nonce, updatedAt: now },
        $setOnInsert: { address: addr, createdAt: now },
      },
      { upsert: true }
    );

    console.log(`[AUTH] Nonce generated for ${addr}`);
    res.json({ nonce });
  } catch (err) {
    console.error('[AUTH] Nonce error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Verify SIWE signature and issue JWT cookie
app.post('/auth/verify', async (req, res) => {
  try {
    const { address, message, signature } = req.body;
    if (!address || !message || !signature) {
      return res.status(400).json({ error: 'Missing params' });
    }

    const addr = address.toLowerCase();
    const user = await users.findOne({ address: addr });
    if (!user) return res.status(400).json({ error: 'Call /auth/nonce first' });

    const verify = await verifySiwe({
      message,
      signature,
      expectedNonce: user.nonce,
      expectedAddress: addr,
    });

    if (!verify.ok) {
      console.warn(`[AUTH] SIWE verification failed for ${addr}: ${verify.error}`);
      return res.status(401).json({ error: verify.error });
    }

    const newNonce = generateNonce();
    await users.updateOne(
      { _id: user._id },
      { $set: { nonce: newNonce, lastLoginAt: new Date() } }
    );

    const token = issueJwt({ sub: String(user._id), address: addr });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log(`[AUTH] User verified and logged in: ${addr}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[AUTH] Verify error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get current authenticated user
app.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'unauthorized' });

    const payload = verifyJwt(token);
    if (!payload) return res.status(401).json({ error: 'invalid token' });

    const user = await users.findOne({ _id: new ObjectId(payload.sub) });
    if (!user) return res.status(404).json({ error: 'user not found' });

    const { nonce, ...publicUser } = user;
    console.log(`[AUTH] Session validated for ${user.address}`);
    res.json({ user: publicUser });
  } catch (err) {
    console.error('[AUTH] /me error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Logout user
app.post('/logout', (req, res) => {
  res.clearCookie('token');
  console.log('[AUTH] User logged out');
  res.json({ ok: true });
});

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`[SERVER] Running at http://${process.env.DOMAIN}:${process.env.PORT}`);
});

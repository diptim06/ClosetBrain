import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Middleware to verify database connectivity before database operations
const requireDb = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error:
        'MongoDB Atlas database is currently unreachable. Please verify MONGODB_URI in your .env file.',
    });
  }
  next();
};

// POST /api/auth/signup
router.post('/signup', requireDb, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate fields presence
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Please provide a valid full name.' });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters in length.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing account
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email address already exists. Please log in instead.',
      });
    }

    // Hash password with bcrypt
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user record
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    // Establish server-managed session
    req.session.userId = user._id.toString();
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Session persistence error on signup:', saveErr);
        return res.status(500).json({ error: 'Failed to initialize user session.' });
      }

      return res.status(201).json({
        message: 'Account created successfully.',
        user: user.toSafeObject(),
      });
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// POST /api/auth/login
router.post('/login', requireDb, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Look up user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Generic message to avoid email enumeration
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify password against hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Establish server-managed session
    req.session.userId = user._id.toString();
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Session persistence error on login:', saveErr);
        return res.status(500).json({ error: 'Failed to initialize user session.' });
      }

      return res.status(200).json({
        message: 'Logged in successfully.',
        user: user.toSafeObject(),
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout session destruction error:', err);
      return res.status(500).json({ error: 'Logout failed.' });
    }

    res.clearCookie('closetbrain.sid', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return res.status(200).json({ message: 'Logged out successfully.' });
  });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(200).json({ user: null });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'MongoDB Atlas is currently unreachable.',
        user: null,
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => { });
      return res.status(200).json({ user: null });
    }

    return res.status(200).json({ user: user.toSafeObject() });
  } catch (err) {
    console.error('Session check error:', err);
    return res.status(500).json({ error: 'Failed to verify session.' });
  }
});

export default router;

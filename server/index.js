import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import authRoutes from './routes/auth.js';
import wardrobeRoutes from './routes/wardrobe.js';
import outfitRoutes from './routes/outfits.js';
import calendarRoutes from './routes/calendar.js';
import { startCleanupWorker, stopCleanupWorker } from './services/cleanupWorker.js';
import { isR2Configured } from './services/r2.js';
import { getSafeGeminiStatus, validateGeminiTimeoutMs } from './services/gemini.js';
import { validateAuthRateLimitMax } from './middleware/authRateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

/**
 * Parses and strictly validates CORS origins based on environment.
 * In production, fails fast if CORS_ORIGIN is missing, empty, or malformed,
 * and never falls back to development localhost.
 *
 * @param {string|undefined} rawOriginString - Comma-separated origin list from environment
 * @param {boolean} isProduction - Whether running in production mode
 * @returns {string[]} Validated array of allowed origin strings
 */
export function parseAndValidateCorsOrigins(rawOriginString, isProduction) {
  const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

  if (!rawOriginString || !rawOriginString.trim()) {
    if (isProduction) {
      throw new Error(
        'Configuration Error: CORS_ORIGIN environment variable is required in production but was not provided. Please set a valid comma-separated origin list (e.g. https://closetbrain.com).'
      );
    }
    return defaultDevOrigins;
  }

  const origins = rawOriginString
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    if (isProduction) {
      throw new Error(
        'Configuration Error: CORS_ORIGIN is empty or contains only delimiters. At least one valid origin must be specified in production.'
      );
    }
    return defaultDevOrigins;
  }

  // Validate each origin format
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`Unsupported protocol '${url.protocol}'. Only http: and https: are allowed.`);
      }
      if (url.pathname !== '/' && url.pathname !== '') {
        throw new Error(`Origin must not contain path elements: '${origin}'`);
      }
      if (origin !== url.origin) {
        throw new Error(`Origin must be formatted as protocol://host[:port] without trailing slash, got '${origin}'`);
      }

      // In production, strictly reject localhost and loopback addresses
      if (isProduction) {
        const hostname = url.hostname.toLowerCase();
        if (
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '0.0.0.0' ||
          hostname === '::1' ||
          hostname === '[::1]'
        ) {
          throw new Error(
            `Configuration Error: Production CORS_ORIGIN must not contain localhost or loopback addresses, got '${origin}'.`
          );
        }
      }
    } catch (err) {
      throw new Error(`Configuration Error: Invalid CORS_ORIGIN entry '${origin}': ${err.message}`);
    }
  }

  if (isProduction) {
    // In production, strictly use the validated configured origins; never trust localhost
    return origins;
  }

  // In development, combine localhost defaults with any explicitly provided origins
  return Array.from(new Set([...defaultDevOrigins, ...origins]));
}

// Fail-fast startup configuration validations
const allowedOrigins = parseAndValidateCorsOrigins(process.env.CORS_ORIGIN, isProd);
validateAuthRateLimitMax(process.env.AUTH_RATE_LIMIT_MAX);
validateGeminiTimeoutMs(process.env.GEMINI_TIMEOUT_MS);

// Security hardening & defensive headers
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration (supporting credentials)
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Ensure reliable SRV resolution across local Wi-Fi router networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Fall back to system resolver
}

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI;
const hasRealMongoUri =
  mongoUri &&
  !mongoUri.includes('<username>') &&
  !mongoUri.includes('<password>') &&
  !mongoUri.includes('<cluster-name>');

let clientPromise = null;
if (hasRealMongoUri) {
  const connectWithRetry = () => {
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
      return;
    }
    mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      })
      .then(() => {
        console.log('✓ Successfully connected to MongoDB Atlas');
      })
      .catch((err) => {
        console.warn('✗ MongoDB Atlas connection warning:', err.message);
        setTimeout(connectWithRetry, 5000);
      });
  };

  connectWithRetry();

  mongoose.connection.on('disconnected', () => {
    console.warn('! MongoDB connection lost. Attempting reconnection...');
    setTimeout(connectWithRetry, 5000);
  });

  clientPromise = new Promise((resolve) => {
    if (mongoose.connection.readyState === 1) {
      resolve(mongoose.connection.getClient());
    } else {
      mongoose.connection.once('open', () => {
        resolve(mongoose.connection.getClient());
      });
    }
  });
} else {
  console.warn(
    '! Notice: MONGODB_URI in .env contains placeholders. Please update .env with your MongoDB Atlas connection string.'
  );
}

// Session store setup: use MongoStore if valid URI provided, fallback gracefully to MemoryStore for dev inspection if needed
let sessionStore;
if (hasRealMongoUri && clientPromise) {
  sessionStore = MongoStore.create({
    clientPromise,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native',
    touchAfter: 24 * 3600, // Update session once in 24 hours if data unchanged
  });
  sessionStore.on('error', (err) => {
    console.warn('Session store warning:', err.message);
  });
}

const sessionSecret = process.env.SESSION_SECRET || 'closetbrain_dev_session_fallback_secret_key_32chars';

app.use(
  session({
    name: 'closetbrain.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore, // Falls back to default memory store if MongoStore not initialized yet
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      path: '/',
    },
  })
);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/calendar', calendarRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    storage: isR2Configured() ? 'configured' : 'pending',
    ai: getSafeGeminiStatus(),
    environment: process.env.NODE_ENV || 'development',
  });
});

const server = app.listen(PORT, () => {
  console.log(`ClosetBrain Express backend running on http://localhost:${PORT}`);
  // Initialize background cleanup & reconciliation worker
  startCleanupWorker();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ Port ${PORT} is already in use by another process.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  stopCleanupWorker();
  server.close(() => {
    mongoose.connection.close(false).then(() => {
      console.log('MongoDB connection closed. Server exited cleanly.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Keepalive interval so server never exits on idle Atlas timeouts
setInterval(() => {}, 60000);

export default app;

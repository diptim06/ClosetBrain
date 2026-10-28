import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration (supporting credentials)
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI;
const hasRealMongoUri =
  mongoUri &&
  !mongoUri.includes('<username>') &&
  !mongoUri.includes('<password>') &&
  !mongoUri.includes('<cluster-name>');

if (hasRealMongoUri) {
  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log('✓ Successfully connected to MongoDB Atlas');
    })
    .catch((err) => {
      console.error('✗ MongoDB Atlas connection error:', err.message);
    });
} else {
  console.warn(
    '! Notice: MONGODB_URI in .env contains placeholders. Please update .env with your MongoDB Atlas connection string.'
  );
}

// Session store setup: use MongoStore if valid URI provided, fallback gracefully to MemoryStore for dev inspection if needed
let sessionStore;
if (hasRealMongoUri) {
  sessionStore = MongoStore.create({
    mongoUrl: mongoUri,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native',
    touchAfter: 24 * 3600, // Update session once in 24 hours if data unchanged
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.listen(PORT, () => {
  console.log(`ClosetBrain Express backend running on http://localhost:${PORT}`);
});

export default app;

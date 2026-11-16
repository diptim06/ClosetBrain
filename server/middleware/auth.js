import mongoose from 'mongoose';

/**
 * Authentication middleware that verifies session validity
 * and derives userId strictly from the server-managed session.
 */
export const requireAuth = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database connection is temporarily unavailable. Please try again shortly.',
    });
  }

  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Authentication required. Please log in to access this resource.',
    });
  }

  // Attach verified user ID to request for downstream handlers
  req.userId = req.session.userId;
  next();
};

export default requireAuth;

const { db } = require('../db/database');

/**
 * Validate a bearer token against database sessions
 * @param {string} token 
 * @returns {object|null} user object or null
 */
function getUserFromToken(token) {
  if (!token) return null;

  try {
    const session = db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.full_name, 
        u.role, 
        u.avatar_color,
        s.token,
        s.expires_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token);

    return session || null;
  } catch (err) {
    console.error('Error validating token:', err);
    return null;
  }
}

/**
 * Extract token from Authorization header or custom header
 * @param {object} req 
 * @returns {string|null}
 */
function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.headers['x-auth-token']) {
    return req.headers['x-auth-token'].trim();
  }
  if (req.query && req.query.auth_token) {
    return req.query.auth_token;
  }
  return null;
}

/**
 * Optional Auth Middleware:
 * If a valid token is provided, attaches req.user.
 * Otherwise req.user is null, but request proceeds.
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    req.user = getUserFromToken(token);
    req.token = token;
  } else {
    req.user = null;
  }
  next();
}

/**
 * Strict Auth Middleware:
 * Requires a valid session token, otherwise sends 401.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to access this resource.'
    });
  }

  const user = getUserFromToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid. Please sign in again.'
    });
  }

  req.user = user;
  req.token = token;
  next();
}

module.exports = {
  getUserFromToken,
  extractToken,
  optionalAuth,
  requireAuth
};

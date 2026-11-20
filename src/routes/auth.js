const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { hashPassword, generateSalt, verifyPassword, generateSessionToken } = require('../utils/auth');
const { requireAuth, extractToken } = require('../middleware/auth');

const AVATAR_PALETTE = ['#4f46e5', '#059669', '#0284c7', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#ea580c'];

/**
 * POST /api/auth/login
 * Sign in with email or username + password
 */
router.post('/login', (req, res) => {
  try {
    const { emailOrUsername, email, username, password } = req.body;
    const identifier = (emailOrUsername || email || username || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter both your email/username and password.'
      });
    }

    // Lookup user by email or username (case-insensitive)
    const user = db.prepare(`
      SELECT * FROM users
      WHERE email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE
    `).get(identifier, identifier);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'No account found matching those credentials.'
      });
    }

    // Verify password hash
    const isValid = verifyPassword(password, user.salt, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please try again.'
      });
    }

    // Create session token (valid for 7 days)
    const token = generateSessionToken();
    db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `).run(token, user.id);

    // Update last login
    db.prepare(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `).run(user.id);

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, details)
        VALUES (?, ?, ?, ?, ?)
      `).run('USER_LOGIN', 'users', user.id, user.full_name, `User signed into portal (${user.email})`);
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr.message);
    }

    res.json({
      success: true,
      message: `Welcome back, ${user.full_name}!`,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_color: user.avatar_color
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Internal login server error.' });
  }
});

/**
 * POST /api/auth/register
 * Register a new user account (Sign In portal sign up)
 */
router.post('/register', (req, res) => {
  try {
    const { full_name, email, username, password, role } = req.body;

    // Field validations
    if (!full_name || full_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Full name must be at least 2 characters.'
      });
    }

    const trimmedEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
    }

    // Auto-derive username if not provided
    let cleanUsername = (username || '').trim().toLowerCase();
    if (!cleanUsername) {
      cleanUsername = trimmedEmail.split('@')[0].replace(/[^a-z0-9_-]/g, '');
    }
    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Username must be at least 3 alphanumeric characters.'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    // Allowed roles
    const validRoles = ['IT Administrator', 'Asset Manager', 'Logistics Officer', 'Staff Member'];
    const chosenRole = validRoles.includes(role) ? role : 'Staff Member';

    // Check duplicate email
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(trimmedEmail);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in instead.'
      });
    }

    // Check duplicate username
    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(cleanUsername);
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        error: 'This username is already taken. Please choose a different username.'
      });
    }

    // Hash password
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const avatarColor = AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)];

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, salt, full_name, role, avatar_color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(cleanUsername, trimmedEmail, passwordHash, salt, full_name.trim(), chosenRole, avatarColor);

    const newUserId = result.lastInsertRowid;

    // Automatically create session token
    const token = generateSessionToken();
    db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at)
      VALUES (?, ?, datetime('now', '+7 days'))
    `).run(token, newUserId);

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, details)
        VALUES (?, ?, ?, ?, ?)
      `).run('USER_REGISTER', 'users', newUserId, full_name.trim(), `New user registered as ${chosenRole} (${trimmedEmail})`);
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Account successfully registered!',
      token,
      user: {
        id: newUserId,
        username: cleanUsername,
        email: trimmedEmail,
        full_name: full_name.trim(),
        role: chosenRole,
        avatar_color: avatarColor
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Registration failed due to a server error.' });
  }
});

/**
 * GET /api/auth/me
 * Validate existing session token and retrieve current user info
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/auth/logout
 * Sign out and invalidate session token
 */
router.post('/logout', (req, res) => {
  const token = extractToken(req);
  if (token) {
    try {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    } catch (err) {
      console.warn('Logout session deletion error:', err.message);
    }
  }
  res.json({
    success: true,
    message: 'Signed out successfully.'
  });
});

/**
 * GET /api/auth/demo-accounts
 * Returns quick access demo credentials
 */
router.get('/demo-accounts', (req, res) => {
  res.json({
    success: true,
    accounts: [
      {
        email: 'admin@company.com',
        role: 'IT Administrator',
        label: 'Admin (Full Access)'
      },
      {
        email: 'sarah.chen@company.com',
        role: 'Asset Manager',
        label: 'Asset Manager'
      }
    ]
  });
});

module.exports = router;

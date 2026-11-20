const crypto = require('crypto');

/**
 * Hash a password using PBKDF2 with SHA-512
 * @param {string} password 
 * @param {string} salt 
 * @returns {string} hex hash
 */
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

/**
 * Generate a cryptographically secure random salt
 * @returns {string} hex salt
 */
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Verify a plain text password against a stored salt and hash
 * @param {string} password 
 * @param {string} salt 
 * @param {string} storedHash 
 * @returns {boolean}
 */
function verifyPassword(password, salt, storedHash) {
  try {
    const hash = hashPassword(password, salt);
    const hashBuffer = Buffer.from(hash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (hashBuffer.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(hashBuffer, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically random session token
 * @returns {string} 64-character hex token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  hashPassword,
  generateSalt,
  verifyPassword,
  generateSessionToken
};

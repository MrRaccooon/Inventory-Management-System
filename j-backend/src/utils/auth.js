/**
 * Authentication and authorization utilities.
 * Handles JWT token generation, password hashing, and role-based access control.
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Verify a plain password against a hashed password.
 * @param {string} plainPassword - The plain text password
 * @param {string} hashedPassword - The hashed password from database
 * @returns {Promise<boolean>} True if passwords match
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Hash a password using bcrypt.
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password string
 */
const getPasswordHash = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Create a JWT access token.
 * @param {Object} data - Dictionary containing user data
 * @param {number} expiresInMinutes - Optional custom expiration time in minutes
 * @returns {string} Encoded JWT token string
 */
const createAccessToken = (data, expiresInMinutes = null) => {
  const expiresIn = expiresInMinutes || config.ACCESS_TOKEN_EXPIRE_MINUTES;
  return jwt.sign(data, config.SECRET_KEY, {
    algorithm: config.ALGORITHM,
    expiresIn: `${expiresIn}m`,
  });
};

/**
 * Verify and decode a JWT token.
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.SECRET_KEY, {
      algorithms: [config.ALGORITHM],
    });
  } catch (error) {
    return null;
  }
};

/**
 * Create a refresh token.
 * @param {string} userId - User UUID
 * @param {string} deviceInfo - Device/user agent information
 * @param {string} ipAddress - Client IP address
 * @returns {Object} Token info
 */
const createRefreshToken = async (userId, deviceInfo = null, ipAddress = null) => {
  const { RefreshToken } = require('../models');
  
  const token = crypto.randomBytes(64).toString('base64url');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const refreshToken = await RefreshToken.create({
    id: uuidv4(),
    user_id: userId,
    token,
    expires_at: expiresAt,
    device_info: deviceInfo,
    ip_address: ipAddress,
  });
  
  return {
    refresh_token: token,
    expires_at: expiresAt.toISOString(),
    token_id: refreshToken.id,
  };
};

/**
 * Verify a refresh token.
 * @param {string} token - Refresh token string
 * @returns {Object|null} User info or null if invalid
 */
const verifyRefreshToken = async (token) => {
  const { RefreshToken } = require('../models');
  const { Op } = require('sequelize');
  
  const refreshToken = await RefreshToken.findOne({
    where: {
      token,
      is_revoked: false,
      expires_at: { [Op.gt]: new Date() },
    },
  });
  
  if (!refreshToken) {
    return null;
  }
  
  return {
    user_id: refreshToken.user_id,
    token_id: refreshToken.id,
  };
};

/**
 * Revoke a refresh token.
 * @param {string} token - Refresh token to revoke
 * @returns {boolean} True if revoked, false if not found
 */
const revokeRefreshToken = async (token) => {
  const { RefreshToken } = require('../models');
  
  const refreshToken = await RefreshToken.findOne({ where: { token } });
  
  if (!refreshToken) {
    return false;
  }
  
  refreshToken.is_revoked = true;
  await refreshToken.save();
  return true;
};

module.exports = {
  verifyPassword,
  getPasswordHash,
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
};


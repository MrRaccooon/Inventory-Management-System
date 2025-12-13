/**
 * Authentication middleware.
 * Handles JWT token verification and role-based access control.
 */
const { verifyAccessToken } = require('../utils/auth');
const { User } = require('../models');

/**
 * Middleware to get the current authenticated user from JWT token.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        detail: 'Not authenticated',
        message: 'Authorization header missing or invalid',
      });
    }
    
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    
    if (!payload) {
      return res.status(401).json({
        detail: 'Could not validate credentials',
        message: 'Invalid or expired token',
      });
    }
    
    const user = await User.findByPk(payload.sub);
    
    if (!user) {
      return res.status(401).json({
        detail: 'Could not validate credentials',
        message: 'User not found',
      });
    }
    
    if (!user.is_active) {
      return res.status(403).json({
        detail: 'User account is inactive',
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      detail: 'Could not validate credentials',
      message: error.message,
    });
  }
};

/**
 * Middleware factory to check if user has required role.
 * @param {Array<string>} allowedRoles - List of allowed role names
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        detail: 'Not authenticated',
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        detail: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
    }
    
    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    
    if (payload) {
      const user = await User.findByPk(payload.sub);
      if (user && user.is_active) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  requireRole,
  optionalAuth,
};


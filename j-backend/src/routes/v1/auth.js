/**
 * Authentication API routes.
 */
const express = require('express');
const asyncHandler = require('express-async-handler');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { User, Shop } = require('../../models');
const { authenticate, requireRole } = require('../../middleware/auth');
const {
  verifyPassword,
  getPasswordHash,
  createAccessToken,
  // createRefreshToken, // Available for use
  verifyRefreshToken,
  // revokeRefreshToken, // Available for use
} = require('../../utils/auth');
const config = require('../../config');

const router = express.Router();

// In-memory storage for tokens (in production, use Redis or database)
const passwordResetTokens = {};
const emailVerificationTokens = {};

// POST /login - OAuth2 form-based login
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  const user = await User.findOne({ where: { email: username } });
  
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({
      detail: 'Incorrect email or password',
    });
  }
  
  if (!user.is_active) {
    return res.status(403).json({
      detail: 'User account is inactive',
    });
  }
  
  await user.update({ last_login: new Date() });
  
  const accessToken = createAccessToken({
    sub: user.id,
    email: user.email,
  });
  
  res.json({
    access_token: accessToken,
    token_type: 'bearer',
  });
}));

// POST /login/json - JSON body login
router.post('/login/json', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const user = await User.findOne({ where: { email } });
  
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({
      detail: 'Incorrect email or password',
    });
  }
  
  if (!user.is_active) {
    return res.status(403).json({
      detail: 'User account is inactive',
    });
  }
  
  await user.update({ last_login: new Date() });
  
  const accessToken = createAccessToken({
    sub: user.id,
    email: user.email,
  });
  
  res.json({
    access_token: accessToken,
    token_type: 'bearer',
  });
}));

// POST /register
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, shop_name, shop_id, role = 'staff', gst_number } = req.body;
  
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(400).json({
      detail: 'Email already registered',
    });
  }
  
  const validRoles = ['owner', 'manager', 'staff', 'auditor', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      detail: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
    });
  }
  
  let shopIdToUse = null;
  
  if (role === 'owner') {
    if (!shop_name) {
      return res.status(400).json({
        detail: 'Shop name is required for owner registration',
      });
    }
    
    const newShop = await Shop.create({
      id: uuidv4(),
      name: shop_name,
      gst_number,
      timezone: 'UTC',
      currency: 'INR',
    });
    shopIdToUse = newShop.id;
  } else if (shop_id) {
    const shop = await Shop.findByPk(shop_id);
    if (!shop) {
      return res.status(404).json({
        detail: 'Shop not found',
      });
    }
    shopIdToUse = shop_id;
  }
  
  const passwordHash = await getPasswordHash(password);
  const newUser = await User.create({
    id: uuidv4(),
    shop_id: shopIdToUse,
    name,
    email,
    password_hash: passwordHash,
    role,
    is_active: true,
  });
  
  if (role === 'owner' && shopIdToUse) {
    await Shop.update(
      { owner_user_id: newUser.id },
      { where: { id: shopIdToUse } },
    );
  }
  
  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('base64url');
  emailVerificationTokens[verificationToken] = {
    user_id: newUser.id,
    email: newUser.email,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
  
  res.status(201).json({
    id: newUser.id,
    shop_id: newUser.shop_id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    is_active: newUser.is_active,
    email_verified: newUser.email_verified,
    last_login: null,
  });
}));

// POST /refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  
  const tokenInfo = await verifyRefreshToken(refresh_token);
  if (!tokenInfo) {
    return res.status(401).json({
      detail: 'Invalid or expired refresh token',
    });
  }
  
  const user = await User.findByPk(tokenInfo.user_id);
  if (!user || !user.is_active) {
    return res.status(401).json({
      detail: 'User not found or inactive',
    });
  }
  
  const accessToken = createAccessToken({
    sub: user.id,
    email: user.email,
  });
  
  res.json({
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
  });
}));

// POST /logout
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  res.json({
    message: 'Successfully logged out',
    detail: 'Please delete the authentication token from your client',
  });
}));

// POST /deactivate-account
router.post('/deactivate-account', authenticate, asyncHandler(async (req, res) => {
  const { current_password } = req.body;
  
  if (!(await verifyPassword(current_password, req.user.password_hash))) {
    return res.status(401).json({
      detail: 'Incorrect password',
    });
  }
  
  await req.user.update({ is_active: false });
  
  res.json({
    message: 'Account deactivated successfully',
    detail: 'Your account has been deactivated. Contact admin to reactivate.',
  });
}));

// POST /reactivate-account/:user_id
router.post('/reactivate-account/:user_id', authenticate, requireRole(['owner', 'admin']), asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  
  const user = await User.findByPk(user_id);
  if (!user) {
    return res.status(404).json({
      detail: 'User not found',
    });
  }
  
  if (req.user.role === 'owner' && user.shop_id !== req.user.shop_id) {
    return res.status(403).json({
      detail: 'Cannot reactivate users from other shops',
    });
  }
  
  await user.update({ is_active: true });
  
  res.json({
    message: 'Account reactivated successfully',
    user_id: user.id,
    email: user.email,
  });
}));

// POST /forgot-password
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const user = await User.findOne({ where: { email } });
  let resetToken = null;
  
  if (user) {
    resetToken = crypto.randomBytes(32).toString('base64url');
    passwordResetTokens[resetToken] = {
      user_id: user.id,
      email: user.email,
      expires_at: new Date(Date.now() + 30 * 60 * 1000),
    };
  }
  
  res.json({
    message: 'If the email exists, a password reset link has been sent',
    reset_token: resetToken,
  });
}));

// POST /reset-password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, new_password } = req.body;
  
  const tokenData = passwordResetTokens[token];
  if (!tokenData) {
    return res.status(400).json({
      detail: 'Invalid or expired reset token',
    });
  }
  
  if (new Date() > tokenData.expires_at) {
    delete passwordResetTokens[token];
    return res.status(400).json({
      detail: 'Reset token has expired',
    });
  }
  
  const user = await User.findByPk(tokenData.user_id);
  if (!user) {
    return res.status(404).json({
      detail: 'User not found',
    });
  }
  
  const passwordHash = await getPasswordHash(new_password);
  await user.update({ password_hash: passwordHash });
  
  delete passwordResetTokens[token];
  
  res.json({ message: 'Password has been reset successfully' });
}));

// POST /change-password
router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  
  if (!(await verifyPassword(current_password, req.user.password_hash))) {
    return res.status(400).json({
      detail: 'Current password is incorrect',
    });
  }
  
  const passwordHash = await getPasswordHash(new_password);
  await req.user.update({ password_hash: passwordHash });
  
  res.json({ message: 'Password changed successfully' });
}));

// PATCH /profile
router.patch('/profile', authenticate, asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const updateData = {};
  
  if (name !== undefined) {
    updateData.name = name;
  }
  
  if (email !== undefined) {
    const existingUser = await User.findOne({
      where: { email, id: { [require('sequelize').Op.ne]: req.user.id } },
    });
    if (existingUser) {
      return res.status(400).json({
        detail: 'Email already in use',
      });
    }
    updateData.email = email;
  }
  
  await req.user.update(updateData);
  
  res.json({
    id: req.user.id,
    shop_id: req.user.shop_id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    is_active: req.user.is_active,
    email_verified: req.user.email_verified,
    last_login: req.user.last_login?.toISOString() || null,
  });
}));

// POST /verify-email
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  const tokenData = emailVerificationTokens[token];
  if (!tokenData) {
    return res.status(400).json({
      detail: 'Invalid or expired verification token',
    });
  }
  
  if (new Date() > tokenData.expires_at) {
    delete emailVerificationTokens[token];
    return res.status(400).json({
      detail: 'Verification token has expired',
    });
  }
  
  const user = await User.findByPk(tokenData.user_id);
  if (!user) {
    return res.status(404).json({
      detail: 'User not found',
    });
  }
  
  await user.update({ email_verified: true });
  delete emailVerificationTokens[token];
  
  res.json({ message: 'Email verified successfully' });
}));

// POST /resend-verification
router.post('/resend-verification', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.json({
      message: 'If the email exists and is not verified, a verification link has been sent',
    });
  }
  
  if (user.email_verified) {
    return res.status(400).json({
      detail: 'Email is already verified',
    });
  }
  
  const verificationToken = crypto.randomBytes(32).toString('base64url');
  emailVerificationTokens[verificationToken] = {
    user_id: user.id,
    email: user.email,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
  
  res.json({
    message: 'Verification email sent',
    verification_token: verificationToken,
  });
}));

// GET /me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({
    id: req.user.id,
    shop_id: req.user.shop_id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    is_active: req.user.is_active,
    email_verified: req.user.email_verified,
    last_login: req.user.last_login?.toISOString() || null,
  });
}));

module.exports = router;


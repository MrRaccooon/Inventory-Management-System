/**
 * File: auth.controller.js
 * Purpose: Handle authentication HTTP requests and responses
 * Layer: Controller
 * Notes:
 * - No business logic in controllers
 * - No DB queries in controllers
 * - No HTTP objects in services
 * - Follows project coding standards
 */

const authService = require('../services/auth.service');  // ✅ CommonJS
const {
  validateRegisterOwner,
  validateRegisterEmployee,
  validateLogin,
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateProfile,
  validateChangePassword
} = require('../validators/auth.validator');  // ✅ CommonJS

/**
 * @route   POST /api/v1/auth/register/owner
 * @access  Public
 * @desc    Register new tenant owner (creates tenant + admin user)
 */
const registerOwner = async (req, res, next) => {
    try {
        const { error, value } = validateRegisterOwner(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        const result = await authService.registerTenantOwner(value);

        res.status(201).json({
            success: true,
            data: result,
            meta: {}
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/auth/register/employee
 * @access  Private (Admin/Manager only)
 * @desc    Register new employee within tenant
 */
const registerEmployee = async (req, res, next) => {
    try {
        const { error, value } = validateRegisterEmployee(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        const result = await authService.registerEmployee({
            ...value,
            tenantId: req.user.tenantId,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            data: result,
            meta: {}
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/auth/login
 * @access  Public
 * @desc    Login user with email/password
 */
const login = async (req, res, next) => {
    try {
        const { error, value } = validateLogin(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        const result = await authService.login(value);

        res.status(200).json({
            success: true,
            data: result,
            meta: {}
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/auth/logout
 * @access  Private
 * @desc    Logout user and invalidate session
 */
const logout = async (req, res, next) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];

        await authService.logout(req.user.id, accessToken);

        res.status(200).json({
            success: true,
            data: {
                message: 'Logged out successfully'
            },
            meta: {}
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/auth/refresh
 * @access  Public (with refresh token)
 * @desc    Refresh access token using refresh token
 */
const refreshToken = async (req, res, next) => {
    try {
        const { error, value } = validateRefreshToken(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        const result = await authService.refreshToken(value.refreshToken);

        res.status(200).json({
            success: true,
            data: result,
            meta: {}
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 * @desc    Send password reset email
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { error, value } = validateForgotPassword(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        await authService.forgotPassword(value.email);

        res.status(200).json({
            success: true,
            data: {
                message: 'Password reset email sent successfully'
            },
            meta: {}
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/auth/reset-password
 * @access  Public (with reset token)
 * @desc    Reset password with token
 */
const resetPassword = async (req, res, next) => {
    try {
        const { error, value } = validateResetPassword(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        await authService.resetPassword(value.token, value.newPassword);

        res.status(200).json({
            success: true,
            data: {
                message: 'Password reset successful'
            },
            meta: {}
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/auth/verify-email
 * @access  Public
 * @desc    Verify email with token from email
 */
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Verification token is required'
                }
            });
        }

        await authService.verifyEmail(token);

        res.status(200).json({
            success: true,
            data: {
                message: 'Email verified successfully'
            },
            meta: {}
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   GET /api/v1/auth/me
 * @access  Private
 * @desc    Get current authenticated user profile
 */
const getCurrentUser = async (req, res, next) => {
    try {
        const user = await authService.getCurrentUser(req.user.id);

        res.status(200).json({
            success: true,
            data: user,
            meta: {}
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   PATCH /api/v1/auth/profile
 * @access  Private
 * @desc    Update authenticated user's profile
 */
const updateProfile = async (req, res, next) => {
    try {
        const { error, value } = validateUpdateProfile(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        const updatedUser = await authService.updateProfile(req.user.id, value);

        res.status(200).json({
            success: true,
            data: updatedUser,
            meta: {}
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @route   POST /api/v1/auth/change-password
 * @access  Private
 * @desc    Change password for authenticated user
 */
const changePassword = async (req, res, next) => {
    try {
        const { error, value } = validateChangePassword(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message
                }
            });
        }

        await authService.changePassword(
            req.user.id,
            value.currentPassword,
            value.newPassword
        );

        res.status(200).json({
            success: true,
            data: {
                message: 'Password changed successfully'
            },
            meta: {}
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    registerOwner,
    registerEmployee,
    login,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    getCurrentUser,
    updateProfile,
    changePassword
};

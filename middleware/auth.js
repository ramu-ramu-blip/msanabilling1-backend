import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import logger from '../utils/logger.js';

export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token - wrapped in try-catch to distinguish DB errors from Auth errors
            try {
                // Check if database is connected first
                if (mongoose.connection.readyState !== 1) {
                    return res.status(503).json({
                        message: 'Database connection unavailable',
                        isDbError: true
                    });
                }

                req.user = await User.findById(decoded.id).select('-password');

                if (!req.user) {
                    return res.status(401).json({ message: 'User not found in system' });
                }

                if (!req.user.isActive) {
                    return res.status(401).json({ message: 'User account is deactivated' });
                }

                next();
            } catch (dbError) {
                logger.error(`Database error in auth middleware: ${dbError.message}`);
                return res.status(500).json({
                    message: 'Internal server error during authentication',
                    isDbError: true
                });
            }
        } catch (error) {
            logger.error(`Auth token verification failed: ${error.message}`);
            // Token errors (JsonWebTokenError, TokenExpiredError)
            return res.status(401).json({
                message: 'Not authorized, token failed',
                isTokenExpired: error.name === 'TokenExpiredError'
            });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Generate JWT Token
export const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d',
    });
};

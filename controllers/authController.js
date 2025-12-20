import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Private (Admin only)
export const register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                message: 'Database connection unavailable. Please try again in a moment.' 
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            role: role || 'staff',
        });

        logger.info(`New user registered: ${email} with role ${user.role}`);

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                message: 'Database connection unavailable. Please try again in a moment.' 
            });
        }

        // Check for user
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is deactivated' });
        }

        // Check if password matches
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        logger.info(`User logged in: ${email}`);

        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                message: 'Database connection unavailable. Please try again in a moment.' 
            });
        }

        const user = await User.findById(req.user.id);

        res.json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private (Admin only)
export const getUsers = async (req, res, next) => {
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                message: 'Database connection unavailable. Please try again in a moment.' 
            });
        }

        const users = await User.find().select('-password');

        res.json({
            success: true,
            count: users.length,
            data: users,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user
// @route   PUT /api/auth/users/:id
// @access  Private (Admin only)
export const updateUser = async (req, res, next) => {
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                message: 'Database connection unavailable. Please try again in a moment.' 
            });
        }

        const { name, email, role, isActive } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;
        user.isActive = isActive !== undefined ? isActive : user.isActive;

        await user.save();

        logger.info(`User updated: ${user.email}`);

        res.json({
            success: true,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private (Admin only)
export const deleteUser = async (req, res, next) => {
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                message: 'Database connection unavailable. Please try again in a moment.' 
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.deleteOne();

        logger.info(`User deleted: ${user.email}`);

        res.json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

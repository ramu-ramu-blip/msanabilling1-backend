import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// @desc    Check API health and database connection
// @route   GET /api/health
// @access  Public
router.get('/', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };

    res.json({
        success: true,
        message: 'mSana Backend API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: {
            status: dbStatus[dbState] || 'unknown',
            connected: dbState === 1
        },
        uptime: process.uptime()
    });
});

export default router;

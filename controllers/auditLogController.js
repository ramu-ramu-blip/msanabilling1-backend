import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

// @desc    Get audit logs
// @route   GET /api/audit-logs
// @access  Private/Admin
export const getAuditLogs = async (req, res) => {
    try {
        const {
            action,
            userId,
            resourceType,
            startDate,
            endDate,
            page = 1,
            limit = 50
        } = req.query;

        // Build query
        const query = {};

        if (action) query.action = action;
        if (userId) query.userId = userId;
        if (resourceType) query.resourceType = resourceType;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Execute query with pagination
        const logs = await AuditLog.find(query)
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await AuditLog.countDocuments(query);

        res.json({
            success: true,
            data: logs,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        logger.error(`Get audit logs error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to get audit logs'
        });
    }
};

// @desc    Get audit log statistics
// @route   GET /api/audit-logs/stats
// @access  Private/Admin
export const getAuditStats = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const stats = await AuditLog.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error(`Get audit stats error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to get audit statistics'
        });
    }
};

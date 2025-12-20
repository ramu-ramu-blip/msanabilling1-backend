import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

// Helper function to create audit log
export const createAuditLog = async ({
    action,
    userId,
    userName,
    userEmail,
    details = {},
    ipAddress,
    userAgent,
    resourceType,
    resourceId
}) => {
    try {
        await AuditLog.create({
            action,
            userId,
            userName,
            userEmail,
            details,
            ipAddress,
            userAgent,
            resourceType,
            resourceId
        });

        logger.info(`Audit log created: ${action} by ${userEmail}`);
    } catch (error) {
        logger.error(`Failed to create audit log: ${error.message}`);
        // Don't throw error - audit logging should not break the main operation
    }
};

// Middleware to automatically log actions
export const auditLogger = (action, resourceType) => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;

        // Override send function
        res.send = function (data) {
            // Only log if operation was successful (2xx status)
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                const resourceId = req.params.id || (typeof data === 'object' && data._id);

                createAuditLog({
                    action,
                    userId: req.user._id,
                    userName: req.user.name || req.user.email,
                    userEmail: req.user.email,
                    details: {
                        method: req.method,
                        path: req.path,
                        body: req.body
                    },
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('user-agent'),
                    resourceType,
                    resourceId
                });
            }

            // Call original send
            originalSend.call(this, data);
        };

        next();
    };
};

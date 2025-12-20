import logger from '../utils/logger.js';

// Role-based access control middleware
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (!roles.includes(req.user.role)) {
            logger.warn(
                `User ${req.user.email} attempted to access ${req.originalUrl} without proper role`
            );
            return res.status(403).json({
                message: `User role '${req.user.role}' is not authorized to access this route`,
            });
        }

        next();
    };
};

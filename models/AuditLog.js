import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            enum: [
                'USER_CREATED',
                'USER_UPDATED',
                'USER_DELETED',
                'INVOICE_CREATED',
                'INVOICE_UPDATED',
                'INVOICE_DELETED',
                'PRODUCT_CREATED',
                'PRODUCT_UPDATED',
                'PRODUCT_DELETED',
                'SETTINGS_UPDATED',
                'LOGIN_SUCCESS',
                'LOGIN_FAILED',
                'LOGOUT'
            ]
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        userName: {
            type: String,
            required: true
        },
        userEmail: {
            type: String,
            required: true
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        ipAddress: {
            type: String
        },
        userAgent: {
            type: String
        },
        resourceType: {
            type: String,
            enum: ['User', 'Invoice', 'Product', 'Settings', 'Auth']
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    {
        timestamps: true
    }
);

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;

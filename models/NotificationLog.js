import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema(
    {
        message: {
            type: String,
            required: true,
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        },
        type: {
            type: String,
            enum: ['low_stock', 'out_of_stock', 'order_request', 'system'],
            default: 'low_stock',
        },
        status: {
            type: String,
            enum: ['sent', 'failed', 'pending'],
            default: 'pending',
        },
        chatId: {
            type: String,
        },
        errorMessage: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
notificationLogSchema.index({ createdAt: -1 });
notificationLogSchema.index({ product: 1 });
notificationLogSchema.index({ status: 1 });

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);

export default NotificationLog;

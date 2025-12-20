import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import errorHandler from './middleware/errorHandler.js';
import { initCronJobs } from './cron.js';
import logger from './utils/logger.js';
import os from 'os';

// Import routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import invoiceRoutes from './routes/invoices.js';
import supplierRoutes from './routes/suppliers.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import auditLogRoutes from './routes/auditLogs.js';
import healthRoutes from './routes/health.js';

// Import services
import './services/telegramService.js';

// Load env vars
dotenv.config();

// Create Express app
const app = express();

// --- Configuration ---

// CORS
app.use(cors({
    origin: '*', // Allow all for Vercel deployment
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security
app.use(helmet());

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Database Connection (Serverless Optimized) ---
let cachedDb = null;

const connectToDatabase = async () => {
    if (cachedDb) {
        return cachedDb;
    }

    if (mongoose.connection.readyState === 1) {
        cachedDb = mongoose.connection;
        return cachedDb;
    }

    if (!process.env.MONGO_URI) {
        const error = '❌ MONGO_URI is not defined in environment variables';
        console.error(error);
        logger.error(error);
        throw new Error(error);
    }

    const opts = {
        bufferCommands: false, // Disable Mongoose buffering
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
    };

    // Connection Listeners
    mongoose.connection.on('connected', () => {
        logger.info('Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
        logger.error(`Mongoose connection error: ${err.message}`);
        console.error('❌ Mongoose Runtime Error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        logger.warn('Mongoose disconnected');
        console.log('⚠️ MongoDB Disconnected');
    });

    mongoose.connection.on('reconnected', () => {
        logger.info('Mongoose reconnected');
        console.log('✅ MongoDB Reconnected');
    });

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, opts);
        cachedDb = conn.connection;

        const env = process.env.NODE_ENV || 'development';
        const connectionType = process.env.VERCEL ? 'Serverless' : 'Standard';
        console.log(`✅ MongoDB connected via ${connectionType} Connection (${env} mode)`);

        return cachedDb;
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        logger.error(`MongoDB Connection Error: ${err.message}`);
        throw err;
    }
};

// Middleware to ensure DB connection for every request
app.use(async (req, res, next) => {
    // Skip DB connection for simple health check if we want, but better to check it.
    // For Vercel, we must ensure connection before handling request.
    try {
        await connectToDatabase();
        next();
    } catch (error) {
        console.error('Database middleware error:', error);
        res.status(503).json({
            success: false,
            message: 'Service Unavailable: Database connection failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/health', healthRoutes);

// Root Route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to mSana Billing API',
        version: '1.0.0',
        docs: '/api/health',
    });
});

// Error Handling
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
app.use(errorHandler);

// --- Server Startup (Local Dev Only) ---
const getLocalIP = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
};

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 4000;

    const startServer = async () => {
        try {
            // 1. Connect to Database first
            await connectToDatabase();

            // 2. Start Listening after DB is ready
            app.listen(PORT, '0.0.0.0', () => {
                const localIP = getLocalIP();
                logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
                console.log(`\n🚀 Server is running:`);
                console.log(`   - Local:            http://localhost:${PORT}`);
                console.log(`   - On Your Network:  http://${localIP}:${PORT}\n`);

                // 3. Initialize Cron Jobs
                initCronJobs();
                console.log('✅ Cron jobs initialized');
            });
        } catch (error) {
            console.error('FAILED TO START SERVER:', error.message);
            process.exit(1);
        }
    };

    startServer();
}

// Export app for Vercel
export default app;
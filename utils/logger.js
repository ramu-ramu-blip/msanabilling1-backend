import winston from 'winston';

const transports = [];

// In production/serverless, use Console only to avoid read-only FS errors
if (process.env.NODE_ENV === 'production') {
    transports.push(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.json()
            )
        })
    );
} else {
    // In development, use File and Console
    transports.push(
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        })
    );
}

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    defaultMeta: { service: 'msana-backend' },
    transports: transports,
});

export default logger;

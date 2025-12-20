import cron from 'node-cron';
import stockWatcher from './services/stockWatcher.js';
import logger from './utils/logger.js';

// Check stock every 5 minutes (can be configured via env)
const schedule = process.env.MIN_STOCK_CHECK_INTERVAL || '*/5 * * * *';

export const initCronJobs = () => {
    // Stock monitoring cron job
    cron.schedule(schedule, async () => {
        logger.info('Running scheduled stock check...');
        await stockWatcher.checkLowStock();
    });

    logger.info(`Stock monitoring cron job scheduled: ${schedule}`);
    console.log(`✅ Cron jobs initialized (Stock check: ${schedule})`);
};

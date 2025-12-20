import TelegramBot from 'node-telegram-bot-api';
import Product from '../models/Product.js';
import NotificationLog from '../models/NotificationLog.js';
import logger from '../utils/logger.js';

class TelegramService {
    constructor() {
        this.bot = null;
        this.adminChatIds = [];
        this.initialize();
    }

    initialize() {
        try {
            const token = process.env.TELEGRAM_BOT_TOKEN;
            const chatIds = process.env.TELEGRAM_ADMIN_CHAT_IDS;

            if (!token || !chatIds) {
                logger.warn('Telegram bot credentials not configured');
                return;
            }

            // Only use polling in development. In production (serverless), polling causes crashes/timeouts.
            // For production, we would need to set up a webhook, but for now we'll disable receiving messages
            // to prevent the app from crashing. Alerts will still work (sending messages).
            const isProduction = process.env.NODE_ENV === 'production';
            this.bot = new TelegramBot(token, { polling: !isProduction });
            this.adminChatIds = chatIds.split(',').map((id) => id.trim());

            this.setupCommands();
            logger.info('Telegram bot initialized successfully');
            console.log('✅ Telegram Bot Connected');
        } catch (error) {
            logger.error(`Telegram bot initialization error: ${error.message}`);
            console.error(`❌ Telegram Bot Error: ${error.message}`);
        }
    }

    setupCommands() {
        // /start command
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const welcomeMessage = `
🏪 *Welcome to mSana Billing Bot*

I'll help you monitor your inventory stock levels.

*Available Commands:*
/lowstock - View all low stock products
/help - Show this help message

You'll receive automatic alerts when products are running low.
      `;

            this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
        });

        // /help command
        this.bot.onText(/\/help/, (msg) => {
            const chatId = msg.chat.id;
            const helpMessage = `
📋 *mSana Billing Bot - Help*

*Commands:*
/lowstock - View all products with low stock
/start - Show welcome message
/help - Show this help

*Automatic Alerts:*
You'll receive notifications when:
• Product stock falls below minimum level
• Product is out of stock
      `;

            this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
        });

        // /lowstock command
        this.bot.onText(/\/lowstock/, async (msg) => {
            const chatId = msg.chat.id;

            try {
                const lowStockProducts = await Product.find({
                    $expr: { $lte: ['$stock', '$minStock'] },
                    isActive: true,
                })
                    .populate('supplier', 'name phone')
                    .sort({ stock: 1 });

                if (lowStockProducts.length === 0) {
                    this.bot.sendMessage(chatId, '✅ All products are well stocked!');
                    return;
                }

                let message = `⚠️ *Low Stock Alert*\n\n`;
                message += `Found ${lowStockProducts.length} product(s) with low stock:\n\n`;

                lowStockProducts.forEach((product, index) => {
                    message += `${index + 1}. *${product.name}*\n`;
                    message += `   SKU: ${product.sku}\n`;
                    message += `   Stock: ${product.stock} ${product.unit}\n`;
                    message += `   Min Level: ${product.minStock} ${product.unit}\n`;
                    if (product.supplier) {
                        message += `   Supplier: ${product.supplier.name}\n`;
                    }
                    message += `\n`;
                });

                this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            } catch (error) {
                logger.error(`Error fetching low stock products: ${error.message}`);
                this.bot.sendMessage(
                    chatId,
                    '❌ Error fetching low stock products. Please try again later.'
                );
            }
        });
    }

    async sendLowStockAlert(product) {
        if (!this.bot || this.adminChatIds.length === 0) {
            logger.warn('Telegram bot not configured, skipping alert');
            return;
        }

        const message = `
⚠️ *Low Stock Alert*

*Product:* ${product.name}
*SKU:* ${product.sku}
*Current Stock:* ${product.stock} ${product.unit}
*Minimum Level:* ${product.minStock} ${product.unit}
*Category:* ${product.category}

${product.supplier ? `*Supplier:* ${product.supplier.name}\n*Phone:* ${product.supplier.phone}` : ''}

🔔 Please reorder soon!
    `;

        for (const chatId of this.adminChatIds) {
            try {
                await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

                // Log notification
                await NotificationLog.create({
                    message: `Low stock alert for ${product.name}`,
                    product: product._id,
                    type: 'low_stock',
                    status: 'sent',
                    chatId,
                });

                logger.info(`Low stock alert sent for ${product.name} to ${chatId}`);
            } catch (error) {
                logger.error(`Failed to send Telegram alert to ${chatId}: ${error.message}`);

                // Log failed notification
                await NotificationLog.create({
                    message: `Low stock alert for ${product.name}`,
                    product: product._id,
                    type: 'low_stock',
                    status: 'failed',
                    chatId,
                    errorMessage: error.message,
                });
            }
        }
    }

    async sendOutOfStockAlert(product) {
        if (!this.bot || this.adminChatIds.length === 0) {
            return;
        }

        const message = `
🚨 *OUT OF STOCK ALERT*

*Product:* ${product.name}
*SKU:* ${product.sku}
*Category:* ${product.category}

${product.supplier ? `*Supplier:* ${product.supplier.name}\n*Phone:* ${product.supplier.phone}` : ''}

⚠️ *URGENT: This product is now out of stock!*
    `;

        for (const chatId of this.adminChatIds) {
            try {
                await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

                await NotificationLog.create({
                    message: `Out of stock alert for ${product.name}`,
                    product: product._id,
                    type: 'out_of_stock',
                    status: 'sent',
                    chatId,
                });

                logger.info(`Out of stock alert sent for ${product.name} to ${chatId}`);
            } catch (error) {
                logger.error(`Failed to send out of stock alert to ${chatId}: ${error.message}`);

                await NotificationLog.create({
                    message: `Out of stock alert for ${product.name}`,
                    product: product._id,
                    type: 'out_of_stock',
                    status: 'failed',
                    chatId,
                    errorMessage: error.message,
                });
            }
        }
    }
}

// Create singleton instance
const telegramService = new TelegramService();

export default telegramService;

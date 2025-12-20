import Product from '../models/Product.js';
import telegramService from './telegramService.js';
import logger from '../utils/logger.js';

class StockWatcher {
    constructor() {
        this.notifiedProducts = new Set(); // Track already notified products
    }

    async checkLowStock() {
        try {
            const lowStockProducts = await Product.find({
                $expr: { $lte: ['$stock', '$minStock'] },
                isActive: true,
            }).populate('supplier', 'name phone email');

            logger.info(`Stock check: Found ${lowStockProducts.length} low stock products`);

            for (const product of lowStockProducts) {
                const productKey = `${product._id}_${product.stock}`;

                // Only send alert if not already notified for this stock level
                if (!this.notifiedProducts.has(productKey)) {
                    if (product.stock === 0) {
                        await telegramService.sendOutOfStockAlert(product);
                    } else {
                        await telegramService.sendLowStockAlert(product);
                    }

                    this.notifiedProducts.add(productKey);

                    // Clean up old notifications (keep only last 1000)
                    if (this.notifiedProducts.size > 1000) {
                        const firstKey = this.notifiedProducts.values().next().value;
                        this.notifiedProducts.delete(firstKey);
                    }
                }
            }
        } catch (error) {
            logger.error(`Stock watcher error: ${error.message}`);
        }
    }

    // Reset notification tracking for a specific product (call after restocking)
    resetProductNotification(productId) {
        for (const key of this.notifiedProducts) {
            if (key.startsWith(productId.toString())) {
                this.notifiedProducts.delete(key);
            }
        }
    }
}

const stockWatcher = new StockWatcher();

export default stockWatcher;

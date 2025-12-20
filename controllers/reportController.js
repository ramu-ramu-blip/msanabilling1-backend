import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import logger from '../utils/logger.js';

// @desc    Get sales report
// @route   GET /api/reports/sales
// @access  Private
export const getSalesReport = async (req, res, next) => {
    try {
        const { startDate, endDate, groupBy } = req.query;

        let matchStage = { status: 'PAID' }; // Only count paid invoices

        // Date range filter
        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchStage.createdAt.$lte = end;
            }
        }

        let groupByField;
        if (groupBy === 'day') {
            groupByField = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        } else if (groupBy === 'month') {
            groupByField = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        } else if (groupBy === 'year') {
            groupByField = { $dateToString: { format: '%Y', date: '$createdAt' } };
        } else {
            groupByField = null;
        }

        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: groupByField,
                    totalSales: { $sum: '$netPayable' },
                    totalInvoices: { $sum: 1 },
                    averageSale: { $avg: '$netPayable' },
                    totalTax: { $sum: '$taxTotal' },
                    totalDiscount: { $sum: '$discountTotal' },
                },
            },
            { $sort: { _id: -1 } },
        ];

        const salesData = await Invoice.aggregate(pipeline);

        // Overall totals
        const overallTotals = await Invoice.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$netPayable' },
                    totalInvoices: { $sum: 1 },
                    averageSale: { $avg: '$netPayable' },
                    totalTax: { $sum: '$taxTotal' },
                    totalDiscount: { $sum: '$discountTotal' },
                },
            },
        ]);

        res.json({
            success: true,
            data: {
                salesData,
                summary: overallTotals[0] || {
                    totalRevenue: 0,
                    totalInvoices: 0,
                    averageSale: 0,
                    totalTax: 0,
                    totalDiscount: 0,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get product sales report
// @route   GET /api/reports/products
// @access  Private
export const getProductSalesReport = async (req, res, next) => {
    try {
        const { startDate, endDate, limit } = req.query;

        let matchStage = { status: 'PAID' };

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchStage.createdAt.$lte = end;
            }
        }

        const pipeline = [
            { $match: matchStage },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.drug',
                    productName: { $first: '$items.productName' },
                    totalQuantity: { $sum: '$items.qty' },
                    totalRevenue: { $sum: '$items.amount' },
                    averagePrice: { $avg: '$items.unitRate' },
                    invoiceCount: { $sum: 1 },
                },
            },
            { $sort: { totalRevenue: -1 } },
        ];

        if (limit) {
            pipeline.push({ $limit: parseInt(limit) });
        }

        const productSales = await Invoice.aggregate(pipeline);

        // Populate product details
        await Product.populate(productSales, {
            path: '_id',
            select: 'name brand generic stock'
        });

        res.json({
            success: true,
            count: productSales.length,
            data: productSales,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get inventory report
// @route   GET /api/reports/inventory
// @access  Private
export const getInventoryReport = async (req, res, next) => {
    try {
        const products = await Product.find({ isActive: true })
            .sort({ stock: 1 }); // Supplier not in Product schema anymore? Removed populate for now.

        const totalProducts = products.length;
        const lowStockProducts = products.filter(
            (p) => p.stock <= p.minStock
        ).length;
        const outOfStockProducts = products.filter((p) => p.stock === 0).length;

        const totalStockValue = products.reduce(
            (sum, p) => sum + (p.stock || 0) * (p.mrp || 0), // Using MRP as proxy for value if cost unavailable in Product
            0
        );

        // Group by Schedule instead of Category (since Category is gone)
        const categoryBreakdown = await Product.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$schedule',
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: '$stock' },
                    totalValue: { $sum: { $multiply: ['$stock', '$mrp'] } },
                },
            },
            { $sort: { totalValue: -1 } },
        ]);

        res.json({
            success: true,
            data: {
                summary: {
                    totalProducts,
                    lowStockProducts,
                    outOfStockProducts,
                    totalStockValue,
                },
                categoryBreakdown,
                products,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get dashboard stats
// @route   GET /api/reports/dashboard
// @access  Private
export const getDashboardStats = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Today's sales
        const todaySales = await Invoice.aggregate([
            { $match: { createdAt: { $gte: today }, status: 'PAID' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$netPayable' },
                    totalInvoices: { $sum: 1 },
                },
            },
        ]);

        // This month's sales
        const monthSales = await Invoice.aggregate([
            { $match: { createdAt: { $gte: thisMonth }, status: 'PAID' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$netPayable' },
                    totalInvoices: { $sum: 1 },
                },
            },
        ]);

        // Low stock products
        const lowStockCount = await Product.countDocuments({
            $expr: { $lte: ['$stock', '$minStock'] }, // minStockLevel -> minStock
            isActive: true,
        });

        // Total products
        const totalProducts = await Product.countDocuments({ isActive: true });

        // Recent invoices
        const recentInvoices = await Invoice.find()
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            success: true,
            data: {
                today: todaySales[0] || { totalRevenue: 0, totalInvoices: 0 },
                thisMonth: monthSales[0] || { totalRevenue: 0, totalInvoices: 0 },
                lowStockCount,
                totalProducts,
                recentInvoices,
            },
        });
    } catch (error) {
        next(error);
    }
};
// @desc    Get day sales report
// @route   GET /api/reports/daily
// @access  Private
export const getDaySalesReport = async (req, res, next) => {
    try {
        const { date } = req.query; // YYYY-MM-DD

        let startOfDay, endOfDay;

        if (date) {
            startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
        } else {
            // Default to today
            startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
        }

        const invoices = await Invoice.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            status: 'PAID'
        })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        const summary = {
            totalRevenue: invoices.reduce((sum, inv) => sum + inv.netPayable, 0),
            totalInvoices: invoices.length,
            cash: invoices.filter(i => i.mode === 'CASH').reduce((sum, i) => sum + i.netPayable, 0),
            upi: invoices.filter(i => i.mode === 'UPI').reduce((sum, i) => sum + i.netPayable, 0),
            card: invoices.filter(i => i.mode === 'CARD').reduce((sum, i) => sum + i.netPayable, 0),
            other: invoices.filter(i => !['CASH', 'UPI', 'CARD'].includes(i.mode)).reduce((sum, i) => sum + i.netPayable, 0),
        };

        res.json({
            success: true,
            date: startOfDay.toISOString().split('T')[0],
            data: {
                summary,
                invoices
            }
        });
    } catch (error) {
        next(error);
    }
};

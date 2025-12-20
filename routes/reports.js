import express from 'express';
import {
    getSalesReport,
    getProductSalesReport,
    getInventoryReport,
    getDashboardStats,
    getDaySalesReport,
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/sales', protect, getSalesReport);
router.get('/products', protect, getProductSalesReport);
router.get('/inventory', protect, getInventoryReport);
router.get('/dashboard', protect, getDashboardStats);
router.get('/daily', protect, getDaySalesReport);

export default router;

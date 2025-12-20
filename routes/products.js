import express from 'express';
import {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    getLowStockProducts,
    getExpiringProducts,
    getCategories,
    bulkImportProducts
} from '../controllers/productController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import multer from 'multer';
import os from 'os';

const upload = multer({ dest: os.tmpdir() });

const router = express.Router();

router.get('/categories', protect, getCategories);
router.get('/alerts/low-stock', protect, getLowStockProducts);
router.get('/alerts/expiring', protect, getExpiringProducts);
router.get('/', protect, getProducts);
router.get('/:id', protect, getProduct);
router.post('/', protect, authorize('admin', 'manager', 'pharmacy'), createProduct);
router.put('/:id', protect, authorize('admin', 'pharmacy', 'manager'), updateProduct);
router.delete('/:id', protect, authorize('admin', 'manager'), deleteProduct);
router.patch('/:id/stock', protect, authorize('admin', 'pharmacy', 'manager'), updateStock);
router.post('/bulk', protect, authorize('admin', 'manager', 'pharmacy'), upload.single('file'), bulkImportProducts);

export default router;
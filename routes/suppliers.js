import express from 'express';
import {
    getSuppliers,
    getSupplier,
    createSupplier,
    updateSupplier,
    deleteSupplier,
} from '../controllers/supplierController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = express.Router();

router.get('/', protect, getSuppliers);
router.get('/:id', protect, getSupplier);
router.post('/', protect, authorize('admin', 'manager'), createSupplier);
router.put('/:id', protect, authorize('admin', 'manager'), updateSupplier);
router.delete('/:id', protect, authorize('admin' , 'manager'), deleteSupplier);

export default router;

import express from 'express';
import {
    getInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceByInvoiceId,
} from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = express.Router();

router.get('/', protect, getInvoices);
router.get('/search/:invoiceId', protect, getInvoiceByInvoiceId);
router.get('/:id', protect, getInvoice);
router.post('/', protect, authorize('admin', 'staff', 'pharmacy'), createInvoice);
router.put('/:id', protect, authorize('admin', 'staff', 'pharmacy'), updateInvoice);
router.delete('/:id', protect, authorize('admin', 'staff', 'pharmacy'), deleteInvoice);

export default router;

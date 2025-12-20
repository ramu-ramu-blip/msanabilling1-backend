
import express from 'express';
import {
    getInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceByInvoiceId,
    getInvoicePDF,
} from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = express.Router();

router.get('/', protect, getInvoices);
router.get('/search/:invoiceId', protect, getInvoiceByInvoiceId);
router.get('/:id', protect, getInvoice);
router.get('/:id/pdf', protect, getInvoicePDF);
router.post('/', protect, authorize('admin', 'manager', 'pharmacy', 'hospital'), createInvoice);
router.put('/:id', protect, authorize('admin'), updateInvoice);
router.delete('/:id', protect, authorize('admin'), deleteInvoice);

export default router;

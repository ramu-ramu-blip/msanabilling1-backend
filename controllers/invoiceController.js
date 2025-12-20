import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Batch from '../models/Batch.js'; // Needed for stock checks
import logger from '../utils/logger.js';
import AuditLog from '../models/AuditLog.js';
import pdfService from '../services/pdfService.js';

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
export const getInvoices = async (req, res, next) => {
    try {
        const { startDate, endDate, status, search } = req.query;

        let query = {};

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Payment status filter
        if (status) {
            query.status = status;
        }

        // Search by invoice ID or patient name
        if (search) {
            query.$or = [
                { invoiceNo: { $regex: search, $options: 'i' } },
                { patientName: { $regex: search, $options: 'i' } },
                { customerPhone: { $regex: search, $options: 'i' } }
            ];
        }

        const invoices = await Invoice.find(query)
            .populate('createdBy', 'name email')
            .populate('items.drug', 'name brand generic')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: invoices.length,
            data: invoices,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
export const getInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('items.drug', 'name brand generic');

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.json({
            success: true,
            data: invoice,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate Invoice PDF
// @route   GET /api/invoices/:id/pdf
// @access  Private
export const getInvoicePDF = async (req, res, next) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const pdfPath = await pdfService.generateInvoicePDF(invoice);

        res.download(pdfPath, `invoice-${invoice.invoiceNo}.pdf`, (err) => {
            if (err) {
                logger.error(`Error downloading PDF: ${err.message}`);
                next(err);
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private (Admin/Staff)
export const createInvoice = async (req, res, next) => {
    try {
        const { items, patientName, doctorName, customerPhone, mode, notes } = req.body;

        // Validate and calculate totals
        let subTotal = 0;
        let taxTotal = 0;
        const processedItems = [];

        for (const item of items) {
            let product = null;
            if (item.drug || item.product) {
                product = await Product.findById(item.drug || item.product);
            }

            const qty = Number(item.qty || item.quantity || 0);
            const rate = Number(item.unitRate || item.price || product?.mrp || product?.sellingPrice || 0);
            const gst = Number(item.gstPct || item.gstPercent || product?.gstPercent || 0);

            const amount = rate * qty;
            const tax = amount * (gst / 100);

            subTotal += amount;
            taxTotal += tax;

            processedItems.push({
                drug: product?._id || null,
                batch: item.batch || null,
                productName: item.productName || item.name || product?.name || product?.brand || 'Custom Item',
                qty: qty,
                unitRate: rate,
                gstPct: gst,
                amount: amount,
                mrp: item.mrp || product?.mrp || rate
            });
        }

        const netPayable = Math.round(subTotal + taxTotal);
        const paidAmount = req.body.paid !== undefined ? Number(req.body.paid) : netPayable;
        const balanceAmount = netPayable - paidAmount;

        let retries = 5;
        let invoice;

        while (retries > 0) {
            try {
                invoice = await Invoice.create({
                    patientName,
                    patientAddress: req.body.patientAddress,
                    admissionDate: req.body.admissionDate,
                    dischargeDate: req.body.dischargeDate,
                    roomNo: req.body.roomNo,
                    department: req.body.department,
                    diagnosis: req.body.diagnosis,
                    doctorName,
                    customerPhone,
                    items: processedItems,
                    subTotal,
                    taxTotal,
                    netPayable,
                    paid: paidAmount,
                    balance: balanceAmount > 0 ? balanceAmount : 0,
                    mode: mode || 'CASH',
                    createdBy: req.user._id,
                    notes,
                });
                break; // Success!
            } catch (error) {
                if (error.code === 11000 && retries > 1) {
                    logger.warn(`Sequence collision detected, retrying... (${retries} attempts left)`);
                    retries--;
                    // Small delay to let the concurrent transaction finish if needed
                    await new Promise(resolve => setTimeout(resolve, 50 * (6 - retries)));
                    continue;
                }
                throw error;
            }
        }

        logger.info(`Invoice created: ${invoice.invoiceNo} by ${req.user.email}`);

        // Create Audit Log
        await AuditLog.create({
            action: 'INVOICE_CREATED',
            userId: req.user._id,
            userName: req.user.name,
            userEmail: req.user.email,
            resourceType: 'Invoice',
            resourceId: invoice._id,
            details: {
                invoiceNo: invoice.invoiceNo,
                patientName: invoice.patientName,
                amount: netPayable,
                mode: mode
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        const populatedInvoice = await Invoice.findById(invoice._id)
            .populate('createdBy', 'name email')
            .populate('items.drug', 'name brand');

        res.status(201).json({
            success: true,
            data: populatedInvoice,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private (Admin only)
export const updateInvoice = async (req, res, next) => {
    try {
        const { status, notes } = req.body;

        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        if (status) invoice.status = status;
        if (notes !== undefined) invoice.notes = notes;

        await invoice.save();

        logger.info(`Invoice updated: ${invoice.invoiceNo}`);

        // Audit Log for Update
        await AuditLog.create({
            action: 'INVOICE_UPDATED',
            userId: req.user._id,
            userName: req.user.name,
            userEmail: req.user.email,
            resourceType: 'Invoice',
            resourceId: invoice._id,
            details: {
                invoiceNo: invoice.invoiceNo,
                changes: req.body
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            data: invoice,
        });
    } catch (error) {
        next(error);
    }
};



// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private (Admin only)
export const deleteInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        await invoice.deleteOne();

        logger.info(`Invoice deleted: ${invoice.invoiceNo}`);

        // Audit Log for Delete
        await AuditLog.create({
            action: 'INVOICE_DELETED',
            userId: req.user._id,
            userName: req.user.name,
            userEmail: req.user.email,
            resourceType: 'Invoice',
            resourceId: invoice._id,
            details: {
                invoiceNo: invoice.invoiceNo
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Invoice deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get invoice by invoice ID
// @route   GET /api/invoices/search/:invoiceNo
// @access  Private
export const getInvoiceByInvoiceId = async (req, res, next) => {
    try {
        const invoice = await Invoice.findOne({ invoiceNo: req.params.invoiceNo })
            .populate('createdBy', 'name email')
            .populate('items.drug', 'name brand generic');

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        res.json({
            success: true,
            data: invoice,
        });
    } catch (error) {
        next(error);
    }
};

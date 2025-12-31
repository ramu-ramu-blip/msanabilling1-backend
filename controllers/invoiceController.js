import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Batch from '../models/Batch.js'; // Needed for stock checks
import logger from '../utils/logger.js';
import AuditLog from '../models/AuditLog.js';

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
            .sort({ createdAt: -1 })
            .lean() // Use lean() for better performance (returns plain JS objects)
            .limit(1000); // Limit results to prevent large payloads

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

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private (Admin/Staff)
export const createInvoice = async (req, res, next) => {
    try {
        const { items, patientName, doctorName, customerPhone, mode, notes } = req.body;

        // Validate and calculate totals
        let subTotal = 0;
        let discountTotal = 0;
        const processedItems = [];

        // Check if discountTotal is provided from frontend (for PharmacyBilling with global discount)
        const hasGlobalDiscount = req.body.discountTotal !== undefined && req.body.discountTotal !== null;

        for (const item of items) {
            let product = null;
            if (item.drug || item.product) {
                product = await Product.findById(item.drug || item.product);
            }

            const qty = Number(item.qty || item.quantity || 0);
            const rate = Number(item.unitRate || item.price || product?.mrp || product?.sellingPrice || 0);
            const gst = Number(item.gstPct || item.gstPercent || product?.gstPercent || 0);
            const discountPct = Number(item.discountPct || item.discount || 0);

            // Calculate item amount
            const itemAmount = rate * qty;
            let itemDiscount = 0;
            let taxableAmount = itemAmount;

            if (hasGlobalDiscount) {
                // Global discount will be applied later, item amount is full
                taxableAmount = itemAmount;
            } else {
                // Item-level discount
                itemDiscount = itemAmount * (discountPct / 100);
                taxableAmount = itemAmount - itemDiscount;
                discountTotal += itemDiscount;
            }

            subTotal += itemAmount;

            processedItems.push({
                drug: product?._id || null,
                batch: item.batch || null,
                productName: item.productName || item.name || product?.name || product?.brand || 'Custom Item',
                qty: qty,
                unitRate: rate,
                gstPct: gst,
                discountPct: discountPct,
                amount: taxableAmount, // Taxable amount (before global discount if any)
                mrp: item.mrp || product?.mrp || rate
            });
        }

        // Apply global discount if provided
        if (hasGlobalDiscount) {
            discountTotal = Number(req.body.discountTotal);
        }

        // Calculate taxable amount (subtotal - discount)
        const taxableAmount = subTotal - discountTotal;

        // Determine if inter-state (default to intra-state if not specified)
        const isInterState = req.body.isInterState === true;
        const placeOfSupply = req.body.placeOfSupply || '';
        
        // Calculate GST breakdown
        let cgst = 0;
        let sgst = 0;
        let igst = 0;
        let taxTotal = 0;

        // Check if manual tax is provided
        if (req.body.taxTotal !== undefined && req.body.taxTotal !== null) {
            // Use manual tax amount
            taxTotal = Number(req.body.taxTotal);
            if (isInterState) {
                igst = taxTotal;
            } else {
                cgst = taxTotal / 2;
                sgst = taxTotal / 2;
            }
        } else {
            // Auto calculate tax for each item based on taxable amount
            for (const item of processedItems) {
                const itemTaxableAmount = item.amount;
                const itemTax = (itemTaxableAmount * (item.gstPct || 0)) / 100;
                
                if (isInterState) {
                    // Inter-state: IGST only
                    igst += itemTax;
                } else {
                    // Intra-state: CGST + SGST (split equally)
                    cgst += itemTax / 2;
                    sgst += itemTax / 2;
                }
                taxTotal += itemTax;
            }
        }

        // Smart rounding: round to nearest whole number (no paise)
        // If decimal > 0.5, round up; if <= 0.5, round down
        const totalBeforeRoundOff = taxableAmount + taxTotal;
        const decimalPart = totalBeforeRoundOff - Math.floor(totalBeforeRoundOff);
        let netPayable;
        if (decimalPart > 0.5) {
            netPayable = Math.ceil(totalBeforeRoundOff); // Round up
        } else {
            netPayable = Math.floor(totalBeforeRoundOff); // Round down
        }
        const roundOff = netPayable - totalBeforeRoundOff;
        
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
                    discountTotal,
                    taxTotal,
                    cgst: Math.round(cgst * 100) / 100,
                    sgst: Math.round(sgst * 100) / 100,
                    igst: Math.round(igst * 100) / 100,
                    roundOff: Math.round(roundOff * 100) / 100,
                    netPayable,
                    paid: paidAmount,
                    balance: balanceAmount > 0 ? balanceAmount : 0,
                    mode: mode || 'CASH',
                    billType: req.body.billType || 'TAX_INVOICE',
                    pdfType: req.body.pdfType || 'STANDARD',
                    isInterState: isInterState,
                    placeOfSupply: placeOfSupply,
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

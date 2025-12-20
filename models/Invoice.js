import mongoose from 'mongoose';

// Invoice Schema (maps to Sale schema in specs)
const invoiceItemSchema = new mongoose.Schema({
    drug: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false // Made optional for custom billing items
    },
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: false // Made optional for custom billing items
    },
    productName: { // Snapshot
        type: String,
        required: true
    },
    qty: {
        type: Number,
        required: true,
        min: 1
    },
    freeQty: {
        type: Number,
        default: 0
    },
    unitRate: {
        type: Number,
        required: true
    },
    mrp: { // Snapshot
        type: Number
    },
    discountPct: {
        type: Number,
        default: 0
    },
    gstPct: {
        type: Number,
        required: true
    },
    amount: { // Taxable value or final amount? Usually taxable + tax.
        type: Number,
        required: true
    }
});

const invoiceSchema = new mongoose.Schema(
    {
        invoiceNo: {
            type: String,
            required: false, // Auto-generated in pre-save hook
            unique: true
        },
        patientName: {
            type: String,
            required: true, // Assuming walk-in is 'Cash Customer'
            trim: true
        },
        patientAddress: {
            type: String,
            trim: true
        },
        admissionDate: {
            type: Date
        },
        dischargeDate: {
            type: Date
        },
        roomNo: {
            type: String,
            trim: true
        },
        department: {
            type: String,
            trim: true
        },
        diagnosis: {
            type: String,
            trim: true
        },
        doctorName: {
            type: String,
            trim: true
        },
        customerPhone: { // Kept from old model
            type: String,
            trim: true
        },
        items: [invoiceItemSchema],

        mode: {
            type: String,
            enum: ['CASH', 'CARD', 'UPI', 'CREDIT'],
            default: 'CASH'
        },

        // GST Compliance Fields
        gstin: {
            type: String,
            uppercase: true,
            trim: true
        },
        placeOfSupply: {
            type: String,
            trim: true
        },
        placeOfSupplyCode: {
            type: String,
            trim: true
        },
        isInterState: {
            type: Boolean,
            default: false
        },

        // Amounts
        subTotal: { type: Number, required: true },
        discountTotal: { type: Number, default: 0 },
        taxTotal: { type: Number, default: 0 },
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },
        roundOff: { type: Number, default: 0 },
        netPayable: { type: Number, required: true },

        paid: { type: Number, required: true },
        balance: { type: Number, default: 0 },

        status: {
            type: String,
            enum: ['PAID', 'PENDING', 'RETURN'], // RETURN for credit notes
            default: 'PAID'
        },

        printed: {
            type: Boolean,
            default: false
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true // removed required temporarily if seeding without user
        },

        notes: String
    },
    {
        timestamps: true,
    }
);

// Auto-generate Invoice # if not provided
invoiceSchema.pre('save', async function (next) {
    if (!this.invoiceNo) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const day = String(date.getDate()).padStart(2, '0');
        const prefix = `INV/${year}/${day}`;

        try {
            // Find the latest invoice for today using regex to be more robust than countDocuments
            // This avoids issues if createdAt doesn't match the current day pattern (e.g. from seeding)
            const lastInvoice = await mongoose.model('Invoice').findOne(
                { invoiceNo: new RegExp(`^${prefix}`) },
                { invoiceNo: 1 },
                { sort: { invoiceNo: -1 } }
            ).lean();

            let nextSeq = 1;
            if (lastInvoice && lastInvoice.invoiceNo) {
                // Extract sequence from the end (last 4 digits)
                const lastSeqText = lastInvoice.invoiceNo.slice(-4);
                const lastSeq = parseInt(lastSeqText, 10);
                if (!isNaN(lastSeq)) {
                    nextSeq = lastSeq + 1;
                }
            }

            this.invoiceNo = `${prefix}${String(nextSeq).padStart(4, '0')}`;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Index
// invoiceNo index is automatically created by unique: true
invoiceSchema.index({ patientName: 1 });
invoiceSchema.index({ createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;

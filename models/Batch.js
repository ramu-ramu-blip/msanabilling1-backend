import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
    drug: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    batchNo: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    expiry: {
        type: Date,
        required: true
    },
    qtyReceived: {
        type: Number,
        required: true,
        min: 0
    },
    qtySold: {
        type: Number,
        default: 0,
        min: 0
    },
    unitCost: {
        type: Number,
        required: true
    },
    unitGst: {
        type: Number,
        default: 0
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    invoiceNo: {
        type: String
    },
    grnDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for FIFO retrieval: Expiry ascending, then GRN ascending
batchSchema.index({ drug: 1, expiry: 1, grnDate: 1 });

const Batch = mongoose.model('Batch', batchSchema);

export default Batch;
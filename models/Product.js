import mongoose from 'mongoose';

// DrugMaster Schema (formerly Product)
const productSchema = new mongoose.Schema(
    {
        sku: {
            type: String,
            unique: true,
            required: true,
            uppercase: true,
            trim: true
        },
        name: { // Kept for backward compatibility (will be Brand + Strength)
            type: String,
            trim: true
        },
        generic: {
            type: String,
            required: true,
            index: true
        },
        brand: {
            type: String,
            required: true,
            index: true
        },
        form: {
            type: String,
            enum: ['TAB', 'CAP', 'SYR', 'INJ', 'CRM', 'ONT', 'DRP', 'PWD'],
            required: true
        },
        strength: {
            type: String,
            required: true
        },
        schedule: {
            type: String,
            enum: ['H', 'H1', 'X', 'OTC'],
            default: 'OTC'
        },
        gstPercent: {
            type: Number,
            enum: [0, 5, 12, 18, 28],
            default: 12
        },
        hsnCode: {
            type: String,
            trim: true,
            index: true
        },
        batchNumber: {
            type: String,
            trim: true
        },
        expiryDate: {
            type: Date
        },
        mrp: {
            type: Number,
            required: true
        },
        unitsPerPack: {
            type: Number,
            default: 1
        },
        barcode: {
            type: String,
            index: true
        },
        minStock: {
            type: Number,
            default: 10
        },
        maxStock: {
            type: Number
        },
        // Virtual stock field (calculated from Batches) - for caching purposes
        stock: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true
        },
        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Supplier',
            index: true
        }
    },
    {
        timestamps: true,
    }
);

// Pre-save to set 'name' for backward compatibility
productSchema.pre('save', function (next) {
    if (!this.name) {
        this.name = `${this.brand} ${this.strength} ${this.form}`;
    }
    next();
});

const Product = mongoose.model('Product', productSchema);

export default Product;
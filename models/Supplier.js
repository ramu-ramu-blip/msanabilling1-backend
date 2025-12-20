import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide supplier name'],
            trim: true,
        },
        phone: {
            type: String,
            required: [true, 'Please provide phone number'],
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email',
            ],
        },
        address: {
            street: String,
            city: String,
            state: String,
            pincode: String,
            country: {
                type: String,
                default: 'India',
            },
        },
        gstNumber: {
            type: String,
            trim: true,
            uppercase: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
supplierSchema.index({ name: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;

import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
    {
        // Business Information
        businessName: {
            type: String,
            required: true,
            default: 'mSana Billing'
        },
        address: {
            type: String,
            default: ''
        },
        city: {
            type: String,
            default: ''
        },
        state: {
            type: String,
            default: ''
        },
        stateCode: {
            type: String,
            default: ''
        },
        pincode: {
            type: String,
            default: ''
        },
        phone: {
            type: String,
            default: ''
        },
        email: {
            type: String,
            default: ''
        },

        // GST Information
        gstin: {
            type: String,
            uppercase: true,
            trim: true,
            validate: {
                validator: function (v) {
                    if (!v) return true; // Optional field
                    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
                },
                message: 'Invalid GSTIN format'
            }
        },

        // Branding
        logoUrl: {
            type: String,
            default: ''
        },

        // Currency
        currency: {
            type: String,
            default: 'INR'
        },
        currencySymbol: {
            type: String,
            default: '₹'
        },

        // Invoice Settings
        invoicePrefix: {
            type: String,
            default: 'INV'
        },
        invoiceTerms: {
            type: String,
            default: 'Thank you for your business!'
        },

        // System Settings
        lowStockThreshold: {
            type: Number,
            default: 10
        },

        // Only one settings document should exist
        singleton: {
            type: Boolean,
            default: true,
            unique: true
        }
    },
    {
        timestamps: true
    }
);

// Ensure only one settings document exists
settingsSchema.pre('save', async function (next) {
    if (this.isNew) {
        const count = await mongoose.model('Settings').countDocuments();
        if (count > 0) {
            throw new Error('Settings document already exists. Use update instead.');
        }
    }
    next();
});

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Models
import User from '../models/User.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import Invoice from '../models/Invoice.js';
import Batch from '../models/Batch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const seedData = async () => {
    await connectDB();

    try {
        // Clear existing data
        await Invoice.deleteMany({});
        await Product.deleteMany({});
        await Supplier.deleteMany({});
        await User.deleteMany({});
        await Batch.deleteMany({});

        console.log('Data cleared');

        // Create Users
        const users = await User.create([
            {
                name: 'Admin User',
                email: 'admin@msana.com',
                password: 'admin123',
                role: 'admin',
            },
            {
                name: 'Staff User',
                email: 'staff@msana.com',
                password: 'staff123',
                role: 'staff',
            },
        ]);

        console.log('Users created');

        // Create Suppliers
        const suppliers = await Supplier.create([
            {
                name: 'PharmaPlus Distributors',
                phone: '9876543210',
                email: 'sales@pharmaplus.com',
                address: '123 Health St, Mumbai',
                gstin: '27AAAAA0000A1Z5',
            },
            {
                name: 'MediCare Supply Co',
                phone: '1234567890',
                email: 'orders@medicare.com',
                address: '456 Wellness Rd, Delhi',
                gstin: '07BBBBB0000B1Z6',
            },
        ]);

        console.log('Suppliers created');

        // Create Products
        const productsData = [
            {
                sku: 'PCM500',
                brand: 'Dolo',
                strength: '650mg',
                generic: 'Paracetamol',
                form: 'TAB',
                mrp: 30,
                stock: 500,
                minStock: 50,
                unitsPerPack: 15,
                supplier: suppliers[0]._id,
            },
            {
                sku: 'AZI500',
                brand: 'Azithral',
                strength: '500mg',
                generic: 'Azithromycin',
                form: 'TAB',
                mrp: 120,
                stock: 100,
                minStock: 20,
                unitsPerPack: 5,
                supplier: suppliers[0]._id,
            },
            {
                sku: 'CROSIN',
                brand: 'Crocin',
                strength: '500mg',
                generic: 'Paracetamol',
                form: 'TAB',
                mrp: 20,
                stock: 50,
                minStock: 100, // Low stock simulation
                unitsPerPack: 15,
                supplier: suppliers[1]._id,
            },
            {
                sku: 'AMX500',
                brand: 'Mox',
                strength: '500mg',
                generic: 'Amoxicillin',
                form: 'CAP',
                mrp: 80,
                stock: 200,
                minStock: 40,
                unitsPerPack: 10,
                supplier: suppliers[1]._id,
            },
            {
                sku: 'VITS',
                brand: 'Supradyn',
                strength: 'Multivitamin',
                generic: 'Multivitamin',
                form: 'TAB',
                mrp: 45,
                stock: 150,
                minStock: 30,
                unitsPerPack: 15,
                supplier: suppliers[0]._id,
            },
        ];

        const products = await Product.create(productsData);
        console.log('Products created');

        // Create Batches for Products
        const batchMap = {}; // Map productId -> batchId

        for (const product of products) {
            const batch = await Batch.create({
                drug: product._id,
                batchNo: `BTC${Math.floor(1000 + Math.random() * 9000)}`,
                expiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year expiry
                qtyReceived: product.stock + 1000,
                qtySold: 0,
                unitCost: product.mrp * 0.7,
                supplier: 'Seed Supplier',
            });
            batchMap[product._id] = batch._id;
        }
        console.log('Batches created');

        // Create Invoices (Sales History)
        const invoices = [];
        const today = new Date();
        const paymentModes = ['CASH', 'UPI', 'CARD'];

        // Generate past invoices for reports
        for (let i = 0; i < 50; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Last 30 days

            const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
            const invoiceItems = [];
            let subTotal = 0;
            let taxTotal = 0;

            for (let j = 0; j < numItems; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                const qty = Math.floor(Math.random() * 5) + 1;
                const rate = product.mrp;
                const gst = product.gstPercent || 12;
                const amount = rate * qty;
                const tax = amount * (gst / 100);

                subTotal += amount;
                taxTotal += tax;

                invoiceItems.push({
                    drug: product._id,
                    batch: batchMap[product._id],
                    productName: product.brand,
                    qty,
                    unitRate: rate,
                    gstPct: gst,
                    amount,
                    mrp: product.mrp,
                });
            }

            const netPayable = Math.round(subTotal + taxTotal);

            invoices.push({
                invoiceNo: `INV${Math.floor(1000 + Math.random() * 90000)}`,
                patientName: `Patient ${i + 1}`,
                doctorName: 'Dr. Smith',
                customerPhone: `9${Math.floor(Math.random() * 900000000)}`,
                items: invoiceItems,
                subTotal,
                taxTotal,
                netPayable,
                paid: netPayable,
                mode: paymentModes[Math.floor(Math.random() * paymentModes.length)],
                createdBy: users[1]._id, // Staff created
                createdAt: date,
            });
        }

        await Invoice.create(invoices);

        console.log('Invoices/Sales History created');

        console.log('Database Seeded Successfully!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

seedData();

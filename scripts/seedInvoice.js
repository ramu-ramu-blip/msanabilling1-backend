import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import Batch from '../models/Batch.js';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import Supplier from '../models/Supplier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedInvoices = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // 1. Get a user for createdBy
        const user = await User.findOne({ role: 'admin' }) || await User.findOne({ isActive: true });
        if (!user) {
            console.error('No active user found. Please run seedUsers first.');
            process.exit(1);
        }

        // 2. Get products
        const products = await Product.find();
        if (products.length === 0) {
            console.error('No products found. Please import medicines from the CSV first.');
            process.exit(1);
        }
        console.log(`Found ${products.length} products.`);

        // 3. Ensure batches exist
        const suppliers = await Supplier.find();
        for (const product of products) {
            const batchExists = await Batch.findOne({ drug: product._id });
            if (!batchExists) {
                await Batch.create({
                    drug: product._id,
                    batchNo: `B-${Math.floor(Math.random() * 900) + 100}`,
                    expiry: new Date('2026-12-31'),
                    qtyReceived: 1000,
                    qtySold: 0,
                    unitCost: product.mrp * 0.7,
                    unitGst: (product.mrp * 0.7 * (product.gstPercent || 12)) / 100,
                    supplier: product.supplier || (suppliers.length > 0 ? suppliers[0]._id : new mongoose.Types.ObjectId()),
                    grnDate: new Date()
                });
            }
        }
        const batches = await Batch.find();

        // 4. Create Invoices
        console.log('Generating 50 sample invoices...');
        await Invoice.deleteMany({});

        const patients = [
            'John Doe', 'Jane Smith', 'Robert Brown', 'Emily Davis', 'Michael Wilson',
            'Sarah Jenkins', 'David Clark', 'Linda White', 'James Taylor', 'Mary Martin',
            'Suresh Kumar', 'Anita Rao', 'Rajesh Patel', 'Priyanka Sharma', 'Vijay Singh'
        ];

        const doctors = ['Dr. Sharma', 'Dr. Reddy', 'Dr. Patil', 'Dr. Gupta', 'Dr. Verma'];

        const invoicesToCreate = [];
        const today = new Date();

        for (let i = 0; i < 50; i++) {
            const itemCount = Math.floor(Math.random() * 4) + 1;
            const items = [];
            let subTotal = 0;
            let taxTotal = 0;

            for (let j = 0; j < itemCount; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                const batch = batches.find(b => b.drug.toString() === product._id.toString());

                const qty = Math.floor(Math.random() * 3) + 1;
                const unitRate = product.mrp;
                const gstPct = product.gstPercent || 12;

                // Tax Calculation (Inclusive of GST)
                const taxableValue = (unitRate * qty) / (1 + gstPct / 100);
                const taxAmount = (unitRate * qty) - taxableValue;
                const itemTotal = unitRate * qty;

                items.push({
                    drug: product._id,
                    batch: batch?._id,
                    productName: `${product.brand} ${product.strength}`,
                    qty,
                    unitRate,
                    mrp: product.mrp,
                    gstPct,
                    amount: itemTotal
                });

                subTotal += taxableValue;
                taxTotal += taxAmount;
            }

            const netPayable = Math.round(subTotal + taxTotal);
            const date = new Date(today);
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));

            invoicesToCreate.push({
                patientName: patients[Math.floor(Math.random() * patients.length)],
                doctorName: doctors[Math.floor(Math.random() * doctors.length)],
                customerPhone: `9${Math.floor(Math.random() * 900000000) + 100000000}`,
                items,
                mode: ['CASH', 'CARD', 'UPI'][Math.floor(Math.random() * 3)],
                subTotal: Math.round(subTotal * 100) / 100,
                taxTotal: Math.round(taxTotal * 100) / 100,
                cgst: Math.round((taxTotal / 2) * 100) / 100,
                sgst: Math.round((taxTotal / 2) * 100) / 100,
                netPayable,
                paid: netPayable,
                status: 'PAID',
                createdBy: user._id,
                createdAt: date
            });
        }

        const year = new Date().getFullYear().toString().slice(-2);
        const day = String(new Date().getDate()).padStart(2, '0');

        for (let i = 0; i < invoicesToCreate.length; i++) {
            const invData = invoicesToCreate[i];
            const seq = String(i + 1).padStart(4, '0');
            const invoice = new Invoice({
                ...invData,
                invoiceNo: `INV/${year}/${day}${seq}`
            });
            await invoice.save();
        }
        console.log(`✅ Successfully seeded 50 invoices for ${products.length} medicines!`);

    } catch (error) {
        console.error('❌ Error seeding invoices:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

seedInvoices();

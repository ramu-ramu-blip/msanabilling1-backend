import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import Product from '../models/Product.js';
import Batch from '../models/Batch.js';

try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) { }

dotenv.config();

const forms = ['TAB', 'CAP', 'SYR', 'INJ', 'CRM', 'ONT', 'PWD'];
const suppliers = ['Apollo Pipes', 'Sun Pharma', 'Cipla Dist.', 'Dr. Reddy Supply', 'Abbott Local'];

const drugs = [
    { brand: 'Dolo', generic: 'Paracetamol', strength: '650mg', form: 'TAB' },
    { brand: 'Calpol', generic: 'Paracetamol', strength: '500mg', form: 'TAB' },
    { brand: 'Augmentin', generic: 'Amoxicillin + Clav', strength: '625mg', form: 'TAB' },
    { brand: 'Azithral', generic: 'Azithromycin', strength: '500mg', form: 'TAB' },
    { brand: 'Pan', generic: 'Pantoprazole', strength: '40mg', form: 'TAB' },
    { brand: 'Omez', generic: 'Omeprazole', strength: '20mg', form: 'CAP' },
    { brand: 'Rantac', generic: 'Ranitidine', strength: '150mg', form: 'TAB' },
    { brand: 'Allegra', generic: 'Fexofenadine', strength: '120mg', form: 'TAB' },
    { brand: 'Cetriz', generic: 'Cetirizine', strength: '10mg', form: 'TAB' },
    { brand: 'Ascoril', generic: 'Terbutaline + Bromhexine', strength: '100ml', form: 'SYR' },
    { brand: 'Benadryl', generic: 'Diphenhydramine', strength: '100ml', form: 'SYR' },
    { brand: 'Volini', generic: 'Diclofenac', strength: '30g', form: 'CRM' },
    { brand: 'Betadine', generic: 'Povidone Iodine', strength: '15mg', form: 'ONT' },
    { brand: 'Shelcal', generic: 'Calcium + Vit D3', strength: '500mg', form: 'TAB' },
    { brand: 'Becosules', generic: 'B-Complex + Vit C', strength: 'Standard', form: 'CAP' },
    { brand: 'Neurobion', generic: 'Vit B1+B6+B12', strength: 'Forte', form: 'TAB' },
    { brand: 'Evion', generic: 'Vitamin E', strength: '400mg', form: 'CAP' },
    { brand: 'Telma', generic: 'Telmisartan', strength: '40mg', form: 'TAB' },
    { brand: 'Amlong', generic: 'Amlodipine', strength: '5mg', form: 'TAB' },
    { brand: 'Glycomet', generic: 'Metformin', strength: '500mg', form: 'TAB' },
    { brand: 'Januvia', generic: 'Sitagliptin', strength: '100mg', form: 'TAB' },
    { brand: 'Thyronorm', generic: 'Thyroxine', strength: '50mcg', form: 'TAB' },
    { brand: 'Manforce', generic: 'Sildenafil', strength: '100mg', form: 'TAB' },
    { brand: 'Unwanted-72', generic: 'Levonorgestrel', strength: '0.75mg', form: 'TAB' },
    { brand: 'I-Pill', generic: 'Levonorgestrel', strength: '1.5mg', form: 'TAB' },
    { brand: 'Ultracet', generic: 'Tramadol + Acet', strength: '325mg', form: 'TAB' },
    { brand: 'Zerodol-P', generic: 'Aceclofenac + Para', strength: '100mg', form: 'TAB' },
    { brand: 'Combiflam', generic: 'Ibuprofen + Para', strength: '400mg', form: 'TAB' },
    { brand: 'Disprin', generic: 'Aspirin', strength: '325mg', form: 'TAB' },
    { brand: 'Ecosprin', generic: 'Aspirin', strength: '75mg', form: 'TAB' },
    { brand: 'Ativan', generic: 'Lorazepam', strength: '2mg', form: 'TAB', schedule: 'X' },
    { brand: 'Alprax', generic: 'Alprazolam', strength: '0.5mg', form: 'TAB', schedule: 'H1' },
    { brand: 'Corex', generic: 'Codeine Phosphate', strength: '100ml', form: 'SYR', schedule: 'H1' },
    { brand: 'Taxim', generic: 'Cefixime', strength: '200mg', form: 'TAB' },
    { brand: 'Monocef', generic: 'Ceftriaxone', strength: '1g', form: 'INJ' },
    { brand: 'Mikacin', generic: 'Amikacin', strength: '500mg', form: 'INJ' },
    { brand: 'Deca-Durabolin', generic: 'Nandrolone', strength: '50mg', form: 'INJ' },
    { brand: 'Sustanon', generic: 'Testosterone', strength: '250mg', form: 'INJ' },
    { brand: 'Liv-52', generic: 'Herbal', strength: 'DS', form: 'TAB' },
    { brand: 'Cystone', generic: 'Herbal', strength: 'Standard', form: 'TAB' },
    { brand: 'Revital', generic: 'Multivitamin', strength: 'H', form: 'CAP' },
    { brand: 'Electral', generic: 'ORS', strength: '21g', form: 'PWD' },
    { brand: 'Eno', generic: 'Sodium Bicarb', strength: '5g', form: 'PWD' },
    { brand: 'Vicks', generic: 'Menthol', strength: '10g', form: 'ONT' },
    { brand: 'Otrivin', generic: 'Xylometazoline', strength: '10ml', form: 'DRP' },
    { brand: 'Ciplox', generic: 'Ciprofloxacin', strength: '10ml', form: 'DRP' },
    { brand: 'Moxikind', generic: 'Amoxicillin', strength: 'CV 625', form: 'TAB' },
    { brand: 'Zinetac', generic: 'Ranitidine', strength: '300mg', form: 'TAB' },
    { brand: 'Avil', generic: 'Pheniramine', strength: '25mg', form: 'TAB' },
];

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('❌ Connection Error:', error.message);
        process.exit(1);
    }
};

const seedData = async () => {
    await connectDB();

    try {
        console.log('Clearing existing products and batches...');
        await Product.deleteMany({});
        await Batch.deleteMany({});

        console.log('Seeding products...');

        for (let i = 0; i < 50; i++) {
            // Get base drug data, or cycle through list if > length
            const baseDrug = drugs[i % drugs.length];
            const suffix = i >= drugs.length ? ` ${Math.floor(i / drugs.length) + 1}` : '';

            // Randomize some props
            const sku = `SKU-${1000 + i}`;
            const mrp = Math.floor(Math.random() * 500) + 20;
            const cost = Math.floor(mrp * 0.7); // 30% margin
            const gst = [5, 12, 18][Math.floor(Math.random() * 3)];

            const product = new Product({
                sku: sku,
                generic: baseDrug.generic,
                brand: baseDrug.brand + suffix,
                form: baseDrug.form,
                strength: baseDrug.strength,
                schedule: baseDrug.schedule || (Math.random() > 0.8 ? 'H' : 'OTC'),
                gstPercent: gst,
                mrp: mrp,
                unitsPerPack: Math.floor(Math.random() * 10) + 1,
                barcode: `${sku}-BAR`,
                minStock: 20,
                stock: 0, // Will be updated by batch
                isActive: true
            });

            const savedProduct = await product.save();

            // Create 1-3 batches for this product
            const numBatches = Math.floor(Math.random() * 3) + 1;
            let totalStock = 0;

            for (let j = 0; j < numBatches; j++) {
                const qty = Math.floor(Math.random() * 100) + 20;
                totalStock += qty;

                // Random expiry 6-24 months in future
                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + 6 + Math.floor(Math.random() * 18));

                await Batch.create({
                    drug: savedProduct._id,
                    batchNo: `B-${100 + i}-${j}`,
                    expiry: expiryDate,
                    qtyReceived: qty,
                    qtySold: 0,
                    unitCost: cost,
                    unitGst: (cost * gst) / 100,
                    supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
                    grnDate: new Date()
                });
            }

            // Update product stock cache
            savedProduct.stock = totalStock;
            await savedProduct.save();
        }

        console.log('✅ Successfully seeded 50 products and batches!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedData();

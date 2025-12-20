import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to DB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const seedUsers = async () => {
    await connectDB();

    const users = [
        {
            name: 'Pharmacy Staff',
            email: 'pharmacy@msana.com',
            password: 'password123',
            role: 'pharmacy',
        },
        {
            name: 'Hospital Staff',
            email: 'hospital@msana.com',
            password: 'password123',
            role: 'hospital',
        },
        {
            name: 'Pharmacy Manager',
            email: 'pharmacy_manager@msana.com',
            password: 'password123',
            role: 'manager',
        },
        {
            name: 'Discharge Staff',
            email: 'discharge@msana.com',
            password: 'password123',
            role: 'discharge',
        },
        {
            name: 'Admin User',
            email: 'admin@msana.com',
            password: 'admin123',
            role: 'admin',
        }
    ];

    try {
        for (const user of users) {
            const exists = await User.findOne({ email: user.email });
            if (exists) {
                // Update role if exists (in case we run this to fix roles)
                exists.role = user.role;
                await exists.save();
                console.log(`Updated user: ${user.email}`);
            } else {
                await User.create(user);
                console.log(`Created user: ${user.email}`);
            }
        }
        console.log('Users seeded successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();

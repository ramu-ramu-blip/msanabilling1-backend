import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const resetAdmin = async () => {
    try {
        let uri = process.env.MONGO_URI;
        if (!uri) {
            console.error('❌ MONGO_URI is missing in environment variables');
            process.exit(1);
        }
        console.log(`Connecting to MongoDB at: ${uri.substring(0, 20)}...`);

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB');

        const email = 'admin@msana.com';
        const password = 'admin123';

        let user = await User.findOne({ email });

        if (!user) {
            console.log('User not found. Creating new admin user...');
            user = new User({
                name: 'Admin User',
                email: email,
                password: password,
                role: 'admin',
                isActive: true
            });
        } else {
            console.log('User found. Updating password...');
            user.password = password; // Will be hashed by pre-save hook
            user.isActive = true;
            user.role = 'admin';
        }

        await user.save();
        console.log('✅ Admin user reset successfully');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

        // Verify
        const savedUser = await User.findOne({ email });
        const isMatch = await savedUser.matchPassword(password);
        console.log(`Password Verification: ${isMatch ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

resetAdmin();

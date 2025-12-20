import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const testLogin = async () => {
    try {
        let uri = process.env.MONGO_URI || 'mongodb://localhost:27017/msana-billing';
        if (uri.includes('localhost')) {
            uri = uri.replace('localhost', '127.0.0.1');
        }
        console.log(`Connecting to MongoDB at: ${uri}`);
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const email = 'admin@msana.com';
        const password = 'admin123';

        console.log(`Checking user: ${email}`);
        const user = await User.findOne({ email });

        if (!user) {
            console.log('❌ User NOT found');
            process.exit(1);
        }

        console.log('✅ User found');
        console.log(`Stored Role: ${user.role}`);
        console.log(`Stored Hash: ${user.password.substring(0, 10)}...`);

        console.log(`Comparing password: ${password}`);
        const isMatch = await user.matchPassword(password);
        // Also try direct bcrypt compare to be sure
        const directMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            console.log('✅ matchPassword() method returned TRUE');
        } else {
            console.log('❌ matchPassword() method returned FALSE');
        }

        if (directMatch) {
            console.log('✅ Direct bcrypt compare returned TRUE');
        } else {
            console.log('❌ Direct bcrypt compare returned FALSE');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

testLogin();

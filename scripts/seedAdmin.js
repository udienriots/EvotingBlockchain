const mongoose = require('../backend/node_modules/mongoose');
const Student = require('../backend/models/Student');
const bcrypt = require('../backend/node_modules/bcryptjs');
require('../backend/node_modules/dotenv').config({ path: 'backend/.env' });

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB under URI:', process.env.MONGO_URI);

        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        await Student.findOneAndUpdate(
            { role: 'admin', username: adminUsername },
            {
                username: adminUsername,
                studentId: `admin:${adminUsername}`,
                name: adminUsername,
                password: hashedPassword,
                role: 'admin',
                active: true
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );
        console.log(`Admin account created: ${adminUsername}`);

        mongoose.connection.close();
        console.log('Connection closed');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAdmin();

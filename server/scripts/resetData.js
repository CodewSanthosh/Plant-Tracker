/**
 * Reset script — DELETES ALL existing data (plants + users) and seeds
 * a clean database with one admin account and one user account.
 *
 * Run from the server folder:  npm run reset
 *
 * Default seeded accounts (change the password after first login):
 *   Admin →  admin@plants.com  /  admin123
 *   User  →  user@plants.com   /  user123
 */
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const User = require('../models/User');
const Plant = require('../models/Plant');

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set in your .env file. Aborting.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Wipe everything
    const plantResult = await Plant.deleteMany({});
    const userResult = await User.deleteMany({});
    console.log(`🗑️  Removed ${plantResult.deletedCount} plants`);
    console.log(`🗑️  Removed ${userResult.deletedCount} users`);

    // Drop any stale indexes left over from previous schema versions
    // (e.g. an old unique "username" index that no longer exists in the model)
    try {
      await User.collection.dropIndexes();
      console.log('🧹 Dropped stale user indexes');
    } catch (idxErr) {
      console.log('ℹ️  No stale user indexes to drop');
    }
    // Rebuild indexes that match the current schema
    await User.syncIndexes();

    // Seed clean accounts (password is hashed by the User model pre-save hook)
    await User.create({ email: 'admin@plants.com', password: 'admin123', role: 'admin' });
    await User.create({ email: 'user@plants.com', password: 'user123', role: 'user' });

    console.log('🌱 Seeded fresh accounts:');
    console.log('   Admin →  admin@plants.com  /  admin123');
    console.log('   User  →  user@plants.com   /  user123');
    console.log('✨ Database is clean and ready.');
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit(process.exitCode || 0);
  }
};

run();

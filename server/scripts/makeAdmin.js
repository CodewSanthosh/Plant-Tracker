/**
 * Promote an existing account to admin (or demote with the second arg).
 *
 * Usage from the server folder:
 *   npm run make-admin -- someone@example.com          → makes them an admin
 *   npm run make-admin -- someone@example.com user      → makes them a user
 */
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const User = require('../models/User');

const run = async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  const role = (process.argv[3] || 'admin').trim().toLowerCase();

  if (!email) {
    console.error('❌ Please provide an email. Example: npm run make-admin -- you@example.com');
    process.exit(1);
  }
  if (!['admin', 'user'].includes(role)) {
    console.error('❌ Role must be "admin" or "user".');
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set in your .env file. Aborting.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ No account found for ${email}`);
      process.exitCode = 1;
      return;
    }

    user.role = role;
    await user.save();
    console.log(`✨ ${email} is now ${role === 'admin' ? 'an ADMIN' : 'a USER'}.`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit(process.exitCode || 0);
  }
};

run();

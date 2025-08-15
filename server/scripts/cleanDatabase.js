const mongoose = require('mongoose');
require('dotenv').config();

const cleanDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop the users collection to remove old indexes
    const db = mongoose.connection.db;
    
    try {
      await db.collection('users').drop();
      console.log('✅ Dropped users collection');
    } catch (error) {
      console.log('ℹ️  Users collection does not exist');
    }

    console.log('✅ Database cleaned successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
    process.exit(1);
  }
};

cleanDatabase();
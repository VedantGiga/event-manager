const mongoose = require('mongoose');
require('dotenv').config();

const analyzeIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = ['events', 'users', 'bookings', 'auditlogs', 'categories'];

    for (const collectionName of collections) {
      console.log(`\n=== ${collectionName.toUpperCase()} COLLECTION ===`);
      
      const collection = db.collection(collectionName);
      
      // Get indexes
      const indexes = await collection.indexes();
      console.log('Current Indexes:');
      indexes.forEach(index => {
        console.log(`  - ${JSON.stringify(index.key)} ${index.unique ? '(UNIQUE)' : ''}`);
      });

      // Get collection stats
      const stats = await collection.stats();
      console.log(`\nCollection Stats:`);
      console.log(`  Documents: ${stats.count}`);
      console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

      // Sample query performance (for events)
      if (collectionName === 'events') {
        console.log('\nQuery Performance Analysis:');
        
        // Test common queries
        const queries = [
          { status: 'published', isPublic: true },
          { status: 'published', category: 'conference' },
          { organizerId: new mongoose.Types.ObjectId() },
          { 'dateTime.start': { $gte: new Date() } }
        ];

        for (const query of queries) {
          const explain = await collection.find(query).explain('executionStats');
          const stats = explain.executionStats;
          console.log(`  Query: ${JSON.stringify(query)}`);
          console.log(`    Execution Time: ${stats.executionTimeMillis}ms`);
          console.log(`    Documents Examined: ${stats.totalDocsExamined}`);
          console.log(`    Index Used: ${stats.executionStages.indexName || 'NONE'}`);
        }
      }
    }

    console.log('\n=== RECOMMENDATIONS ===');
    console.log('1. Monitor slow queries with MongoDB Profiler');
    console.log('2. Consider TTL indexes for AuditLogs collection');
    console.log('3. Use compound indexes for multi-field queries');
    console.log('4. Monitor index usage with db.collection.aggregate([{$indexStats:{}}])');

  } catch (error) {
    console.error('Error analyzing indexes:', error);
  } finally {
    await mongoose.disconnect();
  }
};

analyzeIndexes();
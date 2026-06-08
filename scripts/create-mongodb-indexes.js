/**
 * Script to create MongoDB indexes for guestCountry and channelName fields
 * Run with: node scripts/create-mongodb-indexes.js
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gouacht:jgIpBKEHNbgKFMt@cluster-sojori-paris.7f34h.mongodb.net/?retryWrites=true&w=majority&appName=cluster-sojori-paris';
const DB_NAME = 'srv-fulltask-db';
const COLLECTION_NAME = 'tasks';

async function createIndexes() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log(`📊 Creating indexes on ${DB_NAME}.${COLLECTION_NAME}...`);

    // Create index for guestCountry (for filtering tasks by country)
    await collection.createIndex({ guestCountry: 1 }, { background: true });
    console.log('✅ Created index: { guestCountry: 1 }');

    // Create index for channelName (for filtering tasks by OTA channel)
    await collection.createIndex({ channelName: 1 }, { background: true });
    console.log('✅ Created index: { channelName: 1 }');

    // Create compound index for ownerId + guestCountry + scheduledDate
    await collection.createIndex(
      { ownerId: 1, guestCountry: 1, scheduledDate: 1 },
      { background: true }
    );
    console.log('✅ Created index: { ownerId: 1, guestCountry: 1, scheduledDate: 1 }');

    // Create compound index for ownerId + channelName + scheduledDate
    await collection.createIndex(
      { ownerId: 1, channelName: 1, scheduledDate: 1 },
      { background: true }
    );
    console.log('✅ Created index: { ownerId: 1, channelName: 1, scheduledDate: 1 }');

    console.log('\n🎉 All indexes created successfully!');
    console.log('\nExisting indexes:');
    const indexes = await collection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

createIndexes();

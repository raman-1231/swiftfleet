const mongoose = require('mongoose');
const env = require('./env');

let mongodInstance = null;

async function connectDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    let mongoUri = env.MONGODB_URI;

    if (!mongoUri) {
      if (env.NODE_ENV === 'production') {
        throw new Error('FATAL: MONGODB_URI environment variable is required in production mode. Refusing to start embedded database.');
      }
      if (!mongodInstance) {
        console.log('⚡ [Database] No MONGODB_URI detected in environment. Initializing MongoMemoryServer for zero-config execution...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
      }
      mongoUri = mongodInstance.getUri();
      console.log(`⚡ [Database] MongoMemoryServer active at: ${mongoUri}`);
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ [Database] MongoDB connection error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [Database] MongoDB disconnected');
    });
    console.log(`✅ [Database] MongoDB Connected successfully to: ${mongoose.connection.host || 'embedded-instance'}`);
    return mongoose.connection;
  } catch (error) {
    console.error('❌ [Database] Connection error:', error.message);
    throw error;
  }
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
      mongodInstance = null;
    }
    console.log('🔌 [Database] Disconnected successfully');
  } catch (error) {
    console.error('❌ [Database] Disconnect error:', error.message);
  }
}

module.exports = { connectDB, disconnectDB };

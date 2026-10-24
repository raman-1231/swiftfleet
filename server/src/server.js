const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { initializeSocket } = require('./services/socketService');
const User = require('./models/User');
const { seedDatabase } = require('./seed/seedRunner');

const server = http.createServer(app);

// Initialize Socket.io with HTTP server
initializeSocket(server);

async function startServer() {
  try {
    await connectDB();

    // Check if database needs automated seeding
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 [Server Boot] Empty database detected. Auto-seeding demonstration personas & orders...');
      await seedDatabase();
    } else {
      console.log(`📊 [Server Boot] Database ready with ${userCount} existing user accounts.`);
    }

    server.listen(env.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 SwiftFleet API & Realtime Dispatch Server Active!`);
      console.log(`📍 Endpoint: http://localhost:${env.PORT}`);
      console.log(`⚙️  Environment: ${env.NODE_ENV}`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('❌ Failed to launch SwiftFleet Server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Gracefully terminating server...');
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});

if (require.main === module) {
  startServer();
}

module.exports = { server, startServer };

const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { initializeSocket } = require('./services/socketService');
const User = require('./models/User');
const PartnerProfile = require('./models/PartnerProfile');
const BusinessProfile = require('./models/BusinessProfile');
const Order = require('./models/Order');
const EarningsLedger = require('./models/EarningsLedger');
const { seedDatabase } = require('./seed/seedRunner');
const { backfillTrackingTokens } = require('./utils/backfillTrackingTokens');
const { recoverStaleOffers, startStaleOfferSweep, stopStaleOfferSweep } = require('./services/matchingService');

const server = http.createServer(app);

// Initialize Socket.io with HTTP server
initializeSocket(server);

async function startServer() {
  try {
    await connectDB();

    // Start listening on PORT immediately once DB is connected so Render marks service healthy
    server.listen(env.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 SwiftFleet API & Realtime Dispatch Server Active!`);
      console.log(`📍 Endpoint: http://localhost:${env.PORT}`);
      console.log(`⚙️  Environment: ${env.NODE_ENV}`);
      console.log(`======================================================\n`);
    });

    // Run background catalog initialization & migrations without delaying HTTP listener
    Promise.all([
      User.init(),
      PartnerProfile.init(),
      BusinessProfile.init(),
      Order.init(),
      EarningsLedger.init()
    ]).catch((err) => console.warn('⚠️ [Server Boot] Index init notice:', err.message));

    // Recover any active offers interrupted during server downtime
    recoverStaleOffers()
      .then(() => startStaleOfferSweep(30000))
      .catch((err) => console.warn('⚠️ [Server Boot] Stale offer recovery notice:', err.message));

    // Seeding check in non-production
    const isProduction = env.NODE_ENV === 'production';
    User.countDocuments()
      .then(async (userCount) => {
        const shouldSeed = !isProduction && (userCount === 0 || env.AUTO_SEED === true);
        if (shouldSeed) {
          console.log('🌱 [Server Boot] Non-production environment with empty database. Seeding development fixtures...');
          await seedDatabase();
        } else if (isProduction && userCount === 0) {
          console.log('ℹ️ [Server Boot] Production mode active with zero users. Auto-seeding is disabled (merchants & couriers must register organically).');
        } else {
          console.log(`📊 [Server Boot] Database connected with ${userCount} existing records.`);
        }
      })
      .catch((err) => console.warn('⚠️ [Server Boot] User count notice:', err.message));

    // Safe, idempotent migration: backfill missing tracking tokens for eligible existing orders
    backfillTrackingTokens({ dryRun: false })
      .then((backfillReport) => {
        if (backfillReport.ordersUpdated > 0) {
          console.log(`📦 [Server Boot] Backfilled tracking tokens for ${backfillReport.ordersUpdated} eligible existing orders.`);
        }
      })
      .catch((migErr) => console.warn('⚠️ [Server Boot] Tracking token backfill notice:', migErr.message));
  } catch (error) {
    console.error('❌ Failed to launch SwiftFleet Server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown on SIGINT and SIGTERM
function gracefulShutdown(signal) {
  console.log(`\n🛑 [Server] Received ${signal}. Gracefully terminating server...`);
  stopStaleOfferSweep();
  server.close(async () => {
    try {
      await disconnectDB();
      console.log('🔌 [Server] HTTP server and database disconnected cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('❌ [Server] Error during graceful disconnect:', err.message);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

if (require.main === module) {
  startServer();
}

module.exports = { server, startServer };

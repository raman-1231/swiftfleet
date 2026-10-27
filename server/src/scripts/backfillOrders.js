const { connectDB, disconnectDB } = require('../config/db');
const { backfillTrackingTokens } = require('../utils/backfillTrackingTokens');

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`\n======================================================`);
  console.log(`📦 SwiftFleet Order Tracking Backfill Utility`);
  console.log(`⚙️  Mode: ${isDryRun ? 'DRY RUN (Read Only)' : 'LIVE EXECUTION'}`);
  console.log(`======================================================\n`);

  try {
    await connectDB();
    const result = await backfillTrackingTokens({ dryRun: isDryRun });

    console.log('✅ Backfill complete. Summary Report:');
    console.log(`   - Total Orders Scanned: ${result.totalOrdersScanned}`);
    console.log(`   - Eligible Orders:      ${result.eligibleOrders}`);
    console.log(`   - Already Had Tokens:   ${result.alreadyHasToken}`);
    console.log(`   - Ineligible Skipped:   ${result.ineligibleSkipped}`);
    console.log(`   - Tokens Generated:     ${result.tokensGenerated}`);
    console.log(`   - Orders Updated:       ${result.ordersUpdated}`);
    console.log(`   - Failed Orders:        ${result.failedOrders}`);

    if (result.errors.length > 0) {
      console.warn('⚠️ Encountered errors:', result.errors);
    }
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('❌ Backfill failed:', err.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  run();
}

module.exports = run;

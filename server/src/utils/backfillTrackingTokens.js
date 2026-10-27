const crypto = require('crypto');
const Order = require('../models/Order');
const { generateTrackingToken } = require('./crypto');

const ELIGIBLE_STATUSES = ['created', 'offered', 'assigned', 'picked_up', 'delivered'];
const INELIGIBLE_STATUSES = ['draft', 'cancelled', 'expired'];

/**
 * Safe, idempotent migration to backfill tracking tokens for eligible existing orders.
 *
 * @param {Object} options
 * @param {boolean} options.dryRun - If true, scans and reports without writing to the database.
 * @param {boolean} options.includeDelivered - Include historical delivered orders (defaults to true).
 * @returns {Promise<Object>} Summary report containing counts of total, eligible, updated, skipped, and failed orders.
 */
async function backfillTrackingTokens({ dryRun = false, includeDelivered = true } = {}) {
  const allowedStatuses = includeDelivered
    ? ELIGIBLE_STATUSES
    : ELIGIBLE_STATUSES.filter((s) => s !== 'delivered');

  const report = {
    dryRun,
    totalOrdersScanned: 0,
    eligibleOrders: 0,
    alreadyHasToken: 0,
    ineligibleSkipped: 0,
    tokensGenerated: 0,
    ordersUpdated: 0,
    failedOrders: 0,
    errors: []
  };

  try {
    const orders = await Order.find({}).lean();
    report.totalOrdersScanned = orders.length;

    for (const order of orders) {
      const isEligibleStatus = allowedStatuses.includes(order.status);
      const hasValidToken = Boolean(
        order.trackingToken &&
        typeof order.trackingToken === 'string' &&
        order.trackingToken.trim().length >= 16
      );

      if (!isEligibleStatus) {
        report.ineligibleSkipped++;
        continue;
      }

      report.eligibleOrders++;

      if (hasValidToken) {
        report.alreadyHasToken++;
        continue;
      }

      // Order is eligible and missing a valid tracking token
      try {
        let uniqueToken = '';
        let attempts = 0;
        const maxAttempts = 10;

        while (!uniqueToken && attempts < maxAttempts) {
          attempts++;
          const candidate = generateTrackingToken();
          const collision = await Order.findOne({ trackingToken: candidate }).select('_id').lean();
          if (!collision) {
            uniqueToken = candidate;
          }
        }

        if (!uniqueToken) {
          throw new Error(`Failed to generate unique tracking token after ${maxAttempts} attempts`);
        }

        report.tokensGenerated++;

        if (!dryRun) {
          const updateResult = await Order.updateOne(
            { _id: order._id, $or: [{ trackingToken: { $exists: false } }, { trackingToken: null }, { trackingToken: '' }] },
            { $set: { trackingToken: uniqueToken } }
          );

          if (updateResult.modifiedCount > 0) {
            report.ordersUpdated++;
          } else {
            // Check if updated concurrently
            const recheck = await Order.findById(order._id).select('trackingToken').lean();
            if (recheck?.trackingToken) {
              report.alreadyHasToken++;
            }
          }
        } else {
          // Dry-run mode: count as would-be updated
          report.ordersUpdated++;
        }
      } catch (orderErr) {
        report.failedOrders++;
        report.errors.push({
          orderNumber: order.orderNumber,
          message: orderErr.message
        });
      }
    }

    return report;
  } catch (error) {
    report.errors.push({ message: error.message });
    throw error;
  }
}

module.exports = {
  backfillTrackingTokens,
  ELIGIBLE_STATUSES,
  INELIGIBLE_STATUSES
};

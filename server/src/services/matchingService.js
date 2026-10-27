const PartnerProfile = require('../models/PartnerProfile');
const Order = require('../models/Order');
const User = require('../models/User');
const { calculateHaversineDistance } = require('./pricingService');
const socketService = require('./socketService');
const env = require('../config/env');

const activeTimers = new Map();

/**
 * Clears an active acceptance countdown timer for a specific order
 */
function clearOrderTimer(orderId) {
  if (!orderId) return;
  const key = orderId.toString();
  if (activeTimers.has(key)) {
    clearTimeout(activeTimers.get(key));
    activeTimers.delete(key);
    console.log(`⏱️ [Dispatch] Cancelled active countdown timer for Order ${orderId}`);
  }
}

/**
 * Dispatches an order to the next closest eligible delivery partner.
 */
async function dispatchOrderOffer(orderId) {
  try {
    const order = await Order.findById(orderId).populate('businessId', 'name phone');
    if (!order) return;

    // Only dispatch if order is in a state ready for assignment
    if (order.status !== 'created' && order.status !== 'offered') {
      return;
    }

    // Clear any existing timer for this order
    clearOrderTimer(order._id);

    const [pickupLng, pickupLat] = order.pickup.coordinates;

    // Find all approved, online, and currently available partners
    const candidateProfiles = await PartnerProfile.find({
      verificationStatus: 'approved',
      isOnline: true,
      isAvailable: true,
      userId: { $nin: order.rejectedPartnerIds }
    }).populate('userId', 'name email phone status');

    // Filter out users who are suspended
    const validCandidates = candidateProfiles.filter(
      (cp) => cp.userId && cp.userId.status === 'active'
    );

    if (validCandidates.length === 0) {
      console.log(`⚠️ [Dispatch] No available couriers for Order ${order.orderNumber}. Queued.`);
      order.status = 'created';
      order.offeredPartnerId = null;
      order.offerExpiresAt = null;
      await order.save();

      socketService.broadcastOrderStatus(order, {
        message: 'Searching for available delivery partners nearby...'
      });
      return null;
    }

    // Compute proximity distance for each candidate
    const sortedCandidates = validCandidates.map((cp) => {
      const [pLng, pLat] = cp.currentCoordinates.coordinates;
      const dist = calculateHaversineDistance(pickupLng, pickupLat, pLng, pLat);
      return {
        profile: cp,
        distanceKm: parseFloat(dist.toFixed(2))
      };
    }).sort((a, b) => a.distanceKm - b.distanceKm);

    const bestCandidate = sortedCandidates[0];
    const targetCourier = bestCandidate.profile;
    const expiresAt = new Date(Date.now() + env.OFFER_TIMEOUT_SECONDS * 1000);

    // Atomically offer the order only if it is still awaiting assignment
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: { $in: ['created', 'offered'] }
      },
      {
        $set: {
          status: 'offered',
          offeredPartnerId: targetCourier.userId._id,
          offerExpiresAt: expiresAt
        },
        $push: {
          timeline: {
            status: 'offered',
            timestamp: new Date(),
            note: `Delivery offer dispatched to ${targetCourier.userId.name} (${bestCandidate.distanceKm} km away). Expiration in ${env.OFFER_TIMEOUT_SECONDS}s.`,
            actorId: targetCourier.userId._id
          }
        }
      },
      { new: true }
    );

    if (!updatedOrder) {
      console.log(`ℹ️ [Dispatch] Order ${orderId} transitioned before offer dispatch completed. Offer cancelled.`);
      return null;
    }

    console.log(`🚀 [Dispatch] Order ${updatedOrder.orderNumber} offered to ${targetCourier.userId.name} (Expires in ${env.OFFER_TIMEOUT_SECONDS}s)`);

    // Notify the target partner with delivery offer card payload (sanitized to remove handover PIN and tracking token)
    const courierSafeOfferOrder = typeof updatedOrder.toObject === 'function' ? updatedOrder.toObject() : JSON.parse(JSON.stringify(updatedOrder));
    delete courierSafeOfferOrder.handoverPin;
    delete courierSafeOfferOrder.handoverPinHash;
    delete courierSafeOfferOrder.handoverPinEncrypted;
    delete courierSafeOfferOrder.trackingToken;
    delete courierSafeOfferOrder.trackingUrl;

    socketService.emitToUser(targetCourier.userId._id, 'order_offered', {
      order: courierSafeOfferOrder,
      expiresAt,
      distanceToPickupKm: bestCandidate.distanceKm
    });

    // Broadcast status update to business, tracking room, and admin
    socketService.broadcastOrderStatus(updatedOrder, {
      message: `Offer sent to courier ${targetCourier.userId.name}`,
      expiresAt,
      distanceToPickupKm: bestCandidate.distanceKm
    });

    // Schedule automated expiration timeout
    const timeoutHandle = setTimeout(async () => {
      await handleOfferExpiration(updatedOrder._id, targetCourier.userId._id);
    }, env.OFFER_TIMEOUT_SECONDS * 1000);

    activeTimers.set(updatedOrder._id.toString(), timeoutHandle);

    return targetCourier;
  } catch (error) {
    console.error('❌ [Dispatch Error]:', error.message);
  }
}

/**
 * Handles expiration when a courier doesn't respond within time limit
 */
async function handleOfferExpiration(orderId, partnerId) {
  try {
    const order = await Order.findById(orderId).populate('businessId', 'name phone');
    // If order was already accepted or moved out of 'offered', nothing to expire
    if (!order || order.status !== 'offered' || String(order.offeredPartnerId) !== String(partnerId)) {
      return;
    }

    console.log(`⏰ [Dispatch] Offer expired for order ${order.orderNumber} by partner ${partnerId}`);

    // Append to rejection list and clear current offer
    order.rejectedPartnerIds.push(partnerId);
    order.offeredPartnerId = null;
    order.offerExpiresAt = null;
    order.status = 'created';
    order.timeline.push({
      status: 'expired',
      timestamp: new Date(),
      note: 'Offer timed out without acceptance. Searching next courier.',
      actorId: partnerId
    });

    await order.save();

    // Inform the courier that offer has expired
    socketService.emitToUser(partnerId, 'offer_expired', { orderId: order._id });

    // Inform business and admins
    socketService.broadcastOrderStatus(order, {
      message: 'Offer timed out. Re-routing to next eligible partner.'
    });

    // Cascade to next candidate
    await dispatchOrderOffer(orderId);
  } catch (err) {
    console.error('❌ [Offer Expiration Error]:', err.message);
  }
}

/**
 * Handle explicit rejection by partner
 */
async function handleOfferRejection(orderId, partnerId) {
  clearOrderTimer(orderId);

  const order = await Order.findById(orderId).populate('businessId', 'name phone');
  if (!order || order.status !== 'offered') {
    return;
  }

  order.rejectedPartnerIds.push(partnerId);
  order.offeredPartnerId = null;
  order.offerExpiresAt = null;
  order.status = 'created';
  order.timeline.push({
    status: 'offered',
    timestamp: new Date(),
    note: 'Courier declined offer. Re-routing to next available partner.',
    actorId: partnerId
  });

  await order.save();

  // Inform the declining partner
  socketService.emitToUser(partnerId, 'offer_expired', { orderId: order._id });

  // Inform business and tracking listeners
  socketService.broadcastOrderStatus(order, {
    message: 'Courier declined offer. Re-routing to next available partner.'
  });

  // Cascade to next nearest courier
  return dispatchOrderOffer(orderId);
}

/**
 * Checks for unassigned 'created' orders when a courier toggles online
 */
async function checkQueuedOrdersForPartner(partnerId) {
  try {
    const profile = await PartnerProfile.findOne({
      userId: partnerId,
      verificationStatus: 'approved',
      isOnline: true,
      isAvailable: true
    });
    if (!profile) return;

    // Find oldest unassigned order that hasn't rejected this partner
    const queuedOrder = await Order.findOne({
      status: 'created',
      rejectedPartnerIds: { $ne: partnerId }
    }).sort({ createdAt: 1 });

    if (queuedOrder) {
      console.log(`⚡ [Dispatch] Courier ${partnerId} online. Dispatching queued Order ${queuedOrder.orderNumber}`);
      await dispatchOrderOffer(queuedOrder._id);
    }
  } catch (err) {
    console.error('❌ [Check Queued Orders Error]:', err.message);
  }
}

/**
 * Scans for stale or interrupted offers after server restart or timer loss.
 * If offerExpiresAt has elapsed, triggers expiration cascade.
 * If offer is still active, reschedules the in-memory timer.
 */
async function recoverStaleOffers() {
  try {
    const now = new Date();
    // 1. Stale offers that already passed expiration
    const expiredOffers = await Order.find({
      status: 'offered',
      $or: [
        { offerExpiresAt: { $lte: now } },
        { offerExpiresAt: null }
      ]
    });

    for (const order of expiredOffers) {
      if (order.offeredPartnerId) {
        console.log(`🔄 [Recovery] Cascading stale expired offer for Order ${order.orderNumber}`);
        await handleOfferExpiration(order._id, order.offeredPartnerId);
      }
    }

    // 2. Offers that are still within their expiration window
    const liveOffers = await Order.find({
      status: 'offered',
      offerExpiresAt: { $gt: now }
    });

    for (const order of liveOffers) {
      if (order.offeredPartnerId && !activeTimers.has(order._id.toString())) {
        const remainingMs = Math.max(1000, order.offerExpiresAt.getTime() - Date.now());
        const timeoutHandle = setTimeout(async () => {
          await handleOfferExpiration(order._id, order.offeredPartnerId);
        }, remainingMs);
        activeTimers.set(order._id.toString(), timeoutHandle);
        console.log(`🔄 [Recovery] Rescheduled countdown timer for Order ${order.orderNumber} (${Math.round(remainingMs / 1000)}s remaining)`);
      }
    }
  } catch (err) {
    console.error('❌ [Offer Recovery Error]:', err.message);
  }
}

let sweepInterval = null;

function startStaleOfferSweep(intervalMs = 30000) {
  if (sweepInterval) clearInterval(sweepInterval);
  sweepInterval = setInterval(() => {
    recoverStaleOffers();
  }, intervalMs);
  if (sweepInterval.unref) sweepInterval.unref();
}

function stopStaleOfferSweep() {
  if (sweepInterval) {
    clearInterval(sweepInterval);
    sweepInterval = null;
  }
}

module.exports = {
  dispatchOrderOffer,
  handleOfferExpiration,
  handleOfferRejection,
  clearOrderTimer,
  checkQueuedOrdersForPartner,
  recoverStaleOffers,
  startStaleOfferSweep,
  stopStaleOfferSweep
};

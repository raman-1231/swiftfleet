const PartnerProfile = require('../models/PartnerProfile');
const Order = require('../models/Order');
const User = require('../models/User');
const { calculateHaversineDistance } = require('./pricingService');
const socketService = require('./socketService');
const env = require('../config/env');

const activeTimers = new Map();

/**
 * Dispatches an order to the next closest eligible delivery partner.
 */
async function dispatchOrderOffer(orderId) {
  try {
    const order = await Order.findById(orderId);
    if (!order) return;

    // Only dispatch if order is in a state ready for assignment
    if (order.status !== 'created' && order.status !== 'offered') {
      return;
    }

    // Clear any existing timer for this order
    if (activeTimers.has(orderId.toString())) {
      clearTimeout(activeTimers.get(orderId.toString()));
      activeTimers.delete(orderId.toString());
    }

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

      socketService.emitToOrder(order._id, 'order_status_updated', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: 'created',
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

    // Atomically offer the order
    order.status = 'offered';
    order.offeredPartnerId = targetCourier.userId._id;
    order.offerExpiresAt = expiresAt;
    order.timeline.push({
      status: 'offered',
      timestamp: new Date(),
      note: `Delivery offer dispatched to ${targetCourier.userId.name} (${bestCandidate.distanceKm} km away). Expiration in ${env.OFFER_TIMEOUT_SECONDS}s.`,
      actorId: targetCourier.userId._id
    });

    await order.save();

    console.log(`🚀 [Dispatch] Order ${order.orderNumber} offered to ${targetCourier.userId.name}`);

    // Notify the target partner via Socket.IO
    socketService.emitToUser(targetCourier.userId._id, 'order_offered', {
      order,
      expiresAt,
      distanceToPickupKm: bestCandidate.distanceKm
    });

    // Notify business and tracking listeners
    socketService.emitToOrder(order._id, 'order_status_updated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'offered',
      message: `Offer sent to courier ${targetCourier.userId.name}`
    });

    // Schedule automated expiration timeout
    const timeoutHandle = setTimeout(async () => {
      await handleOfferExpiration(order._id, targetCourier.userId._id);
    }, env.OFFER_TIMEOUT_SECONDS * 1000);

    activeTimers.set(order._id.toString(), timeoutHandle);

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
    const order = await Order.findById(orderId);
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

    // Try next candidate
    await dispatchOrderOffer(orderId);
  } catch (err) {
    console.error('❌ [Offer Expiration Error]:', err.message);
  }
}

/**
 * Handle explicit rejection by partner
 */
async function handleOfferRejection(orderId, partnerId) {
  if (activeTimers.has(orderId.toString())) {
    clearTimeout(activeTimers.get(orderId.toString()));
    activeTimers.delete(orderId.toString());
  }

  const order = await Order.findById(orderId);
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

  // Cascade to next nearest courier
  return dispatchOrderOffer(orderId);
}

module.exports = {
  dispatchOrderOffer,
  handleOfferExpiration,
  handleOfferRejection
};

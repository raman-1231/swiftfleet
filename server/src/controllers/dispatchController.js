const Order = require('../models/Order');
const PartnerProfile = require('../models/PartnerProfile');
const EarningsLedger = require('../models/EarningsLedger');
const { handleOfferRejection } = require('../services/matchingService');
const socketService = require('../services/socketService');

exports.getOffers = async (req, res, next) => {
  try {
    const partnerId = req.user._id;

    // Fetch orders currently offered to this partner that haven't expired
    const activeOffer = await Order.findOne({
      status: 'offered',
      offeredPartnerId: partnerId,
      offerExpiresAt: { $gt: new Date() }
    }).populate('businessId', 'name phone');

    res.json({ activeOffer });
  } catch (error) {
    next(error);
  }
};

/**
 * Atomic acceptance using conditional $set
 * Prevents concurrency race conditions between multiple couriers or expired timers
 */
exports.acceptOffer = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const partnerId = req.user._id;

    // Verify courier profile is approved
    const profile = await PartnerProfile.findOne({ userId: partnerId });
    if (!profile || profile.verificationStatus !== 'approved') {
      return res.status(403).json({
        message: 'Account not approved for dispatch. Please wait for operations verification.'
      });
    }

    // Atomic find and update
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: 'offered',
        offeredPartnerId: partnerId,
        offerExpiresAt: { $gt: new Date() }
      },
      {
        $set: {
          status: 'assigned',
          assignedPartnerId: partnerId,
          offeredPartnerId: null,
          offerExpiresAt: null
        },
        $push: {
          timeline: {
            status: 'assigned',
            timestamp: new Date(),
            note: `Accepted by courier ${req.user.name}. In route to pickup.`,
            actorId: partnerId
          }
        }
      },
      { new: true }
    ).populate('businessId', 'name phone');

    if (!updatedOrder) {
      return res.status(409).json({
        message: 'Offer is no longer available. It may have expired or been assigned to another partner.'
      });
    }

    // Mark partner as currently busy with an active order
    await PartnerProfile.updateOne(
      { userId: partnerId },
      { $set: { isAvailable: false } }
    );

    // Real-time broadcasts
    socketService.emitToOrder(updatedOrder._id, 'order_status_updated', {
      orderId: updatedOrder._id,
      orderNumber: updatedOrder.orderNumber,
      status: 'assigned',
      partnerName: req.user.name,
      partnerPhone: req.user.phone,
      message: `Courier ${req.user.name} accepted the delivery!`
    });

    socketService.emitToRole('admin', 'order_status_updated', {
      orderId: updatedOrder._id,
      status: 'assigned'
    });

    res.json({
      message: 'Delivery offer successfully accepted.',
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

exports.rejectOffer = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const partnerId = req.user._id;

    await handleOfferRejection(orderId, partnerId);

    res.json({ message: 'Delivery offer rejected. Re-routing to next eligible partner.' });
  } catch (error) {
    next(error);
  }
};

/**
 * State machine: assigned -> picked_up -> delivered
 */
exports.updateDeliveryState = async (req, res, next) => {
  try {
    const { orderId, targetStatus } = req.body;
    const partnerId = req.user._id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (String(order.assignedPartnerId) !== String(partnerId)) {
      return res.status(403).json({ message: 'You are not the assigned delivery partner for this order.' });
    }

    // Valid state transitions
    const allowedTransitions = {
      assigned: ['picked_up'],
      picked_up: ['delivered']
    };

    if (!allowedTransitions[order.status] || !allowedTransitions[order.status].includes(targetStatus)) {
      return res.status(400).json({
        message: `Invalid state transition from '${order.status}' to '${targetStatus}'.`
      });
    }

    order.status = targetStatus;
    let noteText = '';

    if (targetStatus === 'picked_up') {
      noteText = `Package collected at pickup by ${req.user.name}. In transit to destination.`;
    } else if (targetStatus === 'delivered') {
      noteText = `Package successfully delivered to recipient by ${req.user.name}.`;
    }

    order.timeline.push({
      status: targetStatus,
      timestamp: new Date(),
      note: noteText,
      actorId: partnerId
    });

    // Handle delivered completion & Exactly-Once Earnings Ledger
    if (targetStatus === 'delivered') {
      if (!order.earningsCredited) {
        order.earningsCredited = true;

        // Upsert earnings ledger with unique index guard
        await EarningsLedger.create({
          partnerId,
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.pricing.partnerPayout,
          distanceKm: order.pricing.distanceKm,
          status: 'credited',
          notes: `Payout for order ${order.orderNumber}`
        });

        // Update courier stats
        await PartnerProfile.updateOne(
          { userId: partnerId },
          {
            $inc: {
              'stats.totalDeliveries': 1,
              'stats.totalEarned': order.pricing.partnerPayout
            },
            $set: { isAvailable: true } // Courier is free for new orders
          }
        );
      }
    }

    await order.save();

    // Broadcast live event
    socketService.emitToOrder(order._id, 'order_status_updated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: targetStatus,
      message: noteText
    });

    res.json({
      message: `Delivery state updated to '${targetStatus}'.`,
      order
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleAvailability = async (req, res, next) => {
  try {
    const partnerId = req.user._id;
    const profile = await PartnerProfile.findOne({ userId: partnerId });

    if (!profile) {
      return res.status(404).json({ message: 'Courier profile not found.' });
    }

    profile.isOnline = !profile.isOnline;
    await profile.save();

    res.json({
      message: `Courier status updated to ${profile.isOnline ? 'Online' : 'Offline'}.`,
      isOnline: profile.isOnline,
      isAvailable: profile.isAvailable
    });
  } catch (error) {
    next(error);
  }
};

exports.updateLocation = async (req, res, next) => {
  try {
    const partnerId = req.user._id;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and Longitude are required.' });
    }

    await PartnerProfile.updateOne(
      { userId: partnerId },
      {
        $set: {
          currentCoordinates: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          lastLocationUpdate: new Date()
        }
      }
    );

    res.json({ message: 'Courier coordinates recorded successfully.' });
  } catch (error) {
    next(error);
  }
};

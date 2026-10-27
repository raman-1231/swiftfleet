const Order = require('../models/Order');
const PartnerProfile = require('../models/PartnerProfile');
const { calculateDeliveryQuote } = require('../services/pricingService');
const { dispatchOrderOffer, clearOrderTimer } = require('../services/matchingService');
const socketService = require('../services/socketService');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Cryptographically secure generator for human-readable order references like SWF-74291
function generateOrderNumber() {
  const randNum = crypto.randomInt(10000, 100000);
  return `SWF-${randNum}`;
}

exports.estimateOrder = async (req, res, next) => {
  try {
    const { pickupCoords, dropoffCoords, weightKg, category } = req.body;

    if (!pickupCoords || !dropoffCoords || pickupCoords.length !== 2 || dropoffCoords.length !== 2) {
      return res.status(400).json({ message: 'Valid pickup and dropoff coordinates [lng, lat] are required.' });
    }

    const quote = calculateDeliveryQuote({
      pickupCoords,
      dropoffCoords,
      weightKg: Number(weightKg) || 1.5,
      category: category || 'general'
    });

    res.json(quote);
  } catch (error) {
    next(error);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const {
      pickup,
      dropoff,
      packageDetails
    } = req.body;

    if (!pickup?.address || !pickup?.coordinates || !dropoff?.address || !dropoff?.coordinates) {
      return res.status(400).json({ message: 'Complete pickup and dropoff locations are required.' });
    }

    // Server-enforced pricing calculation (never trust client amounts)
    const quote = calculateDeliveryQuote({
      pickupCoords: pickup.coordinates,
      dropoffCoords: dropoff.coordinates,
      weightKg: packageDetails?.weightKg || 1.5,
      category: packageDetails?.category || 'general'
    });

    const orderNumber = generateOrderNumber();
    const rawHandoverPin = crypto.randomInt(1000, 10000).toString();
    const handoverPinHash = await bcrypt.hash(rawHandoverPin, 10);

    const order = await Order.create({
      orderNumber,
      businessId: req.user._id,
      status: 'created',
      handoverPin: rawHandoverPin,
      handoverPinHash,
      pickup: {
        address: pickup.address,
        pincode: pickup.pincode || '',
        contactName: pickup.contactName || req.user.name,
        phone: pickup.phone || req.user.phone || '',
        coordinates: pickup.coordinates,
        instructions: pickup.instructions || ''
      },
      dropoff: {
        address: dropoff.address,
        pincode: dropoff.pincode || '',
        contactName: dropoff.contactName || 'Recipient',
        phone: dropoff.phone || '',
        coordinates: dropoff.coordinates,
        instructions: dropoff.instructions || ''
      },
      packageDetails: {
        category: packageDetails?.category || 'general',
        weightKg: packageDetails?.weightKg || 1.5,
        fragile: !!packageDetails?.fragile,
        notes: packageDetails?.notes || ''
      },
      pricing: {
        currency: quote.pricingBreakdown.currency || 'INR',
        currencySymbol: quote.pricingBreakdown.currencySymbol || '₹',
        baseFare: quote.pricingBreakdown.baseFare,
        distanceKm: quote.roadDistanceKm,
        distanceCost: quote.pricingBreakdown.distanceCost,
        weightCost: quote.pricingBreakdown.weightCost,
        categoryCharge: quote.pricingBreakdown.categoryCharge || 0,
        totalCost: quote.pricingBreakdown.totalCost,
        partnerPayout: quote.pricingBreakdown.partnerPayout
      },
      estimatedDurationMins: quote.estimatedDurationMins,
      timeline: [
        {
          status: 'created',
          timestamp: new Date(),
          note: `Order registered by ${req.user.name}. Ready for automated courier dispatch.`,
          actorId: req.user._id
        }
      ]
    });

    const orderObj = order.toObject();
    delete orderObj.handoverPinHash;

    // Notify administrators and order listeners
    socketService.emitToRole('admin', 'new_order_created', { order: orderObj });

    // Trigger proximity dispatch engine asynchronously
    dispatchOrderOffer(order._id);

    res.status(201).json({
      message: 'Delivery order successfully created and queued for courier dispatch.',
      order: orderObj
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    // Businesses only view their own orders
    if (req.user.role === 'business') {
      query.businessId = req.user._id;
    } else if (req.user.role === 'partner') {
      // Couriers view orders assigned to them
      query.assignedPartnerId = req.user._id;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'dropoff.contactName': { $regex: search, $options: 'i' } },
        { 'dropoff.address': { $regex: search, $options: 'i' } },
        { 'pickup.address': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate('assignedPartnerId', 'name phone')
        .populate('businessId', 'name phone'),
      Order.countDocuments(query)
    ]);

    const sanitizedOrders = orders.map((o) => {
      const obj = o.toObject();
      if (req.user.role === 'partner') {
        delete obj.handoverPin;
        delete obj.handoverPinHash;
      } else {
        delete obj.handoverPinHash;
      }
      return obj;
    });

    res.json({
      orders: sanitizedOrders,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('businessId', 'name email phone')
      .populate('assignedPartnerId', 'name phone email')
      .populate('offeredPartnerId', 'name phone')
      .populate('timeline.actorId', 'name role');

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Role-based authorization check
    const currentUserId = req.user._id.toString();

    if (req.user.role === 'business') {
      const businessOwnerId = order.businessId?._id ? order.businessId._id.toString() : order.businessId?.toString();
      if (businessOwnerId !== currentUserId) {
        return res.status(403).json({ message: 'Forbidden: You do not own this order.' });
      }
    } else if (req.user.role === 'partner') {
      const assignedPartnerId = order.assignedPartnerId?._id
        ? order.assignedPartnerId._id.toString()
        : order.assignedPartnerId?.toString();
      const offeredPartnerId = order.offeredPartnerId?._id
        ? order.offeredPartnerId._id.toString()
        : order.offeredPartnerId?.toString();

      // Couriers can only view orders assigned to them or actively offered to them
      if (assignedPartnerId !== currentUserId && offeredPartnerId !== currentUserId) {
        return res.status(403).json({ message: 'Forbidden: You are not assigned or offered this delivery order.' });
      }
    }

    const orderObj = order.toObject();
    if (req.user.role === 'partner') {
      delete orderObj.handoverPin;
      delete orderObj.handoverPinHash;
    } else {
      delete orderObj.handoverPinHash;
    }

    res.json(orderObj);
  } catch (error) {
    next(error);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Verify business ownership or admin role
    if (req.user.role === 'business') {
      const businessOwnerId = order.businessId?._id ? order.businessId._id.toString() : order.businessId?.toString();
      if (businessOwnerId !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: You do not own this order.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to cancel orders.' });
    }

    if (['picked_up', 'delivered'].includes(order.status)) {
      return res.status(400).json({
        message: `Order cannot be cancelled because it is already in state '${order.status}'. Please contact support.`
      });
    }

    order.status = 'cancelled';
    order.cancellationReason = req.body.reason || 'Cancelled by business operator';
    order.timeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Order cancelled. Reason: ${order.cancellationReason}`,
      actorId: req.user._id
    });

    await order.save();

    // Cancel in-memory offer timer if active
    clearOrderTimer(order._id);

    // If an assigned partner was working on this order, restore their availability
    if (order.assignedPartnerId) {
      await PartnerProfile.updateOne(
        { userId: order.assignedPartnerId },
        { $set: { isAvailable: true } }
      );
    }

    socketService.broadcastOrderStatus(order, {
      message: `Order was cancelled. Reason: ${order.cancellationReason}`
    });

    res.json({ message: 'Order successfully cancelled.', order });
  } catch (error) {
    next(error);
  }
};

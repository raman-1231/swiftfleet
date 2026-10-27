const bcrypt = require('bcryptjs');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const { encrypt, decrypt, generateDeliveryPin } = require('../utils/crypto');

/**
 * Public customer-facing tracking endpoint.
 * Authenticated exclusively by the unguessable tracking token.
 * Discloses the active delivery PIN to the customer, but never to couriers or merchants.
 */
exports.getOrderTracking = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string' || token.length < 16) {
      return res.status(404).json({ message: 'Order tracking link is invalid or expired.' });
    }

    const order = await Order.findOne({ trackingToken: token })
      .populate('assignedPartnerId', 'name phone')
      .populate('businessId', 'name');

    if (!order || order.trackingTokenRevoked) {
      return res.status(404).json({ message: 'Order tracking link is invalid or expired.' });
    }

    // Evaluate PIN status
    let pinState = {
      status: 'pending',
      pin: null,
      expiresAt: null,
      attemptsRemaining: 5,
      message: ''
    };

    if (order.status === 'delivered') {
      pinState = {
        status: 'delivered',
        pin: null,
        expiresAt: null,
        attemptsRemaining: 0,
        message: 'Package delivered. Handover PIN was successfully authenticated.'
      };
    } else if (order.status === 'cancelled') {
      pinState = {
        status: 'cancelled',
        pin: null,
        expiresAt: null,
        attemptsRemaining: 0,
        message: 'Order cancelled. Delivery PIN is inactive.'
      };
    } else if (order.handoverPinConsumed) {
      pinState = {
        status: 'consumed',
        pin: null,
        expiresAt: null,
        attemptsRemaining: 0,
        message: 'PIN verified and completed.'
      };
    } else if (order.handoverPinLocked) {
      pinState = {
        status: 'locked',
        pin: null,
        expiresAt: order.handoverPinExpiresAt,
        attemptsRemaining: 0,
        message: 'Verification locked due to excessive failed attempts. Please request a new PIN.'
      };
    } else if (order.handoverPinExpiresAt && new Date() > new Date(order.handoverPinExpiresAt)) {
      pinState = {
        status: 'expired',
        pin: null,
        expiresAt: order.handoverPinExpiresAt,
        attemptsRemaining: Math.max(0, 5 - (order.handoverPinAttempts || 0)),
        message: 'PIN has expired. Please request a new PIN to provide to your courier.'
      };
    } else if (order.handoverPinEncrypted) {
      try {
        const decryptedPin = decrypt(order.handoverPinEncrypted);
        pinState = {
          status: 'active',
          pin: decryptedPin,
          expiresAt: order.handoverPinExpiresAt,
          attemptsRemaining: Math.max(0, 5 - (order.handoverPinAttempts || 0)),
          message: 'Provide this PIN to your delivery courier upon package arrival.'
        };
      } catch (decErr) {
        pinState = {
          status: 'expired',
          pin: null,
          expiresAt: null,
          attemptsRemaining: 5,
          message: 'Unable to decrypt PIN. Please request a new PIN.'
        };
      }
    }

    let cooldownSeconds = 0;
    if (order.handoverPinCooldownUntil && new Date(order.handoverPinCooldownUntil) > new Date()) {
      cooldownSeconds = Math.ceil((new Date(order.handoverPinCooldownUntil).getTime() - Date.now()) / 1000);
    }

    // Mask phone number for customer privacy (display only last 4 digits)
    const rawDropoffPhone = order.dropoff?.phone || '';
    const maskedDropoffPhone = rawDropoffPhone.length > 4
      ? '••••••' + rawDropoffPhone.slice(-4)
      : rawDropoffPhone;

    res.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        estimatedDurationMins: order.estimatedDurationMins,
        pickup: {
          address: order.pickup?.address,
          coordinates: order.pickup?.coordinates,
          instructions: order.pickup?.instructions
        },
        dropoff: {
          address: order.dropoff?.address,
          coordinates: order.dropoff?.coordinates,
          contactName: order.dropoff?.contactName,
          phone: maskedDropoffPhone,
          instructions: order.dropoff?.instructions
        },
        packageDetails: {
          category: order.packageDetails?.category,
          weightKg: order.packageDetails?.weightKg,
          fragile: order.packageDetails?.fragile
        },
        timeline: order.timeline || [],
        currentPartnerLocation: order.currentPartnerLocation,
        assignedPartner: order.assignedPartnerId ? {
          name: order.assignedPartnerId.name
        } : null,
        merchantName: order.businessId?.name || 'Verified Merchant'
      },
      deliveryPin: pinState,
      cooldownSeconds
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerates the delivery PIN on demand from the customer tracking page.
 * Enforces per-order cooldown and server-side rate limits.
 */
exports.regeneratePin = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string') {
      return res.status(404).json({ message: 'Order tracking link is invalid or expired.' });
    }

    const order = await Order.findOne({ trackingToken: token });
    if (!order || order.trackingTokenRevoked) {
      return res.status(404).json({ message: 'Order tracking link is invalid or expired.' });
    }

    if (['delivered', 'cancelled', 'expired'].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot regenerate delivery PIN for an order in '${order.status}' state.`
      });
    }

    // Enforce per-order cooldown (30 seconds default)
    if (order.handoverPinCooldownUntil && new Date() < new Date(order.handoverPinCooldownUntil)) {
      const remainingSeconds = Math.ceil((new Date(order.handoverPinCooldownUntil).getTime() - Date.now()) / 1000);
      return res.status(429).json({
        message: `Please wait ${remainingSeconds}s before requesting another PIN.`,
        cooldownSeconds: remainingSeconds
      });
    }

    // Generate new 6-digit PIN and crypto assets
    const newPin = generateDeliveryPin();
    const pinHash = await bcrypt.hash(newPin, 10);
    const pinEncrypted = encrypt(newPin);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    const cooldownUntil = new Date(Date.now() + 30 * 1000); // 30 seconds cooldown

    // Atomic conditional update prevents race conditions
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        status: { $nin: ['delivered', 'cancelled', 'expired'] },
        $or: [
          { handoverPinCooldownUntil: { $lte: new Date() } },
          { handoverPinCooldownUntil: null }
        ]
      },
      {
        $set: {
          handoverPinEncrypted: pinEncrypted,
          handoverPinHash: pinHash,
          handoverPinExpiresAt: expiresAt,
          handoverPinLastGeneratedAt: new Date(),
          handoverPinCooldownUntil: cooldownUntil,
          handoverPinAttempts: 0,
          handoverPinLocked: false,
          handoverPinVerified: false,
          handoverPinConsumed: false
        }
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(409).json({
        message: 'Could not regenerate PIN due to a concurrent request or active cooldown. Please refresh.'
      });
    }

    // Audit log regeneration event without storing plaintext PIN
    try {
      await AuditLog.create({
        actorName: 'Customer (Tracking Portal)',
        actorRole: 'customer',
        action: 'DELIVERY_PIN_REGENERATED',
        targetType: 'Order',
        targetId: order._id.toString(),
        metadata: {
          orderNumber: order.orderNumber,
          expiresAt
        },
        ipAddress: req.ip || '127.0.0.1'
      });
    } catch (_) {}

    res.json({
      message: 'New delivery PIN generated successfully.',
      deliveryPin: {
        status: 'active',
        pin: newPin,
        expiresAt,
        attemptsRemaining: 5,
        message: 'Provide this new 6-digit PIN to your delivery courier upon package arrival.'
      },
      cooldownSeconds: 30
    });
  } catch (error) {
    next(error);
  }
};

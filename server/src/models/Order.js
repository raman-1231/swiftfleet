const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt, generateTrackingToken } = require('../utils/crypto');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    trackingToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    trackingTokenRevoked: {
      type: Boolean,
      default: false
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assignedPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'created', 'offered', 'assigned', 'picked_up', 'delivered', 'cancelled', 'expired'],
      default: 'created',
      index: true
    },
    offeredPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    offerExpiresAt: {
      type: Date,
      default: null
    },
    rejectedPartnerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    pickup: {
      address: { type: String, required: true },
      pincode: { type: String, default: '' },
      contactName: { type: String, default: 'Store Manager' },
      phone: { type: String, default: '' },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true
      },
      instructions: { type: String, default: '' }
    },
    dropoff: {
      address: { type: String, required: true },
      pincode: { type: String, default: '' },
      contactName: { type: String, required: true },
      phone: { type: String, required: true },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true
      },
      instructions: { type: String, default: '' }
    },
    packageDetails: {
      category: {
        type: String,
        enum: ['documents', 'food_beverage', 'groceries', 'electronics', 'pharmaceuticals', 'general'],
        default: 'general'
      },
      weightKg: { type: Number, default: 1.5 },
      fragile: { type: Boolean, default: false },
      notes: { type: String, default: '' }
    },
    pricing: {
      currency: { type: String, default: 'INR' },
      currencySymbol: { type: String, default: '₹' },
      baseFare: { type: Number, required: true },
      distanceKm: { type: Number, required: true },
      distanceCost: { type: Number, required: true },
      weightCost: { type: Number, default: 0 },
      categoryCharge: { type: Number, default: 0 },
      totalCost: { type: Number, required: true },
      partnerPayout: { type: Number, required: true }
    },
    estimatedDurationMins: {
      type: Number,
      required: true
    },
    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ],
    currentPartnerLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date }
    },
    earningsCredited: {
      type: Boolean,
      default: false
    },
    handoverPinEncrypted: {
      type: String,
      default: ''
    },
    handoverPinHash: {
      type: String,
      default: ''
    },
    handoverPinExpiresAt: {
      type: Date,
      default: null
    },
    handoverPinLastGeneratedAt: {
      type: Date,
      default: null
    },
    handoverPinCooldownUntil: {
      type: Date,
      default: null
    },
    handoverPinAttempts: {
      type: Number,
      default: 0
    },
    handoverPinLocked: {
      type: Boolean,
      default: false
    },
    handoverPinVerified: {
      type: Boolean,
      default: false
    },
    handoverPinConsumed: {
      type: Boolean,
      default: false
    },
    cancellationReason: {
      type: String,
      default: ''
    },
    disputed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Virtual getter/setter for handoverPin to keep backward-compatibility with tests while encrypting at rest
orderSchema.virtual('handoverPin')
  .get(function () {
    if (this._tempHandoverPin) return this._tempHandoverPin;
    if (this.handoverPinEncrypted) {
      try {
        return decrypt(this.handoverPinEncrypted);
      } catch (_) {
        return '';
      }
    }
    return '';
  })
  .set(function (val) {
    this._tempHandoverPin = val ? val.toString().trim() : '';
  });

orderSchema.pre('save', async function (next) {
  try {
    if (!this.trackingToken) {
      this.trackingToken = generateTrackingToken();
    }

    if (this._tempHandoverPin) {
      const pinStr = this._tempHandoverPin;
      this.handoverPinEncrypted = encrypt(pinStr);
      if (!this.handoverPinHash) {
        this.handoverPinHash = await bcrypt.hash(pinStr, 10);
      }
      if (!this.handoverPinExpiresAt) {
        this.handoverPinExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      }
      if (!this.handoverPinLastGeneratedAt) {
        this.handoverPinLastGeneratedAt = new Date();
      }
      this._tempHandoverPin = undefined;
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Compound indexes for dispatch and listing queries
orderSchema.index({ businessId: 1, status: 1 });
orderSchema.index({ assignedPartnerId: 1, status: 1 });
orderSchema.index({ offeredPartnerId: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);

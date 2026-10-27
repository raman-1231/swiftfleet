const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      index: true
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
    handoverPin: {
      type: String,
      default: ''
    },
    handoverPinHash: {
      type: String,
      default: ''
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

// Compound indexes for dispatch and listing queries
orderSchema.index({ businessId: 1, status: 1 });
orderSchema.index({ assignedPartnerId: 1, status: 1 });
orderSchema.index({ offeredPartnerId: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);

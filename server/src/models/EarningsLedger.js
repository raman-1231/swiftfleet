const mongoose = require('mongoose');

const earningsLedgerSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true // Guarantees exactly-once ledger recording per order
    },
    orderNumber: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    currencySymbol: {
      type: String,
      default: '₹'
    },
    distanceKm: {
      type: Number,
      default: 0
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['credited', 'settled', 'held'],
      default: 'credited'
    },
    notes: {
      type: String,
      default: 'Standard delivery completion payout'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('EarningsLedger', earningsLedgerSchema);

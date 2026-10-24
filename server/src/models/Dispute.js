const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    orderNumber: {
      type: String,
      required: true
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    raisedByRole: {
      type: String,
      enum: ['business', 'partner'],
      required: true
    },
    category: {
      type: String,
      enum: ['damaged_item', 'late_delivery', 'wrong_address', 'missing_package', 'payment_issue', 'other'],
      default: 'late_delivery'
    },
    reason: {
      type: String,
      required: [true, 'Dispute reason is required']
    },
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved'],
      default: 'open',
      index: true
    },
    resolutionNotes: {
      type: String,
      default: ''
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Dispute', disputeSchema);

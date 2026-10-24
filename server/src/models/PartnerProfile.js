const mongoose = require('mongoose');

const partnerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true
    },
    verificationNotes: {
      type: String,
      default: ''
    },
    reviewedAt: {
      type: Date
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vehicleType: {
      type: String,
      enum: ['bicycle', 'scooter', 'motorcycle', 'car', 'van'],
      default: 'motorcycle'
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: ''
    },
    idDocumentType: {
      type: String,
      enum: ['National ID', 'Driver License', 'Passport', 'Work Permit'],
      default: 'Driver License'
    },
    idDocumentNumber: {
      type: String,
      trim: true,
      default: ''
    },
    idDocumentUrl: {
      type: String,
      default: ''
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true
    },
    currentCoordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [-73.9851, 40.7484] // Default baseline coordinates (New York Midtown)
      }
    },
    lastLocationUpdate: {
      type: Date,
      default: Date.now
    },
    stats: {
      totalDeliveries: { type: Number, default: 0 },
      rating: { type: Number, default: 5.0 },
      acceptanceRate: { type: Number, default: 100 },
      totalEarned: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

// 2dsphere index for proximity queries
partnerProfileSchema.index({ currentCoordinates: '2dsphere' });

module.exports = mongoose.model('PartnerProfile', partnerProfileSchema);

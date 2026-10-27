const mongoose = require('mongoose');

const businessProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['restaurant', 'grocery', 'pharmacy', 'retail', 'e-commerce', 'bakery', 'other'],
      default: 'retail'
    },
    address: {
      type: String,
      default: ''
    },
    pincode: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    taxId: {
      type: String, // GSTIN or PAN for Indian Businesses
      trim: true,
      default: ''
    },
    gstin: {
      type: String,
      trim: true,
      default: ''
    },
    defaultCoordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [77.2090, 28.6139] // Baseline India coordinates (New Delhi)
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('BusinessProfile', businessProfileSchema);

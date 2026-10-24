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
      default: '350 5th Ave, New York, NY 10118'
    },
    phone: {
      type: String,
      default: ''
    },
    taxId: {
      type: String,
      default: ''
    },
    defaultCoordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [-73.9851, 40.7484]
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('BusinessProfile', businessProfileSchema);

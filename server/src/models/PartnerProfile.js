const mongoose = require('mongoose');
const { encrypt, maskIdentifier } = require('../utils/crypto');

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
    licenseNumberEncrypted: {
      type: String,
      default: ''
    },
    licenseNumberMasked: {
      type: String,
      default: ''
    },
    idDocumentType: {
      type: String,
      enum: [
        'Driving Licence',
        'Aadhaar Card',
        'PAN Card',
        'Voter ID',
        'Passport',
        'National ID',
        'Driver License',
        'Work Permit'
      ],
      default: 'Driving Licence'
    },
    idDocumentNumber: {
      type: String,
      trim: true,
      default: ''
    },
    idDocumentNumberEncrypted: {
      type: String,
      default: ''
    },
    idDocumentNumberMasked: {
      type: String,
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
        default: [77.2090, 28.6139] // Baseline India coordinates (New Delhi)
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

// Pre-save hook: auto encrypt and mask compliance identity numbers so plaintext is never stored
partnerProfileSchema.pre('save', function (next) {
  if (this.isModified('licenseNumber') && this.licenseNumber && !this.licenseNumber.includes('X')) {
    if (!this.licenseNumberEncrypted) {
      this.licenseNumberEncrypted = encrypt(this.licenseNumber);
    }
    this.licenseNumberMasked = maskIdentifier(this.licenseNumber, 'Driving Licence');
    this.licenseNumber = this.licenseNumberMasked;
  }

  if (this.isModified('idDocumentNumber') && this.idDocumentNumber && !this.idDocumentNumber.includes('X')) {
    if (!this.idDocumentNumberEncrypted) {
      this.idDocumentNumberEncrypted = encrypt(this.idDocumentNumber);
    }
    this.idDocumentNumberMasked = maskIdentifier(this.idDocumentNumber, this.idDocumentType);
    this.idDocumentNumber = this.idDocumentNumberMasked;
  }
  next();
});

// JSON and Object transforms: never return unmasked identity numbers or raw ciphertexts to standard endpoints
function sanitizePartnerProfile(doc, ret) {
  if (ret.licenseNumberMasked) {
    ret.licenseNumber = ret.licenseNumberMasked;
  }
  if (ret.idDocumentNumberMasked) {
    ret.idDocumentNumber = ret.idDocumentNumberMasked;
  }
  delete ret.licenseNumberEncrypted;
  delete ret.idDocumentNumberEncrypted;
  return ret;
}

partnerProfileSchema.set('toJSON', { transform: sanitizePartnerProfile });
partnerProfileSchema.set('toObject', { transform: sanitizePartnerProfile });

// 2dsphere index for proximity queries
partnerProfileSchema.index({ currentCoordinates: '2dsphere' });

module.exports = mongoose.model('PartnerProfile', partnerProfileSchema);

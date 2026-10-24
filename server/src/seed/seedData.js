const users = [
  // Administrator
  {
    name: 'Sarah Lin (Ops Director)',
    email: 'admin@swiftfleet.io',
    password: 'Password123!',
    role: 'admin',
    phone: '+1 (555) 019-2831'
  },
  // Businesses
  {
    name: 'Artisan Roast Co.',
    email: 'roast@artisan.demo',
    password: 'Password123!',
    role: 'business',
    phone: '+1 (555) 234-5678',
    businessProfile: {
      companyName: 'Artisan Roast Co.',
      category: 'bakery',
      address: '240 Central Park South, New York, NY 10019',
      defaultCoordinates: {
        type: 'Point',
        coordinates: [-73.9806, 40.7668]
      }
    }
  },
  {
    name: 'GreenLeaf Organics',
    email: 'contact@greenleaf.demo',
    password: 'Password123!',
    role: 'business',
    phone: '+1 (555) 345-6789',
    businessProfile: {
      companyName: 'GreenLeaf Organics Market',
      category: 'grocery',
      address: '150 5th Ave, New York, NY 10011',
      defaultCoordinates: {
        type: 'Point',
        coordinates: [-73.9918, 40.7402]
      }
    }
  },
  {
    name: 'Midtown Express Rx',
    email: 'orders@midtownrx.demo',
    password: 'Password123!',
    role: 'business',
    phone: '+1 (555) 456-7890',
    businessProfile: {
      companyName: 'Midtown Express Pharmacy',
      category: 'pharmacy',
      address: '530 7th Ave, New York, NY 10018',
      defaultCoordinates: {
        type: 'Point',
        coordinates: [-73.9877, 40.7538]
      }
    }
  },
  // Delivery Partners
  {
    name: 'Marcus Vance',
    email: 'marcus.vance@courier.demo',
    password: 'Password123!',
    role: 'partner',
    phone: '+1 (555) 789-0123',
    partnerProfile: {
      verificationStatus: 'approved',
      verificationNotes: 'Verified state DL & commercial courier background check on 2026-10-15.',
      vehicleType: 'motorcycle',
      licenseNumber: 'NY-DL-8823194',
      idDocumentType: 'Driver License',
      idDocumentNumber: 'NY-DL-8823194',
      idDocumentUrl: '/docs/demo_marcus_dl.pdf',
      isOnline: true,
      isAvailable: true,
      currentCoordinates: {
        type: 'Point',
        coordinates: [-73.9842, 40.7505] // Herald Square
      },
      stats: {
        totalDeliveries: 142,
        rating: 4.92,
        acceptanceRate: 98,
        totalEarned: 1845.50
      }
    }
  },
  {
    name: 'Elena Rostova',
    email: 'elena.rostova@courier.demo',
    password: 'Password123!',
    role: 'partner',
    phone: '+1 (555) 890-1234',
    partnerProfile: {
      verificationStatus: 'approved',
      verificationNotes: 'Identity confirmed and equipment checklist verified.',
      vehicleType: 'bicycle',
      licenseNumber: 'NY-ID-4491023',
      idDocumentType: 'National ID',
      idDocumentNumber: 'US-PASS-990141',
      idDocumentUrl: '/docs/demo_elena_id.pdf',
      isOnline: true,
      isAvailable: true,
      currentCoordinates: {
        type: 'Point',
        coordinates: [-73.9785, 40.7580] // Rockefeller Center area
      },
      stats: {
        totalDeliveries: 89,
        rating: 4.96,
        acceptanceRate: 96,
        totalEarned: 1120.00
      }
    }
  },
  {
    name: 'Devon Thorne',
    email: 'devon.thorne@courier.demo',
    password: 'Password123!',
    role: 'partner',
    phone: '+1 (555) 901-2345',
    partnerProfile: {
      verificationStatus: 'pending',
      verificationNotes: 'Under review by safety team. Documents uploaded.',
      vehicleType: 'scooter',
      licenseNumber: 'NY-DL-1928401',
      idDocumentType: 'Driver License',
      idDocumentNumber: 'NY-DL-1928401',
      idDocumentUrl: '/docs/demo_devon_dl.pdf',
      isOnline: false,
      isAvailable: true,
      currentCoordinates: {
        type: 'Point',
        coordinates: [-73.9940, 40.7320] // Greenwich Village
      },
      stats: {
        totalDeliveries: 0,
        rating: 5.0,
        acceptanceRate: 100,
        totalEarned: 0.00
      }
    }
  },
  {
    name: 'Samira Khan',
    email: 'samira.khan@courier.demo',
    password: 'Password123!',
    role: 'partner',
    phone: '+1 (555) 012-3456',
    partnerProfile: {
      verificationStatus: 'approved',
      verificationNotes: 'Cargo van commercial endorsement verified.',
      vehicleType: 'van',
      licenseNumber: 'NY-CDL-661928',
      idDocumentType: 'Driver License',
      idDocumentNumber: 'NY-CDL-661928',
      idDocumentUrl: '/docs/demo_samira_cdl.pdf',
      isOnline: false,
      isAvailable: true,
      currentCoordinates: {
        type: 'Point',
        coordinates: [-73.9650, 40.7750] // Upper East Side
      },
      stats: {
        totalDeliveries: 64,
        rating: 4.88,
        acceptanceRate: 92,
        totalEarned: 950.00
      }
    }
  }
];

module.exports = { users };

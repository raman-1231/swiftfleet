const users = [
  // Administrator
  {
    name: 'Sarah Lin (Ops Director)',
    email: 'admin@swiftfleet.io',
    password: 'Password123!',
    role: 'admin',
    phone: '+91 98110 00001'
  },
  // Businesses (Indian Hubs)
  {
    name: 'Artisan Roast Co.',
    email: 'roast@artisan.demo',
    password: 'Password123!',
    role: 'business',
    phone: '+91 98110 12345',
    businessProfile: {
      companyName: 'Artisan Roast Co.',
      category: 'bakery',
      address: 'Shop 14, Inner Circle, Connaught Place, New Delhi',
      pincode: '110001',
      defaultCoordinates: {
        type: 'Point',
        coordinates: [77.2167, 28.6315] // Connaught Place, New Delhi
      }
    }
  },
  {
    name: 'GreenLeaf Organics',
    email: 'contact@greenleaf.demo',
    password: 'Password123!',
    role: 'business',
    phone: '+91 98220 23456',
    businessProfile: {
      companyName: 'GreenLeaf Organics Market',
      category: 'grocery',
      address: '80 Feet Road, 4th Block, Koramangala, Bengaluru',
      pincode: '560034',
      defaultCoordinates: {
        type: 'Point',
        coordinates: [77.6245, 12.9352] // Koramangala, Bengaluru
      }
    }
  },
  {
    name: 'Midtown Express Rx',
    email: 'orders@midtownrx.demo',
    password: 'Password123!',
    role: 'business',
    phone: '+91 98330 34567',
    businessProfile: {
      companyName: 'Midtown Express Pharmacy',
      category: 'pharmacy',
      address: 'G Block, Bandra Kurla Complex (BKC), Bandra East, Mumbai',
      pincode: '400051',
      defaultCoordinates: {
        type: 'Point',
        coordinates: [72.8687, 19.0688] // BKC, Mumbai
      }
    }
  },
  // Delivery Partners (Indian Courier Fleets)
  {
    name: 'Rajesh Sharma',
    email: 'marcus.vance@courier.demo',
    password: 'Password123!',
    role: 'partner',
    phone: '+91 98110 54321',
    partnerProfile: {
      verificationStatus: 'approved',
      verificationNotes: 'Verified Indian Driving License & commercial courier background check on 2026-10-15.',
      vehicleType: 'motorcycle',
      licenseNumber: 'DL-01-2022-0045129',
      idDocumentType: 'Driver License',
      idDocumentNumber: 'DL-01-2022-0045129',
      idDocumentUrl: '/docs/demo_rajesh_dl.pdf',
      isOnline: true,
      isAvailable: true,
      currentCoordinates: {
        type: 'Point',
        coordinates: [77.2090, 28.6139] // New Delhi Central
      },
      stats: {
        totalDeliveries: 142,
        rating: 4.92,
        acceptanceRate: 98,
        totalEarned: 24500.00
      }
    }
  },
  {
    name: 'Priya Patel',
    email: 'elena.rostova@courier.demo',
    password: 'Password123!',
    role: 'partner',
    phone: '+91 98220 65432',
    partnerProfile: {
      verificationStatus: 'approved',
      verificationNotes: 'Aadhaar identity confirmed and delivery equipment checklist verified.',
      vehicleType: 'bicycle',
      licenseNumber: 'KA-01-2023-0098412',
      idDocumentType: 'National ID',
      idDocumentNumber: 'AADHAAR-990141',
      idDocumentUrl: '/docs/demo_priya_id.pdf',
      isOnline: false,
      isAvailable: true,
      currentCoordinates: {
        type: 'Point',
        coordinates: [77.6245, 12.9352] // Koramangala Bengaluru
      },
      stats: {
        totalDeliveries: 89,
        rating: 4.96,
        acceptanceRate: 96,
        totalEarned: 16800.00
      }
    }
  },
  {
    name: 'Amit Verma',
    email: 'devon.thorne@courier.demo',
    password: 'Password123!',
    role: 'partner',
    phone: '+91 98330 76543',
    partnerProfile: {
      verificationStatus: 'pending',
      verificationNotes: 'Under review by safety team. Documents uploaded.',
      vehicleType: 'scooter',
      licenseNumber: 'MH-02-2024-0012840',
      idDocumentType: 'Driver License',
      idDocumentNumber: 'MH-02-2024-0012840',
      idDocumentUrl: '/docs/demo_amit_dl.pdf',
      isOnline: false,
      isAvailable: true,
      currentCoordinates: {
        type: 'Point',
        coordinates: [72.8687, 19.0688] // BKC Mumbai
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
    name: 'Sunita Rao',
    email: 'samira.khan@courier.demo',
    password: 'Password123!',
    role: 'partner',
    phone: '+91 98110 87654',
    partnerProfile: {
      verificationStatus: 'approved',
      verificationNotes: 'Cargo endorsement verified for light commercial vehicle.',
      vehicleType: 'van',
      licenseNumber: 'DL-03-2021-0066192',
      idDocumentType: 'Driver License',
      idDocumentNumber: 'DL-03-2021-0066192',
      idDocumentUrl: '/docs/demo_sunita_cdl.pdf',
      isOnline: false,
      isAvailable: true,
      currentCoordinates: {
        type: 'Point',
        coordinates: [77.2167, 28.6315] // Connaught Place Delhi
      },
      stats: {
        totalDeliveries: 64,
        rating: 4.88,
        acceptanceRate: 92,
        totalEarned: 14200.00
      }
    }
  }
];

module.exports = { users };

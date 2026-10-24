const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const PartnerProfile = require('../models/PartnerProfile');
const BusinessProfile = require('../models/BusinessProfile');
const Order = require('../models/Order');
const EarningsLedger = require('../models/EarningsLedger');
const Dispute = require('../models/Dispute');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { users } = require('./seedData');

async function seedDatabase() {
  console.log('🌱 [Seeder] Starting SwiftFleet demo database initialization...');

  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    // 1. Clean existing records
    await Promise.all([
      User.deleteMany({}),
      PartnerProfile.deleteMany({}),
      BusinessProfile.deleteMany({}),
      Order.deleteMany({}),
      EarningsLedger.deleteMany({}),
      Dispute.deleteMany({}),
      AuditLog.deleteMany({}),
      Notification.deleteMany({})
    ]);
    console.log('🧹 [Seeder] Cleared existing records.');

    // 2. Insert Users and their respective profiles
    const createdUsers = {};

    for (const u of users) {
      const user = await User.create({
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        phone: u.phone
      });

      createdUsers[u.email] = user;

      if (u.role === 'business' && u.businessProfile) {
        await BusinessProfile.create({
          userId: user._id,
          ...u.businessProfile
        });
      } else if (u.role === 'partner' && u.partnerProfile) {
        await PartnerProfile.create({
          userId: user._id,
          ...u.partnerProfile
        });
      }
    }
    console.log(`👤 [Seeder] Seeded ${Object.keys(createdUsers).length} test accounts.`);

    const artisan = createdUsers['roast@artisan.demo'];
    const greenleaf = createdUsers['contact@greenleaf.demo'];
    const midtownRx = createdUsers['orders@midtownrx.demo'];
    const marcus = createdUsers['marcus.vance@courier.demo'];
    const elena = createdUsers['elena.rostova@courier.demo'];
    const admin = createdUsers['admin@swiftfleet.io'];

    // 3. Seed Realistic Orders Across Lifecycle States
    const ordersData = [
      // Order 1: Delivered Order (Completed)
      {
        orderNumber: 'SWF-54210',
        businessId: artisan._id,
        assignedPartnerId: marcus._id,
        status: 'delivered',
        earningsCredited: true,
        pickup: {
          address: '240 Central Park South, New York, NY',
          contactName: 'Artisan Roast Barista Desk',
          phone: '+1 (555) 234-5678',
          coordinates: [-73.9806, 40.7668],
          instructions: 'Call upon arrival at service entrance'
        },
        dropoff: {
          address: '45 Rockefeller Plaza, New York, NY',
          contactName: 'Jonathan Davis',
          phone: '+1 (555) 998-1122',
          coordinates: [-73.9787, 40.7587],
          instructions: 'Leave with 14th floor concierge'
        },
        packageDetails: {
          category: 'food_beverage',
          weightKg: 2.2,
          fragile: true,
          notes: 'Hot espresso catering batch (12 cups)'
        },
        pricing: {
          baseFare: 5.00,
          distanceKm: 1.4,
          distanceCost: 2.52,
          weightCost: 0,
          totalCost: 7.52,
          partnerPayout: 5.87
        },
        estimatedDurationMins: 14,
        timeline: [
          { status: 'created', timestamp: new Date(Date.now() - 3600000 * 2), note: 'Order placed by Artisan Roast Co.' },
          { status: 'assigned', timestamp: new Date(Date.now() - 3600000 * 1.8), note: 'Accepted by Marcus Vance' },
          { status: 'picked_up', timestamp: new Date(Date.now() - 3600000 * 1.5), note: 'Collected at counter' },
          { status: 'delivered', timestamp: new Date(Date.now() - 3600000 * 1.2), note: 'Handed to Jonathan Davis' }
        ]
      },
      // Order 2: In-Transit Order (Picked Up)
      {
        orderNumber: 'SWF-88192',
        businessId: greenleaf._id,
        assignedPartnerId: elena._id,
        status: 'picked_up',
        pickup: {
          address: '150 5th Ave, New York, NY',
          contactName: 'GreenLeaf Dispatch Desk',
          phone: '+1 (555) 345-6789',
          coordinates: [-73.9918, 40.7402],
          instructions: 'Cold storage insulated tote bag required'
        },
        dropoff: {
          address: '350 5th Ave (Empire State Building), New York, NY',
          contactName: 'Chloe Bennett',
          phone: '+1 (555) 443-8899',
          coordinates: [-73.9857, 40.7484],
          instructions: 'Suite 4402 - Security check-in'
        },
        packageDetails: {
          category: 'groceries',
          weightKg: 4.5,
          fragile: false,
          notes: 'Fresh organic greens & cold-pressed juice'
        },
        pricing: {
          baseFare: 5.00,
          distanceKm: 1.6,
          distanceCost: 2.88,
          weightCost: 1.13,
          totalCost: 9.01,
          partnerPayout: 7.03
        },
        estimatedDurationMins: 16,
        timeline: [
          { status: 'created', timestamp: new Date(Date.now() - 1800000), note: 'Order submitted' },
          { status: 'assigned', timestamp: new Date(Date.now() - 1500000), note: 'Accepted by Elena Rostova' },
          { status: 'picked_up', timestamp: new Date(Date.now() - 600000), note: 'Picked up by Elena Rostova. En route on e-bike.' }
        ]
      },
      // Order 3: Assigned Order (Waiting for Pickup)
      {
        orderNumber: 'SWF-29401',
        businessId: midtownRx._id,
        assignedPartnerId: marcus._id,
        status: 'assigned',
        pickup: {
          address: '530 7th Ave, New York, NY',
          contactName: 'Pharmacist Dave',
          phone: '+1 (555) 456-7890',
          coordinates: [-73.9877, 40.7538],
          instructions: 'Temperature sensitive prescription envelope'
        },
        dropoff: {
          address: '885 2nd Ave, New York, NY',
          contactName: 'Arthur Vance',
          phone: '+1 (555) 777-1234',
          coordinates: [-73.9696, 40.7533],
          instructions: 'Direct signature required from patient'
        },
        packageDetails: {
          category: 'pharmaceuticals',
          weightKg: 0.8,
          fragile: true,
          notes: 'Priority prescription medication'
        },
        pricing: {
          baseFare: 5.00,
          distanceKm: 2.1,
          distanceCost: 3.78,
          weightCost: 0,
          totalCost: 10.28,
          partnerPayout: 8.02
        },
        estimatedDurationMins: 18,
        timeline: [
          { status: 'created', timestamp: new Date(Date.now() - 900000), note: 'Prescription rush requested' },
          { status: 'assigned', timestamp: new Date(Date.now() - 300000), note: 'Accepted by Marcus Vance. Travelling to pharmacy.' }
        ]
      },
      // Order 4: Fresh Created Order (Queued for Dispatch)
      {
        orderNumber: 'SWF-11945',
        businessId: artisan._id,
        status: 'created',
        pickup: {
          address: '240 Central Park South, New York, NY',
          contactName: 'Artisan Counter',
          phone: '+1 (555) 234-5678',
          coordinates: [-73.9806, 40.7668],
          instructions: 'Ready on delivery shelf #2'
        },
        dropoff: {
          address: '10 Columbus Circle, New York, NY',
          contactName: 'Sophia Miller',
          phone: '+1 (555) 888-9900',
          coordinates: [-73.9822, 40.7681],
          instructions: 'Hand to reception desk'
        },
        packageDetails: {
          category: 'food_beverage',
          weightKg: 1.0,
          fragile: false,
          notes: 'Artisan bakery treats box'
        },
        pricing: {
          baseFare: 5.00,
          distanceKm: 0.9,
          distanceCost: 1.62,
          weightCost: 0,
          totalCost: 6.62,
          partnerPayout: 5.16
        },
        estimatedDurationMins: 10,
        timeline: [
          { status: 'created', timestamp: new Date(), note: 'Order registered. Searching proximity couriers.' }
        ]
      }
    ];

    const seededOrders = await Order.insertMany(ordersData);
    console.log(`📦 [Seeder] Seeded ${seededOrders.length} test orders across lifecycle.`);

    // 4. Create EarningsLedger entry for the delivered order
    const deliveredOrder = seededOrders.find((o) => o.status === 'delivered');
    if (deliveredOrder) {
      await EarningsLedger.create({
        partnerId: marcus._id,
        orderId: deliveredOrder._id,
        orderNumber: deliveredOrder.orderNumber,
        amount: deliveredOrder.pricing.partnerPayout,
        distanceKm: deliveredOrder.pricing.distanceKm,
        status: 'credited',
        notes: 'Delivery completed on time'
      });
      console.log('💰 [Seeder] Seeded EarningsLedger entry for delivered order.');
    }

    // 5. Seed Sample Dispute
    await Dispute.create({
      orderId: deliveredOrder._id,
      orderNumber: deliveredOrder.orderNumber,
      raisedBy: artisan._id,
      raisedByRole: 'business',
      category: 'late_delivery',
      reason: 'Slight coffee lid leakage during high speed braking. Customer requested replacement cup credit.',
      details: 'Customer reported cup #2 spilled 10% in box.',
      status: 'under_review'
    });
    console.log('⚖️ [Seeder] Seeded sample operational dispute.');

    // 6. Seed Sample Notifications
    await Notification.create([
      {
        recipientId: marcus._id,
        title: 'New Delivery Assigned',
        message: 'Order #SWF-29401 from Midtown Express Rx is ready for pickup.',
        type: 'order_assigned',
        orderId: seededOrders[2]._id
      },
      {
        recipientId: artisan._id,
        title: 'Order Delivered',
        message: 'Order #SWF-54210 was safely delivered to Jonathan Davis.',
        type: 'order_delivered',
        orderId: deliveredOrder._id
      }
    ]);
    console.log('🔔 [Seeder] Seeded notifications.');

    // 7. Seed Initial Audit Log
    await AuditLog.create({
      actorId: admin._id,
      actorName: 'Sarah Lin (Ops Director)',
      actorRole: 'admin',
      action: 'SYSTEM_INITIALIZED',
      targetType: 'System',
      targetId: 'INIT-2026',
      metadata: { seedVersion: '1.0.0', environment: 'demo' }
    });
    console.log('📜 [Seeder] Seeded initial audit log.');

    console.log('✨ [Seeder] Database seeding successfully finished!');
  } catch (err) {
    console.error('❌ [Seeder] Error during seeding:', err);
    throw err;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await disconnectDB();
      process.exit(1);
    });
}

module.exports = { seedDatabase };

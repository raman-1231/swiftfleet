const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const env = require('../config/env');
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
  // Hard fail-closed production safeguard: refuse destructive seeding when NODE_ENV is production
  if (env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: Database seeding and record deletion are strictly prohibited in production mode (NODE_ENV=production).');
  }

  console.log('🌱 [Seeder] Starting SwiftFleet India demo database initialization...');

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

    // 3. Seed Realistic Indian Orders Across Lifecycle States
    const ordersData = [
      // Order 1: Delivered Order (Completed) - Delhi Connaught Place
      {
        orderNumber: 'SWF-54210',
        businessId: artisan._id,
        assignedPartnerId: marcus._id,
        status: 'delivered',
        earningsCredited: true,
        pickup: {
          address: 'Shop 14, Inner Circle, Connaught Place, New Delhi',
          pincode: '110001',
          contactName: 'Artisan Roast Barista Desk',
          phone: '+91 98110 12345',
          coordinates: [77.2167, 28.6315],
          instructions: 'Call upon arrival at service entrance'
        },
        dropoff: {
          address: 'Barakhamba Road, Connaught Place, New Delhi',
          pincode: '110001',
          contactName: 'Rahul Verma',
          phone: '+91 98119 98877',
          coordinates: [77.2245, 28.6300],
          instructions: 'Leave with 4th floor reception'
        },
        packageDetails: {
          category: 'food_beverage',
          weightKg: 2.2,
          fragile: true,
          notes: 'Hot espresso catering batch (12 cups)'
        },
        pricing: {
          currency: 'INR',
          currencySymbol: '₹',
          baseFare: 40.00,
          distanceKm: 1.4,
          distanceCost: 16.80,
          weightCost: 0,
          categoryCharge: 0,
          totalCost: 56.80,
          partnerPayout: 44.30
        },
        estimatedDurationMins: 14,
        timeline: [
          { status: 'created', timestamp: new Date(Date.now() - 3600000 * 2), note: 'Order placed by Artisan Roast Co.' },
          { status: 'assigned', timestamp: new Date(Date.now() - 3600000 * 1.8), note: 'Accepted by Rajesh Sharma' },
          { status: 'picked_up', timestamp: new Date(Date.now() - 3600000 * 1.5), note: 'Collected at counter' },
          { status: 'delivered', timestamp: new Date(Date.now() - 3600000 * 1.2), note: 'Handed to Rahul Verma with PIN verification' }
        ]
      },
      // Order 2: In-Transit Order (Picked Up) - Bengaluru Koramangala to Indiranagar
      {
        orderNumber: 'SWF-88192',
        businessId: greenleaf._id,
        assignedPartnerId: elena._id,
        status: 'picked_up',
        pickup: {
          address: '80 Feet Road, 4th Block, Koramangala, Bengaluru',
          pincode: '560034',
          contactName: 'GreenLeaf Dispatch Desk',
          phone: '+91 98220 23456',
          coordinates: [77.6245, 12.9352],
          instructions: 'Cold storage insulated tote bag required'
        },
        dropoff: {
          address: '100 Feet Road, Indiranagar, Bengaluru',
          pincode: '560038',
          contactName: 'Ananya Deshmukh',
          phone: '+91 98229 88776',
          coordinates: [77.6412, 12.9784],
          instructions: 'Apartment 402 - Security check-in'
        },
        packageDetails: {
          category: 'groceries',
          weightKg: 4.5,
          fragile: false,
          notes: 'Fresh organic greens & cold-pressed juice'
        },
        pricing: {
          currency: 'INR',
          currencySymbol: '₹',
          baseFare: 40.00,
          distanceKm: 5.8,
          distanceCost: 69.60,
          weightCost: 22.50,
          categoryCharge: 0,
          totalCost: 132.10,
          partnerPayout: 103.04
        },
        estimatedDurationMins: 24,
        timeline: [
          { status: 'created', timestamp: new Date(Date.now() - 1800000), note: 'Order submitted' },
          { status: 'assigned', timestamp: new Date(Date.now() - 1500000), note: 'Accepted by Priya Patel' },
          { status: 'picked_up', timestamp: new Date(Date.now() - 600000), note: 'Picked up by Priya Patel. En route on e-bike.' }
        ]
      },
      // Order 3: Delivered Order (Completed) - Mumbai BKC to Lower Parel
      {
        orderNumber: 'SWF-29401',
        businessId: midtownRx._id,
        assignedPartnerId: marcus._id,
        status: 'delivered',
        earningsCredited: true,
        pickup: {
          address: 'G Block, Bandra Kurla Complex (BKC), Mumbai',
          pincode: '400051',
          contactName: 'Pharmacist Sanjay',
          phone: '+91 98330 34567',
          coordinates: [72.8687, 19.0688],
          instructions: 'Temperature sensitive prescription envelope'
        },
        dropoff: {
          address: 'Senapati Bapat Marg, Lower Parel, Mumbai',
          pincode: '400013',
          contactName: 'Karan Mehra',
          phone: '+91 98339 77665',
          coordinates: [72.8295, 18.9953],
          instructions: 'Direct signature required from patient'
        },
        packageDetails: {
          category: 'pharmaceuticals',
          weightKg: 0.8,
          fragile: true,
          notes: 'Priority prescription medication'
        },
        pricing: {
          currency: 'INR',
          currencySymbol: '₹',
          baseFare: 40.00,
          distanceKm: 9.2,
          distanceCost: 110.40,
          weightCost: 0,
          categoryCharge: 25.00,
          totalCost: 175.40,
          partnerPayout: 136.81
        },
        estimatedDurationMins: 33,
        timeline: [
          { status: 'created', timestamp: new Date(Date.now() - 900000), note: 'Prescription rush requested' },
          { status: 'assigned', timestamp: new Date(Date.now() - 600000), note: 'Accepted by Rajesh Sharma. Travelling to pharmacy.' },
          { status: 'picked_up', timestamp: new Date(Date.now() - 400000), note: 'Picked up from pharmacy counter.' },
          { status: 'delivered', timestamp: new Date(Date.now() - 100000), note: 'Verified via customer handover PIN.' }
        ]
      },
      // Order 4: Fresh Created Order (Queued for Dispatch) - Delhi CP to Khan Market
      {
        orderNumber: 'SWF-11945',
        businessId: artisan._id,
        status: 'created',
        pickup: {
          address: 'Shop 14, Inner Circle, Connaught Place, New Delhi',
          pincode: '110001',
          contactName: 'Artisan Counter',
          phone: '+91 98110 12345',
          coordinates: [77.2167, 28.6315],
          instructions: 'Ready on delivery shelf #2'
        },
        dropoff: {
          address: 'Khan Market, Rabindra Nagar, New Delhi',
          pincode: '110003',
          contactName: 'Deepak Joshi',
          phone: '+91 98118 77665',
          coordinates: [77.2272, 28.6003],
          instructions: 'Hand to reception desk'
        },
        packageDetails: {
          category: 'food_beverage',
          weightKg: 1.0,
          fragile: false,
          notes: 'Artisan bakery treats box'
        },
        pricing: {
          currency: 'INR',
          currencySymbol: '₹',
          baseFare: 40.00,
          distanceKm: 3.8,
          distanceCost: 45.60,
          weightCost: 0,
          categoryCharge: 0,
          totalCost: 85.60,
          partnerPayout: 66.77
        },
        estimatedDurationMins: 18,
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
        title: 'Delivery Completed',
        message: 'Order #SWF-29401 was safely delivered to Karan Mehra.',
        type: 'order_delivered',
        orderId: seededOrders[2]._id
      },
      {
        recipientId: artisan._id,
        title: 'Order Delivered',
        message: 'Order #SWF-54210 was safely delivered to Rahul Verma.',
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
      metadata: { seedVersion: '2.0.0-in', environment: 'demo' }
    });
    console.log('📜 [Seeder] Seeded initial audit log.');

    console.log('✨ [Seeder] Database seeding successfully finished!');
  } catch (err) {
    console.error('❌ [Seeder] Error during seeding:', err);
    throw err;
  }
}

if (require.main === module) {
  if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production') {
    console.error('❌ FATAL: Database seeding and record deletion are strictly prohibited in production mode (NODE_ENV=production).');
    process.exit(1);
  }

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

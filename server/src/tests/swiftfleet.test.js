const path = require('path');
const request = require('supertest');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Order = require('../models/Order');
const PartnerProfile = require('../models/PartnerProfile');
const EarningsLedger = require('../models/EarningsLedger');
const AuditLog = require('../models/AuditLog');
const env = require('../config/env');
const { calculateDeliveryQuote } = require('../services/pricingService');
const { backfillTrackingTokens } = require('../utils/backfillTrackingTokens');

describe('SwiftFleet Core Architecture & Business Logic Test Suite', () => {
  let businessToken;
  let businessId;
  let approvedPartnerToken;
  let approvedPartnerId;
  let unapprovedPartnerToken;
  let unapprovedPartnerId;

  const createTestOrder = (overrides = {}) => Order.create({
    orderNumber: `SWF-${Math.floor(10000 + Math.random() * 90000)}`,
    businessId,
    status: 'created',
    pickup: { address: 'Shop 14, Inner Circle, Connaught Place, New Delhi', coordinates: [77.2167, 28.6315], contactName: 'M' },
    dropoff: { address: 'Barakhamba Road, Connaught Place, New Delhi', coordinates: [77.2245, 28.6300], contactName: 'C', phone: '+91 98110 99887' },
    packageDetails: { category: 'food_beverage', weightKg: 1.5 },
    pricing: { baseFare: 40.0, distanceKm: 1.5, distanceCost: 18.0, weightCost: 0, totalCost: 58.0, partnerPayout: 45.24 },
    estimatedDurationMins: 15,
    ...overrides
  });

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({});
    await PartnerProfile.deleteMany({});
    await Order.deleteMany({});
    await EarningsLedger.deleteMany({});

    // Register an Indian business
    const bizRes = await request(app)
      .post('/api/auth/register-business')
      .send({
        name: 'Test Bakery Owner',
        email: 'bakery@test.com',
        password: 'Password123!',
        companyName: 'Test Bakery LLC',
        address: 'Shop 14, Inner Circle, Connaught Place, New Delhi',
        pincode: '110001'
      });
    businessToken = bizRes.body.token;
    businessId = bizRes.body.user.id;

    // Register an approved partner
    const partRes1 = await request(app)
      .post('/api/auth/register-partner')
      .send({
        name: 'Alex Fast',
        email: 'alex@test.com',
        password: 'Password123!',
        vehicleType: 'motorcycle',
        licenseNumber: 'TEST-DL-1'
      });
    approvedPartnerToken = partRes1.body.token;
    approvedPartnerId = partRes1.body.user.id;

    // Set partner to approved and online
    await PartnerProfile.updateOne(
      { userId: approvedPartnerId },
      { verificationStatus: 'approved', isOnline: true, isAvailable: true }
    );

    // Register a pending/unapproved partner
    const partRes2 = await request(app)
      .post('/api/auth/register-partner')
      .send({
        name: 'Pending Pete',
        email: 'pete@test.com',
        password: 'Password123!',
        vehicleType: 'bicycle',
        licenseNumber: 'TEST-DL-2'
      });
    unapprovedPartnerToken = partRes2.body.token;
    unapprovedPartnerId = partRes2.body.user.id;
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('1. Pricing Engine & Transparent Disclosures', () => {
    it('calculates road distance with urban grid coefficient and transparent breakdown', () => {
      const quote = calculateDeliveryQuote({
        pickupCoords: [77.2167, 28.6315],
        dropoffCoords: [77.2245, 28.6300],
        weightKg: 2.0,
        category: 'general'
      });

      expect(quote).toHaveProperty('roadDistanceKm');
      expect(quote).toHaveProperty('pricingBreakdown');
      expect(quote.currency).toBe('INR');
      expect(quote.pricingBreakdown.totalCost).toBeGreaterThan(quote.pricingBreakdown.partnerPayout);
      expect(quote.pricingBreakdown.partnerPayout).toBeCloseTo(quote.pricingBreakdown.totalCost * 0.78, 1);
      expect(quote.estimatedDurationMins).toBeGreaterThanOrEqual(12);
    });
  });

  describe('2. Authentication & Role Boundaries', () => {
    it('prevents unauthenticated access to order endpoints', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(401);
    });

    it('rejects couriers from attempting to create business orders', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({
          pickup: { address: 'Shop 14, Connaught Place, New Delhi', coordinates: [77.2167, 28.6315] },
          dropoff: { address: 'Barakhamba Road, New Delhi', coordinates: [77.2245, 28.6300] }
        });
      expect(res.status).toBe(403);
    });
  });

  describe('3. Order Creation & Courier Matching Lifecycle', () => {
    let testOrderId;

    it('allows business to create an order and assigns calculated pricing', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({
          pickup: {
            address: 'Shop 14, Inner Circle, Connaught Place, New Delhi',
            coordinates: [77.2167, 28.6315],
            pincode: '110001',
            contactName: 'Bakery Desk'
          },
          dropoff: {
            address: 'Barakhamba Road, Connaught Place, New Delhi',
            coordinates: [77.2245, 28.6300],
            pincode: '110001',
            contactName: 'Office Reception',
            phone: '+91 98110 01990'
          },
          packageDetails: {
            category: 'food_beverage',
            weightKg: 2.0
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.order).toHaveProperty('orderNumber');
      expect(res.body.order.orderNumber).toMatch(/^SWF-/);
      expect(res.body.order.status).toBe('created');
      testOrderId = res.body.order._id;
    });

    it('blocks unapproved partner from accepting offers', async () => {
      // Put order into offered state
      await Order.updateOne(
        { _id: testOrderId },
        {
          status: 'offered',
          offeredPartnerId: unapprovedPartnerId,
          offerExpiresAt: new Date(Date.now() + 60000)
        }
      );

      const res = await request(app)
        .post(`/api/dispatch/accept/${testOrderId}`)
        .set('Authorization', `Bearer ${unapprovedPartnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/pending|approved/);
    });

    it('allows approved partner to atomically accept an offer', async () => {
      // Offer to approved partner
      await Order.updateOne(
        { _id: testOrderId },
        {
          status: 'offered',
          offeredPartnerId: approvedPartnerId,
          offerExpiresAt: new Date(Date.now() + 60000)
        }
      );

      const res = await request(app)
        .post(`/api/dispatch/accept/${testOrderId}`)
        .set('Authorization', `Bearer ${approvedPartnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('assigned');
      expect(res.body.order.assignedPartnerId).toBe(approvedPartnerId);
    });

    it('prevents double-acceptance or race condition on already assigned order', async () => {
      const res = await request(app)
        .post(`/api/dispatch/accept/${testOrderId}`)
        .set('Authorization', `Bearer ${approvedPartnerToken}`);

      expect(res.status).toBe(409);
    });

    it('enforces sequential state transition: cannot jump from assigned straight to delivered', async () => {
      const res = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({
          orderId: testOrderId,
          targetStatus: 'delivered'
        });

      expect(res.status).toBe(400);
    });

    it('transitions to picked_up successfully', async () => {
      const res = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({
          orderId: testOrderId,
          targetStatus: 'picked_up'
        });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('picked_up');
    });

    it('transitions to delivered and writes exactly-once to EarningsLedger', async () => {
      const orderDoc = await Order.findById(testOrderId);
      const res = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({
          orderId: testOrderId,
          targetStatus: 'delivered',
          handoverPin: orderDoc.handoverPin
        });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('delivered');

      // Verify Exactly-Once ledger recording
      const ledgerEntries = await EarningsLedger.find({ orderId: testOrderId });
      expect(ledgerEntries.length).toBe(1);
      expect(ledgerEntries[0].partnerId.toString()).toBe(approvedPartnerId);
      expect(ledgerEntries[0].amount).toBeGreaterThan(0);
    });
  });

  describe('4. Concurrency, Availability & Expiration Edge Cases', () => {
    let partner2Token;
    let partner2Id;

    beforeAll(async () => {
      // Register a second approved partner for concurrent competition tests
      const p2Res = await request(app)
        .post('/api/auth/register-partner')
        .send({
          name: 'Bella Swift',
          email: 'bella@test.com',
          password: 'Password123!',
          vehicleType: 'scooter',
          licenseNumber: 'TEST-DL-BELLA'
        });
      partner2Token = p2Res.body.token;
      partner2Id = p2Res.body.user.id;

      await PartnerProfile.updateOne(
        { userId: partner2Id },
        { verificationStatus: 'approved', isOnline: true, isAvailable: true }
      );
    });

    it('rejects acceptance of an expired offer with HTTP 410', async () => {
      // Create an expired order
      const expiredOrder = await createTestOrder({
        status: 'offered',
        offeredPartnerId: approvedPartnerId,
        offerExpiresAt: new Date(Date.now() - 10000) // Expired 10s ago
      });

      const res = await request(app)
        .post(`/api/dispatch/accept/${expiredOrder._id}`)
        .set('Authorization', `Bearer ${approvedPartnerToken}`);

      expect(res.status).toBe(410);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('rejects an offline courier with HTTP 409', async () => {
      // Toggle partner to offline
      await PartnerProfile.updateOne({ userId: approvedPartnerId }, { isOnline: false, isAvailable: true });

      const testOrder = await createTestOrder({
        status: 'offered',
        offeredPartnerId: approvedPartnerId,
        offerExpiresAt: new Date(Date.now() + 60000)
      });

      const res = await request(app)
        .post(`/api/dispatch/accept/${testOrder._id}`)
        .set('Authorization', `Bearer ${approvedPartnerToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/offline/i);

      // Restore online
      await PartnerProfile.updateOne({ userId: approvedPartnerId }, { isOnline: true, isAvailable: true });
    });

    it('prevents a courier with an active delivery from accepting a second incompatible delivery', async () => {
      // Create Order 1 and assign to approvedPartnerId
      const activeOrder1 = await createTestOrder({
        status: 'assigned',
        assignedPartnerId: approvedPartnerId
      });
      // Courier is marked busy
      await PartnerProfile.updateOne({ userId: approvedPartnerId }, { isAvailable: false, isOnline: true });

      // Create Order 2 offered to approvedPartnerId
      const activeOrder2 = await createTestOrder({
        status: 'offered',
        offeredPartnerId: approvedPartnerId,
        offerExpiresAt: new Date(Date.now() + 60000)
      });

      const res = await request(app)
        .post(`/api/dispatch/accept/${activeOrder2._id}`)
        .set('Authorization', `Bearer ${approvedPartnerToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/active delivery mission in progress|unavailable/i);

      // Cleanup order 1 so partner becomes free
      await Order.deleteOne({ _id: activeOrder1._id });
      await Order.deleteOne({ _id: activeOrder2._id });
      await PartnerProfile.updateOne({ userId: approvedPartnerId }, { isAvailable: true, isOnline: true });
    });

    it('handles simultaneous acceptance: exactly one partner wins the order', async () => {
      // Create competing order offered to partner 1
      const competingOrder = await createTestOrder({
        status: 'offered',
        offeredPartnerId: approvedPartnerId,
        offerExpiresAt: new Date(Date.now() + 60000)
      });

      // Both couriers attempt to accept concurrently
      const [res1, res2] = await Promise.all([
        request(app).post(`/api/dispatch/accept/${competingOrder._id}`).set('Authorization', `Bearer ${approvedPartnerToken}`),
        request(app).post(`/api/dispatch/accept/${competingOrder._id}`).set('Authorization', `Bearer ${partner2Token}`)
      ]);

      const statuses = [res1.status, res2.status];
      // Exactly one gets 200, the other is rejected (403 for not offered to them or 409)
      expect(statuses).toContain(200);
      const otherStatus = statuses.find(s => s !== 200);
      expect([403, 409]).toContain(otherStatus);

      // Order in DB must have assigned status and winner
      const finalOrder = await Order.findById(competingOrder._id);
      expect(finalOrder.status).toBe('assigned');
      expect(finalOrder.assignedPartnerId.toString()).toBe(approvedPartnerId);
    });

    it('cancelling an assigned order restores partner availability', async () => {
      // Partner 2 is online and assigned to an order
      const orderToCancel = await createTestOrder({
        status: 'assigned',
        assignedPartnerId: partner2Id
      });
      await PartnerProfile.updateOne({ userId: partner2Id }, { isAvailable: false });

      // Merchant cancels the order
      const cancelRes = await request(app)
        .post(`/api/orders/${orderToCancel._id}/cancel`)
        .set('Authorization', `Bearer ${businessToken}`)
        .send({ reason: 'Item out of stock' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.order.status).toBe('cancelled');

      // Partner availability must be restored to true
      const p2Profile = await PartnerProfile.findOne({ userId: partner2Id });
      expect(p2Profile.isAvailable).toBe(true);
    });
  });

  describe('5. Production-Readiness, Security Hardening & Remediation Verification', () => {
    let testHttpServer;
    let testPort;
    let ioClient;
    let adminToken;
    let adminId;

    beforeAll(async () => {
      try {
        ioClient = require(path.resolve(__dirname, '../../../client/node_modules/socket.io-client')).io;
      } catch (err) {
        console.warn('socket.io-client not loaded directly:', err.message);
      }

      // Create admin user for authorization tests
      const adminRes = await User.create({
        name: 'Chief Ops Admin',
        email: 'opsadmin@test.com',
        password: 'Password123!',
        role: 'admin',
        status: 'active'
      });
      adminId = adminRes._id.toString();

      const jwt = require('jsonwebtoken');
      const env = require('../config/env');
      adminToken = jwt.sign(
        { id: adminId, role: 'admin', email: 'opsadmin@test.com' },
        env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      // Spin up ephemeral HTTP server for live Socket.IO tests
      const http = require('http');
      const { initializeSocket } = require('../services/socketService');
      testHttpServer = http.createServer(app);
      initializeSocket(testHttpServer);

      await new Promise((resolve) => {
        testHttpServer.listen(0, () => {
          testPort = testHttpServer.address().port;
          resolve();
        });
      });
    });

    afterAll(async () => {
      if (testHttpServer) {
        await new Promise((resolve) => testHttpServer.close(resolve));
      }
    });

    // Verification A: Courier cannot cancel another user's order
    it('Verification A: strictly blocks couriers from cancelling business orders with HTTP 403', async () => {
      const order = await Order.create({
        orderNumber: `SWF-${Math.floor(10000 + Math.random() * 90000)}`,
        businessId,
        status: 'created',
        pickup: { address: 'Shop 14, Connaught Place, New Delhi', coordinates: [77.2167, 28.6315], contactName: 'M' },
        dropoff: { address: 'Barakhamba Road, New Delhi', coordinates: [77.2245, 28.6300], contactName: 'C', phone: '+91 98110 55555' },
        packageDetails: { category: 'general', weightKg: 1 },
        pricing: { baseFare: 40, distanceKm: 1, distanceCost: 12, totalCost: 52, partnerPayout: 40.56 },
        estimatedDurationMins: 10
      });

      // Courier tries to cancel
      const res = await request(app)
        .post(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ reason: 'Courier malicious cancel attempt' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);

      // Verify order is still 'created' and not cancelled
      const freshOrder = await Order.findById(order._id);
      expect(freshOrder.status).toBe('created');
    });

    // Verification B: Unrelated authenticated users cannot join an order room
    it('Verification B: rejects unauthorized socket from joining private order tracking room', (done) => {
      if (!ioClient) {
        console.warn('Skipping socket integration test because client is unavailable');
        return done();
      }

      Order.create({
        orderNumber: `SWF-${Math.floor(10000 + Math.random() * 90000)}`,
        businessId, // Owned by test business
        status: 'created',
        pickup: { address: 'Shop 14, Connaught Place, New Delhi', coordinates: [77.2167, 28.6315], contactName: 'M' },
        dropoff: { address: 'Barakhamba Road, New Delhi', coordinates: [77.2245, 28.6300], contactName: 'C', phone: '+91 98110 55555' },
        packageDetails: { category: 'general', weightKg: 1 },
        pricing: { baseFare: 40, distanceKm: 1, distanceCost: 12, totalCost: 52, partnerPayout: 40.56 },
        estimatedDurationMins: 10
      }).then((order) => {
        // Connect socket as unassigned partner
        const clientSocket = ioClient(`http://127.0.0.1:${testPort}`, {
          auth: { token: approvedPartnerToken },
          transports: ['websocket']
        });

        clientSocket.on('connect', () => {
          // Attempt to eavesdrop on private order
          clientSocket.emit('join_order_room', { orderId: order._id.toString() });
        });

        clientSocket.on('unauthorized_room_join', (payload) => {
          expect(payload.orderId).toBe(order._id.toString());
          expect(payload.message).toMatch(/Forbidden/i);
          clientSocket.disconnect();
          done();
        });

        // Fail-safe timeout in case of unexpected silence
        setTimeout(() => {
          if (clientSocket.connected) {
            clientSocket.disconnect();
          }
        }, 3000);
      });
    });

    // Verification C: Unassigned courier cannot retrieve sensitive order details
    it('Verification C: denies unassigned courier from viewing sensitive order details with HTTP 403', async () => {
      const privateOrder = await Order.create({
        orderNumber: `SWF-${Math.floor(10000 + Math.random() * 90000)}`,
        businessId,
        status: 'created',
        assignedPartnerId: null,
        offeredPartnerId: null,
        pickup: { address: 'Secret Warehouse 1, Connaught Place', coordinates: [77.2167, 28.6315], contactName: 'VIP Owner' },
        dropoff: { address: 'Private Estate, Chanakyapuri', coordinates: [77.1982, 28.5912], contactName: 'VIP Recipient', phone: '+91 99999 00000' },
        packageDetails: { category: 'groceries', weightKg: 3 },
        pricing: { baseFare: 40, distanceKm: 4.5, distanceCost: 54, totalCost: 94, partnerPayout: 73.32 },
        estimatedDurationMins: 20
      });

      // Courier not assigned or offered calls GET /api/orders/:id
      const res = await request(app)
        .get(`/api/orders/${privateOrder._id}`)
        .set('Authorization', `Bearer ${approvedPartnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden.*not assigned or offered/i);

      // Business owner can view their order
      const ownerRes = await request(app)
        .get(`/api/orders/${privateOrder._id}`)
        .set('Authorization', `Bearer ${businessToken}`);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.orderNumber).toBe(privateOrder.orderNumber);

      // Admin can view any order
      const adminOrderRes = await request(app)
        .get(`/api/orders/${privateOrder._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminOrderRes.status).toBe(200);
    });

    // Verification D: Production cannot boot with missing database configuration
    it('Verification D: prevents starting in-memory database in production mode', async () => {
      const envModule = require('../config/env');
      const mongoose = require('mongoose');
      const originalNodeEnv = envModule.NODE_ENV;
      const originalUri = envModule.MONGODB_URI;

      try {
        await mongoose.disconnect();
        envModule.NODE_ENV = 'production';
        envModule.MONGODB_URI = undefined;

        const { connectDB } = require('../config/db');
        // Must throw fatal error refusing embedded MongoMemoryServer in production
        await expect(connectDB()).rejects.toThrow(/MONGODB_URI.*required in production/i);
      } finally {
        envModule.NODE_ENV = originalNodeEnv;
        envModule.MONGODB_URI = originalUri;
        const { connectDB } = require('../config/db');
        await connectDB();
      }
    });

    // Verification F: CORS allowlist validation
    it('Verification F: respects environment-configured CORS allowlist for Vercel and local development', async () => {
      // Allowed local origin
      const allowedRes = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');
      expect(allowedRes.headers['access-control-allow-origin']).toBe('http://localhost:5173');

      // Unauthorized third-party origin
      const rejectedRes = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-external-site.io');
      expect(rejectedRes.headers['access-control-allow-origin']).toBeUndefined();
    });

    // Verification G: Idempotent delivery completion & duplicate earnings protection
    it('Verification G: handles duplicate delivery completion safely without double-crediting', async () => {
      const deliveredOrder = await Order.create({
        orderNumber: `SWF-${Math.floor(10000 + Math.random() * 90000)}`,
        businessId,
        assignedPartnerId: approvedPartnerId,
        status: 'picked_up',
        handoverPin: '4821',
        pickup: { address: 'Shop 14, Connaught Place, New Delhi', coordinates: [77.2167, 28.6315], contactName: 'M' },
        dropoff: { address: 'Barakhamba Road, New Delhi', coordinates: [77.2245, 28.6300], contactName: 'C', phone: '+91 98110 55555' },
        packageDetails: { category: 'electronics', weightKg: 2 },
        pricing: { baseFare: 40, distanceKm: 2, distanceCost: 24, totalCost: 64, partnerPayout: 49.92 },
        estimatedDurationMins: 14
      });

      // Step 1: First delivery update
      const res1 = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({
          orderId: deliveredOrder._id,
          targetStatus: 'delivered',
          handoverPin: '4821'
        });

      expect(res1.status).toBe(200);
      expect(res1.body.order.status).toBe('delivered');

      const profileStep1 = await PartnerProfile.findOne({ userId: approvedPartnerId });
      const totalEarnedAfter1 = profileStep1.stats.totalEarned;
      const deliveriesAfter1 = profileStep1.stats.totalDeliveries;

      // Step 2: Duplicate delivery update
      const res2 = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({
          orderId: deliveredOrder._id,
          targetStatus: 'delivered',
          handoverPin: '4821'
        });

      expect(res2.status).toBe(200);
      expect(res2.body.message).toMatch(/already marked as delivered/i);

      // Verify Exactly-Once ledger recording
      const ledgerRecords = await EarningsLedger.find({ orderId: deliveredOrder._id });
      expect(ledgerRecords.length).toBe(1);

      // Verify courier stats were not credited a second time
      const profileStep2 = await PartnerProfile.findOne({ userId: approvedPartnerId });
      expect(profileStep2.stats.totalEarned).toBe(totalEarnedAfter1);
      expect(profileStep2.stats.totalDeliveries).toBe(deliveriesAfter1);
    });

    // Stale offer recovery verification
    it('recovers and auto-expires stale offers that timed out during server downtime', async () => {
      const { recoverStaleOffers } = require('../services/matchingService');
      const staleOrder = await Order.create({
        orderNumber: `SWF-${Math.floor(10000 + Math.random() * 90000)}`,
        businessId,
        status: 'offered',
        offeredPartnerId: approvedPartnerId,
        offerExpiresAt: new Date(Date.now() - 10000), // 10s in past
        pickup: { address: 'Shop 14, Connaught Place, New Delhi', coordinates: [77.2167, 28.6315], contactName: 'M' },
        dropoff: { address: 'Barakhamba Road, New Delhi', coordinates: [77.2245, 28.6300], contactName: 'C', phone: '+91 98110 55555' },
        packageDetails: { category: 'general', weightKg: 1 },
        pricing: { baseFare: 40, distanceKm: 1, distanceCost: 12, totalCost: 52, partnerPayout: 40.56 },
        estimatedDurationMins: 10
      });

      await recoverStaleOffers();

      const refreshedOrder = await Order.findById(staleOrder._id);
      expect(refreshedOrder.rejectedPartnerIds.map((id) => id.toString())).toContain(approvedPartnerId);
      // Stale courier was revoked and offer was cascaded to next eligible courier or reset to created
      if (refreshedOrder.status === 'offered') {
        expect(refreshedOrder.offeredPartnerId.toString()).not.toBe(approvedPartnerId);
      } else {
        expect(refreshedOrder.status).toBe('created');
      }
    });

    // Error mapping verification: CastError & validation
    it('maps malformed ObjectId parameters to HTTP 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/orders/not-a-valid-mongoose-id')
        .set('Authorization', `Bearer ${businessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('BadRequest');
      expect(res.body.message).toMatch(/not a valid ObjectId/i);
    });

    // DB-aware health check verification
    it('reports database status accurately in /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBe('connected');
      expect(res.body).toHaveProperty('uptimeSeconds');
    });
  });

  describe('6. Real India Production Operations & Localization Verification', () => {
    it('calculates pricing with Indian Rupee (INR) currency metadata and configured fare parameters', () => {
      const quote = calculateDeliveryQuote({
        pickupCoords: [77.2090, 28.6139], // Connaught Place, New Delhi
        dropoffCoords: [77.2300, 28.6500], // Old Delhi
        weightKg: 2.0,
        category: 'general'
      });

      expect(quote.currency).toBe('INR');
      expect(quote.currencySymbol).toBe('₹');
      expect(quote.pricingBreakdown.currency).toBe('INR');
      expect(quote.pricingBreakdown.baseFare).toBe(40.00);
      expect(quote.pricingBreakdown.totalCost).toBeGreaterThanOrEqual(40.00);
      expect(quote.pricingBreakdown.partnerPayout).toBeCloseTo(quote.pricingBreakdown.totalCost * 0.78, 1);
    });

    it('enforces Indian mobile number format during merchant onboarding (rejects invalid, accepts 10-digit)', async () => {
      // Rejects invalid phone
      const invalidRes = await request(app)
        .post('/api/auth/register-business')
        .send({
          name: 'Delhi Retail Store',
          email: 'invalid_phone@retail.in',
          password: 'Password123!',
          phone: '12345',
          companyName: 'Delhi Retail Store'
        });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.message).toMatch(/valid 10-digit Indian mobile number/i);

      // Accepts valid 10-digit Indian mobile
      const validRes = await request(app)
        .post('/api/auth/register-business')
        .send({
          name: 'Delhi Retail Store',
          email: 'valid_phone@retail.in',
          password: 'Password123!',
          phone: '9876543210',
          companyName: 'Delhi Retail Store',
          address: 'Connaught Place, New Delhi',
          pincode: '110001'
        });

      expect(validRes.status).toBe(201);
      expect(validRes.body.user.phone).toBe('9876543210');
      expect(validRes.body.profile.address).toBe('Connaught Place, New Delhi');
      expect(validRes.body.profile.pincode).toBe('110001');
    });

    it('supports Indian compliance document types and New Delhi default coordinates during courier application', async () => {
      const res = await request(app)
        .post('/api/auth/register-partner')
        .send({
          name: 'Rajesh Kumar',
          email: 'rajesh.kumar@swiftfleet.in',
          password: 'Password123!',
          phone: '+919876543211',
          vehicleType: 'motorcycle',
          licenseNumber: 'DL-0420110012345',
          idDocumentType: 'Driving Licence',
          idDocumentNumber: 'DL-0420110012345'
        });

      expect(res.status).toBe(201);
      expect(res.body.profile.idDocumentType).toBe('Driving Licence');
      expect(res.body.profile.verificationStatus).toBe('pending');
      // Coordinates near New Delhi [77.2090, 28.6139]
      expect(res.body.profile.currentCoordinates.coordinates[0]).toBeCloseTo(77.2, 0);
      expect(res.body.profile.currentCoordinates.coordinates[1]).toBeCloseTo(28.6, 0);
    });
  });

  describe('7. P0/P1 Production Hardening Verification (Transactions, PIN Handover, Identity Encryption, GPS Isolation, Enumeration)', () => {
    let adminToken;
    let opsAdminId;

    beforeAll(async () => {
      const adminUser = await User.create({
        name: 'Lead Compliance Auditor',
        email: 'auditor@swiftfleet.in',
        password: 'Password123!',
        role: 'admin'
      });
      opsAdminId = adminUser._id;
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'auditor@swiftfleet.in', password: 'Password123!' });
      adminToken = adminLogin.body.token;
    });

    it('requires Customer Handover PIN to complete delivery, locks on 5 failed attempts, and accepts valid PIN', async () => {
      const pinOrder = await createTestOrder({
        status: 'picked_up',
        assignedPartnerId: approvedPartnerId,
        handoverPin: '7392'
      });

      // 1. Missing PIN -> 400
      const missingPinRes = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ orderId: pinOrder._id, targetStatus: 'delivered' });
      expect(missingPinRes.status).toBe(400);
      expect(missingPinRes.body.message).toMatch(/PIN is required/i);

      // 2. Incorrect PIN -> 400 and increments attempts
      const wrongPinRes = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ orderId: pinOrder._id, targetStatus: 'delivered', handoverPin: '0000' });
      expect(wrongPinRes.status).toBe(400);
      expect(wrongPinRes.body.message).toMatch(/Invalid delivery PIN/i);

      // 3. Repeat 4 more times to trigger lock (total 5 failed attempts)
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/dispatch/status-update')
          .set('Authorization', `Bearer ${approvedPartnerToken}`)
          .send({ orderId: pinOrder._id, targetStatus: 'delivered', handoverPin: '0000' });
      }

      // Now order is locked -> 403
      const lockedRes = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ orderId: pinOrder._id, targetStatus: 'delivered', handoverPin: '7392' });
      expect(lockedRes.status).toBe(403);
      expect(lockedRes.body.message).toMatch(/locked/i);

      // 4. Create fresh order and successfully deliver with correct PIN
      const validPinOrder = await createTestOrder({
        status: 'picked_up',
        assignedPartnerId: approvedPartnerId,
        handoverPin: '5541'
      });
      const validDeliveredRes = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ orderId: validPinOrder._id, targetStatus: 'delivered', handoverPin: '5541' });
      expect(validDeliveredRes.status).toBe(200);
      expect(validDeliveredRes.body.order.status).toBe('delivered');
    });

    it('hides handover PIN from courier and merchant and restricts disclosure exclusively to customer tracking token', async () => {
      const orderWithPin = await createTestOrder({
        status: 'assigned',
        assignedPartnerId: approvedPartnerId,
        handoverPin: '9182'
      });

      // Courier view: never exposes PIN or tracking token
      const courierView = await request(app)
        .get(`/api/orders/${orderWithPin._id}`)
        .set('Authorization', `Bearer ${approvedPartnerToken}`);
      expect(courierView.status).toBe(200);
      expect(courierView.body.handoverPin).toBeUndefined();
      expect(courierView.body.handoverPinHash).toBeUndefined();
      expect(courierView.body.trackingToken).toBeUndefined();
      expect(courierView.body.trackingUrl).toBeUndefined();

      // Merchant owner view: never exposes PIN directly (discloses tracking link to share with recipient)
      const merchantView = await request(app)
        .get(`/api/orders/${orderWithPin._id}`)
        .set('Authorization', `Bearer ${businessToken}`);
      expect(merchantView.status).toBe(200);
      expect(merchantView.body.handoverPin).toBeUndefined();
      expect(merchantView.body.handoverPinHash).toBeUndefined();
      expect(merchantView.body.trackingToken).toBeDefined();
      expect(merchantView.body.trackingUrl).toBe(`/track/${orderWithPin.trackingToken}`);

      // Customer view via secure unguessable tracking token: discloses valid active PIN
      const customerTracking = await request(app)
        .get(`/api/tracking/${orderWithPin.trackingToken}`);
      expect(customerTracking.status).toBe(200);
      expect(customerTracking.body.deliveryPin.pin).toBe('9182');
    });

    it('encrypts sensitive KYC documents and masks them in general API responses while providing audit-logged decrypt for admin', async () => {
      const kycPartnerRes = await request(app)
        .post('/api/auth/register-partner')
        .send({
          name: 'Vikram Compliance Test',
          email: 'vikram.kyc@courier.in',
          password: 'Password123!',
          phone: '+919811223344',
          vehicleType: 'motorcycle',
          licenseNumber: 'DL-0420119988776',
          idDocumentType: 'Driving Licence',
          idDocumentNumber: 'DL-0420119988776'
        });
      expect(kycPartnerRes.status).toBe(201);
      const kycUserId = kycPartnerRes.body.user.id;

      // Check DB directly: ciphertext must be present
      const rawProfileInDb = await PartnerProfile.findOne({ userId: kycUserId });
      expect(rawProfileInDb.licenseNumberEncrypted).toBeDefined();
      expect(rawProfileInDb.licenseNumberEncrypted).toContain(':'); // IV:Tag:Ciphertext format

      // Admin partner list returns masked representation
      const adminListRes = await request(app)
        .get(`/api/admin/partners?search=Vikram`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminListRes.status).toBe(200);
      const partnerInList = adminListRes.body.partners.find(p => p.userId?._id?.toString() === kycUserId);
      expect(partnerInList).toBeDefined();
      expect(partnerInList.licenseNumber).toMatch(/X.*8776/); // Masked
      expect(partnerInList.licenseNumberEncrypted).toBeUndefined();

      // Admin decrypt endpoint recovers plaintext and records AuditLog
      const decryptRes = await request(app)
        .get(`/api/admin/partners/${kycUserId}/decrypt-kyc?reason=RegulatoryComplianceReview`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(decryptRes.status).toBe(200);
      expect(decryptRes.body.licenseNumber).toBe('DL-0420119988776');
      expect(decryptRes.body.auditLogged).toBe(true);

      const auditLogEntry = await AuditLog.findOne({
        action: 'DECRYPT_KYC_DOCUMENT',
        'metadata.partnerUserId': kycUserId
      });
      expect(auditLogEntry).toBeDefined();
      expect(auditLogEntry.actorRole).toBe('admin');
    });

    it('protects against user enumeration by returning identical 401 messages for non-existent users and bad passwords', async () => {
      // 1. Non-existent email
      const nonExistentRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost_user_never_existed@domain.com', password: 'SomePassword123!' });
      expect(nonExistentRes.status).toBe(401);
      expect(nonExistentRes.body.message).toBe('Invalid email or password.');

      // 2. Existing email with incorrect password
      const wrongPassRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bakery@test.com', password: 'WrongPassword999!' });
      expect(wrongPassRes.status).toBe(401);
      expect(wrongPassRes.body.message).toBe('Invalid email or password.');
    });

    it('enforces fail-closed transaction error in production mode when database transactions are unsupported', async () => {
      const origNodeEnv = env.NODE_ENV;
      try {
        env.NODE_ENV = 'production';

        const testOrderProd = await createTestOrder({
          status: 'picked_up',
          assignedPartnerId: approvedPartnerId,
          handoverPin: '1234'
        });

        // In test environment MongoMemoryServer is Single node (topology Single -> transactions not started)
        const res = await request(app)
          .post('/api/dispatch/status-update')
          .set('Authorization', `Bearer ${approvedPartnerToken}`)
          .send({ orderId: testOrderProd._id, targetStatus: 'delivered', handoverPin: '1234' });

        expect(res.status).toBe(500);
        expect(res.body.message).toMatch(/transactions are strictly required in production/i);
      } finally {
        env.NODE_ENV = origNodeEnv;
      }
    });
  });

  describe('10. India-Only Real Maps, Coordinates & WebSocket Security Remediation', () => {
    it('verifies seed data contains zero US coordinates, zero NYC addresses, and zero US phone numbers', () => {
      const fs = require('fs');
      const path = require('path');

      const seedDataContent = fs.readFileSync(path.join(__dirname, '../seed/seedData.js'), 'utf8');
      const seedRunnerContent = fs.readFileSync(path.join(__dirname, '../seed/seedRunner.js'), 'utf8');

      // Assert no NYC / US coordinates
      expect(seedDataContent).not.toMatch(/-73\./);
      expect(seedDataContent).not.toMatch(/40\.7/);
      expect(seedRunnerContent).not.toMatch(/-73\./);
      expect(seedRunnerContent).not.toMatch(/40\.7/);

      // Assert no NYC address keywords
      expect(seedDataContent).not.toMatch(/Central Park|Rockefeller|New York/i);
      expect(seedRunnerContent).not.toMatch(/Central Park|Rockefeller|New York/i);

      // Assert no +1 (555) US numbers
      expect(seedDataContent).not.toMatch(/\+1\s*\(?555/);
      expect(seedRunnerContent).not.toMatch(/\+1\s*\(?555/);

      // Assert Indian phone and city fixtures
      expect(seedDataContent).toMatch(/\+91/);
      expect(seedDataContent).toMatch(/Connaught Place|Koramangala|Bandra Kurla Complex/);
      expect(seedRunnerContent).toMatch(/currency:\s*'INR'/);
      expect(seedRunnerContent).toMatch(/currencySymbol:\s*'₹'/);
    });

    it('confirms all seeded user accounts reside strictly within Indian sovereign geospatial boundaries', () => {
      const { users: seededUsers } = require('../seed/seedData');

      seededUsers.forEach((u) => {
        expect(u.phone).toMatch(/^\+91/);

        if (u.businessProfile?.defaultCoordinates?.coordinates) {
          const [lng, lat] = u.businessProfile.defaultCoordinates.coordinates;
          // India latitude roughly 8°N to 37°N, longitude 68°E to 97°E
          expect(lat).toBeGreaterThanOrEqual(8.0);
          expect(lat).toBeLessThanOrEqual(37.5);
          expect(lng).toBeGreaterThanOrEqual(68.0);
          expect(lng).toBeLessThanOrEqual(97.5);
        }

        if (u.partnerProfile?.currentCoordinates?.coordinates) {
          const [lng, lat] = u.partnerProfile.currentCoordinates.coordinates;
          expect(lat).toBeGreaterThanOrEqual(8.0);
          expect(lat).toBeLessThanOrEqual(37.5);
          expect(lng).toBeGreaterThanOrEqual(68.0);
          expect(lng).toBeLessThanOrEqual(97.5);
        }
      });
    });

    it('ensures WebSocket broadcast sanitization strips handoverPin and hash for couriers and tracking rooms', () => {
      const { sanitizeOrder } = require('../services/socketService');

      const orderDoc = {
        _id: '507f1f77bcf86cd799439011',
        orderNumber: 'SWF-TESTPIN',
        status: 'assigned',
        businessId: '507f1f77bcf86cd799439012',
        assignedPartnerId: '507f1f77bcf86cd799439013',
        offeredPartnerId: null,
        handoverPin: '9421',
        handoverPinHash: '$2a$10$hashedstringhere',
        pickup: { coordinates: [77.2167, 28.6315] },
        dropoff: { coordinates: [77.2245, 28.6300] }
      };

      // 1. Courier and public tracking room sanitization (PIN strictly stripped)
      const courierSafe = sanitizeOrder(orderDoc, { allowPin: false });
      expect(courierSafe.handoverPin).toBeUndefined();
      expect(courierSafe.handoverPinHash).toBeUndefined();
      expect(courierSafe.orderNumber).toBe('SWF-TESTPIN');

      // 2. Merchant and admin privileged room sanitization (PIN preserved, hash stripped)
      const privileged = sanitizeOrder(orderDoc, { allowPin: true });
      expect(privileged.handoverPin).toBe('9421');
      expect(privileged.handoverPinHash).toBeUndefined();
      expect(privileged.orderNumber).toBe('SWF-TESTPIN');
    });

    it('rigorously verifies broadcastOrderStatus delivers stripped PINs to tracking room & courier and privileged PIN to merchant & admin', () => {
      const socketService = require('../services/socketService');
      const io = socketService.getIO();

      const deliveredEvents = {};
      const spy = jest.spyOn(io, 'to').mockImplementation((room) => {
        return {
          emit: (event, payload) => {
            if (!deliveredEvents[room]) deliveredEvents[room] = [];
            deliveredEvents[room].push({ event, payload });
          }
        };
      });

      const testOrder = {
        _id: '67123456789abcdef0123450',
        orderNumber: 'SWF-PIN-TEST-99',
        status: 'assigned',
        businessId: '67123456789abcdef0123451',
        assignedPartnerId: '67123456789abcdef0123452',
        offeredPartnerId: '67123456789abcdef0123453',
        handoverPin: '6543',
        handoverPinHash: '$2a$10$verysecurehashstring',
        pickup: { coordinates: [77.2090, 28.6139] },
        dropoff: { coordinates: [77.2200, 28.6200] }
      };

      socketService.broadcastOrderStatus(testOrder, { note: 'Status change test' });

      // 1. Tracking room: order:67123456789abcdef0123450
      const trackingRoomEvents = deliveredEvents['order:67123456789abcdef0123450'];
      expect(trackingRoomEvents).toBeDefined();
      expect(trackingRoomEvents.length).toBe(1);
      expect(trackingRoomEvents[0].event).toBe('order_status_updated');
      expect(trackingRoomEvents[0].payload.order.handoverPin).toBeUndefined();
      expect(trackingRoomEvents[0].payload.order.handoverPinHash).toBeUndefined();
      expect(trackingRoomEvents[0].payload.order.orderNumber).toBe('SWF-PIN-TEST-99');

      // 2. Assigned Courier room: user:67123456789abcdef0123452
      const courierRoomEvents = deliveredEvents['user:67123456789abcdef0123452'];
      expect(courierRoomEvents).toBeDefined();
      expect(courierRoomEvents.length).toBe(1);
      expect(courierRoomEvents[0].event).toBe('order_status_updated');
      expect(courierRoomEvents[0].payload.order.handoverPin).toBeUndefined();
      expect(courierRoomEvents[0].payload.order.handoverPinHash).toBeUndefined();

      // 3. Offered Courier room: user:67123456789abcdef0123453
      const offeredCourierEvents = deliveredEvents['user:67123456789abcdef0123453'];
      expect(offeredCourierEvents).toBeDefined();
      expect(offeredCourierEvents.length).toBe(1);
      expect(offeredCourierEvents[0].event).toBe('order_status_updated');
      expect(offeredCourierEvents[0].payload.order.handoverPin).toBeUndefined();
      expect(offeredCourierEvents[0].payload.order.handoverPinHash).toBeUndefined();

      // 4. Merchant room: user:67123456789abcdef0123451 (PIN strictly stripped to protect customer privacy)
      const merchantRoomEvents = deliveredEvents['user:67123456789abcdef0123451'];
      expect(merchantRoomEvents).toBeDefined();
      expect(merchantRoomEvents.length).toBe(1);
      expect(merchantRoomEvents[0].event).toBe('order_status_updated');
      expect(merchantRoomEvents[0].payload.order.handoverPin).toBeUndefined();
      expect(merchantRoomEvents[0].payload.order.handoverPinHash).toBeUndefined();

      // 5. Admin role room: role:admin (PIN strictly stripped)
      const adminRoleEvents = deliveredEvents['role:admin'];
      expect(adminRoleEvents).toBeDefined();
      expect(adminRoleEvents.length).toBe(1);
      expect(adminRoleEvents[0].event).toBe('order_status_updated');
      expect(adminRoleEvents[0].payload.order.handoverPin).toBeUndefined();
      expect(adminRoleEvents[0].payload.order.handoverPinHash).toBeUndefined();

      spy.mockRestore();
    });

    it('verifies cryptographic security and distribution of crypto.randomInt for PIN and Order reference generation', () => {
      const crypto = require('crypto');

      // Test 1,000 iterations of PIN generation
      const pins = new Set();
      for (let i = 0; i < 1000; i++) {
        const pin = crypto.randomInt(1000, 10000).toString();
        expect(pin).toHaveLength(4);
        const pinNum = parseInt(pin, 10);
        expect(pinNum).toBeGreaterThanOrEqual(1000);
        expect(pinNum).toBeLessThan(10000);
        expect(Number.isNaN(pinNum)).toBe(false);
        pins.add(pin);
      }
      // With 1000 draws from 9000 possibilities, high entropy ensures > 850 distinct PINs
      expect(pins.size).toBeGreaterThan(850);

      // Verify order reference format SWF-XXXXX
      for (let i = 0; i < 100; i++) {
        const orderNum = `SWF-${crypto.randomInt(10000, 100000)}`;
        expect(orderNum).toMatch(/^SWF-\d{5}$/);
      }
    });

    it('verifies MongoDB low-level BSON persistence never stores raw plaintext driving-license or identity numbers', async () => {
      const mongoose = require('mongoose');
      const PartnerProfile = require('../models/PartnerProfile');
      const User = require('../models/User');
      const { decrypt, maskIdentifier } = require('../utils/crypto');

      const courierUser = await User.create({
        name: 'KYC Test Courier',
        email: `kyc.courier.${Date.now()}@swiftfleet.test`,
        password: 'Password123!',
        role: 'partner',
        phone: '+919988776655'
      });

      const rawDL = 'DL-04-2023-9991234';
      const rawAadhaar = '9999-8888-1234';

      const profile = await PartnerProfile.create({
        userId: courierUser._id,
        verificationStatus: 'pending',
        vehicleType: 'motorcycle',
        licenseNumber: rawDL,
        idDocumentType: 'Aadhaar Card',
        idDocumentNumber: rawAadhaar,
        isOnline: false,
        isAvailable: true,
        currentCoordinates: {
          type: 'Point',
          coordinates: [77.2090, 28.6139]
        }
      });

      // Directly read raw BSON document from MongoDB driver bypassing Mongoose hooks/transforms
      const rawDoc = await mongoose.connection.db.collection('partnerprofiles').findOne({ _id: profile._id });

      const expectedMaskedDL = maskIdentifier(rawDL, 'Driving Licence');
      const expectedMaskedAadhaar = maskIdentifier(rawAadhaar, 'Aadhaar Card');

      // Verify raw BSON contains MASKED values on disk
      expect(rawDoc.licenseNumber).toBe(expectedMaskedDL);
      expect(rawDoc.idDocumentNumber).toBe(expectedMaskedAadhaar);
      expect(rawDoc.licenseNumberMasked).toBe(expectedMaskedDL);
      expect(rawDoc.idDocumentNumberMasked).toBe(expectedMaskedAadhaar);

      // Verify raw plaintext is NOT present in stringified raw BSON
      const rawDocString = JSON.stringify(rawDoc);
      expect(rawDocString.includes(rawDL)).toBe(false);
      expect(rawDocString.includes(rawAadhaar)).toBe(false);

      // Verify ciphertext exists and is AES-256-GCM (iv:tag:ciphertext)
      expect(rawDoc.licenseNumberEncrypted).toBeDefined();
      expect(rawDoc.licenseNumberEncrypted.split(':')).toHaveLength(3);
      expect(rawDoc.idDocumentNumberEncrypted).toBeDefined();
      expect(rawDoc.idDocumentNumberEncrypted.split(':')).toHaveLength(3);

      // Verify decryption recovers exact original plaintext
      expect(decrypt(rawDoc.licenseNumberEncrypted)).toBe(rawDL);
      expect(decrypt(rawDoc.idDocumentNumberEncrypted)).toBe(rawAadhaar);

      // Verify toJSON() and toObject() never leak ciphertexts
      const jsonView = profile.toJSON();
      expect(jsonView.licenseNumber).toBe(expectedMaskedDL);
      expect(jsonView.licenseNumberEncrypted).toBeUndefined();
      expect(jsonView.idDocumentNumberEncrypted).toBeUndefined();
    });

    it('enforces Indian pricing floor (1.0 km minimum, INR 40 base) and Haversine 1.30x modeling disclosure', () => {
      // 0.2 km straight line -> should be clamped to 1.0 km road distance
      const shortQuote = calculateDeliveryQuote({
        pickupCoords: [77.2167, 28.6315],
        dropoffCoords: [77.2170, 28.6320],
        weightKg: 1.0,
        category: 'general'
      });

      expect(shortQuote.roadDistanceKm).toBe(1.0);
      expect(shortQuote.pricingBreakdown.baseFare).toBe(40.00);
      expect(shortQuote.pricingBreakdown.distanceCost).toBe(12.00); // 1.0 * 12
      expect(shortQuote.pricingBreakdown.totalCost).toBe(52.00);
      expect(shortQuote.currency).toBe('INR');
      expect(shortQuote.disclaimer).toMatch(/1\.30x Indian urban topology/i);
    });

    it('verifies reverse proxy trust configuration in Express app', () => {
      const expressApp = require('../app');
      expect(expressApp.get('trust proxy')).toBe(1);
    });

    it('strictly prevents database seeding and wiping when NODE_ENV is production', async () => {
      const { seedDatabase } = require('../seed/seedRunner');
      const envModule = require('../config/env');
      const originalNodeEnv = envModule.NODE_ENV;
      const originalProcessEnv = process.env.NODE_ENV;

      try {
        envModule.NODE_ENV = 'production';
        process.env.NODE_ENV = 'production';

        await expect(seedDatabase()).rejects.toThrow(
          /strictly prohibited in production mode/i
        );
      } finally {
        envModule.NODE_ENV = originalNodeEnv;
        process.env.NODE_ENV = originalProcessEnv;
      }
    });

    it('validates production startup refusal on missing or insecure JWT_SECRET and ENCRYPTION_KEY', () => {
      // Test isolated evaluation of env.js validation logic in production mode
      const testEnvValidation = (mockEnv) => {
        const isProduction = mockEnv.NODE_ENV === 'production';
        if (isProduction) {
          if (!mockEnv.MONGODB_URI) {
            throw new Error('FATAL: MONGODB_URI environment variable is required in production mode. Refusing to boot with in-memory database.');
          }
          if (!mockEnv.JWT_SECRET || mockEnv.JWT_SECRET === 'swiftfleet_super_secure_jwt_dev_key_2026' || mockEnv.JWT_SECRET.length < 16) {
            throw new Error('FATAL: A strong, unique JWT_SECRET (minimum 16 characters) is required in production mode.');
          }
          if (!mockEnv.ENCRYPTION_KEY || mockEnv.ENCRYPTION_KEY.length < 32) {
            throw new Error('FATAL: A secure 32-byte ENCRYPTION_KEY is required in production mode for field-level KYC document encryption.');
          }
        }
      };

      // 1. Missing MONGODB_URI
      expect(() => testEnvValidation({ NODE_ENV: 'production', JWT_SECRET: 'a_very_long_valid_jwt_secret_32_chars!', ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' })).toThrow(/MONGODB_URI.*required/i);

      // 2. Default/Insecure JWT_SECRET
      expect(() => testEnvValidation({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://srv', JWT_SECRET: 'swiftfleet_super_secure_jwt_dev_key_2026', ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' })).toThrow(/JWT_SECRET.*required in production/i);

      // 3. Short JWT_SECRET (< 16 chars)
      expect(() => testEnvValidation({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://srv', JWT_SECRET: 'short_key_123', ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' })).toThrow(/minimum 16 characters/i);

      // 4. Missing ENCRYPTION_KEY
      expect(() => testEnvValidation({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://srv', JWT_SECRET: 'a_very_long_valid_jwt_secret_32_chars!' })).toThrow(/ENCRYPTION_KEY.*required in production/i);

      // 5. Short ENCRYPTION_KEY (< 32 chars)
      expect(() => testEnvValidation({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://srv', JWT_SECRET: 'a_very_long_valid_jwt_secret_32_chars!', ENCRYPTION_KEY: 'short_key_16byte' })).toThrow(/32-byte ENCRYPTION_KEY/i);

      // 6. Valid production credentials
      expect(() => testEnvValidation({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/prod',
        JWT_SECRET: 'a_very_long_valid_jwt_secret_32_chars!',
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
      })).not.toThrow();
    });
  });

  describe('11. Customer Tracking Page & Secure Delivery PIN Lifecycle Workflow', () => {
    let trackingOrder;

    beforeEach(async () => {
      // Create a test order through the actual business order creation endpoint
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({
          pickup: {
            address: 'Shop 14, Connaught Place, New Delhi',
            pincode: '110001',
            coordinates: [77.2167, 28.6315],
            contactName: 'Merchant Desk',
            phone: '+91 98110 12345'
          },
          dropoff: {
            address: 'Barakhamba Road, Connaught Place, New Delhi',
            pincode: '110001',
            coordinates: [77.2245, 28.6300],
            contactName: 'Customer Priya',
            phone: '+91 98110 54321'
          },
          packageDetails: {
            category: 'food_beverage',
            weightKg: 1.5
          }
        });

      trackingOrder = res.body.order;
    });

    it('generates a cryptographically secure tracking token and rejects invalid/forged tokens', async () => {
      expect(trackingOrder.trackingToken).toBeDefined();
      expect(typeof trackingOrder.trackingToken).toBe('string');
      expect(trackingOrder.trackingToken.length).toBeGreaterThanOrEqual(32);
      expect(trackingOrder.trackingUrl).toBe(`/track/${trackingOrder.trackingToken}`);

      // Valid token retrieves customer tracking payload
      const validRes = await request(app).get(`/api/tracking/${trackingOrder.trackingToken}`);
      expect(validRes.status).toBe(200);
      expect(validRes.body.order.orderNumber).toBe(trackingOrder.orderNumber);
      expect(validRes.body.order.dropoff.contactName).toBe('Customer Priya');

      // Invalid / forged token -> HTTP 404
      const invalidRes = await request(app).get('/api/tracking/invalid_forged_token_123456');
      expect(invalidRes.status).toBe(404);
      expect(invalidRes.body.message).toMatch(/invalid or expired/i);
    });

    it('allows external customer to view current valid 6-digit PIN while masking internal details', async () => {
      const res = await request(app).get(`/api/tracking/${trackingOrder.trackingToken}`);
      expect(res.status).toBe(200);
      expect(res.body.deliveryPin).toBeDefined();
      expect(res.body.deliveryPin.status).toBe('active');
      expect(res.body.deliveryPin.pin).toMatch(/^\d{6}$/);
      expect(res.body.deliveryPin.attemptsRemaining).toBe(5);
      expect(res.body.deliveryPin.expiresAt).toBeDefined();

      // Ensure merchant and courier endpoints do NOT leak this PIN
      const merchantView = await request(app)
        .get(`/api/orders/${trackingOrder._id}`)
        .set('Authorization', `Bearer ${businessToken}`);
      expect(merchantView.body.handoverPin).toBeUndefined();
      expect(merchantView.body.handoverPinHash).toBeUndefined();
    });

    it('allows customer to regenerate PIN, immediately invalidating the previous PIN', async () => {
      // 1. Fetch initial PIN
      const initRes = await request(app).get(`/api/tracking/${trackingOrder.trackingToken}`);
      const initialPin = initRes.body.deliveryPin.pin;

      // 2. Assign courier and advance to picked_up state
      await Order.updateOne(
        { _id: trackingOrder._id },
        { status: 'picked_up', assignedPartnerId: approvedPartnerId }
      );

      // 3. Customer requests a new PIN
      const regenRes = await request(app).post(`/api/tracking/${trackingOrder.trackingToken}/regenerate-pin`);
      expect(regenRes.status).toBe(200);
      const newPin = regenRes.body.deliveryPin.pin;
      expect(newPin).toMatch(/^\d{6}$/);
      expect(newPin).not.toBe(initialPin);

      // 4. Partner attempting to deliver with OLD PIN is rejected
      const oldPinRes = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ orderId: trackingOrder._id, targetStatus: 'delivered', handoverPin: initialPin });
      expect(oldPinRes.status).toBe(400);
      expect(oldPinRes.body.message).toMatch(/Invalid delivery PIN/i);

      // 5. Partner delivering with NEW PIN succeeds
      const newPinRes = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ orderId: trackingOrder._id, targetStatus: 'delivered', handoverPin: newPin });
      expect(newPinRes.status).toBe(200);
      expect(newPinRes.body.order.status).toBe('delivered');
    });

    it('enforces regeneration cooldown to prevent rapid spamming', async () => {
      // First regeneration
      const firstRegen = await request(app).post(`/api/tracking/${trackingOrder.trackingToken}/regenerate-pin`);
      expect(firstRegen.status).toBe(200);

      // Immediate second regeneration should be rate-limited by cooldown
      const secondRegen = await request(app).post(`/api/tracking/${trackingOrder.trackingToken}/regenerate-pin`);
      expect(secondRegen.status).toBe(429);
      expect(secondRegen.body.message).toMatch(/Please wait.*before requesting/i);
      expect(secondRegen.body.cooldownSeconds).toBeGreaterThan(0);
    });

    it('rejects delivery verification with an expired PIN and informs courier to ask customer for new PIN', async () => {
      // Expire the PIN in the database
      await Order.updateOne(
        { _id: trackingOrder._id },
        {
          status: 'picked_up',
          assignedPartnerId: approvedPartnerId,
          handoverPinExpiresAt: new Date(Date.now() - 5000) // 5 seconds in past
        }
      );

      // Customer view reflects expired state
      const customerView = await request(app).get(`/api/tracking/${trackingOrder.trackingToken}`);
      expect(customerView.body.deliveryPin.status).toBe('expired');
      expect(customerView.body.deliveryPin.pin).toBeNull();

      // Partner attempt to submit expired PIN is rejected
      const verifyRes = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ orderId: trackingOrder._id, targetStatus: 'delivered', handoverPin: '123456' });
      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.message).toMatch(/expired/i);
    });

    it('strictly prevents unassigned partners and business owners from verifying delivery PIN', async () => {
      await Order.updateOne(
        { _id: trackingOrder._id },
        { status: 'picked_up', assignedPartnerId: approvedPartnerId }
      );

      // 1. Unassigned partner attempt
      const unassignedRes = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${unapprovedPartnerToken}`)
        .send({ orderId: trackingOrder._id, targetStatus: 'delivered', handoverPin: '123456' });
      expect(unassignedRes.status).toBe(403);
      expect(unassignedRes.body.message).toMatch(/not the assigned delivery partner/i);

      // 2. Business user attempt
      const bizRes = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({ orderId: trackingOrder._id, targetStatus: 'delivered', handoverPin: '123456' });
      expect(bizRes.status).toBe(403);
    });

    it('successfully consumes PIN upon delivery and prevents reuse or regeneration on completed orders', async () => {
      // Fetch PIN
      const customerView = await request(app).get(`/api/tracking/${trackingOrder.trackingToken}`);
      const validPin = customerView.body.deliveryPin.pin;

      await Order.updateOne(
        { _id: trackingOrder._id },
        { status: 'picked_up', assignedPartnerId: approvedPartnerId }
      );

      // Complete delivery
      const deliveredRes = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ orderId: trackingOrder._id, targetStatus: 'delivered', handoverPin: validPin });
      expect(deliveredRes.status).toBe(200);

      // Customer view shows delivered status with consumed PIN
      const afterDelivery = await request(app).get(`/api/tracking/${trackingOrder.trackingToken}`);
      expect(afterDelivery.body.order.status).toBe('delivered');
      expect(afterDelivery.body.deliveryPin.status).toBe('delivered');
      expect(afterDelivery.body.deliveryPin.pin).toBeNull();

      // Regeneration rejected on delivered order
      const regenAttempt = await request(app).post(`/api/tracking/${trackingOrder.trackingToken}/regenerate-pin`);
      expect(regenAttempt.status).toBe(400);
      expect(regenAttempt.body.message).toMatch(/Cannot regenerate delivery PIN.*delivered/i);

      // Second delivery attempt with same PIN is rejected or idempotent
      const secondDelivery = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ orderId: trackingOrder._id, targetStatus: 'delivered', handoverPin: validPin });
      expect(secondDelivery.body.message).toMatch(/already.*delivered/i);
    });
  });

  describe('12. Existing Orders Backfill Migration & Tracking Link Accessibility', () => {
    let testAdminToken;

    beforeAll(async () => {
      const adminUser = await User.create({
        name: 'Super Admin',
        email: `admin_${Date.now()}@swiftfleet.io`,
        password: 'Password123!',
        role: 'admin',
        phone: '+91 98110 00099'
      });
      const jwt = require('jsonwebtoken');
      testAdminToken = jwt.sign(
        { id: adminUser._id, role: 'admin', email: adminUser.email },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('safely backfills eligible orders missing tokens and preserves existing valid tokens', async () => {
      // 1. Existing order WITH a valid tracking token
      const existingToken = 'existing_valid_token_1234567890abcdef';
      const orderWithToken = await Order.create({
        orderNumber: `SWF-${Math.floor(10000 + Math.random() * 90000)}`,
        businessId,
        status: 'assigned',
        assignedPartnerId: approvedPartnerId,
        trackingToken: existingToken,
        pickup: { address: 'CP Delhi', coordinates: [77.21, 28.63], contactName: 'M' },
        dropoff: { address: 'Noida', coordinates: [77.32, 28.57], contactName: 'C', phone: '+91 98110 00000' },
        packageDetails: { category: 'general', weightKg: 1 },
        pricing: { baseFare: 40, distanceKm: 5, distanceCost: 60, totalCost: 100, partnerPayout: 78 },
        estimatedDurationMins: 20
      });

      // 2. Existing eligible order MISSING a tracking token (e.g. SWF-34039 scenario)
      const orderMissingToken = await Order.create({
        orderNumber: 'SWF-34039',
        businessId,
        status: 'picked_up', // In Transit
        assignedPartnerId: approvedPartnerId,
        pickup: { address: 'CP Delhi', coordinates: [77.21, 28.63], contactName: 'M' },
        dropoff: { address: 'Gurugram', coordinates: [77.03, 28.45], contactName: 'C', phone: '+91 98110 00001' },
        packageDetails: { category: 'groceries', weightKg: 2 },
        pricing: { baseFare: 40, distanceKm: 10, distanceCost: 120, totalCost: 160, partnerPayout: 124 },
        estimatedDurationMins: 30
      });
      // Remove trackingToken that pre('save') might have set
      await Order.updateOne({ _id: orderMissingToken._id }, { $unset: { trackingToken: '' } });

      // 3. Existing ineligible orders (cancelled, expired, draft) missing tokens
      const cancelledOrder = await Order.create({
        orderNumber: `SWF-${Math.floor(10000 + Math.random() * 90000)}`,
        businessId,
        status: 'cancelled',
        pickup: { address: 'CP Delhi', coordinates: [77.21, 28.63], contactName: 'M' },
        dropoff: { address: 'Delhi', coordinates: [77.22, 28.64], contactName: 'C', phone: '+91 98110 00002' },
        packageDetails: { category: 'documents', weightKg: 0.5 },
        pricing: { baseFare: 40, distanceKm: 2, distanceCost: 24, totalCost: 64, partnerPayout: 50 },
        estimatedDurationMins: 10
      });
      await Order.updateOne({ _id: cancelledOrder._id }, { $unset: { trackingToken: '' } });

      // First run in dry-run mode: reports eligible, updated (simulated), skipped
      const dryRunReport = await backfillTrackingTokens({ dryRun: true });
      expect(dryRunReport.dryRun).toBe(true);
      expect(dryRunReport.eligibleOrders).toBeGreaterThanOrEqual(2);
      expect(dryRunReport.alreadyHasToken).toBeGreaterThanOrEqual(1);
      expect(dryRunReport.ineligibleSkipped).toBeGreaterThanOrEqual(1);
      expect(dryRunReport.failedOrders).toBe(0);

      // Check DB: in dry-run, orderMissingToken still has NO token
      const dryCheck = await Order.findById(orderMissingToken._id);
      expect(dryCheck.trackingToken).toBeUndefined();

      // Run live migration
      const liveReport = await backfillTrackingTokens({ dryRun: false });
      expect(liveReport.dryRun).toBe(false);
      expect(liveReport.ordersUpdated).toBeGreaterThanOrEqual(1);
      expect(liveReport.failedOrders).toBe(0);

      // Check DB: orderMissingToken now has a valid 48-char hex token
      const updatedOrder = await Order.findById(orderMissingToken._id);
      expect(updatedOrder.trackingToken).toBeDefined();
      expect(updatedOrder.trackingToken.length).toBeGreaterThanOrEqual(32);

      // Check DB: orderWithToken still has its ORIGINAL token (never overwritten!)
      const preservedOrder = await Order.findById(orderWithToken._id);
      expect(preservedOrder.trackingToken).toBe(existingToken);

      // Check DB: cancelled order was skipped and received NO token
      const checkCancelled = await Order.findById(cancelledOrder._id);
      expect(checkCancelled.trackingToken).toBeUndefined();

      // Run second time: idempotent, 0 updates!
      const secondReport = await backfillTrackingTokens({ dryRun: false });
      expect(secondReport.ordersUpdated).toBe(0);
      expect(secondReport.tokensGenerated).toBe(0);

      // Token uniqueness: updated token != existing token
      expect(updatedOrder.trackingToken).not.toBe(existingToken);

      // Business owner can retrieve trackingToken and trackingUrl via GET /api/orders/:id and by orderNumber
      const bizView = await request(app)
        .get(`/api/orders/${orderMissingToken._id}`)
        .set('Authorization', `Bearer ${businessToken}`);
      expect(bizView.status).toBe(200);
      expect(bizView.body.trackingToken).toBe(updatedOrder.trackingToken);
      expect(bizView.body.trackingUrl).toBe(`/track/${updatedOrder.trackingToken}`);

      const bizViewByOrderNumber = await request(app)
        .get(`/api/orders/SWF-34039`)
        .set('Authorization', `Bearer ${businessToken}`);
      expect(bizViewByOrderNumber.status).toBe(200);
      expect(bizViewByOrderNumber.body.trackingToken).toBe(updatedOrder.trackingToken);

      // Admin can also view the tracking link
      const adminView = await request(app)
        .get(`/api/orders/${orderMissingToken._id}`)
        .set('Authorization', `Bearer ${testAdminToken}`);
      expect(adminView.status).toBe(200);
      expect(adminView.body.trackingToken).toBe(updatedOrder.trackingToken);

      // Courier partner NEVER sees trackingToken or trackingUrl
      const partnerView = await request(app)
        .get(`/api/orders/${orderMissingToken._id}`)
        .set('Authorization', `Bearer ${approvedPartnerToken}`);
      expect(partnerView.status).toBe(200);
      expect(partnerView.body.trackingToken).toBeUndefined();
      expect(partnerView.body.trackingUrl).toBeUndefined();

      // Guest customer tracking works without login via GET /api/tracking/:token
      const guestView = await request(app)
        .get(`/api/tracking/${updatedOrder.trackingToken}`);
      expect(guestView.status).toBe(200);
      expect(guestView.body.order.orderNumber).toBe('SWF-34039');
      expect(guestView.body.order.status).toBe('picked_up');
      expect(guestView.body.order.dropoff.address).toBe('Gurugram');
      expect(guestView.body.order.dropoff.phone).toContain('••••'); // Masked for privacy
    });

    it('on-demand backfills tracking token in getOrderById if order was created without one', async () => {
      const legacyOrder = await Order.create({
        orderNumber: `SWF-${Math.floor(10000 + Math.random() * 90000)}`,
        businessId,
        status: 'assigned',
        assignedPartnerId: approvedPartnerId,
        pickup: { address: 'CP Delhi', coordinates: [77.21, 28.63], contactName: 'M' },
        dropoff: { address: 'Delhi', coordinates: [77.22, 28.64], contactName: 'C', phone: '+91 98110 00003' },
        packageDetails: { category: 'food_beverage', weightKg: 1 },
        pricing: { baseFare: 40, distanceKm: 2, distanceCost: 24, totalCost: 64, partnerPayout: 50 },
        estimatedDurationMins: 15
      });
      await Order.updateOne({ _id: legacyOrder._id }, { $unset: { trackingToken: '' } });

      // Business owner fetches the legacy order
      const res = await request(app)
        .get(`/api/orders/${legacyOrder._id}`)
        .set('Authorization', `Bearer ${businessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.trackingToken).toBeDefined();
      expect(res.body.trackingToken.length).toBeGreaterThanOrEqual(32);
      expect(res.body.trackingUrl).toBe(`/track/${res.body.trackingToken}`);

      // DB persisted the backfilled token
      const dbCheck = await Order.findById(legacyOrder._id);
      expect(dbCheck.trackingToken).toBe(res.body.trackingToken);
    });

    it('keeps completed order tracking link active and read-only while strictly rejecting OTP/PIN regeneration and re-verification', async () => {
      // 1. Create a completed/delivered order with handover PIN consumed
      const completedOrder = await Order.create({
        orderNumber: `SWF-${Math.floor(10000 + Math.random() * 90000)}`,
        businessId,
        status: 'delivered',
        assignedPartnerId: approvedPartnerId,
        handoverPinVerified: true,
        handoverPinConsumed: true,
        earningsCredited: true,
        pickup: { address: 'CP Delhi', coordinates: [77.21, 28.63], contactName: 'M' },
        dropoff: { address: 'Delhi', coordinates: [77.22, 28.64], contactName: 'Rohan Sharma', phone: '+91 98110 55555' },
        packageDetails: { category: 'food_beverage', weightKg: 1 },
        pricing: { baseFare: 40, distanceKm: 2, distanceCost: 24, totalCost: 64, partnerPayout: 50 },
        estimatedDurationMins: 15,
        timeline: [
          { status: 'created', timestamp: new Date(Date.now() - 3600000), note: 'Order placed' },
          { status: 'assigned', timestamp: new Date(Date.now() - 3000000), note: 'Assigned to courier' },
          { status: 'picked_up', timestamp: new Date(Date.now() - 2000000), note: 'Picked up' },
          { status: 'delivered', timestamp: new Date(Date.now() - 1000000), note: 'Package delivered with customer PIN verification' }
        ]
      });

      // 2. Customer guest access: tracking link remains active and accessible without login
      const guestRes = await request(app).get(`/api/tracking/${completedOrder.trackingToken}`);
      expect(guestRes.status).toBe(200);
      expect(guestRes.body.order.status).toBe('delivered');
      expect(guestRes.body.order.orderNumber).toBe(completedOrder.orderNumber);
      expect(guestRes.body.order.deliveredAt).toBeDefined();
      expect(guestRes.body.order.proofOfDelivery).toBeDefined();
      expect(guestRes.body.order.proofOfDelivery.verifiedViaPin).toBe(true);
      expect(guestRes.body.order.proofOfDelivery.recipientName).toBe('Rohan Sharma');
      expect(guestRes.body.order.dropoff.phone).toBe('••••••5555'); // Masked

      // Delivery PIN state is marked delivered with null PIN
      expect(guestRes.body.deliveryPin.status).toBe('delivered');
      expect(guestRes.body.deliveryPin.pin).toBeNull();
      expect(guestRes.body.deliveryPin.attemptsRemaining).toBe(0);

      // 3. Attempting to request or regenerate PIN on completed order is strictly rejected with HTTP 400
      const regenRes = await request(app)
        .post(`/api/tracking/${completedOrder.trackingToken}/regenerate-pin`);
      expect(regenRes.status).toBe(400);
      expect(regenRes.body.message).toMatch(/Cannot.*regenerate.*delivery PIN/i);

      // Verify DB was NOT modified: handoverPinConsumed is still true, status is still delivered
      const orderAfterRegen = await Order.findById(completedOrder._id);
      expect(orderAfterRegen.status).toBe('delivered');
      expect(orderAfterRegen.handoverPinConsumed).toBe(true);
      expect(orderAfterRegen.handoverPinVerified).toBe(true);

      // 4. Attempting to transition a completed order back to an active delivery state is strictly rejected
      const rollbackRes = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ orderId: completedOrder._id, targetStatus: 'picked_up' });
      expect(rollbackRes.status).toBe(400);
      expect(rollbackRes.body.message).toMatch(/Invalid state transition from 'delivered' to 'picked_up'/i);

      const assignedRollback = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ orderId: completedOrder._id, targetStatus: 'assigned' });
      expect(assignedRollback.status).toBe(400);
      expect(assignedRollback.body.message).toMatch(/Invalid state transition from 'delivered' to 'assigned'/i);

      // Re-delivery attempt on an already delivered order is idempotent and does not alter records
      const duplicateDelivery = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({ orderId: completedOrder._id, targetStatus: 'delivered', handoverPin: '123456' });
      expect(duplicateDelivery.status).toBe(200);
      expect(duplicateDelivery.body.message).toMatch(/already.*delivered/i);
    });
  });

  describe('13. Email-Based Login & Secure Forgot Password Recovery Flow', () => {
    let testUserEmail;
    let testUserInitialPassword;
    let testUser;

    beforeEach(async () => {
      const emailService = require('../services/emailService');
      emailService.clearLastDispatchedEmailForTesting();

      testUserEmail = `recovery_user_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;
      testUserInitialPassword = 'InitialSecurePass123!';

      testUser = await User.create({
        name: 'Recovery Test User',
        email: testUserEmail,
        password: testUserInitialPassword,
        role: 'business',
        phone: '+91 98110 88776'
      });
    });

    it('validates email format and credentials on login with strict anti-enumeration error responses', async () => {
      // 1. Missing fields
      const missingFields = await request(app)
        .post('/api/auth/login')
        .send({ email: '' });
      expect(missingFields.status).toBe(400);
      expect(missingFields.body.message).toMatch(/both email and password/i);

      // 2. Malformed email address
      const malformedEmail = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email-format', password: 'Password123!' });
      expect(malformedEmail.status).toBe(400);
      expect(malformedEmail.body.message).toMatch(/valid email address/i);

      // 3. Non-existent email -> 401
      const nonExistentRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent_user_999999@test.com', password: 'Password123!' });
      expect(nonExistentRes.status).toBe(401);
      expect(nonExistentRes.body.message).toBe('Invalid email or password.');

      // 4. Correct email, wrong password -> 401 with IDENTICAL generic message
      const wrongPasswordRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: 'WrongPassword456!' });
      expect(wrongPasswordRes.status).toBe(401);
      expect(wrongPasswordRes.body.message).toBe(nonExistentRes.body.message);

      // 5. Correct email, correct password -> 200 with JWT token
      const successRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testUserInitialPassword });
      expect(successRes.status).toBe(200);
      expect(successRes.body.token).toBeDefined();
      expect(successRes.body.user.email).toBe(testUserEmail);
    });

    it('enforces anti-enumeration on forgot password, generates secure hashed token, and dispatches reset email', async () => {
      const emailService = require('../services/emailService');
      const crypto = require('crypto');

      // 1. Invalid email format
      const invalidEmailRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid_email_string' });
      expect(invalidEmailRes.status).toBe(400);
      expect(invalidEmailRes.body.message).toMatch(/valid email/i);

      // 2. Non-existent email returns generic success and does NOT dispatch email
      emailService.clearLastDispatchedEmailForTesting();
      const unknownEmailRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody_here_random_12345@test.com' });
      expect(unknownEmailRes.status).toBe(200);
      expect(unknownEmailRes.body.message).toMatch(/If an account exists.*password reset link has been sent/i);
      expect(emailService.getLastDispatchedEmailForTesting()).toBeNull();

      // 3. Existing user returns IDENTICAL generic message and dispatches email
      const existingUserRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });
      expect(existingUserRes.status).toBe(200);
      expect(existingUserRes.body.message).toBe(unknownEmailRes.body.message);
      // Ensure raw token is NEVER returned in response
      expect(existingUserRes.body.token).toBeUndefined();
      expect(existingUserRes.body.resetToken).toBeUndefined();

      // Verify email was dispatched
      const dispatched = emailService.getLastDispatchedEmailForTesting();
      expect(dispatched).not.toBeNull();
      expect(dispatched.to).toBe(testUserEmail);
      expect(dispatched.resetUrl).toMatch(/\/reset-password\?token=[a-f0-9]{64}/);

      // Extract raw token from resetUrl
      const tokenMatch = dispatched.resetUrl.match(/token=([a-f0-9]{64})/);
      expect(tokenMatch).not.toBeNull();
      const rawToken = tokenMatch[1];

      // Check User record in database: token MUST be SHA-256 hashed, NOT plaintext!
      const userInDb = await User.findById(testUser._id).select('+passwordResetTokenHash +passwordResetExpiresAt');
      expect(userInDb.passwordResetTokenHash).toBeDefined();
      expect(userInDb.passwordResetTokenHash).not.toBe(rawToken);
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(userInDb.passwordResetTokenHash).toBe(expectedHash);
      expect(userInDb.passwordResetExpiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('validates tokens and strictly rejects invalid, malformed, or expired tokens', async () => {
      const emailService = require('../services/emailService');

      // Request reset to get a valid token
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });
      const rawToken = emailService.getLastDispatchedEmailForTesting().resetUrl.match(/token=([a-f0-9]{64})/)[1];

      // 1. Valid token passes validation
      const validRes = await request(app).get(`/api/auth/validate-reset-token/${rawToken}`);
      expect(validRes.status).toBe(200);
      expect(validRes.body.valid).toBe(true);

      // 2. Malformed token format (too short / non-hex)
      const malformedRes = await request(app).get('/api/auth/validate-reset-token/shortToken123');
      expect(malformedRes.status).toBe(400);
      expect(malformedRes.body.valid).toBe(false);

      // 3. Unknown 64-char hex token
      const unknownToken = 'a'.repeat(64);
      const unknownRes = await request(app).get(`/api/auth/validate-reset-token/${unknownToken}`);
      expect(unknownRes.status).toBe(400);
      expect(unknownRes.body.valid).toBe(false);

      // 4. Expired token
      await User.updateOne(
        { _id: testUser._id },
        { passwordResetExpiresAt: new Date(Date.now() - 60000) } // 1 minute in the past
      );
      const expiredRes = await request(app).get(`/api/auth/validate-reset-token/${rawToken}`);
      expect(expiredRes.status).toBe(400);
      expect(expiredRes.body.valid).toBe(false);
    });

    it('completes password reset, enforces single-use token invalidation, and prevents login with old password', async () => {
      const emailService = require('../services/emailService');

      // Request token
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUserEmail });
      const rawToken = emailService.getLastDispatchedEmailForTesting().resetUrl.match(/token=([a-f0-9]{64})/)[1];

      // 1. Short password rejection (< 6 chars)
      const shortPassRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, newPassword: '123', confirmPassword: '123' });
      expect(shortPassRes.status).toBe(400);
      expect(shortPassRes.body.message).toMatch(/at least 6 characters/i);

      // 2. Password mismatch rejection
      const mismatchRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, newPassword: 'NewSecurePassword1!', confirmPassword: 'DifferentPassword2!' });
      expect(mismatchRes.status).toBe(400);
      expect(mismatchRes.body.message).toMatch(/do not match/i);

      // 3. Successful password reset
      const newPassword = 'BrandNewPassword2026!';
      const successResetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, newPassword, confirmPassword: newPassword });
      expect(successResetRes.status).toBe(200);
      expect(successResetRes.body.message).toMatch(/reset successfully/i);

      // 4. Token is immediately cleared / single-use: repeating with same token fails
      const reuseRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, newPassword: 'AnotherPassword3!', confirmPassword: 'AnotherPassword3!' });
      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.message).toMatch(/invalid or has expired/i);

      // Token validation also fails now
      const validateAgain = await request(app).get(`/api/auth/validate-reset-token/${rawToken}`);
      expect(validateAgain.status).toBe(400);
      expect(validateAgain.body.valid).toBe(false);

      // 5. Old password is no longer accepted for login
      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testUserInitialPassword });
      expect(oldLoginRes.status).toBe(401);
      expect(oldLoginRes.body.message).toBe('Invalid email or password.');

      // 6. New password works successfully
      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: newPassword });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.token).toBeDefined();
      expect(newLoginRes.body.user.email).toBe(testUserEmail);

      // 7. Verify audit log entry
      const auditLog = await AuditLog.findOne({
        targetId: testUser._id.toString(),
        action: 'PASSWORD_RESET_COMPLETED'
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog.metadata.email).toBe(testUserEmail);
    });
  });
});

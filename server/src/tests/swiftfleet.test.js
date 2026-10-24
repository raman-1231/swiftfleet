const request = require('supertest');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Order = require('../models/Order');
const PartnerProfile = require('../models/PartnerProfile');
const EarningsLedger = require('../models/EarningsLedger');
const { calculateDeliveryQuote } = require('../services/pricingService');

describe('SwiftFleet Core Architecture & Business Logic Test Suite', () => {
  let businessToken;
  let businessId;
  let approvedPartnerToken;
  let approvedPartnerId;
  let unapprovedPartnerToken;
  let unapprovedPartnerId;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({});
    await PartnerProfile.deleteMany({});
    await Order.deleteMany({});
    await EarningsLedger.deleteMany({});

    // Register a business
    const bizRes = await request(app)
      .post('/api/auth/register-business')
      .send({
        name: 'Test Bakery Owner',
        email: 'bakery@test.com',
        password: 'Password123!',
        companyName: 'Test Bakery LLC',
        address: '100 Broadway, NY'
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
        pickupCoords: [-73.9851, 40.7484],
        dropoffCoords: [-73.9785, 40.7580],
        weightKg: 2.0,
        category: 'general'
      });

      expect(quote).toHaveProperty('roadDistanceKm');
      expect(quote).toHaveProperty('pricingBreakdown');
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
          pickup: { address: 'A', coordinates: [-73.98, 40.74] },
          dropoff: { address: 'B', coordinates: [-73.97, 40.75] }
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
            address: '240 Central Park South, New York',
            coordinates: [-73.9806, 40.7668],
            contactName: 'Bakery Desk'
          },
          dropoff: {
            address: '45 Rockefeller Plaza, New York',
            coordinates: [-73.9787, 40.7587],
            contactName: 'Office Reception',
            phone: '555-0199'
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
      const res = await request(app)
        .post('/api/dispatch/status-update')
        .set('Authorization', `Bearer ${approvedPartnerToken}`)
        .send({
          orderId: testOrderId,
          targetStatus: 'delivered'
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
});

const User = require('../models/User');
const PartnerProfile = require('../models/PartnerProfile');
const BusinessProfile = require('../models/BusinessProfile');
const Order = require('../models/Order');
const Dispute = require('../models/Dispute');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const socketService = require('../services/socketService');

exports.getMetrics = async (req, res, next) => {
  try {
    const [
      totalOrders,
      inTransitOrders,
      deliveredOrders,
      unassignedOrders,
      totalPartners,
      onlinePartners,
      pendingVerifications,
      openDisputes,
      recentLedger
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ['assigned', 'picked_up'] } }),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ status: { $in: ['created', 'offered'] } }),
      PartnerProfile.countDocuments(),
      PartnerProfile.countDocuments({ isOnline: true }),
      PartnerProfile.countDocuments({ verificationStatus: 'pending' }),
      Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, totalRevenue: { $sum: '$pricing.totalCost' }, totalPayouts: { $sum: '$pricing.partnerPayout' } } }
      ])
    ]);

    const financialTotals = recentLedger[0] || { totalRevenue: 0, totalPayouts: 0 };

    res.json({
      metrics: {
        totalOrders,
        inTransitOrders,
        deliveredOrders,
        unassignedOrders,
        totalPartners,
        onlinePartners,
        pendingVerifications,
        openDisputes,
        totalRevenue: financialTotals.totalRevenue,
        totalPayouts: financialTotals.totalPayouts,
        netPlatformMargin: parseFloat((financialTotals.totalRevenue - financialTotals.totalPayouts).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getPartners = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.verificationStatus = status;
    }

    const profiles = await PartnerProfile.find(query)
      .populate('userId', 'name email phone status createdAt')
      .sort({ createdAt: -1 });

    let filtered = profiles;
    if (search) {
      filtered = profiles.filter(
        (p) =>
          p.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
          p.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
          p.licenseNumber?.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({ partners: filtered });
  } catch (error) {
    next(error);
  }
};

exports.reviewPartnerVerification = async (req, res, next) => {
  try {
    const { partnerId } = req.params;
    const { status, notes } = req.body; // 'approved' | 'rejected' | 'suspended'

    if (!['approved', 'rejected', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid verification status.' });
    }

    const partnerProfile = await PartnerProfile.findOne({ userId: partnerId }).populate('userId');
    if (!partnerProfile) {
      return res.status(404).json({ message: 'Partner profile not found.' });
    }

    partnerProfile.verificationStatus = status;
    partnerProfile.verificationNotes = notes || `Status updated to ${status} by admin operations.`;
    partnerProfile.reviewedAt = new Date();
    partnerProfile.reviewedBy = req.user._id;

    if (status === 'suspended') {
      await User.updateOne({ _id: partnerId }, { status: 'suspended' });
    } else {
      await User.updateOne({ _id: partnerId }, { status: 'active' });
    }

    await partnerProfile.save();

    // Create persistent notification for courier
    await Notification.create({
      recipientId: partnerId,
      title: `Verification Status: ${status.toUpperCase()}`,
      message: notes || `Your partner account verification has been set to ${status}.`,
      type: 'verification_update'
    });

    // Record immutable audit log
    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: 'admin',
      action: `PARTNER_${status.toUpperCase()}`,
      targetType: 'Partner',
      targetId: partnerId,
      metadata: { notes, previousStatus: partnerProfile.verificationStatus }
    });

    // Push socket alert
    socketService.emitToUser(partnerId, 'verification_status_changed', {
      verificationStatus: status,
      notes
    });

    res.json({
      message: `Partner verification status updated to '${status}'.`,
      partner: partnerProfile
    });
  } catch (error) {
    next(error);
  }
};

exports.getFleetLive = async (req, res, next) => {
  try {
    const [onlineCouriers, activeOrders] = await Promise.all([
      PartnerProfile.find({ isOnline: true }).populate('userId', 'name phone'),
      Order.find({ status: { $in: ['created', 'offered', 'assigned', 'picked_up'] } })
        .populate('assignedPartnerId', 'name phone')
        .populate('businessId', 'name phone')
    ]);

    res.json({
      onlineCouriers,
      activeOrders
    });
  } catch (error) {
    next(error);
  }
};

exports.getDisputes = async (req, res, next) => {
  try {
    const disputes = await Dispute.find()
      .populate('orderId')
      .populate('raisedBy', 'name email role')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ disputes });
  } catch (error) {
    next(error);
  }
};

exports.createDispute = async (req, res, next) => {
  try {
    const { orderId, reason, category, details } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const dispute = await Dispute.create({
      orderId,
      orderNumber: order.orderNumber,
      raisedBy: req.user._id,
      raisedByRole: req.user.role,
      reason,
      category: category || 'late_delivery',
      details: details || ''
    });

    order.disputed = true;
    await order.save();

    res.status(201).json({ message: 'Dispute submitted for operational investigation.', dispute });
  } catch (error) {
    next(error);
  }
};

exports.resolveDispute = async (req, res, next) => {
  try {
    const { disputeId } = req.params;
    const { resolutionNotes, status } = req.body; // 'resolved' | 'under_review'

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found.' });
    }

    dispute.status = status || 'resolved';
    dispute.resolutionNotes = resolutionNotes || 'Resolved by ops coordinator';
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();
    await dispute.save();

    // Audit log
    await AuditLog.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: 'admin',
      action: 'DISPUTE_RESOLVED',
      targetType: 'Dispute',
      targetId: dispute._id.toString(),
      metadata: { resolutionNotes, orderNumber: dispute.orderNumber }
    });

    res.json({ message: 'Dispute updated successfully.', dispute });
  } catch (error) {
    next(error);
  }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
};

const EarningsLedger = require('../models/EarningsLedger');
const Order = require('../models/Order');

exports.getPartnerEarnings = async (req, res, next) => {
  try {
    const partnerId = req.user._id;

    const ledgerEntries = await EarningsLedger.find({ partnerId })
      .sort({ deliveredAt: -1 })
      .populate('orderId', 'orderNumber pricing packageDetails');

    const totalEarned = ledgerEntries.reduce((sum, item) => sum + item.amount, 0);
    const totalDeliveries = ledgerEntries.length;
    const totalKm = ledgerEntries.reduce((sum, item) => sum + (item.distanceKm || 0), 0);

    // Group earnings by day for chart
    const dailyEarningsMap = {};
    ledgerEntries.forEach((entry) => {
      const dateStr = new Date(entry.deliveredAt).toISOString().split('T')[0];
      dailyEarningsMap[dateStr] = (dailyEarningsMap[dateStr] || 0) + entry.amount;
    });

    const earningsChartData = Object.keys(dailyEarningsMap)
      .sort()
      .map((date) => ({
        date,
        payout: parseFloat(dailyEarningsMap[date].toFixed(2))
      }));

    res.json({
      summary: {
        totalEarned: parseFloat(totalEarned.toFixed(2)),
        totalDeliveries,
        totalKm: parseFloat(totalKm.toFixed(1)),
        avgPayoutPerDelivery: totalDeliveries > 0 ? parseFloat((totalEarned / totalDeliveries).toFixed(2)) : 0
      },
      chartData: earningsChartData,
      ledger: ledgerEntries
    });
  } catch (error) {
    next(error);
  }
};

exports.getBusinessAnalytics = async (req, res, next) => {
  try {
    const businessId = req.user._id;

    const orders = await Order.find({ businessId }).sort({ createdAt: 1 });

    const totalOrders = orders.length;
    const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
    const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;
    const inTransitCount = orders.filter((o) => ['assigned', 'picked_up'].includes(o.status)).length;
    const totalSpend = orders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + o.pricing.totalCost, 0);

    // Breakdown by category
    const categoryCounts = {};
    orders.forEach((o) => {
      const cat = o.packageDetails?.category || 'general';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const categoryData = Object.keys(categoryCounts).map((name) => ({
      name,
      value: categoryCounts[name]
    }));

    // Spend & order volume timeline
    const timelineMap = {};
    orders.forEach((o) => {
      const dateStr = new Date(o.createdAt).toISOString().split('T')[0];
      if (!timelineMap[dateStr]) {
        timelineMap[dateStr] = { date: dateStr, count: 0, spend: 0 };
      }
      timelineMap[dateStr].count += 1;
      if (o.status === 'delivered') {
        timelineMap[dateStr].spend += o.pricing.totalCost;
      }
    });

    const volumeTimeline = Object.values(timelineMap);

    res.json({
      metrics: {
        totalOrders,
        deliveredCount,
        cancelledCount,
        inTransitCount,
        fulfillmentRate: totalOrders > 0 ? parseFloat(((deliveredCount / totalOrders) * 100).toFixed(1)) : 100,
        totalSpend: parseFloat(totalSpend.toFixed(2))
      },
      categoryData,
      volumeTimeline
    });
  } catch (error) {
    next(error);
  }
};

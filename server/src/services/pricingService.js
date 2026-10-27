const env = require('../config/env');

/**
 * Calculate Great-Circle distance in kilometers between two coordinates
 * lng1, lat1 -> pickup
 * lng2, lat2 -> dropoff
 */
function calculateHaversineDistance(lng1, lat1, lng2, lat2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Transparent, documented pricing calculator
 * Includes urban routing factor (~1.25x straight-line for Manhattan/city grid layout)
 */
function calculateDeliveryQuote({ pickupCoords, dropoffCoords, weightKg = 1.5, category = 'general' }) {
  const [lng1, lat1] = pickupCoords;
  const [lng2, lat2] = dropoffCoords;

  const straightLineDistance = calculateHaversineDistance(lng1, lat1, lng2, lat2);
  // Urban road factor approximation for Indian city traffic topology (~1.30x straight-line)
  const roadDistanceKm = Math.max(1.0, parseFloat((straightLineDistance * 1.30).toFixed(2)));

  // Base platform fare
  const baseFare = env.BASE_DELIVERY_FARE;

  // Distance rate calculation
  const distanceCost = parseFloat((roadDistanceKm * env.PER_KM_RATE).toFixed(2));

  // Weight surcharge (over 3kg)
  let weightCost = 0;
  if (weightKg > 3) {
    weightCost = parseFloat(((weightKg - 3) * env.WEIGHT_SURCHARGE_PER_KG).toFixed(2));
  }

  // Category surcharge (fragile or pharma expedited)
  let categoryCharge = 0;
  if (category === 'pharmaceuticals' || category === 'electronics') {
    categoryCharge = env.CATEGORY_SURCHARGE;
  }

  const totalCost = parseFloat((baseFare + distanceCost + weightCost + categoryCharge).toFixed(2));
  const partnerPayout = parseFloat((totalCost * env.PARTNER_PAYOUT_RATIO).toFixed(2));

  // Indian urban transit model: 22 km/h average two-wheeler transit + 8 minutes pickup & handoff buffer
  const estimatedDurationMins = Math.max(15, Math.round((roadDistanceKm / 22) * 60 + 8));

  return {
    straightLineDistanceKm: parseFloat(straightLineDistance.toFixed(2)),
    roadDistanceKm,
    currency: env.CURRENCY,
    currencySymbol: env.CURRENCY_SYMBOL,
    pricingBreakdown: {
      currency: env.CURRENCY,
      currencySymbol: env.CURRENCY_SYMBOL,
      baseFare,
      distanceCost,
      weightCost,
      categoryCharge,
      totalCost,
      partnerPayout
    },
    estimatedDurationMins,
    disclaimer: 'Route distance modeled with 1.30x Indian urban topology factor. Straight-line vs road distance disclosed.'
  };
}

module.exports = {
  calculateHaversineDistance,
  calculateDeliveryQuote
};

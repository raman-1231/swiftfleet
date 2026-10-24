import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/apiClient';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LocationPickerMap } from '../../components/maps/LocationPickerMap';
import { DeliveryMap } from '../../components/maps/DeliveryMap';
import { Modal } from '../../components/common/Modal';
import {
  MapPin,
  Package,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Building,
  Navigation,
  ArrowRight
} from 'lucide-react';

const PRESET_LOCATIONS = [
  { name: 'Artisan Roast Co.', address: '240 Central Park South, New York', coords: [-73.9806, 40.7668] },
  { name: 'Empire State Building', address: '350 5th Ave, New York', coords: [-73.9857, 40.7484] },
  { name: 'GreenLeaf Market', address: '150 5th Ave, New York', coords: [-73.9918, 40.7402] },
  { name: 'Midtown Express Rx', address: '530 7th Ave, New York', coords: [-73.9877, 40.7538] },
  { name: 'Rockefeller Center', address: '45 Rockefeller Plaza, New York', coords: [-73.9787, 40.7587] },
  { name: 'Columbus Circle', address: '10 Columbus Circle, New York', coords: [-73.9822, 40.7681] }
];

export const CreateOrderPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [pickupAddress, setPickupAddress] = useState(profile?.address || '240 Central Park South, New York');
  const [pickupCoords, setPickupCoords] = useState(profile?.defaultCoordinates?.coordinates || [-73.9806, 40.7668]);
  const [pickupContact, setPickupContact] = useState(profile?.companyName || user?.name || 'Store Manager');
  const [pickupPhone, setPickupPhone] = useState(profile?.phone || user?.phone || '+1 (555) 234-5678');
  const [pickupInstructions, setPickupInstructions] = useState('Front desk counter');

  const [dropoffAddress, setDropoffAddress] = useState('45 Rockefeller Plaza, New York');
  const [dropoffCoords, setDropoffCoords] = useState([-73.9787, 40.7587]);
  const [dropoffContact, setDropoffContact] = useState('Sarah Jenkins');
  const [dropoffPhone, setDropoffPhone] = useState('+1 (555) 441-9922');
  const [dropoffInstructions, setDropoffInstructions] = useState('Suite 1204 - Direct handover');

  const [category, setCategory] = useState('food_beverage');
  const [weightKg, setWeightKg] = useState(1.5);
  const [fragile, setFragile] = useState(false);
  const [notes, setNotes] = useState('');

  // Active Map Picker Mode
  const [activePickerTarget, setActivePickerTarget] = useState('dropoff'); // 'pickup' | 'dropoff'

  // Estimate State
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fetch price quote when coords, weight, or category changes
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      setQuoteLoading(true);
      api.post('/orders/estimate', {
        pickupCoords,
        dropoffCoords,
        weightKg,
        category
      })
        .then((res) => {
          setQuote(res);
          setErrorMessage('');
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Could not calculate quote.');
        })
        .finally(() => {
          setQuoteLoading(false);
        });
    }
  }, [pickupCoords, dropoffCoords, weightKg, category]);

  const handleApplyPreset = (target, preset) => {
    if (target === 'pickup') {
      setPickupAddress(preset.address);
      setPickupCoords(preset.coords);
    } else {
      setDropoffAddress(preset.address);
      setDropoffCoords(preset.coords);
    }
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const orderPayload = {
        pickup: {
          address: pickupAddress,
          contactName: pickupContact,
          phone: pickupPhone,
          coordinates: pickupCoords,
          instructions: pickupInstructions
        },
        dropoff: {
          address: dropoffAddress,
          contactName: dropoffContact,
          phone: dropoffPhone,
          coordinates: dropoffCoords,
          instructions: dropoffInstructions
        },
        packageDetails: {
          category,
          weightKg,
          fragile,
          notes
        }
      };

      const res = await api.post('/orders', orderPayload);
      setShowConfirmModal(false);
      navigate(`/orders/${res.order._id}`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to dispatch order.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
          Delivery Creation
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
          Create & Dispatch Delivery
        </h1>
        <p className="text-xs text-ink-500 mt-0.5">
          Define pickup, destination, and package specs. Automated proximity algorithm will find nearest verified courier.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-ops-danger text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Group 1: Pickup Location */}
          <Card title="1. Origin / Pickup Location" subtitle="Store or warehouse address">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Pickup Address</label>
                <input
                  type="text"
                  required
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-semibold text-ink-500 block mb-1">Quick NYC Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_LOCATIONS.slice(0, 3).map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset('pickup', p)}
                      className="px-2 py-1 text-[11px] rounded bg-ink-100 hover:bg-brand-50 hover:text-brand-700 text-ink-700 border border-ink-200 transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Pickup Contact</label>
                  <input
                    type="text"
                    value={pickupContact}
                    onChange={(e) => setPickupContact(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Pickup Phone</label>
                  <input
                    type="tel"
                    value={pickupPhone}
                    onChange={(e) => setPickupPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Special Pickup Notes</label>
                <input
                  type="text"
                  value={pickupInstructions}
                  onChange={(e) => setPickupInstructions(e.target.value)}
                  placeholder="e.g. Counter #3 or call upon arrival"
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </Card>

          {/* Group 2: Destination / Dropoff Location */}
          <Card title="2. Destination / Recipient Location" subtitle="Customer delivery point">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Destination Address</label>
                <input
                  type="text"
                  required
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-semibold text-ink-500 block mb-1">Quick NYC Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_LOCATIONS.slice(3).map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset('dropoff', p)}
                      className="px-2 py-1 text-[11px] rounded bg-ink-100 hover:bg-emerald-50 hover:text-emerald-700 text-ink-700 border border-ink-200 transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    value={dropoffContact}
                    onChange={(e) => setDropoffContact(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Recipient Phone</label>
                  <input
                    type="tel"
                    required
                    value={dropoffPhone}
                    onChange={(e) => setDropoffPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Delivery Instructions</label>
                <input
                  type="text"
                  value={dropoffInstructions}
                  onChange={(e) => setDropoffInstructions(e.target.value)}
                  placeholder="e.g. Ring Apt 4B, do not leave at doorstep"
                  className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </Card>

          {/* Group 3: Package Specifications */}
          <Card title="3. Package Specifications" subtitle="Weight and classification for courier vehicle compatibility">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="food_beverage">Food & Catering</option>
                    <option value="groceries">Groceries / Organics</option>
                    <option value="pharmaceuticals">Pharmaceuticals (Priority)</option>
                    <option value="electronics">Electronics</option>
                    <option value="documents">Secure Documents</option>
                    <option value="general">General Retail</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.2"
                    max="30"
                    value={weightKg}
                    onChange={(e) => setWeightKg(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fragileCheck"
                  checked={fragile}
                  onChange={(e) => setFragile(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-ink-300 focus:ring-brand-500"
                />
                <label htmlFor="fragileCheck" className="text-xs text-ink-700 select-none">
                  Fragile / spill-sensitive contents (alerts courier to handle upright)
                </label>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Route Map Preview & Real-Time Price Summary */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Route Telemetry & Pin Adjustment" subtitle="Click map to reposition destination marker">
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActivePickerTarget('dropoff')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    activePickerTarget === 'dropoff'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold'
                      : 'bg-white border-ink-200 text-ink-700'
                  }`}
                >
                  Adjust Dropoff Pin
                </button>
                <button
                  type="button"
                  onClick={() => setActivePickerTarget('pickup')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    activePickerTarget === 'pickup'
                      ? 'bg-blue-50 border-brand-500 text-brand-800 font-semibold'
                      : 'bg-white border-ink-200 text-ink-700'
                  }`}
                >
                  Adjust Pickup Pin
                </button>
              </div>

              <LocationPickerMap
                coords={activePickerTarget === 'pickup' ? pickupCoords : dropoffCoords}
                label={activePickerTarget === 'pickup' ? 'Pickup' : 'Dropoff'}
                onChange={(newCoords, hint) => {
                  if (activePickerTarget === 'pickup') {
                    setPickupCoords(newCoords);
                  } else {
                    setDropoffCoords(newCoords);
                  }
                }}
                className="h-64 w-full rounded-xl"
              />
            </div>
          </Card>

          {/* Pricing & Estimation Card */}
          <Card title="Server Quote Breakdown" subtitle="Formula enforced on backend">
            {quoteLoading ? (
              <div className="p-8 text-center text-xs text-ink-400">Calculating quote...</div>
            ) : quote ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-ink-600">
                  <span>Straight-line Vector:</span>
                  <span className="font-mono">{quote.straightLineDistanceKm} km</span>
                </div>
                <div className="flex justify-between text-ink-600">
                  <span>Modeled Road Route:</span>
                  <span className="font-mono font-semibold text-ink-900">{quote.roadDistanceKm} km</span>
                </div>
                <div className="flex justify-between text-ink-600">
                  <span>Base Platform Fare:</span>
                  <span className="font-mono">${quote.pricingBreakdown.baseFare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-ink-600">
                  <span>Distance Fare:</span>
                  <span className="font-mono">${quote.pricingBreakdown.distanceCost.toFixed(2)}</span>
                </div>
                {quote.pricingBreakdown.weightCost > 0 && (
                  <div className="flex justify-between text-ink-600">
                    <span>Weight Surcharge:</span>
                    <span className="font-mono">+${quote.pricingBreakdown.weightCost.toFixed(2)}</span>
                  </div>
                )}
                {quote.pricingBreakdown.categoryCharge > 0 && (
                  <div className="flex justify-between text-ink-600">
                    <span>Expedited Handling:</span>
                    <span className="font-mono">+${quote.pricingBreakdown.categoryCharge.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-ink-100 flex items-baseline justify-between">
                  <span className="font-bold text-sm text-ink-900">Total Delivery Price</span>
                  <span className="text-2xl font-extrabold font-mono text-ink-950">
                    ${quote.pricingBreakdown.totalCost.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                  <span>Partner Payout Allocation (78%):</span>
                  <span className="font-bold font-mono">${quote.pricingBreakdown.partnerPayout.toFixed(2)}</span>
                </div>

                <div className="p-2.5 bg-ink-50 rounded-lg text-[11px] text-ink-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-ink-400 flex-shrink-0" />
                  <span>Estimated Courier ETA: <strong>{quote.estimatedDurationMins} minutes</strong></span>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-4"
                  onClick={() => setShowConfirmModal(true)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Review & Confirm Dispatch
                </Button>
              </div>
            ) : (
              <div className="text-xs text-ink-400">Enter coordinates to display pricing.</div>
            )}
          </Card>
        </div>
      </div>

      {/* Confirmation & Dispatch Dialog */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Delivery Dispatch"
        subtitle="Review order before automated courier dispatching"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs text-ink-700">
          <div className="p-3 bg-ink-50 rounded-lg border border-ink-100 space-y-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-ink-400 block">Origin Pickup</span>
              <p className="font-medium text-ink-900">{pickupAddress}</p>
              <p className="text-ink-500">{pickupContact} • {pickupPhone}</p>
            </div>
            <div className="pt-2 border-t border-ink-200">
              <span className="text-[10px] uppercase font-bold text-ink-400 block">Destination Dropoff</span>
              <p className="font-medium text-ink-900">{dropoffAddress}</p>
              <p className="text-ink-500">{dropoffContact} • {dropoffPhone}</p>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm font-bold text-ink-900 pt-1">
            <span>Guaranteed Total:</span>
            <span className="text-lg font-mono text-brand-600">
              ${quote?.pricingBreakdown?.totalCost?.toFixed(2)}
            </span>
          </div>

          <p className="text-[11px] text-ink-500 leading-normal">
            Upon confirmation, the system will offer this delivery to the closest verified courier with an active 45-second acceptance window.
          </p>

          <div className="flex gap-3 pt-3 border-t border-ink-100">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="w-1/3"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitOrder}
              isLoading={isSubmitting}
              className="w-2/3"
            >
              Confirm & Dispatch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

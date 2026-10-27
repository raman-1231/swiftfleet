import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/apiClient';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LocationPickerMap } from '../../components/maps/LocationPickerMap';
import { Modal } from '../../components/common/Modal';
import { formatINR } from '../../utils/currency';
import { searchIndianAddress } from '../../utils/geocoding';
import {
  MapPin,
  Package,
  Clock,
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  Building,
  Navigation,
  ArrowRight,
  Search,
  Loader2
} from 'lucide-react';

const PRESET_LOCATIONS = [
  { name: 'Connaught Place (CP)', address: 'Connaught Place, Inner Circle, New Delhi', coords: [77.2167, 28.6315], pincode: '110001' },
  { name: 'Cyber Hub Gurugram', address: 'DLF Cyber City, Gurugram, Haryana', coords: [77.0878, 28.4950], pincode: '122002' },
  { name: 'Koramangala 5th Block', address: '80 Feet Road, Koramangala, Bengaluru', coords: [77.6245, 12.9352], pincode: '560034' },
  { name: 'Indiranagar 100ft Rd', address: '100 Feet Road, Indiranagar, Bengaluru', coords: [77.6412, 12.9784], pincode: '560038' },
  { name: 'Bandra Kurla Complex (BKC)', address: 'G Block, BKC, Bandra East, Mumbai', coords: [72.8687, 19.0688], pincode: '400051' },
  { name: 'Lower Parel / Phoenix', address: 'Senapati Bapat Marg, Lower Parel, Mumbai', coords: [72.8295, 18.9953], pincode: '400013' }
];

export const CreateOrderPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const enableDemo = !import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEMO === 'true';

  // Form State: Initialize from authenticated business profile if available, otherwise blank
  const [pickupAddress, setPickupAddress] = useState(profile?.address || '');
  const [pickupCoords, setPickupCoords] = useState(profile?.defaultCoordinates?.coordinates || null);
  const [pickupContact, setPickupContact] = useState(profile?.companyName || user?.name || '');
  const [pickupPhone, setPickupPhone] = useState(profile?.phone || user?.phone || '');
  const [pickupPincode, setPickupPincode] = useState(profile?.pincode || '');
  const [pickupInstructions, setPickupInstructions] = useState('Front desk / counter');

  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [dropoffContact, setDropoffContact] = useState('');
  const [dropoffPhone, setDropoffPhone] = useState('');
  const [dropoffPincode, setDropoffPincode] = useState('');
  const [dropoffInstructions, setDropoffInstructions] = useState('');

  const [category, setCategory] = useState('food_beverage');
  const [weightKg, setWeightKg] = useState(1.5);
  const [fragile, setFragile] = useState(false);
  const [notes, setNotes] = useState('');

  // Active Map Picker Mode
  const [activePickerTarget, setActivePickerTarget] = useState('dropoff'); // 'pickup' | 'dropoff'

  // Indian Address Search States
  const [pickupSearchQuery, setPickupSearchQuery] = useState('');
  const [pickupSearchResults, setPickupSearchResults] = useState([]);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);

  const [dropoffSearchQuery, setDropoffSearchQuery] = useState('');
  const [dropoffSearchResults, setDropoffSearchResults] = useState([]);
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false);

  // Estimate State
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync profile defaults when profile finishes loading asynchronously
  useEffect(() => {
    if (profile && !pickupAddress) {
      if (profile.address) setPickupAddress(profile.address);
      if (profile.defaultCoordinates?.coordinates) setPickupCoords(profile.defaultCoordinates.coordinates);
      if (profile.pincode) setPickupPincode(profile.pincode);
      if (profile.companyName || user?.name) setPickupContact(profile.companyName || user?.name);
      if (profile.phone || user?.phone) setPickupPhone(profile.phone || user?.phone);
    }
  }, [profile, user, pickupAddress]);

  // Debounced search for Pickup address
  useEffect(() => {
    if (!pickupSearchQuery || pickupSearchQuery.trim().length < 3) {
      setPickupSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingPickup(true);
      const results = await searchIndianAddress(pickupSearchQuery);
      setPickupSearchResults(results);
      setIsSearchingPickup(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [pickupSearchQuery]);

  // Debounced search for Dropoff address
  useEffect(() => {
    if (!dropoffSearchQuery || dropoffSearchQuery.trim().length < 3) {
      setDropoffSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingDropoff(true);
      const results = await searchIndianAddress(dropoffSearchQuery);
      setDropoffSearchResults(results);
      setIsSearchingDropoff(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [dropoffSearchQuery]);

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
      if (preset.pincode) setPickupPincode(preset.pincode);
      setPickupSearchQuery('');
      setPickupSearchResults([]);
      setFieldErrors((prev) => ({ ...prev, pickupAddress: '', pickupCoords: '' }));
    } else {
      setDropoffAddress(preset.address);
      setDropoffCoords(preset.coords);
      if (preset.pincode) setDropoffPincode(preset.pincode);
      setDropoffSearchQuery('');
      setDropoffSearchResults([]);
      setFieldErrors((prev) => ({ ...prev, dropoffAddress: '', dropoffCoords: '' }));
    }
  };

  const handleSelectSearchResult = (target, result) => {
    if (target === 'pickup') {
      setPickupAddress(result.displayName);
      setPickupCoords(result.coords);
      if (result.pincode) setPickupPincode(result.pincode);
      setPickupSearchQuery('');
      setPickupSearchResults([]);
      setFieldErrors((prev) => ({ ...prev, pickupAddress: '', pickupCoords: '' }));
    } else {
      setDropoffAddress(result.displayName);
      setDropoffCoords(result.coords);
      if (result.pincode) setDropoffPincode(result.pincode);
      setDropoffSearchQuery('');
      setDropoffSearchResults([]);
      setFieldErrors((prev) => ({ ...prev, dropoffAddress: '', dropoffCoords: '' }));
    }
  };

  const handleReviewClick = () => {
    const errors = {};
    if (!pickupAddress.trim()) errors.pickupAddress = 'Pickup address is required';
    if (!pickupCoords) errors.pickupCoords = 'Please specify pickup coordinates on map or search';
    if (!pickupContact.trim()) errors.pickupContact = 'Contact name is required';
    if (!dropoffAddress.trim()) errors.dropoffAddress = 'Destination address is required';
    if (!dropoffContact.trim()) errors.dropoffContact = 'Recipient contact name is required';
    if (!dropoffCoords) errors.dropoffCoords = 'Please pick a dropoff point on map or search address';

    // Validate 6-digit Indian PIN codes (/^[1-9][0-9]{5}$/)
    if (pickupPincode && !/^[1-9][0-9]{5}$/.test(pickupPincode.trim())) {
      errors.pickupPincode = 'Valid 6-digit Indian PIN code required (e.g. 110001)';
    }
    if (dropoffPincode && !/^[1-9][0-9]{5}$/.test(dropoffPincode.trim())) {
      errors.dropoffPincode = 'Valid 6-digit Indian PIN code required (e.g. 560034)';
    }

    // Validate Indian phone numbers if provided
    if (pickupPhone && !/^(?:\+91[\-\s]?)?[6-9]\d{9}$/.test(pickupPhone.trim())) {
      errors.pickupPhone = 'Valid Indian mobile number (+91 followed by 10 digits)';
    }
    if (dropoffPhone && !/^(?:\+91[\-\s]?)?[6-9]\d{9}$/.test(dropoffPhone.trim())) {
      errors.dropoffPhone = 'Valid Indian mobile number (+91 followed by 10 digits)';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Please fill in required destination and contact fields before dispatch.');
      return;
    }
    setFieldErrors({});
    setErrorMessage('');
    setShowConfirmModal(true);
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
          pincode: pickupPincode,
          coordinates: pickupCoords,
          instructions: pickupInstructions
        },
        dropoff: {
          address: dropoffAddress,
          contactName: dropoffContact,
          phone: dropoffPhone,
          pincode: dropoffPincode,
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
          Delivery Creation • India Logistics
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
          Create & Dispatch Delivery
        </h1>
        <p className="text-xs text-ink-500 mt-0.5">
          Define Indian pickup and destination coordinates. Automated proximity algorithm will find nearest verified courier.
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
          <Card title="1. Origin / Pickup Location" subtitle="Indian merchant or store address">
            <div className="space-y-4">
              {/* Indian Address Search Bar */}
              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">
                  Search Indian Address or Locality
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={pickupSearchQuery}
                    onChange={(e) => setPickupSearchQuery(e.target.value)}
                    placeholder="Type city, street, or 6-digit PIN code (e.g. Connaught Place, Koramangala)"
                    className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <Search className="w-4 h-4 text-ink-400 absolute left-3 top-2.5" />
                  {isSearchingPickup && (
                    <Loader2 className="w-4 h-4 text-brand-500 animate-spin absolute right-3 top-2.5" />
                  )}
                </div>

                {/* Autocomplete Results Dropdown */}
                {pickupSearchResults.length > 0 && (
                  <div className="mt-1 bg-white border border-ink-200 rounded-lg shadow-elevated overflow-hidden z-20 relative divide-y divide-ink-100">
                    {pickupSearchResults.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSearchResult('pickup', item)}
                        className="w-full text-left px-3 py-2 hover:bg-brand-50 transition-colors text-xs text-ink-800 flex items-start gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">{item.displayName}</p>
                          {item.pincode && (
                            <span className="text-[11px] text-ink-500 font-mono">PIN: {item.pincode}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Pickup Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter complete street address"
                  value={pickupAddress}
                  onChange={(e) => {
                    setPickupAddress(e.target.value);
                    if (fieldErrors.pickupAddress) setFieldErrors((prev) => ({ ...prev, pickupAddress: '' }));
                  }}
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                    fieldErrors.pickupAddress
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                      : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                  }`}
                />
                {fieldErrors.pickupAddress && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.pickupAddress}</p>
                )}
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-semibold text-ink-500 block mb-1">Quick Metropolitan Hubs:</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Pickup Contact *</label>
                  <input
                    type="text"
                    required
                    value={pickupContact}
                    onChange={(e) => setPickupContact(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {fieldErrors.pickupContact && (
                    <p className="text-[11px] text-red-600 mt-0.5">{fieldErrors.pickupContact}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Pickup Phone</label>
                  <input
                    type="tel"
                    value={pickupPhone}
                    onChange={(e) => setPickupPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {fieldErrors.pickupPhone && (
                    <p className="text-[11px] text-red-600 mt-0.5">{fieldErrors.pickupPhone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">PIN Code (6 Digits)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pickupPincode}
                    onChange={(e) => setPickupPincode(e.target.value)}
                    placeholder="110001"
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                      fieldErrors.pickupPincode
                        ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                        : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                    }`}
                  />
                  {fieldErrors.pickupPincode && (
                    <p className="text-[11px] text-red-600 mt-0.5">{fieldErrors.pickupPincode}</p>
                  )}
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
          <Card title="2. Destination / Recipient Location" subtitle="Indian customer delivery point">
            <div className="space-y-4">
              {/* Indian Address Search Bar */}
              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">
                  Search Indian Address or Locality
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={dropoffSearchQuery}
                    onChange={(e) => setDropoffSearchQuery(e.target.value)}
                    placeholder="Type city, street, or 6-digit PIN code (e.g. Indiranagar, BKC Mumbai)"
                    className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <Search className="w-4 h-4 text-ink-400 absolute left-3 top-2.5" />
                  {isSearchingDropoff && (
                    <Loader2 className="w-4 h-4 text-brand-500 animate-spin absolute right-3 top-2.5" />
                  )}
                </div>

                {/* Autocomplete Results Dropdown */}
                {dropoffSearchResults.length > 0 && (
                  <div className="mt-1 bg-white border border-ink-200 rounded-lg shadow-elevated overflow-hidden z-20 relative divide-y divide-ink-100">
                    {dropoffSearchResults.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSearchResult('dropoff', item)}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors text-xs text-ink-800 flex items-start gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">{item.displayName}</p>
                          {item.pincode && (
                            <span className="text-[11px] text-ink-500 font-mono">PIN: {item.pincode}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Destination Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100 Feet Road, Indiranagar, Bengaluru"
                  value={dropoffAddress}
                  onChange={(e) => {
                    setDropoffAddress(e.target.value);
                    if (fieldErrors.dropoffAddress) {
                      setFieldErrors((prev) => ({ ...prev, dropoffAddress: '' }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                    fieldErrors.dropoffAddress
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                      : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                  }`}
                />
                {fieldErrors.dropoffAddress && (
                  <p className="text-[11px] text-red-600 mt-1">{fieldErrors.dropoffAddress}</p>
                )}
              </div>

              {/* Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-ink-500">Quick Metropolitan Hubs:</span>
                  {fieldErrors.dropoffCoords && (
                    <span className="text-[11px] text-red-600 font-medium">{fieldErrors.dropoffCoords}</span>
                  )}
                </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ananya Deshmukh"
                    value={dropoffContact}
                    onChange={(e) => {
                      setDropoffContact(e.target.value);
                      if (fieldErrors.dropoffContact) {
                        setFieldErrors((prev) => ({ ...prev, dropoffContact: '' }));
                      }
                    }}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                      fieldErrors.dropoffContact
                        ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                        : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                    }`}
                  />
                  {fieldErrors.dropoffContact && (
                    <p className="text-[11px] text-red-600 mt-1">{fieldErrors.dropoffContact}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Recipient Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98229 88776"
                    value={dropoffPhone}
                    onChange={(e) => setDropoffPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {fieldErrors.dropoffPhone && (
                    <p className="text-[11px] text-red-600 mt-0.5">{fieldErrors.dropoffPhone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-800 mb-1">Dropoff PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="560038"
                    value={dropoffPincode}
                    onChange={(e) => setDropoffPincode(e.target.value)}
                    className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-ink-900 focus:outline-none ${
                      fieldErrors.dropoffPincode
                        ? 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20'
                        : 'border-ink-200 focus:ring-2 focus:ring-brand-500'
                    }`}
                  />
                  {fieldErrors.dropoffPincode && (
                    <p className="text-[11px] text-red-600 mt-0.5">{fieldErrors.dropoffPincode}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-800 mb-1">Delivery Instructions</label>
                <input
                  type="text"
                  value={dropoffInstructions}
                  onChange={(e) => setDropoffInstructions(e.target.value)}
                  placeholder="e.g. Ring Apt 4B, verify handover PIN"
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
          <Card title="Interactive Map Pin Placement" subtitle="Click map or use 'Detect Location' to place pin">
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
                onChange={(newCoords, addressHint, pincodeHint) => {
                  if (activePickerTarget === 'pickup') {
                    setPickupCoords(newCoords);
                    if (addressHint && !pickupAddress) setPickupAddress(addressHint);
                    if (pincodeHint && !pickupPincode) setPickupPincode(pincodeHint);
                    setFieldErrors((prev) => ({ ...prev, pickupCoords: '' }));
                  } else {
                    setDropoffCoords(newCoords);
                    if (addressHint && !dropoffAddress) setDropoffAddress(addressHint);
                    if (pincodeHint && !dropoffPincode) setDropoffPincode(pincodeHint);
                    setFieldErrors((prev) => ({ ...prev, dropoffCoords: '' }));
                  }
                }}
                className="h-64 w-full rounded-xl"
              />
            </div>
          </Card>

          {/* Pricing & Estimation Card */}
          <Card title="Server Quote Breakdown" subtitle="Formula enforced on backend in INR (₹)">
            {quoteLoading ? (
              <div className="p-8 text-center text-xs text-ink-400">Calculating quote...</div>
            ) : quote ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-ink-600">
                  <span>Straight-line Distance:</span>
                  <span className="font-mono">{quote.straightLineDistanceKm} km</span>
                </div>
                <div className="flex justify-between text-ink-600">
                  <span>Modeled Road Distance:</span>
                  <span className="font-mono font-semibold text-ink-900">{quote.roadDistanceKm} km</span>
                </div>
                <div className="p-2 bg-brand-50/50 rounded border border-brand-100 text-[11px] text-brand-900">
                  {quote.disclaimer || 'Route distance modeled with 1.30x Indian urban topology factor.'}
                </div>

                <div className="flex justify-between text-ink-600 pt-1">
                  <span>Base Platform Fare:</span>
                  <span className="font-mono">{formatINR(quote.pricingBreakdown.baseFare)}</span>
                </div>
                <div className="flex justify-between text-ink-600">
                  <span>Distance Fare:</span>
                  <span className="font-mono">{formatINR(quote.pricingBreakdown.distanceCost)}</span>
                </div>
                {quote.pricingBreakdown.weightCost > 0 && (
                  <div className="flex justify-between text-ink-600">
                    <span>Weight Surcharge:</span>
                    <span className="font-mono">+{formatINR(quote.pricingBreakdown.weightCost)}</span>
                  </div>
                )}
                {quote.pricingBreakdown.categoryCharge > 0 && (
                  <div className="flex justify-between text-ink-600">
                    <span>Expedited Handling:</span>
                    <span className="font-mono">+{formatINR(quote.pricingBreakdown.categoryCharge)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-ink-100 flex items-baseline justify-between">
                  <span className="font-bold text-sm text-ink-900">Total Delivery Price</span>
                  <span className="text-2xl font-extrabold font-mono text-ink-950">
                    {formatINR(quote.pricingBreakdown.totalCost)}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                  <span>Partner Payout Allocation (78%):</span>
                  <span className="font-bold font-mono">{formatINR(quote.pricingBreakdown.partnerPayout)}</span>
                </div>

                <div className="p-2.5 bg-ink-50 rounded-lg text-[11px] text-ink-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-ink-400 flex-shrink-0" />
                  <span>Estimated Courier ETA: <strong>{quote.estimatedDurationMins} minutes</strong></span>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-4"
                  onClick={handleReviewClick}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Review & Confirm Dispatch
                </Button>
              </div>
            ) : (
              <div className="text-xs text-ink-400 py-6 text-center">
                Search or select origin and destination points to calculate delivery fare.
              </div>
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
              <p className="text-ink-500">{pickupContact} • {pickupPhone || 'No phone'}</p>
              {pickupPincode && <p className="text-ink-400 font-mono text-[10px]">PIN: {pickupPincode}</p>}
            </div>
            <div className="pt-2 border-t border-ink-200">
              <span className="text-[10px] uppercase font-bold text-ink-400 block">Destination Dropoff</span>
              <p className="font-medium text-ink-900">{dropoffAddress}</p>
              <p className="text-ink-500">{dropoffContact} • {dropoffPhone || 'No phone'}</p>
              {dropoffPincode && <p className="text-ink-400 font-mono text-[10px]">PIN: {dropoffPincode}</p>}
            </div>
          </div>

          <div className="flex justify-between items-center text-sm font-bold text-ink-900 pt-1">
            <span>Guaranteed Total:</span>
            <span className="text-lg font-mono text-brand-600">
              {formatINR(quote?.pricingBreakdown?.totalCost)}
            </span>
          </div>

          <p className="text-[11px] text-ink-500 leading-normal">
            Upon confirmation, the dispatch engine will search for the nearest verified delivery partner with an active 45-second acceptance window.
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

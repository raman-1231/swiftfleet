import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  ShieldCheck,
  Zap,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  Building2,
  Bike,
  Compass,
  FileCheck2,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const LandingPage = () => {
  // Interactive live delivery estimator widget
  const [distanceKm, setDistanceKm] = useState(2.5);
  const [packageWeight, setPackageWeight] = useState(1.5);
  const [packageCategory, setPackageCategory] = useState('general');

  // Calculation mirrors server pricing logic
  const roadDistance = parseFloat((distanceKm * 1.28).toFixed(1));
  const baseFare = 5.00;
  const distanceCost = parseFloat((roadDistance * 1.80).toFixed(2));
  const weightSurcharge = packageWeight > 3 ? parseFloat(((packageWeight - 3) * 0.75).toFixed(2)) : 0;
  const categorySurcharge = packageCategory === 'pharma' ? 1.50 : 0;
  const totalCost = parseFloat((baseFare + distanceCost + weightSurcharge + categorySurcharge).toFixed(2));
  const driverPayout = parseFloat((totalCost * 0.78).toFixed(2));
  const estimatedMins = Math.max(12, Math.round((roadDistance / 20) * 60 + 7));

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden border-b border-ink-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                <span>Autonomous Hyperlocal Workforce Orchestration</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink-950 tracking-tight leading-[1.12]">
                Smarter local delivery, powered by <span className="text-brand-500">verified</span> couriers.
              </h1>

              <p className="text-lg text-ink-600 leading-relaxed max-w-2xl font-normal">
                SwiftFleet bridges neighborhood merchants with authenticated, background-checked delivery partners.
                Real-time proximity dispatching, atomic order locking, and an auditable ledger for transparent settlements.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link to="/register-business">
                  <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Onboard as Business Merchant
                  </Button>
                </Link>
                <Link to="/register-partner">
                  <Button size="lg" variant="outline" leftIcon={<Bike className="w-4 h-4 text-brand-500" />}>
                    Apply as Delivery Partner
                  </Button>
                </Link>
              </div>

              {/* Verification & Trust Badges */}
              <div className="pt-6 border-t border-ink-100 flex flex-wrap gap-6 text-xs text-ink-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-ops-success" />
                  <span>Manual ID & DL Operations Audit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-brand-500" />
                  <span>45s Proximity Cascade Dispatch</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-ink-700" />
                  <span>Atomic Race-Condition Guard</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Live Quote & Dispatch Simulator */}
            <div className="lg:col-span-5">
              <div className="bg-ink-50 p-6 rounded-2xl border border-ink-200 shadow-elevated">
                <div className="flex items-center justify-between pb-4 border-b border-ink-200">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink-900">Live Quote & Dispatch Engine</h3>
                      <p className="text-[11px] text-ink-500">Real-time transparent pricing simulator</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Rule Matrix
                  </span>
                </div>

                <div className="space-y-4 py-4">
                  {/* Distance Slider */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-ink-800 mb-1.5">
                      <span>Delivery Radius</span>
                      <span className="font-mono text-brand-600">{distanceKm} km (Est. road: {roadDistance} km)</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="12"
                      step="0.5"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
                      className="w-full accent-brand-500 h-1.5 bg-ink-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Weight Slider */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-ink-800 mb-1.5">
                      <span>Package Weight</span>
                      <span className="font-mono text-brand-600">{packageWeight} kg</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={packageWeight}
                      onChange={(e) => setPackageWeight(parseFloat(e.target.value))}
                      className="w-full accent-brand-500 h-1.5 bg-ink-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Category Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-ink-800 mb-1.5">Package Class</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'general', label: 'Standard Box' },
                        { id: 'food', label: 'Food / Bakery' },
                        { id: 'pharma', label: 'Prescription Rx' }
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPackageCategory(cat.id)}
                          className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all text-center ${
                            packageCategory === cat.id
                              ? 'bg-brand-50 border-brand-500 text-brand-700 font-semibold'
                              : 'bg-white border-ink-200 text-ink-700 hover:bg-ink-100'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transparent Calculation Ledger Breakdown */}
                  <div className="bg-white p-4 rounded-xl border border-ink-200 space-y-2 text-xs">
                    <div className="flex justify-between text-ink-600">
                      <span>Base Dispatch Fee</span>
                      <span className="font-mono">${baseFare.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-ink-600">
                      <span>Distance Fare ({roadDistance} km @ $1.80/km)</span>
                      <span className="font-mono">${distanceCost.toFixed(2)}</span>
                    </div>
                    {weightSurcharge > 0 && (
                      <div className="flex justify-between text-ink-600">
                        <span>Weight Surcharge (&gt;3kg)</span>
                        <span className="font-mono">+${weightSurcharge.toFixed(2)}</span>
                      </div>
                    )}
                    {categorySurcharge > 0 && (
                      <div className="flex justify-between text-ink-600">
                        <span>Expedited Pharma Handling</span>
                        <span className="font-mono">+${categorySurcharge.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-ink-100 flex justify-between items-baseline">
                      <div>
                        <span className="font-bold text-ink-900 text-sm">Merchant Total</span>
                        <span className="block text-[10px] text-ink-400">Road grid modeled</span>
                      </div>
                      <span className="text-xl font-extrabold text-ink-950 font-mono">${totalCost.toFixed(2)}</span>
                    </div>

                    <div className="pt-2 border-t border-dashed border-ink-200 flex justify-between items-center text-emerald-800 bg-emerald-50/60 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-medium text-[11px]">Courier Payout (78%)</span>
                      </div>
                      <span className="font-bold font-mono text-sm text-emerald-700">${driverPayout.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-ink-500 pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-ink-400" />
                      <span>Estimated Transit: <strong>{estimatedMins} mins</strong></span>
                    </div>
                    <span className="text-[11px] font-mono text-ink-400">Zero hidden markups</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Architecture Workflow */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
            Engineered for Operational Integrity
          </h2>
          <p className="text-sm text-ink-600 mt-2">
            Every step is protected by verified status checks, geospatial queries, and conditional atomic locks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="relative hover:border-brand-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-brand-600 flex items-center justify-center font-bold text-base mb-4">
              01
            </div>
            <h3 className="text-base font-semibold text-ink-900 mb-2">Merchant Registers Delivery</h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              Store operator enters pickup and dropoff points with validated coordinates. The server deterministically calculates route distance, fare, and sets up a fresh order state.
            </p>
          </Card>

          <Card className="relative hover:border-brand-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base mb-4">
              02
            </div>
            <h3 className="text-base font-semibold text-ink-900 mb-2">Proximity Dispatch Cascade</h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              The matching engine searches for approved, online, available couriers closest to pickup. Offers are dispatched with a strict 45-second timer. If rejected or timed out, it automatically cascades to the next partner.
            </p>
          </Card>

          <Card className="relative hover:border-brand-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base mb-4">
              03
            </div>
            <h3 className="text-base font-semibold text-ink-900 mb-2">Atomic Acceptance & Ledger Payout</h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              Once accepted, race conditions are blocked atomically. Live GPS updates track pickup and delivery. Upon confirmed handover, the earnings ledger is credited exactly once.
            </p>
          </Card>
        </div>
      </section>

      {/* Role-Specific Benefits */}
      <section className="py-16 bg-white border-y border-ink-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Business Box */}
            <div className="p-8 rounded-2xl bg-ink-50/70 border border-ink-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-500 text-white flex items-center justify-center mb-5">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-ink-900">For Local Businesses & Merchants</h3>
                <p className="text-sm text-ink-600 mt-2 mb-6">
                  Maintain control over your local fulfillment without relying on predatory 30% marketplace commissions.
                </p>
                <ul className="space-y-3 text-xs text-ink-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-ops-success flex-shrink-0 mt-0.5" />
                    <span>Flat transparent distance-based fees with zero hidden markups</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-ops-success flex-shrink-0 mt-0.5" />
                    <span>Real-time courier GPS tracking link to share directly with your end customers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-ops-success flex-shrink-0 mt-0.5" />
                    <span>Dedicated dispute queue for damaged or late packages</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                <Link to="/register-business">
                  <Button variant="primary">Create Merchant Account</Button>
                </Link>
              </div>
            </div>

            {/* Partner Box */}
            <div className="p-8 rounded-2xl bg-ink-50/70 border border-ink-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-5">
                  <Bike className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-ink-900">For Delivery Partners & Couriers</h3>
                <p className="text-sm text-ink-600 mt-2 mb-6">
                  Earn competitive payouts with full visibility into distance, pickup points, and guaranteed earnings before you accept.
                </p>
                <ul className="space-y-3 text-xs text-ink-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-ops-success flex-shrink-0 mt-0.5" />
                    <span>78% of order fare credited directly to your ledger upon delivery confirmation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-ops-success flex-shrink-0 mt-0.5" />
                    <span>Flexible online / offline switch with zero penalty for declining unfeasible offers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-ops-success flex-shrink-0 mt-0.5" />
                    <span>Clear verification onboarding with driver license and vehicle validation</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                <Link to="/register-partner">
                  <Button variant="outline">Register as Delivery Partner</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Refined Footer */}
      <footer className="bg-ink-950 text-white py-12 border-t border-ink-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-ink-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center text-white font-bold">
                <Truck className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg tracking-tight">SwiftFleet</span>
              <span className="text-xs text-ink-400 font-mono ml-2">v1.0.0-production-spec</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-ink-400">
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link to="/register-business" className="hover:text-white transition-colors">Business Onboarding</Link>
              <Link to="/register-partner" className="hover:text-white transition-colors">Courier Verification</Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-500">
            <p>© 2026 SwiftFleet Logistics Platform. Master Portfolio Engineering Project.</p>
            <p className="font-mono text-[11px] text-ink-400">
              MERN Stack Architecture • Socket.IO • Leaflet OpenStreetMap • Atomic Concurrency
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

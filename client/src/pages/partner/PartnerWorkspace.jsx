import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/apiClient';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { DeliveryMap } from '../../components/maps/DeliveryMap';
import confetti from 'canvas-confetti';
import {
  Bike,
  Power,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Clock,
  DollarSign,
  Package,
  Phone,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export const PartnerWorkspace = () => {
  const { user, profile, updateProfileState } = useAuth();
  const { socket, activeOffer, clearActiveOffer, latestOrderUpdate, updateLocation } = useSocket();
  const toast = useToast();

  const [isOnline, setIsOnline] = useState(profile?.isOnline || false);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [recentCompleted, setRecentCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  // Countdown timer for incoming offer
  const [countdown, setCountdown] = useState(45);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Simulated GPS movement state
  const [courierSimCoords, setCourierSimCoords] = useState(
    profile?.currentCoordinates?.coordinates || [-73.9842, 40.7505]
  );

  const isApproved = profile?.verificationStatus === 'approved';

  // Load active delivery and recent completions
  const fetchCourierState = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      const assigned = res.orders?.find((o) => ['assigned', 'picked_up'].includes(o.status));
      setActiveDelivery(assigned || null);

      const completed = res.orders?.filter((o) => o.status === 'delivered') || [];
      setRecentCompleted(completed.slice(0, 5));
    } catch (err) {
      console.error('Error fetching partner deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourierState();
  }, []);

  // Sync latest order update
  useEffect(() => {
    if (latestOrderUpdate) {
      fetchCourierState();
    }
  }, [latestOrderUpdate]);

  // Countdown effect when offer arrives
  useEffect(() => {
    if (!activeOffer) return;

    setCountdown(45);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          clearActiveOffer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeOffer]);

  // Toggle online / offline
  const handleToggleOnline = async () => {
    try {
      setIsActionLoading(true);
      const res = await api.post('/dispatch/availability');
      setIsOnline(res.isOnline);
      if (profile) {
        updateProfileState({ ...profile, isOnline: res.isOnline });
      }
      toast.info(res.isOnline ? 'You are now Online' : 'You are now Offline', res.message);
    } catch (err) {
      toast.error('Could not toggle status', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Accept incoming offer
  const handleAcceptOffer = async (orderId) => {
    try {
      setIsActionLoading(true);
      const res = await api.post(`/dispatch/accept/${orderId}`);
      clearActiveOffer();
      setActiveDelivery(res.order);
      toast.success('Offer Accepted!', `Order #${res.order.orderNumber} assigned to you.`);
      fetchCourierState();
    } catch (err) {
      toast.error('Acceptance Failed', err.message);
      clearActiveOffer();
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reject offer
  const handleRejectOffer = async (orderId) => {
    try {
      await api.post(`/dispatch/reject/${orderId}`);
      clearActiveOffer();
      toast.info('Offer Declined', 'Order re-routed to next eligible courier.');
    } catch (err) {
      console.error(err);
      clearActiveOffer();
    }
  };

  // Advance delivery lifecycle state: assigned -> picked_up -> delivered
  const handleAdvanceState = async (nextStatus) => {
    if (!activeDelivery) return;
    try {
      setIsActionLoading(true);
      const res = await api.post('/dispatch/status-update', {
        orderId: activeDelivery._id,
        targetStatus: nextStatus
      });

      if (nextStatus === 'delivered') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        toast.success(
          'Delivery Completed!',
          `$${res.order.pricing?.partnerPayout?.toFixed(2)} credited to your earnings ledger.`
        );
        setActiveDelivery(null);
      } else {
        toast.info('Package Picked Up', 'In transit to customer dropoff.');
        setActiveDelivery(res.order);
      }
      fetchCourierState();
    } catch (err) {
      toast.error('State Update Failed', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Simulate movement along route for evaluator live demonstration
  const handleSimulateMovement = () => {
    if (!activeDelivery) return;
    const isPickedUp = activeDelivery.status === 'picked_up';
    const target = isPickedUp ? activeDelivery.dropoff.coordinates : activeDelivery.pickup.coordinates;

    const newLng = courierSimCoords[0] + (target[0] - courierSimCoords[0]) * 0.35;
    const newLat = courierSimCoords[1] + (target[1] - courierSimCoords[1]) * 0.35;
    const updated = [parseFloat(newLng.toFixed(4)), parseFloat(newLat.toFixed(4))];

    setCourierSimCoords(updated);
    updateLocation(updated[1], updated[0]);
    toast.info('Location Beacon Updated', `Simulated coordinates: ${updated[1]}, ${updated[0]}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Verification Guard Alert if not approved */}
      {!isApproved && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 flex items-start gap-3 shadow-subtle">
          <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-sm text-amber-950">Verification Required for Dispatch</h4>
            <p className="mt-1 leading-relaxed">
              Your courier account status is currently: <strong>{profile?.verificationStatus?.toUpperCase() || 'PENDING'}</strong>.
              Operations administrators review all driver licenses and identity records. You can explore the workspace, but incoming live orders are restricted until verified.
            </p>
            <p className="mt-2 text-[11px] text-amber-800 font-mono">
              Demo tip: Use the navbar <strong>"Switch Demo Persona"</strong> to switch to Marcus Vance (Approved) or Sarah Lin (Admin Ops to approve this profile).
            </p>
          </div>
        </div>
      )}

      {/* Courier HUD Bar */}
      <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${isOnline ? 'bg-emerald-600' : 'bg-ink-600'}`}>
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink-950">{user?.name}</h2>
              <StatusBadge status={isOnline ? 'online' : 'offline'} />
              <StatusBadge status={profile?.verificationStatus || 'pending'} />
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              Vehicle: <span className="capitalize font-semibold text-ink-700">{profile?.vehicleType || 'Motorcycle'}</span> • Rating: ★ {profile?.stats?.rating || '5.0'}
            </p>
          </div>
        </div>

        {/* Online / Offline Toggle Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant={isOnline ? 'secondary' : 'success'}
            size="md"
            onClick={handleToggleOnline}
            isLoading={isActionLoading}
            leftIcon={<Power className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            {isOnline ? 'Go Offline' : 'Go Online for Offers'}
          </Button>
        </div>
      </div>

      {/* Urgent Incoming Delivery Request Modal / Banner */}
      {activeOffer && (
        <div className="p-6 bg-brand-500 text-white rounded-2xl shadow-elevated border-2 border-brand-400 animate-in zoom-in-95">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-400/40">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              <h3 className="text-xl font-extrabold tracking-tight">New Delivery Offer</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-brand-600 font-mono font-bold">
                {activeOffer.order?.orderNumber}
              </span>
            </div>

            {/* Acceptance Countdown Circular Badge */}
            <div className="flex items-center gap-2 bg-brand-600/80 px-4 py-2 rounded-xl border border-brand-400">
              <Clock className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-medium">Expires in:</span>
              <span className="text-lg font-mono font-extrabold text-amber-300">{countdown}s</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 text-xs">
            <div className="bg-brand-600/50 p-3 rounded-xl border border-brand-400/30">
              <span className="text-brand-200 block text-[10px] uppercase font-bold">Guaranteed Courier Payout</span>
              <span className="text-2xl font-extrabold font-mono text-emerald-300">
                ${activeOffer.order?.pricing?.partnerPayout?.toFixed(2)}
              </span>
            </div>

            <div className="bg-brand-600/50 p-3 rounded-xl border border-brand-400/30">
              <span className="text-brand-200 block text-[10px] uppercase font-bold">Total Transit Distance</span>
              <span className="text-2xl font-extrabold font-mono text-white">
                {activeOffer.order?.pricing?.distanceKm} km
              </span>
            </div>

            <div className="bg-brand-600/50 p-3 rounded-xl border border-brand-400/30">
              <span className="text-brand-200 block text-[10px] uppercase font-bold">Package Classification</span>
              <span className="text-base font-bold capitalize text-white mt-1 block">
                {activeOffer.order?.packageDetails?.category?.replace('_', ' ')} ({activeOffer.order?.packageDetails?.weightKg} kg)
              </span>
            </div>
          </div>

          {/* Route Preview */}
          <div className="bg-brand-600/40 p-4 rounded-xl border border-brand-400/30 text-xs space-y-2">
            <div>
              <span className="text-brand-200 text-[10px] uppercase font-bold block">Pickup Merchant</span>
              <p className="font-semibold text-sm">{activeOffer.order?.pickup?.address}</p>
            </div>
            <div className="pt-2 border-t border-brand-400/30">
              <span className="text-brand-200 text-[10px] uppercase font-bold block">Delivery Destination</span>
              <p className="font-semibold text-sm">{activeOffer.order?.dropoff?.address}</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              variant="secondary"
              size="lg"
              className="w-1/3 bg-brand-700 hover:bg-brand-800 text-white border-0"
              onClick={() => handleRejectOffer(activeOffer.order?._id)}
            >
              Decline
            </Button>
            <Button
              variant="success"
              size="lg"
              className="w-2/3 bg-emerald-500 hover:bg-emerald-600 font-bold text-base shadow-subtle"
              onClick={() => handleAcceptOffer(activeOffer.order?._id)}
              isLoading={isActionLoading}
            >
              Accept Delivery (${activeOffer.order?.pricing?.partnerPayout?.toFixed(2)})
            </Button>
          </div>
        </div>
      )}

      {/* Active Delivery HUD or Ready Standby State */}
      {activeDelivery ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Active Navigation Panel */}
          <div className="lg:col-span-7 space-y-4">
            <Card
              title={`Active Mission: Order #${activeDelivery.orderNumber}`}
              subtitle={
                activeDelivery.status === 'assigned'
                  ? 'Step 1: Travel to pickup origin to collect package'
                  : 'Step 2: Travel to destination dropoff to complete handover'
              }
            >
              <div className="space-y-4">
                {/* Status indicator banner */}
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  activeDelivery.status === 'assigned'
                    ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                    : 'bg-purple-50 text-purple-900 border border-purple-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-current animate-pulse" />
                    <span>
                      {activeDelivery.status === 'assigned'
                        ? 'EN ROUTE TO PICKUP COUNTER'
                        : 'PACKAGE IN TRANSIT TO CUSTOMER'}
                    </span>
                  </div>
                  <StatusBadge status={activeDelivery.status} />
                </div>

                {/* Primary Destination Action Address */}
                <div className="p-4 bg-ink-50 rounded-xl border border-ink-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-brand-500 text-white mt-0.5">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                        {activeDelivery.status === 'assigned' ? 'Pickup Address' : 'Dropoff Destination'}
                      </span>
                      <h4 className="text-base font-bold text-ink-950 mt-0.5">
                        {activeDelivery.status === 'assigned'
                          ? activeDelivery.pickup.address
                          : activeDelivery.dropoff.address}
                      </h4>
                      <p className="text-xs text-ink-600 mt-1">
                        Contact: <strong>{activeDelivery.status === 'assigned' ? activeDelivery.pickup.contactName : activeDelivery.dropoff.contactName}</strong>
                        {' '}({activeDelivery.status === 'assigned' ? activeDelivery.pickup.phone : activeDelivery.dropoff.phone})
                      </p>
                      <p className="text-xs text-brand-700 italic mt-0.5">
                        Note: {activeDelivery.status === 'assigned' ? activeDelivery.pickup.instructions : activeDelivery.dropoff.instructions || 'No special instructions.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payout & Distance Stats */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-ink-200">
                    <span className="text-ink-500 block text-[11px]">Guaranteed Payout</span>
                    <span className="text-xl font-bold font-mono text-emerald-700">
                      ${activeDelivery.pricing?.partnerPayout?.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-ink-200">
                    <span className="text-ink-500 block text-[11px]">Route Distance</span>
                    <span className="text-xl font-bold font-mono text-ink-900">
                      {activeDelivery.pricing?.distanceKm} km
                    </span>
                  </div>
                </div>

                {/* State Machine Action Controls */}
                <div className="pt-2">
                  {activeDelivery.status === 'assigned' ? (
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full text-base font-bold shadow-subtle"
                      onClick={() => handleAdvanceState('picked_up')}
                      isLoading={isActionLoading}
                      rightIcon={<CheckCircle2 className="w-5 h-5" />}
                    >
                      Confirm Package Picked Up
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      size="lg"
                      className="w-full text-base font-bold shadow-subtle bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAdvanceState('delivered')}
                      isLoading={isActionLoading}
                      rightIcon={<CheckCircle2 className="w-5 h-5" />}
                    >
                      Confirm Handover & Settle Payout
                    </Button>
                  )}
                </div>

                {/* Evaluator Helper: Simulate GPS Movement Button */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleSimulateMovement}
                    className="text-xs text-brand-600 hover:text-brand-800 font-medium inline-flex items-center gap-1.5 underline"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Simulate Courier GPS Beacon Telemetry
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Map View */}
          <div className="lg:col-span-5">
            <Card title="Live Route Telemetry" subtitle="OpenStreetMap with real-time waypoint rendering">
              <DeliveryMap
                pickupCoords={activeDelivery.pickup?.coordinates}
                dropoffCoords={activeDelivery.dropoff?.coordinates}
                courierCoords={courierSimCoords}
                pickupAddress={activeDelivery.pickup?.address}
                dropoffAddress={activeDelivery.dropoff?.address}
                courierName={user?.name}
                className="h-80 w-full rounded-xl"
              />
            </Card>
          </div>
        </div>
      ) : (
        /* Standby State */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Card className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
                <Navigation className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-ink-950">
                {isOnline ? 'Standby: Listening for Proximity Offers' : 'You are currently Offline'}
              </h3>
              <p className="text-xs text-ink-500 max-w-md mx-auto mt-1 mb-6 leading-relaxed">
                {isOnline
                  ? 'When merchants within your radius place an order, an offer with guaranteed earnings will appear here with a 45-second acceptance window.'
                  : 'Toggle your status to Online using the button above to begin receiving delivery requests.'}
              </p>

              {isOnline && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-mono font-medium border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Proximity Geofence Active (Midtown Manhattan)</span>
                </div>
              )}
            </Card>

            {/* Recent Completed Deliveries */}
            <Card title="Recent Deliveries" subtitle="Completed orders settled to your ledger">
              {recentCompleted.length === 0 ? (
                <div className="py-6 text-center text-xs text-ink-400">
                  No completed deliveries recorded yet today.
                </div>
              ) : (
                <div className="divide-y divide-ink-100">
                  {recentCompleted.map((order) => (
                    <div key={order._id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-ink-900">{order.orderNumber}</span>
                          <StatusBadge status="delivered" />
                        </div>
                        <p className="text-[11px] text-ink-500 mt-0.5 truncate max-w-sm">
                          {order.dropoff?.address}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-700 text-sm">
                          +${order.pricing?.partnerPayout?.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-ink-400 block">
                          {new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Earnings Summary Card */}
          <div className="lg:col-span-4 space-y-4">
            <Card title="Ledger Summary" subtitle="Verified payouts">
              <div className="space-y-4">
                <div className="p-4 bg-ink-50 rounded-xl border border-ink-100">
                  <span className="text-xs text-ink-500 block">Cumulative Payouts</span>
                  <span className="text-3xl font-extrabold font-mono text-ink-950 mt-1 block">
                    ${profile?.stats?.totalEarned?.toFixed(2) || '0.00'}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Exactly-once settlement guaranteed</span>
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-ink-600">
                    <span>Fulfilled Deliveries:</span>
                    <span className="font-mono font-bold text-ink-900">
                      {profile?.stats?.totalDeliveries || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>Courier Rating:</span>
                    <span className="font-mono font-bold text-ink-900">
                      ★ {profile?.stats?.rating || '5.0'}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>Acceptance Rate:</span>
                    <span className="font-mono font-bold text-ink-900">
                      {profile?.stats?.acceptanceRate || 100}%
                    </span>
                  </div>
                </div>

                <Link to="/partner/earnings" className="block pt-2">
                  <Button variant="outline" size="sm" className="w-full">
                    View Complete Earnings Ledger
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

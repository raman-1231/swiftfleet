import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../../api/apiClient';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { DeliveryMap } from '../../components/maps/DeliveryMap';
import {
  Package,
  MapPin,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Lock,
  RefreshCw,
  AlertTriangle,
  Bike,
  Sparkles,
  Info
} from 'lucide-react';

export const CustomerTrackingPage = () => {
  const { token } = useParams();

  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenSuccessMsg, setRegenSuccessMsg] = useState('');
  const [regenErrorMsg, setRegenErrorMsg] = useState('');

  // Countdown timers
  const [pinRemainingSecs, setPinRemainingSecs] = useState(0);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [liveCourierCoords, setLiveCourierCoords] = useState(null);

  // Prevent search engine indexing of private delivery tracking pages
  useEffect(() => {
    let metaTag = document.querySelector('meta[name="robots"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'robots';
      document.head.appendChild(metaTag);
    }
    metaTag.content = 'noindex, nofollow';

    return () => {
      metaTag.content = 'index, follow';
    };
  }, []);

  const fetchTracking = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get(`/tracking/${token}`);
      setTrackingData(res);
      if (res.order?.currentPartnerLocation) {
        setLiveCourierCoords(res.order.currentPartnerLocation);
      }
      if (res.cooldownSeconds) {
        setCooldownSecs(res.cooldownSeconds);
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to find tracking details for this delivery link.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTracking();
    }
  }, [token]);

  // Real-time socket connection authorized exclusively with the tracking token
  useEffect(() => {
    if (!token) return;

    const rawEndpoint = (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin).trim();
    const socketEndpoint = rawEndpoint.replace(/\/api\/?$/, '').replace(/\/$/, '');

    const s = io(socketEndpoint, {
      auth: { trackingToken: token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      reconnectionDelay: 2000
    });

    s.on('order_status_updated', (payload) => {
      console.log('📦 [Customer Tracking] Live order status update:', payload);
      fetchTracking(true);
    });

    s.on('courier_location_updated', (loc) => {
      setLiveCourierCoords({ lat: loc.lat, lng: loc.lng, updatedAt: loc.timestamp });
    });

    return () => {
      s.disconnect();
    };
  }, [token]);

  // Compute PIN expiration countdown timer
  useEffect(() => {
    const expiresAt = trackingData?.deliveryPin?.expiresAt;
    if (!expiresAt) {
      setPinRemainingSecs(0);
      return;
    }

    const calcRemaining = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    };

    setPinRemainingSecs(calcRemaining());
    const interval = setInterval(() => {
      const rem = calcRemaining();
      setPinRemainingSecs(rem);
      if (rem <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [trackingData?.deliveryPin?.expiresAt]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSecs <= 0) return;
    const timer = setInterval(() => {
      setCooldownSecs((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSecs]);

  const handleRegeneratePin = async () => {
    if (isRegenerating || cooldownSecs > 0) return;
    setRegenSuccessMsg('');
    setRegenErrorMsg('');
    setIsRegenerating(true);

    try {
      const res = await api.post(`/tracking/${token}/regenerate-pin`);
      setTrackingData((prev) => ({
        ...prev,
        deliveryPin: res.deliveryPin,
        cooldownSeconds: res.cooldownSeconds
      }));
      setCooldownSecs(res.cooldownSeconds || 30);
      setRegenSuccessMsg('New 6-digit delivery PIN generated successfully.');
    } catch (err) {
      setRegenErrorMsg(err.message || 'Failed to regenerate delivery PIN.');
      if (err.cooldownSeconds) {
        setCooldownSecs(err.cooldownSeconds);
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-ink-500">Retrieving live package telemetry...</p>
        </div>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-ink-900">Tracking Link Expired or Invalid</h2>
          <p className="text-xs text-ink-500 leading-relaxed">
            {error || 'This delivery tracking link is invalid or has expired. Please request an updated tracking link from the sending merchant.'}
          </p>
        </Card>
      </div>
    );
  }

  const { order, deliveryPin } = trackingData;
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';
  const isPinExpired = deliveryPin?.status === 'expired' || (deliveryPin?.expiresAt && pinRemainingSecs <= 0 && !isDelivered);
  const isPinLocked = deliveryPin?.status === 'locked';

  return (
    <div className="min-h-screen bg-ink-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Brand & Order Reference Header */}
        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-brand-600">
                SwiftFleet Live Courier Tracking
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 font-mono tracking-tight mt-0.5">
              Order #{order.orderNumber}
            </h1>
            <p className="text-xs text-ink-500 mt-1">
              Dispatched from <strong>{order.merchantName}</strong>
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1">
            <StatusBadge status={order.status} />
            <span className="text-[11px] text-ink-400 font-mono">
              Estimated duration: ~{order.estimatedDurationMins || 20} mins
            </span>
          </div>
        </div>

        {/* ALWAYS-VISIBLE CUSTOMER DELIVERY PIN HERO CARD */}
        {!isCancelled && !isDelivered && (
          <div className="bg-gradient-to-br from-brand-600 to-indigo-700 text-white p-6 sm:p-7 rounded-2xl shadow-elevated border-2 border-brand-400/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-lg">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-brand-100 text-[11px] font-semibold backdrop-blur-sm">
                  <Lock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Secure Delivery Handover Verification</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Your Delivery Handover PIN
                </h2>
                <p className="text-xs text-brand-100 leading-relaxed">
                  Share this 6-digit numeric code with your SwiftFleet courier <strong>only upon package arrival</strong> to authenticate the delivery.
                </p>
              </div>

              {/* PIN Digits Display Box */}
              <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 sm:min-w-[210px] text-center">
                {deliveryPin?.pin && !isPinExpired && !isPinLocked ? (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-200">
                      Active 6-Digit PIN
                    </span>
                    <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-amber-300 my-1">
                      {deliveryPin.pin}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Expires in: {formatCountdown(pinRemainingSecs)}</span>
                    </div>
                  </>
                ) : isPinLocked ? (
                  <div className="text-center space-y-1">
                    <AlertTriangle className="w-6 h-6 text-amber-300 mx-auto" />
                    <span className="text-xs font-bold text-amber-200 block">Verification Locked</span>
                    <span className="text-[10px] text-white/80 block">Max attempts exceeded</span>
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <Clock className="w-6 h-6 text-amber-300 mx-auto" />
                    <span className="text-xs font-bold text-amber-200 block">PIN Expired</span>
                    <span className="text-[10px] text-white/80 block">Generate a fresh PIN below</span>
                  </div>
                )}
              </div>
            </div>

            {/* Alert & Request New PIN Action Bar */}
            <div className="mt-5 pt-5 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs">
                {isPinExpired ? (
                  <span className="text-amber-200 flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-300" />
                    Your previous PIN has expired. Click below to generate a new PIN.
                  </span>
                ) : isPinLocked ? (
                  <span className="text-amber-200 flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-300" />
                    Incorrect PIN attempts exceeded. Click below to reset verification.
                  </span>
                ) : (
                  <span className="text-brand-100 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-brand-300" />
                    Never share this PIN over phone or chat before the courier arrives in person.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRegeneratePin}
                  isLoading={isRegenerating}
                  disabled={isRegenerating || cooldownSecs > 0}
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />}
                  className="bg-white text-brand-700 hover:bg-brand-50 border-0 font-bold text-xs shadow-sm"
                >
                  {cooldownSecs > 0
                    ? `Wait ${cooldownSecs}s to Request`
                    : 'Request New PIN'}
                </Button>
              </div>
            </div>

            {/* Feedback Banners */}
            {regenSuccessMsg && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-300/40 text-emerald-100 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <span>{regenSuccessMsg}</span>
              </div>
            )}
            {regenErrorMsg && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-500/20 border border-red-300/40 text-red-100 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-300 flex-shrink-0" />
                <span>{regenErrorMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Delivered Confirmation Banner */}
        {isDelivered && (
          <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center gap-4 text-emerald-950 shadow-subtle">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Package Successfully Delivered</h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Handover was authenticated with your customer delivery PIN. Thank you for choosing SwiftFleet!
              </p>
            </div>
          </div>
        )}

        {/* Live Delivery Map & Courier HUD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <Card
              title="Live Transit Map"
              subtitle={
                liveCourierCoords
                  ? 'Streaming live courier GPS beacon updates'
                  : 'Displaying pickup origin and dropoff waypoints'
              }
            >
              <DeliveryMap
                pickupCoords={order.pickup?.coordinates}
                dropoffCoords={order.dropoff?.coordinates}
                courierCoords={liveCourierCoords}
                lastLocationUpdate={liveCourierCoords?.updatedAt}
                pickupAddress={order.pickup?.address}
                dropoffAddress={order.dropoff?.address}
                courierName={order.assignedPartner?.name || 'SwiftFleet Courier'}
                className="h-80 w-full rounded-xl"
              />

              {order.assignedPartner && (
                <div className="mt-3 p-3 bg-ink-50 rounded-xl border border-ink-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center">
                      <Bike className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-ink-400 block">Assigned Courier</span>
                      <span className="font-semibold text-ink-900">{order.assignedPartner.name}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                    Verified Courier Partner
                  </span>
                </div>
              )}
            </Card>
          </div>

          {/* Delivery Details & Milestones */}
          <div className="lg:col-span-5 space-y-6">
            <Card title="Delivery Destination" subtitle="Dropoff details">
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-ink-900 block">{order.dropoff?.address}</span>
                    <span className="text-ink-500 text-[11px] mt-0.5 block">
                      Recipient: {order.dropoff?.contactName}
                    </span>
                    {order.dropoff?.instructions && (
                      <p className="text-brand-700 italic text-[11px] mt-1 bg-brand-50 p-2 rounded">
                        Note: {order.dropoff.instructions}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Package Classification" subtitle="Fulfillment specification">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-ink-50 rounded-xl border border-ink-100">
                  <span className="text-[10px] uppercase font-bold text-ink-400 block">Category</span>
                  <span className="font-bold text-ink-900 capitalize mt-0.5 block">
                    {order.packageDetails?.category?.replace('_', ' ') || 'General Parcel'}
                  </span>
                </div>
                <div className="p-3 bg-ink-50 rounded-xl border border-ink-100">
                  <span className="text-[10px] uppercase font-bold text-ink-400 block">Weight</span>
                  <span className="font-bold text-ink-900 mt-0.5 block">
                    {order.packageDetails?.weightKg || 1.5} kg
                  </span>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card title="Activity Timeline" subtitle="Live dispatch log">
              <div className="space-y-3">
                {(order.timeline || []).slice(-4).reverse().map((event, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-ink-900 block capitalize">{event.status.replace('_', ' ')}</span>
                      <p className="text-ink-500 text-[11px]">{event.note}</p>
                      <span className="text-[10px] text-ink-400 font-mono mt-0.5 block">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

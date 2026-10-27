import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/apiClient';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { DeliveryMap } from '../../components/maps/DeliveryMap';
import { Modal } from '../../components/common/Modal';
import { formatINR } from '../../utils/currency';
import {
  Truck,
  MapPin,
  Clock,
  Phone,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Navigation,
  Lock,
  Share2,
  Copy
} from 'lucide-react';

export const OrderTrackingPage = () => {
  const { id } = useParams();
  const { socket } = useSocket();
  const { user } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveCourierCoords, setLiveCourierCoords] = useState(null);

  // Cancellation & Dispute Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeCategory, setDisputeCategory] = useState('late_delivery');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${id}`);
      setOrder(res);
      if (res.currentPartnerLocation) {
        setLiveCourierCoords(res.currentPartnerLocation);
      }
    } catch (err) {
      setError(err.message || 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Join order room for live tracking
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join_order_room', { orderId: id });

    const handleOrderStatusUpdated = (payload) => {
      if (payload.orderId === id) {
        fetchOrder();
      }
    };

    const handleCourierLocationUpdated = (loc) => {
      if (loc.orderId === id) {
        setLiveCourierCoords({ lat: loc.lat, lng: loc.lng, updatedAt: loc.timestamp });
      }
    };

    socket.on('order_status_updated', handleOrderStatusUpdated);
    socket.on('courier_location_updated', handleCourierLocationUpdated);

    return () => {
      socket.emit('leave_order_room', { orderId: id });
      socket.off('order_status_updated', handleOrderStatusUpdated);
      socket.off('courier_location_updated', handleCourierLocationUpdated);
    };
  }, [socket, id]);

  const handleCancelOrder = async () => {
    try {
      setIsActionLoading(true);
      await api.post(`/orders/${id}/cancel`, { reason: cancelReason });
      toast.success('Order Cancelled', `Order #${order.orderNumber} has been successfully cancelled.`);
      setShowCancelModal(false);
      fetchOrder();
    } catch (err) {
      toast.error('Cancellation Failed', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRaiseDispute = async () => {
    try {
      setIsActionLoading(true);
      await api.post('/admin/disputes', {
        orderId: id,
        reason: disputeReason,
        category: disputeCategory
      });
      toast.success('Dispute Filed', 'Incident report registered in ops queue.');
      setShowDisputeModal(false);
      fetchOrder();
    } catch (err) {
      toast.error('Failed to File Incident', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-ink-400">
        Loading live tracking telemetry...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-ops-danger">
        {error || 'Order not found.'}
      </div>
    );
  }

  const isCancellable = ['created', 'offered', 'assigned'].includes(order.status);
  const isMerchantOwner = user?.role === 'business' && (
    String(order.businessId?._id || order.businessId) === String(user?._id || user?.id)
  );
  const canCancel = isCancellable && (user?.role === 'admin' || isMerchantOwner);
  const canViewCustomerLink = (isMerchantOwner || user?.role === 'admin') && order.trackingToken && order.status !== 'delivered';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to={user?.role === 'partner' ? '/partner' : user?.role === 'admin' ? '/admin' : '/business'}
            className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 font-mono tracking-tight">
              {order.orderNumber}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Registered on {new Date(order.createdAt).toLocaleString()} • {order.packageDetails?.category}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCancel && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowCancelModal(true)}
            >
              Cancel Order
            </Button>
          )}

          {['picked_up', 'delivered'].includes(order.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisputeModal(true)}
            >
              File Incident Claim
            </Button>
          )}
        </div>
      </div>

      {/* Customer Tracking Link sharing card for business merchant owner & admin */}
      {canViewCustomerLink && (
        <div className="p-4 sm:p-5 bg-brand-50 border-2 border-brand-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-subtle animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold flex-shrink-0 mt-0.5 sm:mt-0 shadow-sm">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-900">
                  Customer Delivery Tracking & PIN Link
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-brand-100 text-brand-800 border border-brand-200">
                  Guest Accessible
                </span>
              </div>
              <p className="text-xs text-brand-700 mt-0.5">
                Share this secure link with your recipient. They can track live courier progress and view their 6-digit delivery PIN without logging in.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:min-w-[380px]">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/track/${order.trackingToken}`}
              onClick={(e) => e.target.select()}
              className="text-xs font-mono bg-white border border-brand-300 rounded-xl px-3 py-2 text-ink-900 select-all truncate flex-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              title="Click to select customer tracking URL"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const fullUrl = `${window.location.origin}/track/${order.trackingToken}`;
                  navigator.clipboard.writeText(fullUrl)
                    .then(() => toast.success('Tracking Link Copied', 'Customer tracking link copied to clipboard.'))
                    .catch(() => toast.info('Customer Tracking URL', fullUrl));
                }}
                leftIcon={<Copy className="w-3.5 h-3.5" />}
                className="flex-1 sm:flex-none shadow-sm"
              >
                Copy Link
              </Button>
              {typeof navigator !== 'undefined' && navigator.share && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const fullUrl = `${window.location.origin}/track/${order.trackingToken}`;
                    navigator.share({
                      title: `Track SwiftFleet Delivery #${order.orderNumber}`,
                      text: `Track your package delivery live from ${order.businessId?.name || 'Store'} on SwiftFleet:`,
                      url: fullUrl
                    }).catch(() => {});
                  }}
                  leftIcon={<Share2 className="w-3.5 h-3.5" />}
                  className="bg-white hover:bg-brand-50 border-brand-200"
                  title="Share via device share menu"
                >
                  Share
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Map & Live Position */}
        <div className="lg:col-span-7 space-y-6">
          <Card
            title="Live Route Telemetry"
            subtitle={
              liveCourierCoords
                ? 'Broadcasting live courier GPS beacon'
                : 'Displaying origin and destination delivery waypoints'
            }
          >
            <DeliveryMap
              pickupCoords={order.pickup?.coordinates}
              dropoffCoords={order.dropoff?.coordinates}
              courierCoords={liveCourierCoords}
              lastLocationUpdate={liveCourierCoords?.updatedAt}
              pickupAddress={order.pickup?.address}
              dropoffAddress={order.dropoff?.address}
              courierName={order.assignedPartnerId?.name || 'Assigned Courier'}
              className="h-96 w-full rounded-xl"
            />

            {liveCourierCoords ? (
              (() => {
                const isStale = liveCourierCoords.updatedAt
                  ? (Date.now() - new Date(liveCourierCoords.updatedAt).getTime() > 60000)
                  : false;
                const secondsAgo = liveCourierCoords.updatedAt
                  ? Math.floor((Date.now() - new Date(liveCourierCoords.updatedAt).getTime()) / 1000)
                  : 0;

                return isStale ? (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      ⚠️ Stale GPS Signal ({secondsAgo > 60 ? `${Math.floor(secondsAgo / 60)}m ago` : `${secondsAgo}s ago`}) — Telemetry may be delayed
                    </span>
                    <span className="font-mono text-[11px] text-amber-800">
                      {liveCourierCoords.lat?.toFixed(4)}, {liveCourierCoords.lng?.toFixed(4)}
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live GPS coordinate lock active
                    </span>
                    <span className="font-mono text-[11px]">
                      {liveCourierCoords.lat?.toFixed(4)}, {liveCourierCoords.lng?.toFixed(4)}
                    </span>
                  </div>
                );
              })()
            ) : (
              <div className="mt-3 p-2.5 bg-ink-50 rounded-lg text-xs text-ink-500 flex items-center justify-between">
                <span>Waypoint Coordinates Locked</span>
                <span className="font-mono text-[11px] text-ink-400">Road modeled 1.30x</span>
              </div>
            )}
          </Card>

          {/* Pickup & Destination Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card title="Pickup Origin" subtitle="Merchant Location">
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-ink-950">{order.pickup?.address}</p>
                <p className="text-ink-600">Contact: {order.pickup?.contactName}</p>
                <p className="text-ink-600">Phone: {order.pickup?.phone || 'N/A'}</p>
                {order.pickup?.instructions && (
                  <p className="text-brand-700 italic mt-1">Instructions: {order.pickup.instructions}</p>
                )}
              </div>
            </Card>

            <Card title="Dropoff Destination" subtitle="Recipient Address">
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-ink-950">{order.dropoff?.address}</p>
                <p className="text-ink-600">Contact: {order.dropoff?.contactName}</p>
                <p className="text-ink-600">Phone: {order.dropoff?.phone}</p>
                {order.dropoff?.instructions && (
                  <p className="text-brand-700 italic mt-1">Instructions: {order.dropoff.instructions}</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column: Timeline & Courier Info */}
        <div className="lg:col-span-5 space-y-6">
          {/* Assigned Partner Profile Card */}
          {order.assignedPartnerId ? (
            <Card title="Assigned Delivery Partner" subtitle="Verified courier handling this mission">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold text-lg">
                  {order.assignedPartnerId.name[0]}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-ink-900">{order.assignedPartnerId.name}</h4>
                  <p className="text-xs text-ink-500 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{order.assignedPartnerId.phone || 'Direct dispatch line'}</span>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Verified ID
                </span>
              </div>
            </Card>
          ) : (
            <Card title="Courier Matching Status">
              <div className="text-xs text-ink-600 space-y-2">
                <p>
                  {order.status === 'offered'
                    ? 'Dispatched to closest available partner. Awaiting acceptance response.'
                    : 'System is currently evaluating active couriers in pickup geofence.'}
                </p>
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-brand-800 font-mono text-[11px]">
                  Dispatch Algorithm: Proximity Cascade (Haversine 2D)
                </div>
              </div>
            </Card>
          )}

          {/* Pricing Summary */}
          <Card title="Pricing & SLA Summary">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-ink-600">
                <span>Route Distance:</span>
                <span className="font-mono font-semibold text-ink-900">{order.pricing?.distanceKm} km</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Estimated Duration:</span>
                <span className="font-mono font-semibold text-ink-900">{order.estimatedDurationMins} mins</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Total Delivery Fare:</span>
                <span className="font-mono font-bold text-ink-900 text-sm">
                  {formatINR(order.pricing?.totalCost)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                <span>Courier Earnings Allocation:</span>
                <span className="font-mono font-bold">{formatINR(order.pricing?.partnerPayout)}</span>
              </div>
            </div>
          </Card>

          {/* Chronological Lifecycle Timeline */}
          <Card title="Delivery Lifecycle Audit" subtitle="Immutable state transition chronology">
            <div className="space-y-4">
              {order.timeline?.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs relative">
                  <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 pb-3 border-b border-ink-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink-900 uppercase tracking-wider text-[11px]">
                        {step.status}
                      </span>
                      <span className="text-[10px] text-ink-400 font-mono">
                        {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-ink-600 mt-0.5 leading-relaxed">{step.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Cancel Order Dialog */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Delivery Order"
        subtitle="This action will withdraw the order from courier dispatch."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-ink-800 mb-1">Cancellation Reason</label>
            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer cancelled order at store"
              className="w-full px-3 py-2 text-xs bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Keep Order
            </Button>
            <Button
              variant="danger"
              onClick={handleCancelOrder}
              isLoading={isActionLoading}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Incident / Dispute Dialog */}
      <Modal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        title="Report Delivery Incident"
        subtitle="Filing an operational dispute notifies operations coordinators."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-ink-800 mb-1">Incident Category</label>
            <select
              value={disputeCategory}
              onChange={(e) => setDisputeCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-ink-200 rounded-lg text-ink-900"
            >
              <option value="late_delivery">Late Delivery / ETA Breach</option>
              <option value="damaged_item">Merchandise Damaged in Transit</option>
              <option value="wrong_address">Wrong Dropoff Address Handover</option>
              <option value="missing_package">Missing Package / Unaccounted</option>
              <option value="other">Other Incident</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-800 mb-1">Incident Details</label>
            <textarea
              rows={3}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe what occurred during fulfillment..."
              className="w-full px-3 py-2 text-xs bg-white border border-ink-200 rounded-lg text-ink-900"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowDisputeModal(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleRaiseDispute}
              isLoading={isActionLoading}
            >
              Submit Claim
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/apiClient';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { DeliveryMap } from '../../components/maps/DeliveryMap';
import {
  PlusCircle,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  MapPin
} from 'lucide-react';

export const BusinessDashboard = () => {
  const { user, profile } = useAuth();
  const { latestOrderUpdate } = useSocket();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrderForMap, setSelectedOrderForMap] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders?status=${statusFilter}&search=${search}`);
      setOrders(res.orders || []);
      if (res.orders && res.orders.length > 0 && !selectedOrderForMap) {
        setSelectedOrderForMap(res.orders[0]);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  // Re-fetch or update when socket broadcasts an order status change
  useEffect(() => {
    if (latestOrderUpdate) {
      fetchOrders();
    }
  }, [latestOrderUpdate]);

  const activeOrders = orders.filter((o) => ['created', 'offered', 'assigned', 'picked_up'].includes(o.status));
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const totalSpend = deliveredOrders.reduce((sum, o) => sum + (o.pricing?.totalCost || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Fast Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
            Merchant Operations
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
            {profile?.companyName || 'Business Hub'}
          </h1>
          <p className="text-xs text-ink-500 mt-0.5">
            Realtime dispatch monitoring and fulfillment ledger
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/business/create">
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Create New Delivery
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Operational KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card noPadding className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-500">Active In Transit</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-ink-950">
              {orders.filter((o) => ['assigned', 'picked_up'].includes(o.status)).length}
            </span>
            <span className="text-xs text-indigo-600 font-medium">Live on road</span>
          </div>
        </Card>

        <Card noPadding className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-500">Queued for Dispatch</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-ink-950">
              {orders.filter((o) => ['created', 'offered'].includes(o.status)).length}
            </span>
            <span className="text-xs text-amber-600 font-medium">Matching couriers</span>
          </div>
        </Card>

        <Card noPadding className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-500">Fulfilled Deliveries</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-ink-950">{deliveredOrders.length}</span>
            <span className="text-xs text-emerald-600 font-medium">Completed</span>
          </div>
        </Card>

        <Card noPadding className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-500">Total Spend</span>
            <div className="p-2 rounded-lg bg-blue-50 text-brand-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-ink-950">${totalSpend.toFixed(2)}</span>
            <span className="text-xs text-ink-500 font-medium">Settled ledger</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Active Deliveries List + Live Map Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Deliveries List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink-900">Live Delivery Orders</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-ink-100 text-ink-700">
                {orders.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-medium bg-white border border-ink-200 rounded-lg px-2.5 py-1.5 text-ink-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="all">All Statuses</option>
                <option value="created">Created (Waiting)</option>
                <option value="offered">Offered</option>
                <option value="assigned">Assigned</option>
                <option value="picked_up">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-ink-400">Loading orders...</div>
          ) : orders.length === 0 ? (
            <EmptyState
              title="No delivery orders found"
              description="Create your first on-demand delivery to initiate courier matching."
              actionLabel="Create Delivery"
              onAction={() => window.location.href = '/business/create'}
            />
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const isSelected = selectedOrderForMap?._id === order._id;
                return (
                  <div
                    key={order._id}
                    onClick={() => setSelectedOrderForMap(order)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                      isSelected
                        ? 'border-brand-500 ring-2 ring-brand-100 shadow-card'
                        : 'border-ink-200 hover:border-ink-300 shadow-subtle'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-ink-950">
                            {order.orderNumber}
                          </span>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-xs text-ink-500 mt-1 flex items-center gap-1">
                          <span>{order.packageDetails?.category}</span>
                          <span>•</span>
                          <span>{order.packageDetails?.weightKg} kg</span>
                          <span>•</span>
                          <span className="font-mono">${order.pricing?.totalCost?.toFixed(2)}</span>
                        </p>
                      </div>

                      <Link
                        to={`/orders/${order._id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                      >
                        Track <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Route Details */}
                    <div className="mt-3 pt-3 border-t border-ink-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-400 block">Pickup</span>
                        <p className="text-ink-800 truncate" title={order.pickup?.address}>
                          {order.pickup?.address}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-ink-400 block">Destination</span>
                        <p className="text-ink-800 truncate" title={order.dropoff?.address}>
                          {order.dropoff?.address}
                        </p>
                      </div>
                    </div>

                    {/* Courier Tag */}
                    {order.assignedPartnerId && (
                      <div className="mt-2 text-[11px] text-ink-600 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-indigo-600" />
                        <span>Courier: <strong>{order.assignedPartnerId.name}</strong></span>
                        {order.assignedPartnerId.phone && (
                          <span className="text-ink-400">({order.assignedPartnerId.phone})</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Interactive Operational Map View */}
        <div className="lg:col-span-5">
          <Card
            title={selectedOrderForMap ? `Order ${selectedOrderForMap.orderNumber} Map` : 'Operational Map'}
            subtitle={selectedOrderForMap ? `Status: ${selectedOrderForMap.status}` : 'Select an order to inspect route telemetry'}
            className="sticky top-20"
          >
            {selectedOrderForMap ? (
              <div className="space-y-4">
                <DeliveryMap
                  pickupCoords={selectedOrderForMap.pickup?.coordinates}
                  dropoffCoords={selectedOrderForMap.dropoff?.coordinates}
                  courierCoords={selectedOrderForMap.currentPartnerLocation}
                  pickupAddress={selectedOrderForMap.pickup?.address}
                  dropoffAddress={selectedOrderForMap.dropoff?.address}
                  courierName={selectedOrderForMap.assignedPartnerId?.name || 'Courier'}
                  className="h-80 w-full rounded-xl"
                />

                <div className="p-3 bg-ink-50 rounded-lg text-xs space-y-1.5 border border-ink-100">
                  <div className="flex justify-between text-ink-600">
                    <span>Road Route Distance:</span>
                    <span className="font-mono font-semibold text-ink-900">
                      {selectedOrderForMap.pricing?.distanceKm} km
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>Estimated Transit Duration:</span>
                    <span className="font-mono font-semibold text-ink-900">
                      {selectedOrderForMap.estimatedDurationMins} minutes
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>Recipient Contact:</span>
                    <span className="font-semibold text-ink-900">
                      {selectedOrderForMap.dropoff?.contactName} ({selectedOrderForMap.dropoff?.phone || 'No phone'})
                    </span>
                  </div>
                </div>

                <Link to={`/orders/${selectedOrderForMap._id}`} className="block">
                  <Button variant="outline" size="sm" className="w-full">
                    View Full Order Audit & Timeline
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-xs text-ink-400 border border-dashed border-ink-200 rounded-xl">
                Select an order from the list to display telemetry map
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

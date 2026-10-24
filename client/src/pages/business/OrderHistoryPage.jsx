import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { Search, Filter, ArrowUpRight, PlusCircle, Package } from 'lucide-react';

export const OrderHistoryPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders?status=${statusFilter}&search=${search}`);
      setOrders(res.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
            Fulfillment Records
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
            Order Ledger & History
          </h1>
          <p className="text-xs text-ink-500 mt-0.5">
            Complete historical directory of merchant deliveries, timestamps, and settled payouts
          </p>
        </div>

        <Link to="/business/create">
          <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
            New Delivery
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, recipient name, or address..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-2.5" />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs font-medium bg-white border border-ink-200 rounded-lg px-3 py-2 text-ink-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">All Lifecycles</option>
          <option value="created">Created</option>
          <option value="offered">Offered</option>
          <option value="assigned">Assigned</option>
          <option value="picked_up">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-ink-50/70 border-b border-ink-100 text-ink-500 font-medium">
                <th className="py-3 px-6">Order Number</th>
                <th className="py-3 px-6">Date Placed</th>
                <th className="py-3 px-6">Destination</th>
                <th className="py-3 px-6">Recipient</th>
                <th className="py-3 px-6">Assigned Courier</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Fare Total</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-ink-400">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-ink-400">No orders found.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-ink-900">
                      {order.orderNumber}
                    </td>
                    <td className="py-3.5 px-6 text-ink-600">
                      {new Date(order.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-6 text-ink-800 max-w-xs truncate" title={order.dropoff?.address}>
                      {order.dropoff?.address}
                    </td>
                    <td className="py-3.5 px-6 text-ink-700">
                      {order.dropoff?.contactName}
                    </td>
                    <td className="py-3.5 px-6 text-ink-700">
                      {order.assignedPartnerId?.name || <span className="text-ink-400 italic">Unassigned</span>}
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono font-bold text-ink-950">
                      ${order.pricing?.totalCost?.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        to={`/orders/${order._id}`}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
                      >
                        Track <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

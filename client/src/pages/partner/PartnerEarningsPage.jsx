import React, { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/Badge';
import { formatINR } from '../../utils/currency';
import { IndianRupee, TrendingUp, Calendar, Navigation, FileSpreadsheet } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export const PartnerEarningsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/earnings/partner')
      .then((res) => {
        setData(res);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
          Settlement Ledger
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
          Courier Earnings & Payout Ledger
        </h1>
        <p className="text-xs text-ink-500 mt-0.5">
          Auditable transaction entries recorded upon confirmed order delivery handovers
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-ink-400">Loading ledger data...</div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card noPadding className="p-5">
              <span className="text-xs font-semibold text-ink-500">Cumulative Earnings</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-ink-950">
                  {formatINR(data?.summary?.totalEarned)}
                </span>
                <span className="text-xs text-emerald-600 font-medium">Verified Payouts</span>
              </div>
            </Card>

            <Card noPadding className="p-5">
              <span className="text-xs font-semibold text-ink-500">Fulfilled Deliveries</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-ink-950">
                  {data?.summary?.totalDeliveries || 0}
                </span>
                <span className="text-xs text-brand-600 font-medium">Orders</span>
              </div>
            </Card>

            <Card noPadding className="p-5">
              <span className="text-xs font-semibold text-ink-500">Road Distance Completed</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-ink-950">
                  {data?.summary?.totalKm || 0}
                </span>
                <span className="text-xs text-ink-600 font-medium">Kilometers</span>
              </div>
            </Card>

            <Card noPadding className="p-5">
              <span className="text-xs font-semibold text-ink-500">Avg. Payout per Mission</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-ink-950">
                  {formatINR(data?.summary?.avgPayoutPerDelivery)}
                </span>
                <span className="text-xs text-ink-500 font-medium">Per drop</span>
              </div>
            </Card>
          </div>

          {/* Recharts Volume Trend */}
          {data?.chartData && data.chartData.length > 0 && (
            <Card title="Earnings Trend" subtitle="Daily settlement totals">
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chartData}>
                    <defs>
                      <linearGradient id="payoutGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3457E5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3457E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} prefix="₹" />
                    <Tooltip
                      formatter={(val) => [formatINR(val), 'Payout']}
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="payout" stroke="#3457E5" strokeWidth={2.5} fillOpacity={1} fill="url(#payoutGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Ledger Table */}
          <Card title="Immutable Ledger Records" subtitle="Guaranteed exactly-once entries recorded per order" noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-ink-50/70 border-b border-ink-100 text-ink-500 font-medium">
                    <th className="py-3 px-6">Transaction Ref</th>
                    <th className="py-3 px-6">Order Number</th>
                    <th className="py-3 px-6">Distance</th>
                    <th className="py-3 px-6">Delivered Timestamp</th>
                    <th className="py-3 px-6">Ledger State</th>
                    <th className="py-3 px-6 text-right">Credit Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {data?.ledger?.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-ink-400">
                        No ledger entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    data?.ledger?.map((entry) => (
                      <tr key={entry._id} className="hover:bg-ink-50/50 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-[11px] text-ink-500">
                          TX-{entry._id.substring(entry._id.length - 8).toUpperCase()}
                        </td>
                        <td className="py-3.5 px-6 font-mono font-bold text-ink-900">
                          {entry.orderNumber}
                        </td>
                        <td className="py-3.5 px-6 text-ink-600">
                          {entry.distanceKm} km
                        </td>
                        <td className="py-3.5 px-6 text-ink-600">
                          {new Date(entry.deliveredAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            {entry.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-bold text-sm text-emerald-700">
                          +{formatINR(entry.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

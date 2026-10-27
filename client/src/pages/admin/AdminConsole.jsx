import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatINR } from '../../utils/currency';
import {
  ShieldCheck,
  Truck,
  Users,
  AlertOctagon,
  IndianRupee,
  TrendingUp,
  Clock,
  Layers,
  FileCheck,
  FileText,
  ArrowRight
} from 'lucide-react';

export const AdminConsole = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/metrics')
      .then((res) => setMetrics(res.metrics))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
          Operations Command Center
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
          Fleet Operations & Workforce Oversight
        </h1>
        <p className="text-xs text-ink-500 mt-0.5">
          High-density operational surveillance, compliance auditing, and live dispatch oversight
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-ink-400">Loading system metrics...</div>
      ) : (
        <>
          {/* Operations KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card noPadding className="p-5">
              <span className="text-xs font-semibold text-ink-500">Live In-Transit</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-ink-950">
                  {metrics?.inTransitOrders || 0}
                </span>
                <span className="text-xs text-indigo-600 font-medium">On-Road Telemetry</span>
              </div>
            </Card>

            <Card noPadding className="p-5">
              <span className="text-xs font-semibold text-ink-500">Unassigned Queue</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-ink-950">
                  {metrics?.unassignedOrders || 0}
                </span>
                <span className="text-xs text-amber-600 font-medium">Matching / Cascade</span>
              </div>
            </Card>

            <Card noPadding className="p-5">
              <span className="text-xs font-semibold text-ink-500">Online Active Couriers</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-ink-950">
                  {metrics?.onlinePartners || 0}
                </span>
                <span className="text-xs text-emerald-600 font-medium">Ready for Dispatch</span>
              </div>
            </Card>

            <Card noPadding className="p-5">
              <span className="text-xs font-semibold text-ink-500">Pending Verification</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-ink-950">
                  {metrics?.pendingVerifications || 0}
                </span>
                <Link to="/admin/verification" className="text-xs text-brand-600 font-semibold hover:underline">
                  Review Queue →
                </Link>
              </div>
            </Card>
          </div>

          {/* Financial Platform Margin Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card noPadding className="p-5">
              <span className="text-xs font-semibold text-ink-500">Gross Merchant Volume</span>
              <div className="mt-2">
                <span className="text-2xl font-bold font-mono text-ink-950">
                  {formatINR(metrics?.totalRevenue)}
                </span>
                <span className="text-[11px] text-ink-500 block mt-1">Aggregated order gross spend</span>
              </div>
            </Card>

            <Card noPadding className="p-5">
              <span className="text-xs font-semibold text-ink-500">Total Courier Disbursements</span>
              <div className="mt-2">
                <span className="text-2xl font-bold font-mono text-emerald-700">
                  {formatINR(metrics?.totalPayouts)}
                </span>
                <span className="text-[11px] text-emerald-600 block mt-1">78% average driver revenue share</span>
              </div>
            </Card>

            <Card noPadding className="p-5">
              <span className="text-xs font-semibold text-ink-500">Net Platform Margin</span>
              <div className="mt-2">
                <span className="text-2xl font-bold font-mono text-brand-600">
                  {formatINR(metrics?.netPlatformMargin)}
                </span>
                <span className="text-[11px] text-brand-600 block mt-1">Retained infrastructure revenue</span>
              </div>
            </Card>
          </div>

          {/* Core Command Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <Card className="hover:border-brand-400 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center mb-4">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink-900">Workforce Verification</h3>
              <p className="text-xs text-ink-600 mt-1 mb-4 leading-relaxed">
                Inspect uploaded driver license numbers and verify or suspend couriers before live dispatch eligibility.
              </p>
              <Link to="/admin/verification">
                <Button variant="outline" size="sm" className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Open Verification Portal
                </Button>
              </Link>
            </Card>

            <Card className="hover:border-brand-400 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink-900">Live Fleet Radar Map</h3>
              <p className="text-xs text-ink-600 mt-1 mb-4 leading-relaxed">
                Full-screen geographic surveillance showing all online partners and in-flight order waypoints in real-time.
              </p>
              <Link to="/admin/fleet">
                <Button variant="outline" size="sm" className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Launch Fleet Map
                </Button>
              </Link>
            </Card>

            <Card className="hover:border-brand-400 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-ink-900">Disputes & Incident Log</h3>
              <p className="text-xs text-ink-600 mt-1 mb-4 leading-relaxed">
                Review merchant claims regarding late deliveries, package damage, or driver disputes with resolution tools.
              </p>
              <Link to="/admin/disputes">
                <Button variant="outline" size="sm" className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Manage Disputes ({metrics?.openDisputes || 0})
                </Button>
              </Link>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

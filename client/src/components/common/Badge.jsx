import React from 'react';

export const StatusBadge = ({ status, className = '' }) => {
  const getBadgeConfig = (st) => {
    switch (st?.toLowerCase()) {
      case 'created':
        return {
          label: 'Ready for Dispatch',
          bg: 'bg-blue-50 text-brand-700 border-blue-200',
          dot: 'bg-brand-500'
        };
      case 'offered':
        return {
          label: 'Offer Pending',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500 animate-pulse'
        };
      case 'assigned':
        return {
          label: 'Courier Assigned',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          dot: 'bg-indigo-500'
        };
      case 'picked_up':
        return {
          label: 'In Transit',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500 animate-pulse'
        };
      case 'delivered':
        return {
          label: 'Delivered',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-600'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500'
        };
      case 'expired':
        return {
          label: 'Offer Expired',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400'
        };
      // Verification statuses
      case 'approved':
        return {
          label: 'Verified & Approved',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-600'
        };
      case 'pending':
        return {
          label: 'Pending Review',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500'
        };
      case 'rejected':
        return {
          label: 'Rejected',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500'
        };
      case 'suspended':
        return {
          label: 'Suspended',
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          dot: 'bg-rose-600'
        };
      // Courier online/offline
      case 'online':
        return {
          label: 'Online & Available',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500 animate-pulse'
        };
      case 'offline':
        return {
          label: 'Offline',
          bg: 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-400'
        };
      default:
        return {
          label: st || 'Unknown',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400'
        };
    }
  };

  const config = getBadgeConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

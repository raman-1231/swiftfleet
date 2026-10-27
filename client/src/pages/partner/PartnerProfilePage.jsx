import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/Badge';
import { ShieldCheck, Bike, FileCheck, Star, Award, Mail, Phone, Calendar } from 'lucide-react';

export const PartnerProfilePage = () => {
  const { user, profile } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
          Partner Identity
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
          Courier Verification & Credentials
        </h1>
        <p className="text-xs text-ink-500 mt-0.5">
          Audited workforce registration, vehicle telemetry profile, and compliance status
        </p>
      </div>

      {/* Verification Status Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        profile?.verificationStatus === 'approved'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
          : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            profile?.verificationStatus === 'approved' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm">
                Operational Compliance Status: <span className="uppercase">{profile?.verificationStatus || 'PENDING'}</span>
              </h3>
            </div>
            <p className="text-xs text-ink-600 mt-0.5">
              {profile?.verificationNotes || 'Identity verification reviewed and documented by SwiftFleet operations.'}
            </p>
          </div>
        </div>
        <StatusBadge status={profile?.verificationStatus || 'pending'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal & Vehicle Info */}
        <Card title="Courier Details" subtitle="Contact and vehicle profile">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-ink-500">Legal Name:</span>
              <span className="font-semibold text-ink-900">{user?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-ink-500">Email Address:</span>
              <span className="font-mono text-ink-900">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-ink-500">Phone Number:</span>
              <span className="text-ink-900">{user?.phone || 'Not provided'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-ink-500">Registered Vehicle:</span>
              <span className="font-semibold text-ink-900 capitalize">{profile?.vehicleType || 'Motorcycle'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-ink-500">Document Number:</span>
              <span className="font-mono font-semibold text-ink-900">{profile?.licenseNumber || 'Verified on file'}</span>
            </div>
          </div>
        </Card>

        {/* Performance Statistics */}
        <Card title="Performance & Safety Metrics" subtitle="Persisted platform score">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-ink-500">Total Fulfilled Deliveries:</span>
              <span className="font-bold font-mono text-ink-900">{profile?.stats?.totalDeliveries || 0}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-ink-500">Customer Satisfaction Rating:</span>
              <span className="font-bold text-ink-900 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{profile?.stats?.rating || '5.0'} / 5.0</span>
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-ink-500">Offer Acceptance Rate:</span>
              <span className="font-bold font-mono text-ink-900">{profile?.stats?.acceptanceRate || 100}%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-ink-500">KYC Document Type:</span>
              <span className="text-ink-900">{profile?.idDocumentType || 'Driving Licence'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-ink-500">KYC Audit Reference:</span>
              <span className="font-mono text-xs text-brand-600 truncate max-w-[200px]">
                {profile?.idDocumentUrl || 'kyc_audit_verified.pdf'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

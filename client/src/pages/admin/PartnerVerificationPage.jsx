import React, { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  ShieldAlert,
  Bike
} from 'lucide-react';

export const PartnerVerificationPage = () => {
  const toast = useToast();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Selected partner for review modal
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decryptedDoc, setDecryptedDoc] = useState(null);
  const [decrypting, setDecrypting] = useState(false);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/partners?status=${statusFilter}&search=${search}`);
      setPartners(res.partners || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, [statusFilter, search]);

  const handleDecryptKYC = async (partnerUserId) => {
    try {
      setDecrypting(true);
      const res = await api.get(`/admin/partners/${partnerUserId}/decrypt-kyc?reason=ComplianceInspection`);
      setDecryptedDoc(res);
      toast.info('Decryption Audited', 'Identity document decryption logged to compliance audit trail.');
    } catch (err) {
      toast.error('Decryption Failed', err.message);
    } finally {
      setDecrypting(false);
    }
  };

  const handleUpdateStatus = async (partnerId, targetStatus) => {
    try {
      setIsSubmitting(true);
      const res = await api.put(`/admin/partners/${partnerId}/verify`, {
        status: targetStatus,
        notes: reviewNotes || `Compliance status set to ${targetStatus} by operations coordinator.`
      });
      toast.success('Status Updated', res.message);
      setSelectedPartner(null);
      setDecryptedDoc(null);
      setReviewNotes('');
      fetchPartners();
    } catch (err) {
      toast.error('Update Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
            Compliance & Vetting
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
            Partner Workforce Verification
          </h1>
          <p className="text-xs text-ink-500 mt-0.5">
            Audit compliance documents (Driving Licence, Aadhaar, PAN), verify credentials, and authorize active delivery dispatch eligibility
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium bg-white border border-ink-200 rounded-lg px-3 py-2 text-ink-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Verification States</option>
            <option value="pending">Pending Verification</option>
            <option value="approved">Approved & Verified</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-ink-50/70 border-b border-ink-100 text-ink-500 font-medium">
                <th className="py-3 px-6">Courier Name</th>
                <th className="py-3 px-6">Vehicle Class</th>
                <th className="py-3 px-6">Compliance Doc Number</th>
                <th className="py-3 px-6">Availability</th>
                <th className="py-3 px-6">Vetting Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-ink-400">Loading couriers...</td>
                </tr>
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-ink-400">
                    No couriers found matching this filter.
                  </td>
                </tr>
              ) : (
                partners.map((partner) => (
                  <tr key={partner._id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-ink-900">{partner.userId?.name}</div>
                      <div className="text-[11px] text-ink-500 font-mono">{partner.userId?.email}</div>
                    </td>
                    <td className="py-3.5 px-6 capitalize text-ink-800">
                      {partner.vehicleType}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-medium text-ink-700">
                      {partner.licenseNumber || 'Unspecified'}
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={partner.isOnline ? 'online' : 'offline'} />
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={partner.verificationStatus} />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedPartner(partner);
                          setDecryptedDoc(null);
                          setReviewNotes(partner.verificationNotes || '');
                        }}
                      >
                        Inspect & Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Partner Inspection & Action Modal */}
      {selectedPartner && (
        <Modal
          isOpen={!!selectedPartner}
          onClose={() => setSelectedPartner(null)}
          title={`Review Verification: ${selectedPartner.userId?.name}`}
          subtitle="Audit compliance credentials and approve or suspend active dispatch eligibility"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-ink-50 rounded-xl border border-ink-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-500">Legal Name:</span>
                <span className="font-semibold text-ink-900">{selectedPartner.userId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Contact Email:</span>
                <span className="font-mono text-ink-900">{selectedPartner.userId?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Phone:</span>
                <span className="text-ink-900">{selectedPartner.userId?.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Registered Vehicle:</span>
                <span className="capitalize font-semibold text-ink-900">{selectedPartner.vehicleType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Document Type:</span>
                <span className="text-ink-900">{selectedPartner.idDocumentType || 'Driving Licence'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-500">Document Number:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-ink-900">
                    {decryptedDoc ? decryptedDoc.licenseNumber : (selectedPartner.licenseNumberMasked || selectedPartner.licenseNumber)}
                  </span>
                  {!decryptedDoc && (
                    <button
                      type="button"
                      onClick={() => handleDecryptKYC(selectedPartner.userId?._id || selectedPartner.userId)}
                      disabled={decrypting}
                      className="text-[10px] text-brand-600 hover:text-brand-800 underline font-semibold"
                    >
                      {decrypting ? 'Decrypting...' : 'Decrypt (Audit Logged)'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Document File Token:</span>
                <span className="font-mono text-brand-600 truncate max-w-[200px]">
                  {selectedPartner.idDocumentUrl || 'kyc_document_verified.pdf'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-800 mb-1">
                Operational Review Notes (Persisted to Audit Log & Notifications)
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="KYC credentials verified against official registry on 2026-10-25."
                className="w-full px-3 py-2 text-xs bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="pt-3 border-t border-ink-100 flex flex-wrap gap-2 justify-end">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleUpdateStatus(selectedPartner.userId._id, 'suspended')}
                disabled={isSubmitting}
              >
                Suspend Account
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUpdateStatus(selectedPartner.userId._id, 'rejected')}
                disabled={isSubmitting}
              >
                Reject
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleUpdateStatus(selectedPartner.userId._id, 'approved')}
                isLoading={isSubmitting}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Authorize & Approve Courier
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

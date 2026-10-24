import React, { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { AlertOctagon, CheckCircle2, MessageSquare, Clock } from 'lucide-react';

export const DisputeManagementPage = () => {
  const toast = useToast();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [targetStatus, setTargetStatus] = useState('resolved');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/disputes');
      setDisputes(res.disputes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolve = async () => {
    if (!selectedDispute) return;
    try {
      setIsSubmitting(true);
      await api.put(`/admin/disputes/${selectedDispute._id}`, {
        resolutionNotes,
        status: targetStatus
      });
      toast.success('Dispute Updated', 'Resolution saved and added to audit trail.');
      setSelectedDispute(null);
      setResolutionNotes('');
      fetchDisputes();
    } catch (err) {
      toast.error('Failed to update dispute', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
          Incident Response
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
          Operational Dispute Resolution
        </h1>
        <p className="text-xs text-ink-500 mt-0.5">
          Merchant and driver claims regarding damaged merchandise, delay penalties, or wrong dropoffs
        </p>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-ink-50/70 border-b border-ink-100 text-ink-500 font-medium">
                <th className="py-3 px-6">Order Ref</th>
                <th className="py-3 px-6">Raised By</th>
                <th className="py-3 px-6">Category</th>
                <th className="py-3 px-6">Claim Details</th>
                <th className="py-3 px-6">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-ink-400">Loading disputes...</td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-ink-400">No disputes reported.</td>
                </tr>
              ) : (
                disputes.map((dispute) => (
                  <tr key={dispute._id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-ink-900">
                      {dispute.orderNumber}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-semibold text-ink-900 block">{dispute.raisedBy?.name}</span>
                      <span className="text-[10px] uppercase font-bold text-ink-500">{dispute.raisedByRole}</span>
                    </td>
                    <td className="py-3.5 px-6 capitalize text-ink-800">
                      {dispute.category?.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-6 text-ink-600 max-w-xs truncate" title={dispute.reason}>
                      {dispute.reason}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        dispute.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {dispute.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setResolutionNotes(dispute.resolutionNotes || '');
                          setTargetStatus(dispute.status);
                        }}
                      >
                        {dispute.status === 'resolved' ? 'View Resolution' : 'Review & Settle'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dispute Resolution Dialog */}
      {selectedDispute && (
        <Modal
          isOpen={!!selectedDispute}
          onClose={() => setSelectedDispute(null)}
          title={`Dispute Claim: Order #${selectedDispute.orderNumber}`}
          subtitle={`Filed by ${selectedDispute.raisedBy?.name} (${selectedDispute.raisedByRole})`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-ink-50 rounded-lg border border-ink-100 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-ink-400 block">Reported Reason</span>
              <p className="font-medium text-ink-900 leading-relaxed">{selectedDispute.reason}</p>
              {selectedDispute.details && (
                <p className="text-ink-600 text-[11px] pt-1">{selectedDispute.details}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-800 mb-1">Target Resolution State</label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="under_review">Under Investigation</option>
                <option value="resolved">Resolved & Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-800 mb-1">
                Resolution Notes (Persisted to Order Audit)
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Merchant issued partial credit for spill. Courier coached on cargo fastening."
                className="w-full px-3 py-2 text-xs bg-white border border-ink-200 rounded-lg text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-ink-100">
              <Button variant="outline" onClick={() => setSelectedDispute(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleResolve}
                isLoading={isSubmitting}
              >
                Save Resolution
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../api/apiClient';
import { Card } from '../../components/common/Card';
import { FileText, Shield, User, Clock, CheckCircle2 } from 'lucide-react';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/audit-logs')
      .then((res) => setLogs(res.logs || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
          Security & Compliance
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-950 tracking-tight">
          System Audit Trail
        </h1>
        <p className="text-xs text-ink-500 mt-0.5">
          Immutable event log tracking administrative interventions, approvals, suspensions, and dispute settlements
        </p>
      </div>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-ink-50/70 border-b border-ink-100 text-ink-500 font-medium">
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-6">Actor</th>
                <th className="py-3 px-6">Action</th>
                <th className="py-3 px-6">Target Entity</th>
                <th className="py-3 px-6">Metadata / Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-ink-400">Loading audit trail...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-ink-400">No audit events recorded.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-[11px] text-ink-500">
                      {new Date(log.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-ink-900">{log.actorName}</div>
                      <span className="text-[10px] text-ink-400 uppercase font-bold">{log.actorRole}</span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded text-[11px] border border-brand-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-ink-700">
                      {log.targetType}:{log.targetId?.substring(0, 10)}...
                    </td>
                    <td className="py-3.5 px-6 font-mono text-[11px] text-ink-600 max-w-sm truncate">
                      {JSON.stringify(log.metadata || {})}
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

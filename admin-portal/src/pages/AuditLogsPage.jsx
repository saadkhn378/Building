import React, { useState, useEffect } from 'react';
import { History, Shield, RefreshCw } from 'lucide-react';
import client from '../api/client';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await client.get('/dashboard/audit-logs');
      setLogs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-1">Immutable, append-only record of all critical administrative and financial operations</p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Change Details (Diff)</th>
                <th className="py-3 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-500 font-sans text-xs">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-brand-400 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-300">
                      {log.actor_name || 'System / Member'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {log.entity}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-md truncate">
                      {log.new_value ? JSON.stringify(log.new_value) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import client from '../api/client';
import { formatINR } from '../utils/formatters';

export const ReceiptsPage = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await client.get('/receipts');
      setReceipts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleDownload = (receiptId, receiptNumber) => {
    window.open(`/api/v1/receipts/${receiptId}/download`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Official Payment Receipts</h1>
          <p className="text-xs text-slate-400 mt-1">Archive of all verified UPI and cash settlement receipts with PDF download</p>
        </div>
        <button
          onClick={fetchReceipts}
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
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-4">Flat No</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Billing Cycle</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">UTR / Ref</th>
                <th className="py-3 px-4 text-right">PDF Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-500 text-xs">
                    No payment receipts issued yet. Receipts are generated automatically once a payment is verified.
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-300">{r.receipt_number}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{r.flat_number}</td>
                    <td className="py-3.5 px-4 text-slate-200">{r.member_name}</td>
                    <td className="py-3.5 px-4 text-slate-400">{r.billing_period_month}/{r.billing_period_year}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{formatINR(r.amount_paise)}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                        {r.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{r.utr || 'Cash OTP Verified'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDownload(r.id, r.receipt_number)}
                        className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/20 rounded-lg font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
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

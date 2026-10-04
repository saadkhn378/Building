import React, { useState, useEffect } from 'react';
import { Receipt, PlusCircle, RefreshCw, XCircle, AlertCircle, CheckCircle, Eye, Calendar } from 'lucide-react';
import client from '../api/client';
import { formatINR, paiseToRupees } from '../utils/formatters';

export const BillsPage = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showGenModal, setShowGenModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [genSubmitting, setGenSubmitting] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const [genForm, setGenForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    due_date: new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString().split('T')[0],
    base_rupees: 2500,
    sinking_fund_rupees: 0,
  });

  const fetchBills = async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `/billing/bills?status=${statusFilter}` : '/billing/bills';
      const res = await client.get(url);
      setBills(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [statusFilter]);

  const handleGenerateBatch = async (e) => {
    e.preventDefault();
    setError('');
    setGenSubmitting(true);

    try {
      const basePaise = Math.round(Number(genForm.base_rupees) * 100);
      const additionalItems = [];
      if (Number(genForm.sinking_fund_rupees) > 0) {
        additionalItems.push({
          title: 'Sinking Fund',
          amount_paise: Math.round(Number(genForm.sinking_fund_rupees) * 100),
        });
      }

      const res = await client.post('/billing/generate-monthly', {
        month: Number(genForm.month),
        year: Number(genForm.year),
        due_date: genForm.due_date,
        base_amount_paise: basePaise,
        additional_items: additionalItems,
      });

      alert(res.message || 'Batch bills generated successfully!');
      setShowGenModal(false);
      fetchBills();
    } catch (err) {
      setError(err.message || 'Failed to generate monthly bills.');
    } finally {
      setGenSubmitting(false);
    }
  };

  const handleCancelBill = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;

    try {
      await client.post(`/billing/bills/${selectedBill.id}/cancel`, {
        cancellation_reason: cancelReason,
      });
      setShowCancelModal(false);
      setSelectedBill(null);
      setCancelReason('');
      fetchBills();
    } catch (err) {
      alert(err.message || 'Failed to cancel bill.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20">PAID</span>;
      case 'VERIFICATION_PENDING':
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20">PROOF SUBMITTED</span>;
      case 'PARTIALLY_PAID':
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">PARTIAL</span>;
      case 'OVERDUE':
        return <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-semibold border border-red-500/20">OVERDUE</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-semibold">CANCELLED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">PENDING</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Maintenance Invoices & Billing Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">One-click monthly batch bill generation, dues monitoring, and invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setError('');
              setShowGenModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Monthly Cycle</span>
          </button>
          <button
            onClick={fetchBills}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['', 'PENDING', 'VERIFICATION_PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
              statusFilter === st
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            {st ? st.replace('_', ' ') : 'ALL BILLS'}
          </button>
        ))}
      </div>

      {/* Bills Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Bill No</th>
                <th className="py-3 px-4">Flat No</th>
                <th className="py-3 px-4">Owner Name</th>
                <th className="py-3 px-4">Cycle</th>
                <th className="py-3 px-4">Amount Due</th>
                <th className="py-3 px-4">Paid So Far</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bills.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-500 text-xs">
                    No maintenance bills found matching filter criteria. Click "Generate Monthly Cycle" to create bills.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">{bill.bill_number}</td>
                    <td className="py-3.5 px-4 font-bold text-brand-300">{bill.flat_number}</td>
                    <td className="py-3.5 px-4 text-slate-300">{bill.owner_name}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {bill.billing_period_month}/{bill.billing_period_year}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {formatINR(bill.total_amount_paise)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {formatINR(bill.paid_amount_paise)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(bill.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(bill.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      {bill.status !== 'PAID' && bill.status !== 'CANCELLED' && (
                        <button
                          onClick={() => {
                            setSelectedBill(bill);
                            setShowCancelModal(true);
                          }}
                          title="Cancel bill"
                          className="px-2 py-1 text-slate-400 hover:text-red-400 text-[11px] font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Batch Generate Bills */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Generate Monthly Maintenance Bills</h3>
            <p className="text-xs text-slate-400 mb-5">
              Generates bills for all registered flats in one click. Automatically applies any existing member credits.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleGenerateBatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Month</label>
                  <select
                    value={genForm.month}
                    onChange={(e) => setGenForm({ ...genForm, month: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    {[...Array(12).keys()].map((m) => (
                      <option key={m + 1} value={m + 1}>
                        {new Date(2026, m, 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Year</label>
                  <input
                    type="number"
                    value={genForm.year}
                    onChange={(e) => setGenForm({ ...genForm, year: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={genForm.due_date}
                  onChange={(e) => setGenForm({ ...genForm, due_date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Base Maintenance (₹)</label>
                <input
                  type="number"
                  required
                  value={genForm.base_rupees}
                  onChange={(e) => setGenForm({ ...genForm, base_rupees: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Optional Sinking / Add-on Fund (₹)</label>
                <input
                  type="number"
                  value={genForm.sinking_fund_rupees}
                  onChange={(e) => setGenForm({ ...genForm, sinking_fund_rupees: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={genSubmitting}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {genSubmitting ? 'Generating...' : 'Confirm & Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cancel Bill */}
      {showCancelModal && selectedBill && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Cancel Maintenance Bill</h3>
            <p className="text-xs text-slate-400 mb-4">
              Cancelling Bill #{selectedBill.bill_number} for Flat {selectedBill.flat_number}. A mandatory reason is required for the audit log.
            </p>

            <form onSubmit={handleCancelBill} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cancellation Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="e.g. Duplicate bill generated by mistake / Re-issued with corrections"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
                >
                  Cancel Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Shield, RefreshCw, AlertCircle, ExternalLink, Image } from 'lucide-react';
import client from '../api/client';
import { formatINR } from '../utils/formatters';

export const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [policy, setPolicy] = useState('SUMMARY');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    description: '',
    amount_rupees: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    invoice_number: '',
    payment_method: 'BANK_TRANSFER',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expRes, catRes, polRes] = await Promise.all([
        client.get('/expenses'),
        client.get('/expenses/categories'),
        client.get('/expenses/policy'),
      ]);
      setExpenses(expRes.data?.expenses || []);
      setCategories(catRes.data || []);
      setPolicy(polRes.data?.visibilityLevel || 'SUMMARY');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdatePolicy = async (newPolicy) => {
    try {
      await client.patch('/expenses/policy', { visibility_level: newPolicy });
      setPolicy(newPolicy);
      alert(`Member financial transparency policy updated to '${newPolicy}'.`);
    } catch (err) {
      alert(err.message || 'Failed to update policy.');
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const amountPaise = Math.round(Number(formData.amount_rupees) * 100);
      await client.post('/expenses', {
        ...formData,
        amount_paise: amountPaise,
      });

      setShowModal(false);
      setFormData({
        category_id: '',
        title: '',
        description: '',
        amount_rupees: '',
        expense_date: new Date().toISOString().split('T')[0],
        vendor_name: '',
        invoice_number: '',
        payment_method: 'BANK_TRANSFER',
      });
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Society Expenses & Financial Transparency</h1>
          <p className="text-xs text-slate-400 mt-1">Record building maintenance expenditures and control member visibility policies</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Financial Transparency Policy Card */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Member Financial Transparency Policy</h3>
            <p className="text-xs text-slate-400 mt-0.5">Controls what flat owners can view inside their mobile app</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {[
            { id: 'PRIVATE', label: 'Private (Chairman only)' },
            { id: 'SUMMARY', label: 'Summary (Monthly totals)' },
            { id: 'DETAILED', label: 'Detailed (Itemized)' },
          ].map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => handleUpdatePolicy(lvl.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                policy === lvl.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <h2 className="text-base font-bold text-white mb-4">Expenses Log</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description / Title</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-500 text-xs">
                    No expenses recorded yet. Click "Record Expense" to add maintenance expenses.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(exp.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-brand-400">{exp.category_name}</td>
                    <td className="py-3.5 px-4 text-slate-200 font-medium">{exp.title}</td>
                    <td className="py-3.5 px-4 text-slate-300">{exp.vendor_name || '—'}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{exp.invoice_number || '—'}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{formatINR(exp.amount_paise)}</td>
                    <td className="py-3.5 px-4 text-slate-400">{exp.payment_method}</td>
                    <td className="py-3.5 px-4 text-right">
                      {exp.signedAttachmentUrl ? (
                        <a
                          href={exp.signedAttachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-400 hover:text-brand-300 text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <Image className="w-3 h-3" />
                          <span>View</span>
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Record Expense */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Record Society Expense</h3>
            <p className="text-xs text-slate-400 mb-5">Add building maintenance or service expenditure</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Title / Item *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October Common Area Electricity Bill"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 14500"
                    value={formData.amount_rupees}
                    onChange={(e) => setFormData({ ...formData, amount_rupees: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="BANK_TRANSFER">NEFT / Bank Transfer</option>
                    <option value="UPI">Society UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Petty Cash</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vendor / Payee</label>
                  <input
                    type="text"
                    placeholder="e.g. MSEDCL / Otis Elevators"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice / Bill Number</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-948"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

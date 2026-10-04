import React, { useState, useEffect } from 'react';
import { Banknote, Key, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import client from '../api/client';
import { formatINR } from '../utils/formatters';

export const CashPaymentPage = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBillId, setSelectedBillId] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [remarks, setRemarks] = useState('');
  const [activeResult, setActiveResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchPendingBills = async () => {
    try {
      setLoading(true);
      const res = await client.get('/billing/bills?status=PENDING');
      setBills(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingBills();
  }, []);

  const handleBillSelect = (billId) => {
    setSelectedBillId(billId);
    const bill = bills.find((b) => b.id === billId);
    if (bill) {
      const remainingPaise = BigInt(bill.total_amount_paise) - BigInt(bill.paid_amount_paise);
      setAmountRupees((Number(remainingPaise) / 100).toString());
    }
  };

  const handleInitiateCash = async (e) => {
    e.preventDefault();
    if (!selectedBillId || !amountRupees) return;
    setError('');
    setSubmitting(true);

    try {
      const amountPaise = Math.round(Number(amountRupees) * 100);
      const res = await client.post('/cash-payments/initiate', {
        bill_id: selectedBillId,
        amount_paise: amountPaise,
        remarks: remarks || null,
      });

      setActiveResult(res.data);
      setSelectedBillId('');
      setAmountRupees('');
      setRemarks('');
      fetchPendingBills();
    } catch (err) {
      setError(err.message || 'Failed to record cash payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Record In-Person Cash Payment</h1>
        <p className="text-xs text-slate-400 mt-1">
          Two-way verified cash settlement. The system generates a single-use verbal OTP which the member enters in their mobile app to confirm payment.
        </p>
      </div>

      {/* Live Generated OTP Showcase (When initiated) */}
      {activeResult && (
        <div className="p-6 bg-gradient-to-r from-brand-950 via-slate-900 to-slate-900 rounded-2xl border-2 border-brand-500 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/40">
            <Key className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">Cash Payment Recorded — Tell Member This OTP</h2>
            <p className="text-xs text-slate-300 mt-1">
              Collected <strong className="text-brand-400">{formatINR(activeResult.amountPaise)}</strong> from{' '}
              <strong className="text-white">{activeResult.ownerName}</strong> (Flat {activeResult.flatNumber})
            </p>
          </div>

          <div className="p-5 bg-slate-950/90 rounded-2xl border border-brand-500/40 inline-block px-10">
            <p className="text-4xl font-mono font-extrabold text-brand-400 tracking-widest">
              {activeResult.cashOtp}
            </p>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Valid for 24 hours • 5 attempts allowed</span>
            </p>
          </div>

          <div className="max-w-md mx-auto p-3 bg-slate-800/60 rounded-xl text-left text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-white">What happens next?</p>
            <p>1. Tell the 6-digit code verbally to the member.</p>
            <p>2. Member opens their mobile app and taps "Confirm Cash Payment".</p>
            <p>3. As soon as they enter this OTP, the bill is marked <strong>PAID</strong> and a receipt is issued.</p>
          </div>

          <button
            onClick={() => setActiveResult(null)}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
          >
            Record Another Cash Payment
          </button>
        </div>
      )}

      {/* Initiation Form */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-brand-400" />
          <span>New Cash Collection Entry</span>
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleInitiateCash} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Flat / Pending Bill <span className="text-brand-400">*</span>
            </label>
            <select
              required
              value={selectedBillId}
              onChange={(e) => handleBillSelect(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">Choose pending bill...</option>
              {bills.map((b) => (
                <option key={b.id} value={b.id}>
                  Flat {b.flat_number} — {b.owner_name} (Cycle {b.billing_period_month}/{b.billing_period_year} — Due: {formatINR(BigInt(b.total_amount_paise) - BigInt(b.paid_amount_paise))})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Cash Amount Handed Over (₹) <span className="text-brand-400">*</span>
            </label>
            <input
              type="number"
              required
              placeholder="e.g. 2500"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Cash Note / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Handed over at Society Office in person"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !selectedBillId}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/20 transition-all disabled:opacity-50"
            >
              {submitting ? 'Generating Verbal OTP...' : 'Record Cash & Generate Verbal OTP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

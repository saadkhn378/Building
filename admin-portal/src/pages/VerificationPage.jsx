import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  Eye, 
  RefreshCw, 
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import client from '../api/client';
import { formatINR } from '../utils/formatters';

export const VerificationPage = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Amount mismatch');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await client.get('/verification/queue');
      const items = res.data || [];
      setQueue(items);
      if (items.length > 0) {
        setSelectedItem(items[0]);
      } else {
        setSelectedItem(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await client.post(`/verification/${selectedItem.id}/approve`);
      alert(`Payment of ${formatINR(selectedItem.amount_paise)} approved and receipt generated!`);
      fetchQueue();
    } catch (err) {
      alert(err.message || 'Failed to approve payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!selectedItem || !rejectReason) return;
    setActionLoading(true);
    try {
      await client.post(`/verification/${selectedItem.id}/reject`, {
        rejection_reason: rejectReason,
      });
      alert('Payment proof rejected and member notified.');
      setShowRejectModal(false);
      fetchQueue();
    } catch (err) {
      alert(err.message || 'Failed to reject payment.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">UPI Payment Verification Queue</h1>
          <p className="text-xs text-slate-400 mt-1">Review member payment screenshots, verify bank UTRs, and approve receipts</p>
        </div>
        <button
          onClick={fetchQueue}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue ({queue.length})</span>
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-slate-800 p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">All Clear! No Pending Verifications</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            There are no UPI payment proofs waiting in the queue. New submissions from the member mobile app will appear here instantly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Pending List */}
          <div className="lg:col-span-5 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Awaiting Verification ({queue.length})
            </p>
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {queue.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-brand-500/60 shadow-lg shadow-brand-500/10'
                        : 'glass-panel hover:bg-slate-800/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-white">Flat {item.flat_number}</span>
                      <span className="text-xs font-mono font-bold text-brand-400">
                        {formatINR(item.amount_paise)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{item.member_name}</span>
                      <span className="font-mono text-[11px] text-slate-300">UTR: {item.utr}</span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Bill #{item.bill_number}
                      </span>
                      {item.isAmountMatch ? (
                        <span className="text-brand-400 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" /> Exact Match
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Mismatch
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Item Verification Inspector */}
          {selectedItem && (
            <div className="lg:col-span-7 space-y-4">
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
                {/* Header Strip */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Flat {selectedItem.flat_number} — Proof Inspection
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submitted by <span className="text-slate-200 font-semibold">{selectedItem.member_name}</span> ({selectedItem.member_mobile})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">Submission Date</p>
                    <p className="text-xs font-medium text-slate-200">
                      {new Date(selectedItem.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Amount Reconciliation Card */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/90 rounded-xl border border-slate-800 text-center">
                  <div>
                    <p className="text-[11px] text-slate-400">Amount Due</p>
                    <p className="text-base font-bold text-white mt-1">
                      {formatINR(selectedItem.balance_due_paise)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Paid Amount (UTR)</p>
                    <p className="text-base font-bold text-brand-400 mt-1">
                      {formatINR(selectedItem.amount_paise)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Match Status</p>
                    {selectedItem.isAmountMatch ? (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs font-bold border border-brand-500/20">
                        EXACT MATCH
                      </span>
                    ) : (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                        DIFFERENCE
                      </span>
                    )}
                  </div>
                </div>

                {/* UTR Verification Strip */}
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-400">Bank UTR / Transaction No: </span>
                    <span className="font-mono font-bold text-white ml-2 text-sm">{selectedItem.utr}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                    Checked Unique
                  </span>
                </div>

                {/* Screenshot Viewer */}
                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                    <span>Uploaded UPI Payment Screenshot</span>
                    {selectedItem.signedScreenshotUrl && (
                      <a
                        href={selectedItem.signedScreenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
                      >
                        Open Full View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </p>
                  <div className="w-full h-80 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center p-2 relative group">
                    {selectedItem.signedScreenshotUrl ? (
                      <img
                        src={selectedItem.signedScreenshotUrl}
                        alt="Payment Screenshot"
                        className="max-h-full max-w-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center text-slate-500 text-xs">
                        No screenshot image preview available
                      </div>
                    )}
                  </div>
                </div>

                {/* Member Remarks */}
                {selectedItem.remarks && (
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-medium">Member Remarks:</p>
                    <p className="text-xs text-slate-200 mt-1">{selectedItem.remarks}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Proof</span>
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{actionLoading ? 'Approving...' : 'Approve & Issue Receipt'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Rejection Reason */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Reject Payment Submission</h3>
            <p className="text-xs text-slate-400 mb-4">
              Select a reason for rejection. The member will receive an instant notification to re-submit proof.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Rejection Reason</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                >
                  <option value="Amount mismatch (paid less than due)">Amount mismatch (paid less than due)</option>
                  <option value="Transaction not found in society bank account">Transaction not found in society bank account</option>
                  <option value="Invalid or unreadable screenshot">Invalid or unreadable screenshot</option>
                  <option value="Wrong UTR / Transaction number">Wrong UTR / Transaction number</option>
                  <option value="Duplicate payment submission">Duplicate payment submission</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

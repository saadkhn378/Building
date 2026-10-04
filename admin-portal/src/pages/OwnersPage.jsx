import React, { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw, Key, Copy, Check, UserX, AlertCircle, ShieldAlert } from 'lucide-react';
import client from '../api/client';

export const OwnersPage = () => {
  const [owners, setOwners] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newOwnerResult, setNewOwnerResult] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    email: '',
    flat_id: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ownersRes, structRes] = await Promise.all([
        client.get('/owners'),
        client.get('/society/structure'),
      ]);
      setOwners(ownersRes.data || []);
      setFlats(structRes.data?.flats || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegisterOwner = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await client.post('/owners', formData);
      setNewOwnerResult(res.data);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to register owner.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerateCode = async (ownerId) => {
    try {
      const res = await client.post(`/owners/${ownerId}/regenerate-invite`);
      alert(`New 6-digit Invite Code generated: ${res.data.invite_code} (Valid for 7 days). Share this code with the owner.`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to regenerate invite code.');
    }
  };

  const handleDeactivateOwner = async (ownerId, name) => {
    if (window.confirm(`Are you sure you want to deactivate owner '${name}'? This is typically done when a flat is sold or transferred.`)) {
      try {
        await client.patch(`/owners/${ownerId}/deactivate`);
        fetchData();
      } catch (err) {
        alert(err.message || 'Failed to deactivate owner.');
      }
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Flat Owners & Member Registry</h1>
          <p className="text-xs text-slate-400 mt-1">Manage owner accounts, generate 6-digit invite codes, and handle transfers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setNewOwnerResult(null);
              setError('');
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register Owner</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Owners Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Flat No</th>
                <th className="py-3 px-4">Owner Name</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">App Invite Code</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {owners.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-500 text-xs">
                    No owners registered yet. Click "Register Owner" to onboard a member.
                  </td>
                </tr>
              ) : (
                owners.map((owner) => (
                  <tr key={owner.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{owner.flat_number || 'Unassigned'}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">{owner.full_name}</td>
                    <td className="py-3.5 px-4 text-slate-300">{owner.mobile}</td>
                    <td className="py-3.5 px-4">
                      {owner.has_pin ? (
                        <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 font-semibold border border-brand-500/20">
                          Active (PIN Set)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                          Awaiting App Setup
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {owner.invite_code ? (
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-0.5 bg-slate-800 text-brand-300 font-mono font-bold rounded border border-slate-700">
                            {owner.invite_code}
                          </code>
                          <button
                            onClick={() => handleCopyCode(owner.invite_code)}
                            title="Copy code"
                            className="p-1 hover:text-white text-slate-400"
                          >
                            {copiedCode === owner.invite_code ? <Check className="w-3.5 h-3.5 text-brand-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleRegenerateCode(owner.id)}
                        title="Regenerate single-use invite code"
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-medium transition-colors"
                      >
                        Reset Invite
                      </button>
                      <button
                        onClick={() => handleDeactivateOwner(owner.id, owner.full_name)}
                        title="Deactivate account for flat sale/transfer"
                        className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[11px] font-medium transition-colors"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register Owner */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 shadow-2xl">
            {newOwnerResult ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center border border-brand-500/20">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Owner Onboarded!</h3>
                <p className="text-xs text-slate-300">
                  Share this single-use 6-digit invite code with <strong className="text-white">{newOwnerResult.full_name}</strong> to install the mobile app:
                </p>

                <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl inline-block">
                  <p className="text-2xl font-mono font-extrabold text-brand-400 tracking-wider">
                    {newOwnerResult.invite_code}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Single-use • Expires in 7 days</p>
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-2">Register Flat Owner</h3>
                <p className="text-xs text-slate-400 mb-5">Attach an owner to a flat and generate their first invite code</p>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterOwner} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Assigned Flat <span className="text-brand-400">*</span>
                    </label>
                    <select
                      required
                      value={formData.flat_id}
                      onChange={(e) => setFormData({ ...formData, flat_id: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="">Select Flat...</option>
                      {flats.map((f) => (
                        <option key={f.id} value={f.id}>
                          Flat {f.flat_number} {f.owner_name ? `(Current: ${f.owner_name})` : '(Available)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Owner Full Name <span className="text-brand-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kulkarni"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                    </input>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mobile Number (10 digits) <span className="text-brand-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9820192831"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. owner@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                    />
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
                      {submitting ? 'Generating...' : 'Issue Invite Code'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

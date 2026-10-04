import React, { useState, useEffect } from 'react';
import { Building2, Plus, Home, Layers, Check, AlertCircle, RefreshCw } from 'lucide-react';
import client from '../api/client';

export const StructurePage = () => {
  const [data, setData] = useState({ buildings: [], wings: [], flats: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    flat_number: '',
    carpet_area_sqft: '',
    wing_id: '',
    occupancy_status: 'OCCUPIED',
    tenant_note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchStructure = async () => {
    try {
      setLoading(true);
      const res = await client.get('/society/structure');
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructure();
  }, []);

  const handleCreateFlat = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await client.post('/society/flats', formData);
      setShowModal(false);
      setFormData({ flat_number: '', carpet_area_sqft: '', wing_id: '', occupancy_status: 'OCCUPIED', tenant_note: '' });
      fetchStructure();
    } catch (err) {
      setError(err.message || 'Failed to create flat.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Society Structure & Flat Registry</h1>
          <p className="text-xs text-slate-400 mt-1">Manage buildings, wings, and flat inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Flat</span>
          </button>
          <button
            onClick={fetchStructure}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Buildings & Wings Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Buildings</p>
            <p className="text-lg font-bold text-white">{data.buildings?.length || 1}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Wings / Blocks</p>
            <p className="text-lg font-bold text-white">{data.wings?.length || 1}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Registered Flats</p>
            <p className="text-lg font-bold text-white">{data.flats?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Flat Cards Grid */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <h2 className="text-base font-bold text-white mb-4">Flats Inventory</h2>

        {data.flats?.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No flats registered yet. Click "Add Flat" to register your first building flat.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.flats.map((flat) => (
              <div
                key={flat.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-brand-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-white">{flat.flat_number}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        flat.occupancy_status === 'OCCUPIED'
                          ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {flat.occupancy_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Area: <span className="text-slate-200">{flat.carpet_area_sqft || 950} sq.ft</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Owner: <span className="text-slate-200 font-medium">{flat.owner_name || 'Not assigned'}</span>
                  </p>
                </div>

                {flat.tenant_note && (
                  <p className="text-[11px] text-slate-500 italic mt-3 pt-2 border-t border-slate-800">
                    Note: {flat.tenant_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Add Flat */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Add New Flat</h3>
            <p className="text-xs text-slate-400 mb-5">Register a flat in your society hierarchy</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateFlat} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Flat Number <span className="text-brand-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A-301 or B-104"
                  value={formData.flat_number}
                  onChange={(e) => setFormData({ ...formData, flat_number: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Carpet Area (sq. ft)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 950"
                  value={formData.carpet_area_sqft}
                  onChange={(e) => setFormData({ ...formData, carpet_area_sqft: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Occupancy Status
                </label>
                <select
                  value={formData.occupancy_status}
                  onChange={(e) => setFormData({ ...formData, occupancy_status: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="OCCUPIED">Occupied (Owner)</option>
                  <option value="VACANT">Vacant</option>
                  <option value="TENANT">Tenant Occupied</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tenant / Flat Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tenant Mr. Verma (Lease valid till Dec 2026)"
                  value={formData.tenant_note}
                  onChange={(e) => setFormData({ ...formData, tenant_note: e.target.value })}
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
                  {submitting ? 'Creating...' : 'Create Flat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

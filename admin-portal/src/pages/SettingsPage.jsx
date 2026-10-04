import React, { useState, useEffect } from 'react';
import { Settings, QrCode, Shield, Save, RefreshCw, AlertCircle } from 'lucide-react';
import client from '../api/client';

export const SettingsPage = () => {
  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    upi_id: '',
    upi_qr_image_url: '',
    late_fee_type: 'PERCENTAGE',
    late_fee_value: 500,
    grace_period_days: 10,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await client.get('/society/me');
      if (res.data) {
        setSociety(res.data);
        setFormData({
          name: res.data.name || '',
          address: res.data.address || '',
          upi_id: res.data.upi_id || '',
          upi_qr_image_url: res.data.upi_qr_image_url || '',
          late_fee_type: res.data.late_fee_type || 'PERCENTAGE',
          late_fee_value: res.data.late_fee_value || 500,
          grace_period_days: res.data.grace_period_days || 10,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await client.patch('/society/settings', formData);
      setSociety(res.data);
      setMessage('Society profile and payment settings updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Society Settings & UPI Configuration</h1>
        <p className="text-xs text-slate-400 mt-1">Configure society details, official UPI QR code for member payments, and late fee rules</p>
      </div>

      {message && (
        <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-xl text-brand-400 text-xs">
          ✅ {message}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Society Info */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Society Identification</h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Society Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Address *</label>
            <textarea
              rows="2"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            ></textarea>
          </div>
        </div>

        {/* Card 2: UPI & QR Code Settings */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand-400" />
            <span>Official Society UPI Payment Setup</span>
          </h2>
          <p className="text-xs text-slate-400">
            These details are displayed directly on the member mobile app when flat owners tap "Pay Maintenance via UPI".
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Official Society UPI ID (VPA) *</label>
            <input
              type="text"
              required
              placeholder="e.g. greenviewheights@sbi or society@okhdfcbank"
              value={formData.upi_id}
              onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Society Official QR Code Image URL</label>
            <input
              type="text"
              placeholder="e.g. https://... or paste link to society bank QR code image"
              value={formData.upi_qr_image_url}
              onChange={(e) => setFormData({ ...formData, upi_qr_image_url: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Card 3: Late Fee Policy */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Late Fee & Overdue Escalation Rules</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Calculation Type</label>
              <select
                value={formData.late_fee_type}
                onChange={(e) => setFormData({ ...formData, late_fee_type: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat Fee (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {formData.late_fee_type === 'PERCENTAGE' ? 'Rate (500 = 5%)' : 'Flat Amount (in paise)'}
              </label>
              <input
                type="number"
                value={formData.late_fee_value}
                onChange={(e) => setFormData({ ...formData, late_fee_value: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Grace Period (Days)</label>
              <input
                type="number"
                value={formData.grace_period_days}
                onChange={(e) => setFormData({ ...formData, grace_period_days: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

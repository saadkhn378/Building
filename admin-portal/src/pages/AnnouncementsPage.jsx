import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Bell, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import client from '../api/client';

export const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'NORMAL',
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await client.get('/announcements');
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await client.post('/announcements', formData);
      setShowModal(false);
      setFormData({ title: '', content: '', priority: 'NORMAL' });
      alert('Announcement published and push notifications dispatched to all flat owners!');
      fetchAnnouncements();
    } catch (err) {
      setError(err.message || 'Failed to publish announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'EMERGENCY':
        return <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-bold border border-red-500/20">🚨 EMERGENCY</span>;
      case 'IMPORTANT':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">⚠️ IMPORTANT</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">NOTICE</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Society Announcements & Broadcasts</h1>
          <p className="text-xs text-slate-400 mt-1">Publish notices and emergency broadcasts with automatic mobile push delivery</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Announcement</span>
          </button>
          <button
            onClick={fetchAnnouncements}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {announcements.length === 0 ? (
          <div className="col-span-2 glass-panel p-12 text-center text-slate-500 text-xs rounded-2xl border border-slate-800">
            No active announcements. Click "New Announcement" to broadcast to members.
          </div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className={`p-5 rounded-2xl border transition-all ${
                a.priority === 'EMERGENCY'
                  ? 'bg-red-950/20 border-red-500/40'
                  : 'glass-panel border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                {getPriorityBadge(a.priority)}
                <span className="text-[11px] text-slate-400">
                  {new Date(a.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-2">{a.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{a.content}</p>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>By: {a.author_name}</span>
                <span className="text-brand-400 font-medium flex items-center gap-1">
                  <Bell className="w-3 h-3" /> Push Dispatched
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: New Notice */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Publish Announcement</h3>
            <p className="text-xs text-slate-400 mb-5">Broadcasts instantly to all member mobile apps</p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Priority Level</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="NORMAL">Normal Notice</option>
                  <option value="IMPORTANT">Important (General alert)</option>
                  <option value="EMERGENCY">🚨 Emergency (Immediate alert)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Water Tank Cleaning this Sunday"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Message Body *</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Detailed notice information for members..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
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
                  {submitting ? 'Broadcasting...' : 'Publish & Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

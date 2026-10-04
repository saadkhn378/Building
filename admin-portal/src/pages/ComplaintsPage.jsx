import React, { useState, useEffect } from 'react';
import { 
  MessageSquareWarning, 
  CheckCircle2, 
  RotateCcw, 
  Send, 
  Paperclip, 
  ExternalLink,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import client from '../api/client';

export const ComplaintsPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `/complaints?status=${statusFilter}` : '/complaints';
      const res = await client.get(url);
      const items = res.data || [];
      setComplaints(items);
      if (items.length > 0) {
        loadThread(items[0].id);
      } else {
        setSelectedComplaint(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (id) => {
    try {
      const res = await client.get(`/complaints/${id}`);
      setSelectedComplaint(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedComplaint) return;
    setSubmittingReply(true);
    try {
      await client.post(`/complaints/${selectedComplaint.id}/messages`, {
        message: replyText,
      });
      setReplyText('');
      loadThread(selectedComplaint.id);
    } catch (err) {
      alert(err.message || 'Failed to post reply.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedComplaint) return;
    try {
      await client.patch(`/complaints/${selectedComplaint.id}/status`, { status });
      fetchComplaints();
    } catch (err) {
      alert(err.message || 'Failed to update complaint status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Member Complaints Board</h1>
          <p className="text-xs text-slate-400 mt-1">Review photo reports from members, reply in conversation threads, and resolve issues</p>
        </div>
        <button
          onClick={fetchComplaints}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        {['', 'OPEN', 'REOPENED', 'RESOLVED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === st
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {st ? st : 'ALL COMPLAINTS'}
          </button>
        ))}
      </div>

      {/* Split Thread Layout */}
      {complaints.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-slate-800 p-12 text-center text-slate-500 text-xs">
          No complaints registered matching this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Complaints List (Left) */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {complaints.map((c) => {
              const isSelected = selectedComplaint?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => loadThread(c.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-brand-500/60 shadow-lg shadow-brand-500/10'
                      : 'glass-panel hover:bg-slate-800/40 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white">Flat {c.flat_number}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        c.status === 'OPEN'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : c.status === 'REOPENED'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-200 line-clamp-1">{c.title}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
                    <span>{c.tag_name || 'General Issue'}</span>
                    <span>{c.message_count} messages</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Thread Chat View (Right) */}
          {selectedComplaint && (
            <div className="lg:col-span-7 flex flex-col h-[720px] glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              {/* Header */}
              <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedComplaint.title}</span>
                    <span className="text-xs font-normal text-slate-400">
                      (Flat {selectedComplaint.flat_number} • {selectedComplaint.member_name})
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tag: {selectedComplaint.tag_name || 'General'}</p>
                </div>

                <div>
                  {selectedComplaint.status !== 'RESOLVED' ? (
                    <button
                      onClick={() => handleUpdateStatus('RESOLVED')}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-brand-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Issue Resolved
                    </span>
                  )}
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedComplaint.messages?.map((msg) => {
                  const isChairman = msg.sender_role === 'CHAIRMAN';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isChairman ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">{msg.sender_name}</span>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl max-w-md text-xs leading-relaxed ${
                          isChairman
                            ? 'bg-brand-600 text-white rounded-tr-none'
                            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                        }`}
                      >
                        <p>{msg.message}</p>

                        {/* Photo Attachment */}
                        {msg.signedAttachmentUrl && (
                          <div className="mt-2.5 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                            <img
                              src={msg.signedAttachmentUrl}
                              alt="Attachment"
                              className="max-h-60 w-full object-cover"
                            />
                            <div className="p-1.5 text-right bg-slate-900/60">
                              <a
                                href={msg.signedAttachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-brand-300 hover:underline inline-flex items-center gap-1"
                              >
                                View full image <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input Box */}
              <form onSubmit={handleSendReply} className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a response to the flat owner..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  disabled={submittingReply || !replyText.trim()}
                  className="p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

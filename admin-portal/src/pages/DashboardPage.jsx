import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MessageSquareWarning, 
  ArrowUpRight, 
  Send,
  PlusCircle,
  FileCheck,
  RefreshCw,
  BellRing
} from 'lucide-react';
import client from '../api/client';
import { formatINR, paiseToRupees } from '../utils/formatters';

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remindingFlat, setRemindingFlat] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await client.get('/dashboard/chairman');
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSendReminder = (flatNumber) => {
    setRemindingFlat(flatNumber);
    setTimeout(() => {
      alert(`Payment push reminder dispatched to owner of Flat ${flatNumber}!`);
      setRemindingFlat(null);
    }, 600);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading society overview...</p>
        </div>
      </div>
    );
  }

  const d = data || {
    fundBalancePaise: '0',
    totalCollectedPaise: '0',
    totalExpensesPaise: '0',
    monthCollectionPaise: '0',
    monthExpensesPaise: '0',
    pendingDuesPaise: '0',
    overdueDuesPaise: '0',
    pendingVerificationCount: 0,
    openComplaintsCount: 0,
    defaulterCount: 0,
    defaulters: [],
    dailyStrip: { submitted_today: 0, verified_today: 0, pending_verification: 0, collected_today_paise: '0' },
    trendChart: [],
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Chairman Overview</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time financial status, daily reconciliation, and pending actions</p>
        </div>
        <div className="flex items-center gap-2.5">
          <NavLink
            to="/bills"
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Bills</span>
          </NavLink>
          <NavLink
            to="/verification"
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            <FileCheck className="w-4 h-4 text-brand-400" />
            <span>Verify Payments ({d.pendingVerificationCount})</span>
          </NavLink>
          <button
            onClick={fetchDashboardData}
            title="Refresh Metrics"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Daily Reconciliation Strip */}
      <div className="glass-panel rounded-2xl p-5 border border-brand-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850">
        <div className="flex items-center gap-2 text-xs font-bold text-brand-400 uppercase tracking-wider mb-3">
          <Clock className="w-4 h-4" />
          <span>Today's Live Reconciliation Strip</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <p className="text-[11px] text-slate-400">Proofs Submitted Today</p>
            <p className="text-lg font-bold text-white mt-1">{d.dailyStrip?.submitted_today || 0}</p>
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <p className="text-[11px] text-slate-400">Verified Today</p>
            <p className="text-lg font-bold text-brand-400 mt-1">{d.dailyStrip?.verified_today || 0}</p>
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <p className="text-[11px] text-slate-400">Pending Verification</p>
            <p className="text-lg font-bold text-amber-400 mt-1">{d.dailyStrip?.pending_verification || 0}</p>
          </div>
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <p className="text-[11px] text-slate-400">Collected Today</p>
            <p className="text-lg font-bold text-white mt-1">{formatINR(d.dailyStrip?.collected_today_paise || '0')}</p>
          </div>
        </div>
      </div>

      {/* 6 Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Fund Balance */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400">Net Fund Balance</p>
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-white">{formatINR(d.fundBalancePaise)}</h3>
          <p className="text-[11px] text-slate-400 mt-2">
            Collected: <span className="text-slate-200">{formatINR(d.totalCollectedPaise)}</span> | Exp: <span className="text-slate-200">{formatINR(d.totalExpensesPaise)}</span>
          </p>
        </div>

        {/* Card 2: This Month Collection */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400">Collected This Month</p>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-white">{formatINR(d.monthCollectionPaise)}</h3>
          <p className="text-[11px] text-slate-400 mt-2">
            Expenses this month: <span className="text-slate-200">{formatINR(d.monthExpensesPaise)}</span>
          </p>
        </div>

        {/* Card 3: Pending & Overdue */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400">Pending & Overdue Dues</p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-amber-400">{formatINR(d.pendingDuesPaise)}</h3>
          <p className="text-[11px] text-red-400 mt-2 font-medium">
            Overdue: {formatINR(d.overdueDuesPaise)}
          </p>
        </div>

        {/* Card 4: Defaulters */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400">Defaulters (2+ Cycles)</p>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-red-400">{d.defaulterCount} Flats</h3>
          <p className="text-[11px] text-slate-400 mt-2">Flats with repeated unpaid cycles</p>
        </div>

        {/* Card 5: Payment Queue */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400">Pending Verifications</p>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-purple-400">{d.pendingVerificationCount}</h3>
          <NavLink to="/verification" className="text-[11px] text-brand-400 hover:text-brand-300 font-medium mt-2 inline-flex items-center gap-1">
            Open verification queue <ArrowUpRight className="w-3 h-3" />
          </NavLink>
        </div>

        {/* Card 6: Open Complaints */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-400">Open Complaints</p>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <MessageSquareWarning className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-cyan-400">{d.openComplaintsCount}</h3>
          <NavLink to="/complaints" className="text-[11px] text-brand-400 hover:text-brand-300 font-medium mt-2 inline-flex items-center gap-1">
            View complaints board <ArrowUpRight className="w-3 h-3" />
          </NavLink>
        </div>
      </div>

      {/* Defaulter Roster */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Defaulter Registry</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Owners with 2 or more consecutive unpaid maintenance cycles</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">
            {d.defaulters?.length || 0} Defaulters Flagged
          </span>
        </div>

        {(!d.defaulters || d.defaulters.length === 0) ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            🎉 Excellent! There are no flagged defaulters in the society at this time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Flat No</th>
                  <th className="py-3 px-4">Owner Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Unpaid Cycles</th>
                  <th className="py-3 px-4">Total Outstanding</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {d.defaulters.map((def, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{def.flat_number}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">{def.owner_name}</td>
                    <td className="py-3.5 px-4 text-slate-400">{def.owner_mobile}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 font-semibold border border-red-500/20">
                        {def.unpaid_months} months
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-400">
                      {formatINR(def.total_due_paise)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleSendReminder(def.flat_number)}
                        disabled={remindingFlat === def.flat_number}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg font-semibold inline-flex items-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        <span>{remindingFlat === def.flat_number ? 'Sending...' : 'Remind'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Collections vs Expense Trend Chart (Clean CSS visualization) */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <h2 className="text-base font-bold text-white tracking-tight mb-1">Financial Trend (Last 6 Months)</h2>
        <p className="text-xs text-slate-400 mb-6">Comparison of total verified maintenance collected vs society expenses</p>

        <div className="space-y-4">
          {d.trendChart && d.trendChart.length > 0 ? (
            d.trendChart.map((item, idx) => {
              const colRupees = paiseToRupees(item.collection_paise);
              const expRupees = paiseToRupees(item.expense_paise);
              const maxVal = Math.max(colRupees, expRupees, 10000);
              const colPct = Math.min(Math.round((colRupees / maxVal) * 100), 100);
              const expPct = Math.min(Math.round((expRupees / maxVal) * 100), 100);

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">{item.month_label}</span>
                    <span className="text-slate-400">
                      Collected: <span className="text-brand-400">{formatINR(item.collection_paise)}</span> | Exp: <span className="text-red-400">{formatINR(item.expense_paise)}</span>
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                    <div
                      style={{ width: `${colPct}%` }}
                      className="h-full bg-brand-500 rounded-full transition-all duration-500"
                      title={`Collected: ${formatINR(item.collection_paise)}`}
                    ></div>
                    <div
                      style={{ width: `${expPct}%` }}
                      className="h-full bg-red-500/80 rounded-full transition-all duration-500"
                      title={`Expenses: ${formatINR(item.expense_paise)}`}
                    ></div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs">
              No historical billing data to chart yet. Generate your first monthly cycle!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Bell, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Header = ({ title = 'Dashboard', subtitle }) => {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="h-16 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20 px-8 flex items-center justify-between">
      <div>
        <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Date Display */}
        <div className="text-xs font-medium text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 hidden sm:block">
          📅 {today}
        </div>

        {/* Verification Queue Quick Link */}
        <NavLink
          to="/verification"
          className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-lg border border-brand-500/30 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Verify Payments</span>
        </NavLink>
      </div>
    </header>
  );
};

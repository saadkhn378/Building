import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Receipt, 
  CheckCircle2, 
  Banknote, 
  FileText, 
  MessageSquareWarning, 
  Wallet, 
  Megaphone, 
  History, 
  Settings, 
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { user, logout } = useAuth();

  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      ],
    },
    {
      title: 'SOCIETY & OWNERS',
      items: [
        { name: 'Structure & Flats', path: '/structure', icon: Building2 },
        { name: 'Owners & Invites', path: '/owners', icon: Users },
      ],
    },
    {
      title: 'MAINTENANCE & FINANCE',
      items: [
        { name: 'Bills & Invoices', path: '/bills', icon: Receipt },
        { name: 'Verification Queue', path: '/verification', icon: CheckCircle2 },
        { name: 'Record Cash (OTP)', path: '/cash-payment', icon: Banknote },
        { name: 'Payment Receipts', path: '/receipts', icon: FileText },
        { name: 'Expenses & Proofs', path: '/expenses', icon: Wallet },
      ],
    },
    {
      title: 'SUPPORT & NOTICES',
      items: [
        { name: 'Complaints Board', path: '/complaints', icon: MessageSquareWarning },
        { name: 'Announcements', path: '/announcements', icon: Megaphone },
      ],
    },
    {
      title: 'GOVERNANCE',
      items: [
        { name: 'Audit Logs', path: '/audit-logs', icon: History },
        { name: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-white tracking-tight leading-none">SOCIETY ADMIN</h1>
          <p className="text-[11px] text-brand-400 font-medium mt-1 truncate max-w-[140px]">
            {user?.societyName || 'Building Portal'}
          </p>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {navSections.map((section, idx) => (
          <div key={idx}>
            <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase px-3 mb-2">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-brand-500/10 text-brand-400 border border-brand-500/30 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.fullName?.charAt(0) || 'C'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.fullName || 'Chairman'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.mobile || 'Admin'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

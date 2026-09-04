import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/Toast';
import { Building2, Users, LayoutDashboard, ShieldCheck, LogOut, Menu } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Employees from './pages/Employees';
import Login from './pages/Login';
import { getMe } from './lib/api';

const LOGO_URL = 'https://res.cloudinary.com/wyixfdon/image/upload/v1788505553/creative-logo-360_6-removebg-preview_rjmq61.png';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/companies" element={<ProtectedRoute><Layout><Companies /></Layout></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><Layout><Employees /></Layout></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getMe()
      .then((res) => {
        setRole(res.data?.role || '');
        setName(res.data?.name || 'User');
      })
      .catch(() => {});
  }, []);

  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, show: true },
    { to: '/companies', label: 'Companies', icon: <Building2 className="h-5 w-5" />, show: true },
    { to: '/employees', label: 'Employees', icon: <Users className="h-5 w-5" />, show: isAdmin },
    { to: '/super-admin', label: 'Super Admin', icon: <ShieldCheck className="h-5 w-5" />, show: isSuperAdmin },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <img
          src={LOGO_URL}
          alt="Bluconnetmedia B2B Lead Platform"
          className="h-9 w-9 rounded-xl object-contain"
        />
        <div>
          <p className="text-sm font-bold leading-tight text-white">Bluconnetmedia</p>
          <p className="text-[11px] leading-tight text-slate-400">B2B Lead Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Menu</p>
        {navItems
          .filter((i) => i.show)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-900/40'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
      </nav>

      {/* User / Logout */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-bold text-white">
            {getInitials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="truncate text-[11px] text-slate-400">{role.replace('_', ' ') || 'Member'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-rose-400"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-slate-900 lg:block">{sidebar}</aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 animate-slide-in-left bg-slate-900 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/60 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Bluconnetmedia B2B Lead Platform</p>
            <p className="hidden text-xs text-slate-400 sm:block">Company data, leads &amp; team workflows</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-rose-600 lg:hidden"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        <main className="w-full flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
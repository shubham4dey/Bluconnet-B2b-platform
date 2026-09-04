import React, { useState } from 'react';
import { login } from '../lib/api';
import { Eye, EyeOff, Mail, Lock, Building2, BarChart3, ShieldCheck, Loader2 } from 'lucide-react';

const LOGO_URL = 'https://res.cloudinary.com/wyixfdon/image/upload/v1788505553/creative-logo-360_6-removebg-preview_rjmq61.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      window.location.href = '/';
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(msg ? `Login failed: ${msg}` : 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Branding panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-slate-950 p-12 lg:flex">
        {/* Decorative gradients */}
        <div className="pointer-events-none absolute -left-32 top-[-10%] h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-[-10%] h-96 w-96 rounded-full bg-violet-600/30 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-1/2 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <img
            src={LOGO_URL}
            alt="Bluconnetmedia B2B Lead Platform"
            className="h-11 w-11 rounded-2xl object-contain"
          />
          <div>
            <p className="text-lg font-bold leading-tight text-white">Bluconnetmedia</p>
            <p className="text-sm leading-tight text-slate-400">B2B Lead Platform</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            Manage your B2B leads with <span className="bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">precision</span>.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            Track companies, qualify leads, and collaborate with your team — all in one modern workspace built for startup growth.
          </p>

          <div className="mt-10 space-y-4">
            <FeatureRow icon={<Building2 className="h-5 w-5" />} title="Company database" desc="Organize thousands of records with rich filters." />
            <FeatureRow icon={<BarChart3 className="h-5 w-5" />} title="Live analytics" desc="Understand lead quality at a glance." />
            <FeatureRow icon={<ShieldCheck className="h-5 w-5" />} title="Role-based access" desc="Secure team workflows with granular permissions." />
          </div>
        </div>

        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} Bluconnetmedia B2B Lead Platform. All rights reserved.</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-12 sm:px-8">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <img
              src={LOGO_URL}
              alt="Bluconnetmedia B2B Lead Platform"
              className="h-14 w-14 rounded-2xl object-contain"
            />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Bluconnetmedia B2B Lead Platform</h1>
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-card sm:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
              <p className="mt-1.5 text-sm text-slate-500">Sign in to your account to continue.</p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 animate-fade-in">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-base pl-11"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-base py-2.5 pl-11 pr-11"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Authorized personnel only. Access is monitored and audited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-brand-400 ring-1 ring-white/10">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-sm text-slate-400">{desc}</p>
      </div>
    </div>
  );
}
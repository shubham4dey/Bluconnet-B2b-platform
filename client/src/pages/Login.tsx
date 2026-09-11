import React, { useState } from 'react';
import { login, signup } from '../lib/api';
import { Eye, EyeOff, Mail, Lock, UserPlus, Building2, BarChart3, ShieldCheck, Zap, Loader2, Check } from 'lucide-react';

const LOGO_URL = 'https://res.cloudinary.com/wyixfdon/image/upload/v1788522474/logo.e37f4b4e88609db63b46_ln3j18.png';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password);
      window.location.href = '/';
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(msg ? `Sign up failed: ${msg}` : 'Could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Dark Background */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-950 p-12 lg:flex">
        {/* Background Dashboard Image */}
        <div className="absolute inset-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop" 
            alt="Dashboard" 
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/90 to-slate-900/80" />
        </div>

        {/* Decorative Gradients */}
        <div className="pointer-events-none absolute -left-32 top-[-10%] h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-[-10%] h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />

        {/* Top Section */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2 rounded-full bg-slate-800/50 px-4 py-2 backdrop-blur-sm">
            <div className="h-2 w-2 rounded-full bg-blue-400" />
            <span className="text-sm text-slate-300">Transforming Businesses with Data</span>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white">
            Manage your{' '}
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              B2B leads
            </span>{' '}
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              with precision
            </span>
            .
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-400">
            Track companies, qualify leads, and collaborate with your team — all in one modern workspace built for startup growth.
          </p>

          {/* Feature Grid */}
          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 rounded-xl bg-blue-500/10 p-4 backdrop-blur-sm ring-1 ring-blue-500/20">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Company database</p>
                <p className="mt-1 text-xs text-slate-400">Organize thousands of records with rich filters.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 p-4 backdrop-blur-sm ring-1 ring-emerald-500/20">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Live analytics</p>
                <p className="mt-1 text-xs text-slate-400">Understand lead quality at a glance.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 p-4 backdrop-blur-sm ring-1 ring-amber-500/20">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Role-based access</p>
                <p className="mt-1 text-xs text-slate-400">Secure team workflows with granular permissions.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 p-4 backdrop-blur-sm ring-1 ring-rose-500/20">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Built for growth</p>
                <p className="mt-1 text-xs text-slate-400">Save time, close more deals, and scale faster.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="relative z-10 rounded-2xl bg-slate-900/50 p-6 backdrop-blur-sm ring-1 ring-white/10">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-2xl font-bold text-white">2K+</p>
              <p className="mt-1 text-xs text-slate-400">Companies</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">50K+</p>
              <p className="mt-1 text-xs text-slate-400">Leads Tracked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">10+</p>
              <p className="mt-1 text-xs text-slate-400">Team Members</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">99.9%</p>
              <p className="mt-1 text-xs text-slate-400">Uptime</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
          <p>© 2026 Bluconnetmedia B2B Lead Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Data</span>
            <span>•</span>
            <span>People</span>
            <span>•</span>
            <span>Growth</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Light Background */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white px-4 py-12 sm:px-8">
        {/* Top Right - Navigation Link */}
        <div className="absolute right-8 top-8">
          {mode === 'signin' ? (
            <p className="text-sm text-slate-500">
              New here?{' '}
              <button
                onClick={() => { setMode('signup'); setError(''); setLoading(false); }}
                className="font-semibold text-purple-600 hover:text-purple-700"
              >
                Create an account
              </button>
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <button
                onClick={() => { setMode('signin'); setError(''); setLoading(false); }}
                className="font-semibold text-purple-600 hover:text-purple-700"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile Logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <img
              src={LOGO_URL}
              alt="Bluconnetmedia B2B Lead Platform"
              className="h-14 w-14 rounded-2xl object-contain"
            />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Bluconnetmedia B2B Lead Platform</h1>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl sm:p-10">
            {/* Logo */}
            <div className="mb-6 flex items-center justify-center gap-2">
              <img
                src={LOGO_URL}
                alt="Bluconnetmedia"
                className="h-10 w-10 rounded-xl object-contain"
              />
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900">Bluconnetmedia</p>
                <p className="text-xs text-slate-500">B2B Lead Platform</p>
              </div>
            </div>

            {/* Welcome Text */}
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900">
                Welcome back 👋
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Sign in to your account to continue.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 animate-fade-in">
                {error}
              </div>
            )}

            <form onSubmit={mode === 'signup' ? handleSignup : handleSubmit} className="space-y-5">
              {mode === 'signup' && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Full name</label>
                  <div className="relative">
                    <UserPlus className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
                    placeholder="admin@bluconnetmedia.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 pr-11 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
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

              {mode === 'signup' && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 pr-11 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              )}

              {mode === 'signin' && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-slate-600">Keep me signed in</span>
                  </label>
                  <button type="button" className="text-sm font-semibold text-purple-600 hover:text-purple-700">
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading
                  ? mode === 'signup'
                    ? 'Creating account…'
                    : 'Signing in…'
                  : mode === 'signup'
                    ? 'Create account'
                    : 'Sign in →'}
              </button>
            </form>

            {mode === 'signin' && (
              <>
                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-medium text-slate-400">OR</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-md"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </>
            )}

            <p className="mt-6 text-center text-xs text-slate-400">
              Authorized personnel only. Access is monitored and audited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
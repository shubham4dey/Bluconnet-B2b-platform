import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanies } from '../lib/api';
import { formatDateTime } from '../lib/dates';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Building2, CheckCircle2, Star, Clock, LayoutDashboard, TrendingUp, ArrowRight, Upload, Users, FileText, Zap } from 'lucide-react';
import { Card, StatusBadge, QualityBadge, Skeleton } from '../components/ui';

const GRADIENTS = {
  blue: 'from-blue-500 to-indigo-600',
  green: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-500 to-orange-600',
  rose: 'from-rose-500 to-pink-600',
};

const QUALITY_COLORS = ['#10b981', '#f59e0b', '#f43f5e'];

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['companies'], queryFn: () => getCompanies({ limit: 1000 }) });

  if (isLoading) return <DashboardSkeleton />;

  const companies = data?.data || [];
  const activeCount = companies.filter((c: any) => c.status === 'ACTIVE').length;
  const qualityA = companies.filter((c: any) => c.leadQuality === 'A').length;
  const pendingCount = companies.filter((c: any) => c.status === 'PENDING').length;
  const processCount = companies.filter((c: any) => c.status === 'PROCESS').length;
  const rejectCount = companies.filter((c: any) => c.status === 'REJECT').length;
  const qualityB = companies.filter((c: any) => c.leadQuality === 'B').length;
  const qualityC = companies.filter((c: any) => c.leadQuality === 'C').length;
  const inactiveCount = companies.filter((c: any) => c.status === 'INACTIVE').length;

  const qualityData = [
    { name: 'Quality A', value: qualityA, count: qualityA },
    { name: 'Quality B', value: qualityB, count: qualityB },
    { name: 'Quality C', value: qualityC, count: qualityC },
  ];

  const statusData = [
    { name: 'Active', value: activeCount },
    { name: 'Pending', value: pendingCount },
    { name: 'Process', value: processCount },
    { name: 'Reject', value: rejectCount },
    { name: 'Inactive', value: inactiveCount },
  ];

  const recentCompanies = [...companies]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const totalLeads = companies.length;
  const conversionRate = totalLeads ? Math.round((qualityA / totalLeads) * 100) : 0;
  const lastMonthTotal = 222; // Simulated for demo - in real app, fetch from API
  const lastMonthActive = 1;
  const lastWeekPending = 195;

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return { value: 100, positive: true };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(Math.round(change)), positive: change >= 0 };
  };

  const totalChange = getPercentageChange(totalLeads, lastMonthTotal);
  const activeChange = getPercentageChange(activeCount, lastMonthActive);
  const pendingChange = getPercentageChange(pendingCount, lastWeekPending);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative w-full max-w-xl">
              <input
                type="text"
                placeholder="Search companies, leads, or anything..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pl-11 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs text-slate-400 ring-1 ring-slate-200">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            
            <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-3 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                SA
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">Super Admin</p>
                <p className="text-xs text-slate-500">Admin</p>
              </div>
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {/* Welcome Section */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, Admin! 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Here's what's happening with your B2B lead pipeline today.
            </p>
          </div>
          
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-slate-700">Sep 1, 2026 - Sep 30, 2026</span>
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Total Companies */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className={`absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-gradient-to-br ${GRADIENTS.blue} opacity-10 transition-opacity group-hover:opacity-20`} />
            <div className="relative">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Companies</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{totalLeads}</p>
                </div>
                <div className={`rounded-xl bg-gradient-to-br ${GRADIENTS.blue} p-2.5 text-white shadow-lg shadow-blue-500/25`}>
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +{totalChange.value}%
                </span>
                <span className="text-xs text-slate-400">from last month</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">{qualityA} quality A leads</p>
            </div>
          </div>

          {/* Active Leads */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className={`absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-gradient-to-br ${GRADIENTS.green} opacity-10 transition-opacity group-hover:opacity-20`} />
            <div className="relative">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Leads</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{activeCount}</p>
                </div>
                <div className={`rounded-xl bg-gradient-to-br ${GRADIENTS.green} p-2.5 text-white shadow-lg shadow-emerald-500/25`}>
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +{activeChange.value}%
                </span>
                <span className="text-xs text-slate-400">from last month</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">Currently engaged</p>
            </div>
          </div>

          {/* Quality A Leads */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className={`absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-gradient-to-br ${GRADIENTS.amber} opacity-10 transition-opacity group-hover:opacity-20`} />
            <div className="relative">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Quality A Leads</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{qualityA}</p>
                </div>
                <div className={`rounded-xl bg-gradient-to-br ${GRADIENTS.amber} p-2.5 text-white shadow-lg shadow-amber-500/25`}>
                  <Star className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">{conversionRate}% of all leads</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">0% of all leads</p>
            </div>
          </div>

          {/* Pending Review */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className={`absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-gradient-to-br ${GRADIENTS.rose} opacity-10 transition-opacity group-hover:opacity-20`} />
            <div className="relative">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pending Review</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{pendingCount}</p>
                </div>
                <div className={`rounded-xl bg-gradient-to-br ${GRADIENTS.rose} p-2.5 text-white shadow-lg shadow-rose-500/25`}>
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +{pendingChange.value}%
                </span>
                <span className="text-xs text-slate-400">from last week</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">Needs attention</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Lead Quality Distribution */}
          <Card className="overflow-hidden border-0 shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Lead Quality Distribution</h3>
                  <p className="text-sm text-slate-500">Breakdown by quality grade</p>
                </div>
                <select className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-indigo-500">
                  <option>All Companies</option>
                </select>
              </div>
            </div>
            <div className="p-6">
              <div className="h-72">
                {totalLeads === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={qualityData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={80} 
                        outerRadius={110} 
                        dataKey="value" 
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {qualityData.map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={QUALITY_COLORS[index % QUALITY_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: '1px solid #e2e8f0', 
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
                          fontSize: 13,
                          padding: '8px 12px'
                        }}
                        formatter={(value: any, name: any) => [value, name]}
                      />
                      <text x="50%" y="45%" textAnchor="middle" className="fill-slate-900 text-2xl font-bold">
                        {totalLeads}
                      </text>
                      <text x="50%" y="52%" textAnchor="middle" className="fill-slate-400 text-xs">
                        Total
                      </text>
                      <text x="50%" y="58%" textAnchor="middle" className="fill-slate-400 text-xs">
                        Companies
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {qualityData.map((d, i) => {
                  const percentage = totalLeads ? Math.round((d.value / totalLeads) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: QUALITY_COLORS[i] }} />
                        <span className="text-sm font-medium text-slate-700">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-slate-900">{d.count}</span>
                        <span className="text-sm text-slate-400">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Status Overview */}
          <Card className="overflow-hidden border-0 shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Status Overview</h3>
                  <p className="text-sm text-slate-500">Companies by lifecycle stage</p>
                </div>
                <select className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-indigo-500">
                  <option>All Time</option>
                </select>
              </div>
            </div>
            <div className="p-6">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} 
                      axisLine={false} 
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ 
                        borderRadius: 12, 
                        border: '1px solid #e2e8f0', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
                        fontSize: 13,
                        padding: '8px 12px'
                      }}
                      cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#6366f1" 
                      radius={[8, 8, 0, 0]} 
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recently Added Companies */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Recently Added Companies</h3>
                    <p className="text-sm text-slate-500">Latest records in your database</p>
                  </div>
                  <button className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                    View All
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {recentCompanies.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/70">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-sm font-bold text-indigo-600 ring-1 ring-indigo-100">
                      {(c.companyName || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{c.companyName}</p>
                      <p className="truncate text-xs text-slate-400">
                        {c.industry || '—'}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm text-slate-600">{formatDateTime(c.createdAt)}</p>
                      <p className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <QualityBadge quality={c.leadQuality} />
                      <StatusBadge status={c.status} />
                    </div>
                    <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </div>
                ))}
                {recentCompanies.length === 0 && (
                  <div className="px-6 py-12 text-center text-sm text-slate-400">
                    No companies yet. Import your first batch to get started.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <div>
              <h3 className="mb-1 text-base font-bold text-slate-900">Quick Actions</h3>
              <p className="text-sm text-slate-500">Everything you need to manage your leads</p>
            </div>
            
            <div className="space-y-3">
              <button className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-600 ring-1 ring-indigo-100 transition-transform group-hover:scale-110">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Add Company</p>
                  <p className="text-xs text-slate-500">Manually add a new company</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-indigo-600" />
              </button>

              <button className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-emerald-300 hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 ring-1 ring-emerald-100 transition-transform group-hover:scale-110">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Import Companies</p>
                  <p className="text-xs text-slate-500">Bulk import via CSV</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-emerald-600" />
              </button>

              <button className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-purple-300 hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 text-purple-600 ring-1 ring-purple-100 transition-transform group-hover:scale-110">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Manage Employees</p>
                  <p className="text-xs text-slate-500">Add or manage team members</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-purple-600" />
              </button>

              <button className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-amber-300 hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 ring-1 ring-amber-100 transition-transform group-hover:scale-110">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">View Reports</p>
                  <p className="text-xs text-slate-500">Analyze your lead data</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-amber-600" />
              </button>
            </div>

            {/* Promo Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-lg">
              <div className="relative z-10">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <Zap className="h-5 w-5 text-amber-300" />
                </div>
                <h4 className="text-lg font-bold">Turn Leads into Opportunities</h4>
                <p className="mt-1 text-sm text-indigo-100">Keep your data updated and never miss a potential client.</p>
                <button className="mt-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-600 shadow-lg transition-transform hover:scale-105">
                  Explore Reports
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-purple-500/20 blur-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-48 rounded-xl" />
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
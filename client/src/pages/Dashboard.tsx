import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanies } from '../lib/api';
import { formatDateTime } from '../lib/dates';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Building2, CheckCircle2, Star, Clock, LayoutDashboard } from 'lucide-react';
import { StatCard, Card, PageHeader, StatusBadge, QualityBadge, Skeleton } from '../components/ui';

const GRADIENTS = {
  blue: 'bg-gradient-to-br from-brand-500 to-indigo-600',
  green: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-600',
  rose: 'bg-gradient-to-br from-rose-500 to-pink-600',
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

  const qualityData = [
    { name: 'Quality A', value: qualityA },
    { name: 'Quality B', value: qualityB },
    { name: 'Quality C', value: qualityC },
  ];

  const statusData = [
    { name: 'Active', value: activeCount },
    { name: 'Pending', value: pendingCount },
    { name: 'Process', value: processCount },
    { name: 'Reject', value: rejectCount },
    { name: 'Inactive', value: companies.filter((c: any) => c.status === 'INACTIVE').length },
  ];

  const recentCompanies = [...companies].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  const totalLeads = companies.length;
  const conversionRate = totalLeads ? Math.round((qualityA / totalLeads) * 100) : 0;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your B2B lead pipeline"
        icon={<LayoutDashboard className="h-5 w-5" />}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Companies" value={totalLeads} icon={<Building2 className="h-5 w-5" />} gradient={GRADIENTS.blue} hint={`${qualityA} quality A leads`} />
        <StatCard label="Active Leads" value={activeCount} icon={<CheckCircle2 className="h-5 w-5" />} gradient={GRADIENTS.green} hint="Currently engaged" />
        <StatCard label="Quality A Leads" value={qualityA} icon={<Star className="h-5 w-5" />} gradient={GRADIENTS.amber} hint={`${conversionRate}% of all leads`} />
        <StatCard label="Pending Review" value={pendingCount} icon={<Clock className="h-5 w-5" />} gradient={GRADIENTS.rose} hint="Needs attention" />
      </div>
{/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Lead Quality Distribution</h3>
            <p className="text-sm text-slate-500">Breakdown by quality grade</p>
          </div>
          <div className="h-72">
            {totalLeads === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={qualityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {qualityData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={QUALITY_COLORS[index % QUALITY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: 13 }}
                    formatter={(value: any, name: any) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 flex items-center justify-center gap-5">
            {qualityData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: QUALITY_COLORS[i % QUALITY_COLORS.length] }} />
                {d.name} · {d.value}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Status Overview</h3>
            <p className="text-sm text-slate-500">Companies by lifecycle stage</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: 13 }}
                  cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                />
                <Bar dataKey="value" name="Companies" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent companies */}
      <Card>
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">Recently Added Companies</h3>
          <p className="text-sm text-slate-500">Latest records in your database</p>
        </div>
        <div className="divide-y divide-slate-50">
          {recentCompanies.map((c: any) => (
            <div key={c.id} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-slate-50/70">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-violet-50 text-xs font-bold text-brand-600 ring-1 ring-brand-100">
                {(c.companyName || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{c.companyName}</p>
                <p className="truncate text-xs text-slate-400">
                  {[c.industry, c.country, c.city].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <QualityBadge quality={c.leadQuality} />
                <StatusBadge status={c.status} />
              </div>
              <p className="hidden w-24 text-right text-xs text-slate-400 md:block">
                {formatDateTime(c.createdAt) ?? '—'}
              </p>
            </div>
          ))}
          {recentCompanies.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-slate-400">No companies yet. Import your first batch to get started.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
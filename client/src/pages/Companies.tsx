import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompanies, getImportLogs, exportCompaniesCsv, updateCompanyStatus, deleteCompany, getAccountManagers } from '../lib/api';
import { Search, Download, Edit2, Trash2, Eye, Upload, History, Building2, Plus, ChevronLeft, ChevronRight, FileDown, FilterX, Users, Mail, Globe, Linkedin, X, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import ImportModal from '../components/ImportModal';
import CompanyForm from '../components/CompanyForm';
import { PageHeader, Card, StatusBadge, QualityBadge, EmptyState, Badge, Th, Td, Button, Select } from '../components/ui';
import { useToast } from '../components/Toast';

export default function SuperAdmin() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [affiliateManager, setAffiliateManager] = useState('');
  const [editCompany, setEditCompany] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [role, setRole] = useState<string>('');
  const [viewCompany, setViewCompany] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setRole(payload.role || '');
      } catch {}
    }
  }, []);

  const canManage = ['SUPER_ADMIN', 'ADMIN'].includes(role);
  // Export is Admin-only (SUPER_ADMIN / ADMIN) per role-based access control.
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);
  // Employees are allowed to add companies and import CSVs, but never export.
  const canAddOrImport = canManage || role === 'EMPLOYEE';

  const { data, isLoading } = useQuery({
    queryKey: ['companies', page, search, status, industry, country, companyType, affiliateManager],
    queryFn: () => getCompanies({ page, limit: 50, search, status, industry, country, companyType, accountManager: affiliateManager })
  });

  const { data: accountManagers } = useQuery({ queryKey: ['accountManagers'], queryFn: getAccountManagers });

  const { data: importLogs } = useQuery({ 
    queryKey: ['importLogs'], 
    queryFn: getImportLogs 
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => updateCompanyStatus(id, status),
    onSuccess: (_: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Status updated', `Company marked as ${vars.status}.`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company deleted', 'The record has been removed.');
    },
  });

  const resetPageAndFilter = (setter: any) => (e: any) => { setter(e.target.value); setPage(1); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportCompaniesCsv({ search, status, industry, country, companyType, accountManager: affiliateManager });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `companies-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export complete', 'Your CSV file has been downloaded.');
    } catch (err) {
      toast.error('Export failed', 'Could not export company data.');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => { setSearch(''); setStatus(''); setIndustry(''); setCountry(''); setCompanyType(''); setPage(1); };

  const handleToggleStatus = (company: any) => {
    const newStatus = company.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    statusMutation.mutate({ id: company.id, status: newStatus });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <PageHeader
        title="Companies"
        subtitle={`${data?.total || 0} companies in your database`}
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <>
            {isAdmin && (
              <Button variant="secondary" onClick={handleExport} loading={exporting} icon={<FileDown className="h-4 w-4" />}>
                Export CSV
              </Button>
            )}
            {canAddOrImport && (
              <Button variant="success" onClick={() => setImportOpen(true)} icon={<Upload className="h-4 w-4" />}>
                Import
              </Button>
            )}
            {canAddOrImport && (
              <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
                Add Company
              </Button>
            )}
          </>
        }
      />

      {/* Filters */}
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={resetPageAndFilter(setSearch)}
              className="input-base pl-10"
            />
          </div>
          <Select value={status} onChange={resetPageAndFilter(setStatus)}>
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PENDING">Pending</option>
          </Select>
          <Select value={industry} onChange={resetPageAndFilter(setIndustry)}>
            <option value="">All Industries</option>
            <option value="SaaS">SaaS</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Finance">Finance</option>
            <option value="E-commerce">E-commerce</option>
            <option value="Education">Education</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Other">Other</option>
          </Select>
          <Select value={companyType} onChange={resetPageAndFilter(setCompanyType)}>
            <option value="">All Types</option>
            <option value="Startup">Startup</option>
            <option value="SME">SME</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Other">Other</option>
          </Select>
          <Select value={affiliateManager} onChange={resetPageAndFilter(setAffiliateManager)} disabled={!accountManagers}>
            <option value="">All Managers</option>
            {accountManagers?.data?.map((m: any) => (
          <option key={m.accountManagerName + '|' + m.accountManagerId} value={m.accountManagerName}>
            {m.accountManagerName}{m.accountManagerId ? ' (ID: ' + m.accountManagerId + ')' : ''}
          </option>
        ))}
          </Select>
          <Button variant="secondary" onClick={clearFilters} icon={<FilterX className="h-4 w-4" />} className="w-full">
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Company Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[2400px] table-auto">
          <thead className="bg-slate-50">
            <tr>
              <Th className="w-[2%]">#</Th>
              <Th className="w-[2%]">ID</Th>
              <Th className="w-[5.5%]">Company</Th>
              <Th className="w-[5%]">Advertiser Name</Th>
              <Th className="w-[5.5%]">Website</Th>
              <Th className="w-[5.5%]">Contact Person</Th>
              <Th className="w-[5%]">Phone</Th>
              <Th className="w-[5%]">WhatsApp</Th>
              <Th className="w-[5%]">Telegram / Teams</Th>
              <Th className="w-[3.5%]">LinkedIn</Th>
              <Th className="w-[5.5%]">Email</Th>
              <Th className="w-[3%]">Employees</Th>
              <Th className="w-[3%]">Followers</Th>
              <Th className="w-[3.5%]">Type</Th>
              <Th className="w-[3.5%]">Base GEO</Th>
              <Th className="w-[5%]">Address</Th>
              <Th className="w-[4.5%]">Services</Th>
              <Th className="w-[4%]">Technology</Th>
              <Th className="w-[6%]">Affiliate Manager</Th>
              <Th className="w-[4.5%]">Record Created</Th>
              <Th className="w-[4.5%]">Last Modified</Th>
              <Th className="w-[3%]">Quality</Th>
              <Th className="w-[4%]">Status</Th>
              <Th className="w-[3%]">Source</Th>
              <Th className="w-[6%]">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={25} className="p-8">
                  <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-600" /> Loading company data...
                  </div>
                </td>
              </tr>
            ) : !data?.data || data.data.length === 0 ? (
              <tr>
                <td colSpan={25}>
                  <EmptyState
                    icon={<Building2 className="h-6 w-6" />}
                    title="No companies found"
                    message="Try adjusting your filters, or import a CSV to get started."
                  />
                </td>
              </tr>
            ) : (
              (data?.data || []).map((c: any, index: number) => (
              <tr key={c.id} onClick={(e) => { e.stopPropagation(); setViewCompany(c); }} className="cursor-pointer transition-colors hover:bg-brand-50/40">
  <Td className="text-slate-400">{(page - 1) * 50 + index + 1}</Td>
  <Td className="text-xs font-medium text-slate-500">{c.advertiserId || c.externalId || '—'}</Td>
  <Td>
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-violet-50 text-[10px] font-bold text-brand-600 ring-1 ring-brand-100">
        {(c.companyName || "?").slice(0, 2).toUpperCase()}
      </div>
      <span className="text-sm font-semibold text-slate-900" title={c.companyName}>{c.companyName}</span>
    </div>
  </Td>
  <Td className="text-sm text-slate-700">{c.advertiserName || '—'}</Td>
  <Td>
    {c.website ? (
      <a href={c.website.startsWith("http") ? c.website : "https://" + c.website} target="_blank" rel="noreferrer" className="truncate text-sm text-brand-600 hover:underline" title={c.website}>
        {c.website.replace(/^https?:\/\//, "")}
      </a>
    ) : (
      <span className="text-sm text-slate-300">—</span>
    )}
  </Td>
  <Td>
    <span className="truncate text-sm text-slate-700" title={c.contactPersonName}>{c.contactPersonName || "—"}</span>
  </Td>
  <Td>
    <span className="truncate text-sm text-slate-500" title={c.phone}>{c.phone || "—"}</span>
  </Td>
  <Td>
    {c.whatsappNumber ? (
      <a href={"https://wa.me/" + c.whatsappNumber.replace(/\D/g, "")} target="_blank" rel="noreferrer" className="truncate text-sm text-emerald-600 hover:underline" title={c.whatsappNumber}>
        {c.whatsappNumber}
      </a>
    ) : (
      <span className="text-sm text-slate-300">—</span>
    )}
  </Td>
  <Td>
    <span className="truncate text-sm text-slate-500" title={c.telegramTeams}>{c.telegramTeams || "—"}</span>
  </Td>
  <Td>
    {c.linkedinUrl ? (
      <a href={c.linkedinUrl.startsWith("http") ? c.linkedinUrl : "https://" + c.linkedinUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
        <Linkedin className="h-4 w-4" />
      </a>
    ) : (
      <span className="text-sm text-slate-300">—</span>
    )}
  </Td>
  <Td>
    <div className="truncate">
      {c.email ? (
        <a href={"mailto:" + c.email} className="truncate text-sm text-brand-600 hover:underline" title={c.email}>
          {c.email}
        </a>
      ) : (
        <span className="text-sm text-slate-300">No email</span>
      )}
    </div>
  </Td>
  <Td><span className="text-sm text-slate-700">{c.employees || "—"}</span></Td>
  <Td><span className="text-sm text-slate-700">{c.followers || "—"}</span></Td>
  <Td><Badge color="gray">{c.companyType || "N/A"}</Badge></Td>
  <Td><span className="truncate text-sm text-slate-700" title={c.baseGeo}>{c.baseGeo || "—"}</span></Td>
  <Td><span className="truncate text-sm text-slate-500" title={c.address}>{c.address || "—"}</span></Td>
  <Td><span className="truncate text-sm text-slate-500" title={c.services}>{c.services || "—"}</span></Td>
  <Td><span className="truncate text-sm text-slate-500" title={c.technologiesUsed}>{c.technologiesUsed || "—"}</span></Td>
  <Td><span className="truncate text-sm text-slate-700" title={c.accountManagerName}>{c.accountManagerName || "—"}</span></Td>
  <Td><span className="truncate text-sm text-slate-500">{c.recordCreated ? new Date(c.recordCreated).toLocaleDateString("en-GB") : "—"}</span></Td>
  <Td><span className="truncate text-sm text-slate-500">{c.recordModified ? new Date(c.recordModified).toLocaleDateString("en-GB") : "—"}</span></Td>
  <Td><QualityBadge quality={c.leadQuality} /></Td>
  <Td><StatusBadge status={c.status} /></Td>
  <Td><span className="truncate text-sm text-slate-500" title={c.source}>{c.source || "—"}</span></Td>
  <Td className="text-right">
    <div className="flex justify-end gap-0.5">
      <button onClick={(e) => { e.stopPropagation(); setViewCompany(c); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600" title="View details">
        <Eye className="h-4 w-4" />
      </button>
      {canManage && (
        <button onClick={(e) => { e.stopPropagation(); setEditCompany(c); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600" title="Edit">
          <Edit2 className="h-4 w-4" />
        </button>
      )}
      {canManage && (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleStatus(c); }}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
          title={c.status === "ACTIVE" ? "Deactivate" : "Activate"}
        >
          {c.status === "ACTIVE" ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
        </button>
      )}
      {canManage && (
        <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.companyName); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  </Td>
</tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      <div className="mt-5 flex flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
        <span>
          Page <strong>{page}</strong> of <strong>{data?.totalPages || 1}</strong> · {data?.total || 0} companies
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p: number) => p - 1)} icon={<ChevronLeft className="h-4 w-4" />}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= (data?.totalPages || 1)} onClick={() => setPage((p: number) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Recent Imports Section */}
      {importLogs?.data?.length > 0 && (
        <Card className="mt-6">
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Imports</h3>
              <p className="text-xs text-slate-400">Latest CSV / Excel uploads</p>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {importLogs.data.slice(0, 5).map((log: any) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">{log.fileName}</p>
                  <p className="text-xs text-slate-400">
                    by {log.user?.name || 'Unknown'} · {new Date(log.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {log.imported > 0 && <Badge color="green">{log.imported} new</Badge>}
                  {log.duplicates > 0 && <Badge color="amber">{log.duplicates} dup</Badge>}
                  {log.failed > 0 && <Badge color="red">{log.failed} failed</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      {viewCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setViewCompany(null)}>
          <div
            className="w-full max-w-2xl max-h-[90vh] animate-slide-up overflow-y-auto rounded-2xl bg-white shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
              <h2 className="text-lg font-bold text-slate-900">Company Details</h2>
              <button onClick={() => setViewCompany(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-bold text-white">
                  {(viewCompany.companyName || '?').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{viewCompany.companyName}</h3>
                  <p className="text-sm text-slate-400">{viewCompany.industry || 'No industry'}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <QualityBadge quality={viewCompany.leadQuality} />
                  <StatusBadge status={viewCompany.status} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem label="Email" value={viewCompany.email} />
                <DetailItem label="Website" value={viewCompany.website} />
                <DetailItem label="LinkedIn" value={viewCompany.linkedinUrl} />
                <DetailItem label="Phone" value={viewCompany.phone} />
                <DetailItem label="Sales Number" value={viewCompany.salesNumber} />
                <DetailItem label="WhatsApp Number" value={viewCompany.whatsappNumber} />
                <DetailItem label="Telegram / Teams" value={viewCompany.telegramTeams} />
                <DetailItem label="Contact Person Name" value={viewCompany.contactPersonName} />
                <DetailItem label="Contact Person Phone" value={viewCompany.contactPersonPhone} />
                <DetailItem label="Advertiser ID" value={viewCompany.advertiserId} />
                <DetailItem label="Advertiser Name" value={viewCompany.advertiserName} />
                <DetailItem label="Employees" value={viewCompany.employees} />
                <DetailItem label="Followers" value={viewCompany.followers} />
                <DetailItem label="Type" value={viewCompany.companyType} />
                <DetailItem label="Base GEO" value={viewCompany.baseGeo} />
                <DetailItem label="Country" value={viewCompany.country} />
                <DetailItem label="City" value={viewCompany.city} />
                <DetailItem label="State" value={viewCompany.state} />
                <DetailItem label="Affiliate Manager" value={viewCompany.accountManagerName} />
                <DetailItem label="Address" value={viewCompany.address} />
                <DetailItem label="Services" value={viewCompany.services} />
                <DetailItem label="Revenue" value={viewCompany.revenue} />
                <DetailItem label="Company Size" value={viewCompany.companySize} />
                <DetailItem label="Technologies Used" value={viewCompany.technologiesUsed} />
                <DetailItem label="Target Market" value={viewCompany.targetMarket} />
                <DetailItem label="Record Created" value={viewCompany.recordCreated ? new Date(viewCompany.recordCreated).toLocaleString() : null} />
                <DetailItem label="Last Modified" value={viewCompany.recordModified ? new Date(viewCompany.recordModified).toLocaleString() : null} />
              </div>
            </div>
          </div>
        </div>
      )}

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <CompanyForm open={createOpen} onClose={() => setCreateOpen(false)} />
      <CompanyForm open={!!editCompany} onClose={() => setEditCompany(null)} editCompany={editCompany} />
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">{value || 'N/A'}</p>
    </div>
  );
}
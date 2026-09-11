import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompanies, getImportLogs, exportCompaniesCsv, updateCompany, updateCompanyStatus, deleteCompany, deleteCompaniesBulk, getAssignableUsers, getCompanyFeedback, addCompanyFeedback } from '../lib/api';
import { AlertTriangle, Search, Download, Edit2, Trash2, Eye, Upload, History, Building2, Plus, ChevronLeft, ChevronRight, FileDown, FilterX, Users, Mail, Globe, Linkedin, X, ToggleLeft, ToggleRight, Loader2, MessageSquare, Save } from 'lucide-react';
import ImportModal from '../components/ImportModal';
import CompanyForm from '../components/CompanyForm';
import { formatRecordCreated, formatRecordModified, formatDateTime } from '../lib/dates';
import { PageHeader, Card, StatusBadge, QualityBadge, EmptyState, Badge, Th, Td, Button, Select, Modal, Input, Field } from '../components/ui';
import { useToast } from '../components/Toast';

// Rows-per-page selector (persisted per browser in localStorage).
const PAGE_SIZE_KEY = 'companies:pageSize';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250];
const DEFAULT_PAGE_SIZE = 25;

// '' / junk → null (column stays empty); '1,200' or ' 50 ' → 1200 / 50.
// Mirrors CompanyForm so the Int columns never receive NaN or '' (the API
// would reject those). Never sends NaN for the employees/followers columns.
const parseOptionalInt = (v: string): number | null => {
  if (!v || !v.trim()) return null;
  const n = Number(v.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

// Editable fields for the inline edit mode of the Company Details modal
// (Admin / Super Admin only). Mirrors CompanyForm's field set plus the extra
// detail-only columns (country, city, state, revenue, companySize,
// technologiesUsed, targetMarket) that the backend accepts.
const INLINE_EDIT_EMPTY = {
  companyName: '',
  website: '',
  linkedinUrl: '',
  email: '',
  employees: '',
  followers: '',
  companyType: '',
  baseGeo: '',
  address: '',
  services: '',
  industry: '',
  leadQuality: 'C',
  status: 'PENDING',
  phone: '',
  salesNumber: '',
  whatsappNumber: '',
  telegramTeams: '',
  contactPersonName: '',
  contactPersonPhone: '',
  advertiserId: '',
  advertiserName: '',
  accountManagerName: '',
  country: '',
  city: '',
  state: '',
  revenue: '',
  companySize: '',
  technologiesUsed: '',
  targetMarket: '',
};

export default function SuperAdmin() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    // Restore the user's chosen page size across refreshes / navigation.
    const stored = Number(localStorage.getItem(PAGE_SIZE_KEY));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  });
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
  // Inline editing of the Company Details modal — enabled for Admin / Super
  // Admin only; employees always get the read-only view.
  const [inlineEditing, setInlineEditing] = useState(false);
  const [inlineForm, setInlineForm] = useState<any>({ ...INLINE_EDIT_EMPTY });
  const [inlineError, setInlineError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; names: string[] } | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setRole(payload.role || '');
        setUserId(payload.id || '');
      } catch {}
    }
  }, []);

  // Table horizontal scroll enhancements
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollStartX, setScrollStartX] = useState(0);

  // Shift + Mouse Wheel horizontal scroll
  const handleWheelScroll = useCallback((e: WheelEvent) => {
    if (!tableScrollRef.current) return;
    
    // If Shift is pressed, convert vertical scroll to horizontal
    if (e.shiftKey) {
      e.preventDefault();
      tableScrollRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  // Click-and-drag scroll handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only allow drag on left mouse button
    if (e.button !== 0) return;
    if (!tableScrollRef.current) return;
    
    // Don't start drag on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, select, textarea')) return;
    
    e.preventDefault();
    setIsDragging(true);
    setDragStartX(e.pageX);
    setScrollStartX(tableScrollRef.current.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !tableScrollRef.current) return;
    
    const dx = e.pageX - dragStartX;
    tableScrollRef.current.scrollLeft = scrollStartX - dx;
  }, [isDragging, dragStartX, scrollStartX]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Attach/detach mouse move and up listeners for drag scrolling
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Attach wheel listener for Shift+Scroll
  useEffect(() => {
    const container = tableScrollRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheelScroll, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheelScroll);
      };
    }
  }, [handleWheelScroll]);

  // Prevent text selection while dragging
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none';
      return () => {
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging]);

  const canManage = ['SUPER_ADMIN', 'ADMIN'].includes(role);
  // Export is Admin-only (SUPER_ADMIN / ADMIN) per role-based access control.
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);
  // Employees are allowed to add companies and import CSVs, but never export.
  const canAddOrImport = canManage || role === 'EMPLOYEE';

  const { data, isLoading } = useQuery({
    queryKey: ['companies', page, pageSize, search, status, industry, country, companyType, affiliateManager],
    queryFn: () => getCompanies({ page, limit: pageSize, search, status, industry, country, companyType, accountManager: affiliateManager })
  });

  // Track scroll position for edge indicators
  const [scrollIndicators, setScrollIndicators] = useState({ left: false, right: false });
  
  const updateScrollIndicators = useCallback(() => {
    const container = tableScrollRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setScrollIndicators({
      left: scrollLeft > 5,
      right: scrollLeft < scrollWidth - clientWidth - 5
    });
  }, []);

  useEffect(() => {
    const container = tableScrollRef.current;
    if (!container) return;
    
    const handleScroll = () => updateScrollIndicators();
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateScrollIndicators);
    
    // Initial check
    setTimeout(updateScrollIndicators, 100);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [updateScrollIndicators, data]);

  const { data: assignableUsersRes } = useQuery({ queryKey: ['assignableUsers'], queryFn: getAssignableUsers, enabled: canManage, staleTime: 60_000 });

  const { data: importLogs } = useQuery({ 
    queryKey: ['importLogs'], 
    queryFn: getImportLogs 
  });

  const [feedbackText, setFeedbackText] = useState('');

  const feedbackQuery = useQuery({
    queryKey: ['companyFeedback', viewCompany?.id],
    queryFn: () => getCompanyFeedback(viewCompany.id),
    enabled: !!viewCompany,
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ id, comment }: any) => addCompanyFeedback(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyFeedback', viewCompany?.id] });
      setFeedbackText('');
      toast.success('Feedback added', 'Your remark has been saved on the company record.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: any) => updateCompanyStatus(id, status),
    onSuccess: (_: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Status updated', `Company marked as ${vars.status}.`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ ids }: any) => (ids.length === 1 ? deleteCompany(ids[0]) : deleteCompaniesBulk(ids)),
    onSuccess: (_: any, vars: any) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['assignableUsers'] });
      setDeleteTarget(null);
      setSelectedIds([]);
      toast.success(vars.ids.length === 1 ? 'Company deleted successfully' : 'Selected companies deleted successfully');
    },
    onError: () => {
      setDeleteTarget(null);
      toast.error('Delete failed', 'Could not delete the selected companies. Please try again.');
    },
  });

  // ----- Inline edit in the Company Details modal (Admin / Super Admin) -----
  // Admins and Super Admins can edit every permitted field directly inside the
  // details modal (Affiliate Manager, Status and all editable details) with
  // Save / Cancel actions. Employees never see the Edit affordance and keep
  // the read-only view. RBAC is enforced again by the backend on save.
  // Opening the details modal (or switching to another company) always starts
  // in read-only view mode; closing exits edit mode.
  useEffect(() => {
    setInlineEditing(false);
    setInlineError('');
  }, [viewCompany?.id]);

  const inlineEditMutation = useMutation({
    mutationFn: ({ id, payload }: any) => updateCompany(id, payload),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      // Refresh the modal contents with the freshly saved record and drop
      // back into read-only view mode.
      setViewCompany(res?.data || null);
      setInlineEditing(false);
      setInlineError('');
      toast.success('Company updated', 'Your changes have been saved.');
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.message || err?.response?.data?.error || '';
      setInlineError(`Failed to update company.${detail ? ` ${detail}` : ''}`);
    },
  });

  const startInlineEdit = () => {
    if (!viewCompany) return;
    setInlineForm({
      companyName: viewCompany.companyName || '',
      website: viewCompany.website || '',
      linkedinUrl: viewCompany.linkedinUrl || '',
      email: viewCompany.email || '',
      employees: viewCompany.employees?.toString() || '',
      followers: viewCompany.followers?.toString() || '',
      companyType: viewCompany.companyType || '',
      baseGeo: viewCompany.baseGeo || '',
      address: viewCompany.address || '',
      services: viewCompany.services || '',
      industry: viewCompany.industry || '',
      leadQuality: viewCompany.leadQuality || 'C',
      status: viewCompany.status || 'PENDING',
      phone: viewCompany.phone || '',
      salesNumber: viewCompany.salesNumber || '',
      whatsappNumber: viewCompany.whatsappNumber || '',
      telegramTeams: viewCompany.telegramTeams || '',
      contactPersonName: viewCompany.contactPersonName || '',
      contactPersonPhone: viewCompany.contactPersonPhone || '',
      advertiserId: viewCompany.advertiserId || '',
      advertiserName: viewCompany.advertiserName || '',
      accountManagerName: viewCompany.accountManagerName || viewCompany.addedBy?.name || '',
      country: viewCompany.country || '',
      city: viewCompany.city || '',
      state: viewCompany.state || '',
      revenue: viewCompany.revenue || '',
      companySize: viewCompany.companySize || '',
      technologiesUsed: viewCompany.technologiesUsed || '',
      targetMarket: viewCompany.targetMarket || '',
    });
    setInlineError('');
    setInlineEditing(true);
  };

  const cancelInlineEdit = () => {
    setInlineEditing(false);
    setInlineError('');
  };

  const handleInlineChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInlineForm((f: any) => ({ ...f, [name]: value }));
  };

  // Same validation & payload shaping as CompanyForm so the backend receives
  // identical data whether the user edits via the form or inline.
  const handleInlineSave = () => {
    if (!viewCompany) return;
    setInlineError('');
    if (!String(inlineForm.companyName || '').trim()) {
      setInlineError('Company Name is required.');
      return;
    }
    const payload: any = {
      companyName: inlineForm.companyName.trim(),
      website: inlineForm.website.trim() || null,
      linkedinUrl: inlineForm.linkedinUrl.trim() || null,
      email: inlineForm.email.trim() || null,
      employees: parseOptionalInt(inlineForm.employees),
      followers: parseOptionalInt(inlineForm.followers),
      companyType: inlineForm.companyType.trim() || null,
      baseGeo: inlineForm.baseGeo.trim() || null,
      address: inlineForm.address.trim() || null,
      services: inlineForm.services.trim() || null,
      industry: inlineForm.industry.trim() || null,
      leadQuality: inlineForm.leadQuality,
      status: inlineForm.status,
      phone: inlineForm.phone.trim() || null,
      salesNumber: inlineForm.salesNumber.trim() || null,
      whatsappNumber: inlineForm.whatsappNumber.trim() || null,
      telegramTeams: inlineForm.telegramTeams.trim() || null,
      contactPersonName: inlineForm.contactPersonName.trim() || null,
      contactPersonPhone: inlineForm.contactPersonPhone.trim() || null,
      advertiserId: inlineForm.advertiserId.trim() || null,
      advertiserName: inlineForm.advertiserName.trim() || null,
      accountManagerName: inlineForm.accountManagerName.trim() || null,
      country: inlineForm.country.trim() || null,
      city: inlineForm.city.trim() || null,
      state: inlineForm.state.trim() || null,
      revenue: inlineForm.revenue.trim() || null,
      companySize: inlineForm.companySize.trim() || null,
      technologiesUsed: inlineForm.technologiesUsed.trim() || null,
      targetMarket: inlineForm.targetMarket.trim() || null,
    };
    inlineEditMutation.mutate({ id: viewCompany.id, payload });
  };

  const resetPageAndFilter = (setter: any) => (e: any) => { setter(e.target.value); setPage(1); };

  // Changing the page size recalculates pagination â€” always restart from page 1
  // so the user never lands on a page number that no longer exists.
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    localStorage.setItem(PAGE_SIZE_KEY, String(size));
    setPage(1);
  };

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

  const clearFilters = () => { setSearch(''); setStatus(''); setIndustry(''); setCountry(''); setCompanyType(''); setAffiliateManager(''); setPage(1); };

  const handleToggleStatus = (company: any) => {
    const newStatus = company.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    statusMutation.mutate({ id: company.id, status: newStatus });
  };

  const canDeleteCompany = (c: any) => canManage || (role === 'EMPLOYEE' && c.addedById === userId);

  // Edit access mirrors the server: Admins edit everything; an employee can edit
  // every company in their listing (owned or imported â€” the listing scope and the
  // edit rule are identical server-side). Employees can now also change status on
  // those companies; new employee submissions are still forced to PENDING by the
  // server (create-mode select stays read-only for them).
  const canEditRow = canManage || role === 'EMPLOYEE';

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allVisibleIds = (data?.data || []).map((c: any) => c.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id: string) => selectedIds.includes(id));

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...allVisibleIds])]);
    } else {
      setSelectedIds((prev) => prev.filter((id: string) => !allVisibleIds.includes(id)));
    }
  };



  const openDeleteModal = (ids: string[], names: string[]) => setDeleteTarget({ ids, names });

  const handleConfirmDelete = () => {
    if (deleteTarget) deleteMutation.mutate({ ids: deleteTarget.ids });
  };



  const selectedNames = (data?.data || []).filter((c: any) => selectedIds.includes(c.id)).map((c: any) => c.companyName);

  return (
    <div className="animate-fade-in space-y-3">
      {/* Header */}
      <PageHeader
        title="Companies"
        subtitle={`${data?.total || 0} companies in your database`}
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <>
            {isAdmin && (
              <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting} icon={<FileDown className="h-4 w-4" />} className="whitespace-nowrap">
                Export CSV
              </Button>
            )}
            {canAddOrImport && (
              <Button variant="success" size="sm" onClick={() => setImportOpen(true)} icon={<Upload className="h-4 w-4" />} className="whitespace-nowrap">
                Import
              </Button>
            )}
            {canAddOrImport && (
              <Button size="sm" onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />} className="whitespace-nowrap">
                Add Company
              </Button>
            )}
          </>
        }
      />

      {/* Filters — ultra-compact left-aligned toolbar: minimized control
          heights/widths and gaps so every primary filter fits on ONE row at
          1366×768 with no horizontal scrolling. Controls stack full-width on
          mobile and wrap gracefully on narrow screens. */}
      <Card className="px-2 py-1.5">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-44 sm:shrink-0">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={resetPageAndFilter(setSearch)}
              className="input-base py-1.5 pl-8 pr-2 text-xs"
            />
          </div>
          <Select size="sm" value={status} onChange={resetPageAndFilter(setStatus)} className="w-full sm:w-[84px] shrink-0">
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESS">Process</option>
            <option value="REJECT">Reject</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
          <Select size="sm" value={industry} onChange={resetPageAndFilter(setIndustry)} className="w-full sm:w-[100px] shrink-0">
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
          <Select size="sm" value={companyType} onChange={resetPageAndFilter(setCompanyType)} className="w-full sm:w-[80px] shrink-0">
            <option value="">All Types</option>
            <option value="Startup">Startup</option>
            <option value="SME">SME</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Other">Other</option>
          </Select>
          {canManage && (
          <Select size="sm" value={affiliateManager} onChange={resetPageAndFilter(setAffiliateManager)} className="w-full sm:w-[112px] shrink-0">
            <option value="">All Managers</option>
            {(assignableUsersRes?.data || []).map((u: any) => (
            <option value={u.name} key={u.id}>
            {u.name}
          </option>
        ))}
          </Select>
          )}
          <Button variant="secondary" size="sm" onClick={clearFilters} icon={<FilterX className="h-3.5 w-3.5" />} className="h-[30px] w-full shrink-0 whitespace-nowrap px-2.5 sm:w-auto">
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Company Data Table */}
      <Card className="overflow-hidden">
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-start gap-1.5 border-b border-slate-100 bg-rose-50/50 px-5 py-3 sm:gap-2">
            <span className="mr-1 text-sm font-medium text-rose-700">{selectedIds.length} selected</span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="whitespace-nowrap">
              Clear selection
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => openDeleteModal(selectedIds, selectedNames)}
              className="whitespace-nowrap"
            >
              Delete Selected
            </Button>
          </div>
        )}
        <div 
          ref={tableScrollRef}
          className={`table-scroll-container ${isDragging ? 'dragging' : 'can-drag'} ${scrollIndicators.left ? 'can-scroll-left' : ''} ${scrollIndicators.right ? 'can-scroll-right' : ''}`}
          onMouseDown={handleMouseDown}
        >
        <table className="w-full min-w-[2400px] table-auto">
          <thead className="bg-slate-50">
            <tr>
              <Th className="w-[3%]">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  aria-label="Select all companies on this page"
                />
              </Th>
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
                <td colSpan={26} className="p-8">
                  <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-600" /> Loading company data...
                  </div>
                </td>
              </tr>
            ) : !data?.data || data.data.length === 0 ? (
              <tr>
                <td colSpan={26}>
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
                <Td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => handleToggleSelect(c.id)}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    aria-label={`Select ${c.companyName}`}
                  />
                </Td>
                <Td className="text-slate-400">{(page - 1) * 50 + index + 1}</Td>
  <Td className="text-xs font-medium text-slate-500">{c.advertiserId || c.externalId || 'â€”'}</Td>
  <Td>
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-violet-50 text-[10px] font-bold text-brand-600 ring-1 ring-brand-100">
        {(c.companyName || "?").slice(0, 2).toUpperCase()}
      </div>
      <span className="text-sm font-semibold text-slate-900" title={c.companyName}>{c.companyName}</span>
    </div>
  </Td>
  <Td className="text-sm text-slate-700">{c.advertiserName || 'â€”'}</Td>
  <Td>
    {c.website ? (
      <a href={c.website.startsWith("http") ? c.website : "https://" + c.website} target="_blank" rel="noreferrer" className="truncate text-sm text-brand-600 hover:underline" title={c.website}>
        {c.website.replace(/^https?:\/\//, "")}
      </a>
    ) : (
      <span className="text-sm text-slate-300">â€”</span>
    )}
  </Td>
  <Td>
    <span className="truncate text-sm text-slate-700" title={c.contactPersonName}>{c.contactPersonName || "â€”"}</span>
  </Td>
  <Td>
    <span className="truncate text-sm text-slate-500" title={c.phone}>{c.phone || "â€”"}</span>
  </Td>
  <Td>
    {c.whatsappNumber ? (
      <a href={"https://wa.me/" + c.whatsappNumber.replace(/\D/g, "")} target="_blank" rel="noreferrer" className="truncate text-sm text-emerald-600 hover:underline" title={c.whatsappNumber}>
        {c.whatsappNumber}
      </a>
    ) : (
      <span className="text-sm text-slate-300">â€”</span>
    )}
  </Td>
  <Td>
    <span className="truncate text-sm text-slate-500" title={c.telegramTeams}>{c.telegramTeams || "â€”"}</span>
  </Td>
  <Td>
    {c.linkedinUrl ? (
      <a href={c.linkedinUrl.startsWith("http") ? c.linkedinUrl : "https://" + c.linkedinUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
        <Linkedin className="h-4 w-4" />
      </a>
    ) : (
      <span className="text-sm text-slate-300">â€”</span>
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
  <Td><span className="text-sm text-slate-700">{c.employees || "â€”"}</span></Td>
  <Td><span className="text-sm text-slate-700">{c.followers || "â€”"}</span></Td>
  <Td><Badge color="gray">{c.companyType || "N/A"}</Badge></Td>
  <Td><span className="truncate text-sm text-slate-700" title={c.baseGeo}>{c.baseGeo || "â€”"}</span></Td>
  <Td><span className="truncate text-sm text-slate-500" title={c.address}>{c.address || "â€”"}</span></Td>
  <Td><span className="truncate text-sm text-slate-500" title={c.services}>{c.services || "â€”"}</span></Td>
  <Td><span className="truncate text-sm text-slate-500" title={c.technologiesUsed}>{c.technologiesUsed || "â€”"}</span></Td>
  <Td><span className="truncate text-sm text-slate-700" title={c.accountManagerName || c.addedBy?.name}>{c.accountManagerName || c.addedBy?.name || "â€”"}</span></Td>
  <Td><span className="truncate text-sm text-slate-500" title={formatRecordCreated(c)}>{formatRecordCreated(c)}</span></Td>
  <Td><span className="truncate text-sm text-slate-500" title={formatRecordModified(c)}>{formatRecordModified(c)}</span></Td>
  <Td><QualityBadge quality={c.leadQuality} /></Td>
  <Td><StatusBadge status={c.status} /></Td>
  <Td><span className="truncate text-sm text-slate-500" title={c.source}>{c.source || "â€”"}</span></Td>
  <Td className="text-right">
    <div className="flex justify-end gap-0.5">
      <button onClick={(e) => { e.stopPropagation(); setViewCompany(c); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600" title="View details">
        <Eye className="h-4 w-4" />
      </button>
      {canEditRow && (
        <button onClick={(e) => { e.stopPropagation(); setEditCompany(c); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600" title="Edit">
          <Edit2 className="h-4 w-4" />
        </button>
      )}
      {canEditRow && (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleStatus(c); }}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
          title={c.status === "ACTIVE" ? "Deactivate" : "Activate"}
        >
          {c.status === "ACTIVE" ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
        </button>
      )}
      {canDeleteCompany(c) && (
        <button onClick={(e) => { e.stopPropagation(); openDeleteModal([c.id], [c.companyName]); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Delete">
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
          Page <strong>{page}</strong> of <strong>{data?.totalPages || 1}</strong> Â· {data?.total || 0} companies
        </span>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap">Rows per page</span>
            <Select
              value={String(pageSize)}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="w-20 py-1.5 text-sm"
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </Select>
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p: number) => p - 1)} icon={<ChevronLeft className="h-4 w-4" />}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= (data?.totalPages || 1)} onClick={() => setPage((p: number) => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
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
                    by {log.user?.name || 'Unknown'} Â· {formatDateTime(log.createdAt) ?? '—'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => { if (!inlineEditing) setViewCompany(null); }}>
          <div
            className="w-full max-w-2xl max-h-[90vh] animate-slide-up overflow-y-auto rounded-2xl bg-white shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
              <h2 className="text-lg font-bold text-slate-900">{inlineEditing ? 'Edit Company' : 'Company Details'}</h2>
              <div className="flex items-center gap-2">
                {canManage && !inlineEditing && (
                  <Button size="sm" variant="secondary" onClick={startInlineEdit} icon={<Edit2 className="h-4 w-4" />}>
                    Edit
                  </Button>
                )}
                <button onClick={() => setViewCompany(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
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
              {canManage && inlineEditing ? (
                <>
                  <InlineEditGrid form={inlineForm} onChange={handleInlineChange} users={assignableUsersRes?.data || []} />
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DetailItem label="Record Created" value={formatRecordCreated(viewCompany)} />
                    <DetailItem label="Last Modified" value={formatRecordModified(viewCompany)} />
                  </div>
                </>
              ) : (
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
                <DetailItem label="Affiliate Manager" value={viewCompany.accountManagerName || viewCompany.addedBy?.name} />
                <DetailItem label="Address" value={viewCompany.address} />
                <DetailItem label="Services" value={viewCompany.services} />
                <DetailItem label="Revenue" value={viewCompany.revenue} />
                <DetailItem label="Company Size" value={viewCompany.companySize} />
                <DetailItem label="Technologies Used" value={viewCompany.technologiesUsed} />
                <DetailItem label="Target Market" value={viewCompany.targetMarket} />
                <DetailItem label="Record Created" value={formatRecordCreated(viewCompany)} />
                <DetailItem label="Last Modified" value={formatRecordModified(viewCompany)} />
              </div>
              )}

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-brand-600" />
                  <h4 className="text-sm font-semibold text-slate-800">Internal Feedback / Remarks</h4>
                </div>
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                  {feedbackQuery.isError && (
                    <p className="text-xs text-rose-600">Could not load feedback. Please try again.</p>
                  )}
                  {(feedbackQuery.data?.data || []).length === 0 && !feedbackQuery.isError && (
                    <p className="text-xs text-slate-400">No feedback yet.</p>
                  )}
                  {(feedbackQuery.data?.data || []).map((fb: any) => (
                    <div key={fb.id} className="rounded-lg bg-white p-3 shadow-sm">
                      <p className="text-sm text-slate-700">{fb.comment}</p>
                      <p className="mt-1 text-xs text-slate-400">{fb.user?.name || 'Admin'} &middot; {formatDateTime(fb.createdAt) ?? '—'}</p>
                    </div>
                  ))}
                </div>
                {canManage && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Add internal feedback / remark..."
                    />
                    <Button
                      size="sm"
                      loading={feedbackMutation.isPending}
                      onClick={() => { if (viewCompany && feedbackText.trim()) feedbackMutation.mutate({ id: viewCompany.id, comment: feedbackText.trim() }); }}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
              {canManage && inlineEditing && (
                <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
                  {inlineError ? (
                    <p className="text-sm font-medium text-rose-600">{inlineError}</p>
                  ) : (
                    <span className="text-xs text-slate-400">Edits are saved to the company record.</span>
                  )}
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" onClick={cancelInlineEdit} disabled={inlineEditMutation.isPending}>
                      Cancel
                    </Button>
                    <Button loading={inlineEditMutation.isPending} onClick={handleInlineSave} icon={<Save className="h-4 w-4" />}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete companies"
        icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete the selected company(s)? This action cannot be undone.

        </p>
        {deleteTarget && deleteTarget.names.length > 0 && (
          <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto rounded-xl bg-slate-50 p-3">
            {deleteTarget.names.slice(0, 8).map((name: string) => (
              <li key={name} className="truncate text-xs font-medium text-slate-600">{name}</li>
            ))}
            {deleteTarget.names.length > 8 && (
              <li className="text-xs text-slate-400">+{deleteTarget.names.length - 8} more</li>
            )}
          </ul>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={handleConfirmDelete}
            icon={<Trash2 className="h-4 w-4" />}
          >
            Delete
          </Button>
        </div>
      </Modal>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      {/* Create form: employees can now select and update the status.
          Admins may also pick any status. Edit form: same access for all users.
          Affiliate Manager field is only visible to Admin / Super Admin roles. */}
      <CompanyForm open={createOpen} onClose={() => setCreateOpen(false)} canManage={canManage || role === 'EMPLOYEE'} canManageAffiliateManager={canManage} />
      <CompanyForm open={!!editCompany} onClose={() => setEditCompany(null)} editCompany={editCompany} canManage={canManage || role === 'EMPLOYEE'} canManageAffiliateManager={canManage} />
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

// Editable field grid for the inline edit mode of the Company Details modal
// (Admin / Super Admin only). Mirrors the fields and option lists of
// CompanyForm so validation and saved values stay consistent everywhere.
function InlineEditGrid({ form, onChange, users }: {
  form: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  users: any[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Company Name" required>
        <Input name="companyName" value={form.companyName} onChange={onChange} placeholder="Acme Inc." />
      </Field>
      <Field label="Type">
        <Select name="companyType" value={form.companyType} onChange={onChange}>
          <option value="">Select type</option>
          <option value="B2B">B2B</option>
          <option value="B2C">B2C</option>
          <option value="SaaS">SaaS</option>
          <option value="Enterprise">Enterprise</option>
          <option value="Other">Other</option>
        </Select>
      </Field>
      <Field label="Website">
        <Input name="website" value={form.website} onChange={onChange} placeholder="https://acme.com" />
      </Field>
      <Field label="LinkedIn">
        <Input name="linkedinUrl" value={form.linkedinUrl} onChange={onChange} placeholder="linkedin.com/company/acme" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" value={form.email} onChange={onChange} placeholder="info@acme.com" />
      </Field>
      <Field label="Industry">
        <Input name="industry" value={form.industry} onChange={onChange} placeholder="SaaS" />
      </Field>
      <Field label="Employees">
        <Input name="employees" type="number" min={0} value={form.employees} onChange={onChange} />
      </Field>
      <Field label="Followers">
        <Input name="followers" type="number" min={0} value={form.followers} onChange={onChange} />
      </Field>
      <Field label="Base GEO">
        <Input name="baseGeo" value={form.baseGeo} onChange={onChange} placeholder="USA" />
      </Field>
      <Field label="Lead Quality">
        <Select name="leadQuality" value={form.leadQuality} onChange={onChange}>
          <option value="A">A (High)</option>
          <option value="B">B (Medium)</option>
          <option value="C">C (Low)</option>
        </Select>
      </Field>
      <Field label="Status">
        <Select name="status" value={form.status} onChange={onChange}>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESS">Process</option>
          <option value="REJECT">Reject</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </Field>
      <Field label="Affiliate Manager — assign to user (login accounts)">
        <Select
          name="accountManagerName"
          value={users.some((u: any) => u.name === form.accountManagerName) ? form.accountManagerName : form.accountManagerName ? `__custom__:${form.accountManagerName}` : ''}
          onChange={(e) => {
            const v = e.target.value;
            // Legacy free-text value (company imported with a name that no
            // longer matches any login account) is kept selectable so it is
            // never silently wiped on edit.
            onChange({ target: { name: 'accountManagerName', value: v.startsWith('__custom__:') ? v.replace(/^__custom__:/, '') : v } } as any);
          }}
        >
          <option value="">— Select user —</option>
          {users.map((u: any) => (
            <option key={u.id} value={u.name}>
              {u.name} ({u.role === 'ADMIN' ? 'Admin' : 'Employee'})
            </option>
          ))}
          {form.accountManagerName && !users.some((u: any) => u.name === form.accountManagerName) && (
            <option value={`__custom__:${form.accountManagerName}`}>
              {form.accountManagerName} (previous — no login)
            </option>
          )}
        </Select>
      </Field>
      <Field label="Phone">
        <Input name="phone" value={form.phone} onChange={onChange} />
      </Field>
      <Field label="Sales Number">
        <Input name="salesNumber" value={form.salesNumber} onChange={onChange} />
      </Field>
      <Field label="WhatsApp Number">
        <Input name="whatsappNumber" value={form.whatsappNumber} onChange={onChange} />
      </Field>
      <Field label="Telegram / Teams">
        <Input name="telegramTeams" value={form.telegramTeams} onChange={onChange} />
      </Field>
      <Field label="Contact Person Name">
        <Input name="contactPersonName" value={form.contactPersonName} onChange={onChange} />
      </Field>
      <Field label="Contact Person Phone">
        <Input name="contactPersonPhone" value={form.contactPersonPhone} onChange={onChange} />
      </Field>
      <Field label="Advertiser ID">
        <Input name="advertiserId" value={form.advertiserId} onChange={onChange} placeholder="e.g. ADV-1023" />
      </Field>
      <Field label="Advertiser Name">
        <Input name="advertiserName" value={form.advertiserName} onChange={onChange} placeholder="e.g. Acme Advertising" />
      </Field>
      <Field label="Country">
        <Input name="country" value={form.country} onChange={onChange} />
      </Field>
      <Field label="City">
        <Input name="city" value={form.city} onChange={onChange} />
      </Field>
      <Field label="State">
        <Input name="state" value={form.state} onChange={onChange} />
      </Field>
      <Field label="Revenue">
        <Input name="revenue" value={form.revenue} onChange={onChange} />
      </Field>
      <Field label="Company Size">
        <Input name="companySize" value={form.companySize} onChange={onChange} />
      </Field>
      <Field label="Target Market">
        <Input name="targetMarket" value={form.targetMarket} onChange={onChange} />
      </Field>
      <Field label="Technologies Used">
        <Input name="technologiesUsed" value={form.technologiesUsed} onChange={onChange} />
      </Field>
      <Field label="Address">
        <Input name="address" value={form.address} onChange={onChange} />
      </Field>
      <Field label="Services">
        <Input name="services" value={form.services} onChange={onChange} />
      </Field>
    </div>
  );
}

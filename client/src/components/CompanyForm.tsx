import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCompany, updateCompany, getAssignableUsers } from '../lib/api';
import { formatRecordCreated, formatRecordModified } from '../lib/dates';
import { Plus, Save, Building2 } from 'lucide-react';
import { Modal, Field, Input, Select, Button } from './ui';
import { useToast } from './Toast';

interface CompanyFormProps {
  open: boolean;
  onClose: () => void;
  editCompany?: any;
  /** Whether the current user may edit the Status field. */
  canManageStatus?: boolean;
  /** Whether the current user may manage (edit) the company / status. */
  canManage?: boolean;
  /** Whether the current user may view/edit the Affiliate Manager field. */
  canManageAffiliateManager?: boolean;
}

const EMPTY_FORM = {
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
};

// '' / junk → null (column stays empty); '1,200' or ' 50 ' → 1200 / 50.
// Never sends NaN or '' for the Int columns, which the API would reject.
const parseOptionalInt = (v: string): number | null => {
  if (!v || !v.trim()) return null;
  const n = Number(v.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

export default function CompanyForm({ open, onClose, editCompany, canManageStatus = false, canManage = false, canManageAffiliateManager = false }: CompanyFormProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  // Everyone holding a platform LOGIN account who logged in at least once
  // (ADMIN + EMPLOYEE, ACTIVE, lastLogin NOT NULL) — shown in the Affiliate
  // Manager dropdown so a company can be assigned / re-assigned to any such
  // user. Sorted A→Z by the backend.
  const { data: assignableUsersRes } = useQuery({
    queryKey: ['assignableUsers'],
    queryFn: getAssignableUsers,
    enabled: open,
    staleTime: 60_000,
  });
  const assignableUsers: any[] = assignableUsersRes?.data || [];

  useEffect(() => {
    if (editCompany) {
      setForm({
        companyName: editCompany.companyName || '',
        website: editCompany.website || '',
        linkedinUrl: editCompany.linkedinUrl || '',
        email: editCompany.email || '',
        employees: editCompany.employees?.toString() || '',
        followers: editCompany.followers?.toString() || '',
        companyType: editCompany.companyType || '',
        baseGeo: editCompany.baseGeo || '',
        address: editCompany.address || '',
        services: editCompany.services || '',
                industry: editCompany.industry || '',
        leadQuality: editCompany.leadQuality || 'C',
        status: editCompany.status || 'PENDING',
        phone: editCompany.phone || '',
        salesNumber: editCompany.salesNumber || '',
        whatsappNumber: editCompany.whatsappNumber || '',
        telegramTeams: editCompany.telegramTeams || '',
        contactPersonName: editCompany.contactPersonName || '',
        contactPersonPhone: editCompany.contactPersonPhone || '',
        advertiserId: editCompany.advertiserId || '',
        advertiserName: editCompany.advertiserName || '',
        accountManagerName: editCompany.accountManagerName || editCompany.addedBy?.name || '',
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [editCompany, open]);

  const isEdit = !!editCompany;

  const mutation = useMutation({
    mutationFn: (payload: any) => (isEdit ? updateCompany(editCompany.id, payload) : createCompany(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(isEdit ? 'Company updated' : 'Company added', isEdit ? 'Your changes have been saved.' : 'The company was added to your database.');
      handleClose();
    },
    onError: (err: any) => {
      // Surface the backend's real message (validation details, etc.) instead of
      // the generic "Failed to add company." whenever one is available.
      const detail = err?.response?.data?.message || err?.response?.data?.error || '';
      setError(
        isEdit
          ? `Failed to update company.${detail ? ` ${detail}` : ''}`
          : `Failed to add company.${detail ? ` ${detail}` : ''}`
      );
    },
  });

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.companyName.trim()) {
      setError('Company Name is required.');
      return;
    }
    const payload: any = {
      companyName: form.companyName.trim(),
      website: form.website.trim() || null,
      linkedinUrl: form.linkedinUrl.trim() || null,
      email: form.email.trim() || null,
      employees: parseOptionalInt(form.employees),
      followers: parseOptionalInt(form.followers),
      companyType: form.companyType.trim() || null,
      baseGeo: form.baseGeo.trim() || null,
      address: form.address.trim() || null,
      services: form.services.trim() || null,
      industry: form.industry.trim() || null,
            leadQuality: form.leadQuality,
      status: form.status,
      phone: form.phone.trim() || null,
      salesNumber: form.salesNumber.trim() || null,
      whatsappNumber: form.whatsappNumber.trim() || null,
      telegramTeams: form.telegramTeams.trim() || null,
      contactPersonName: form.contactPersonName.trim() || null,
      contactPersonPhone: form.contactPersonPhone.trim() || null,
      advertiserId: form.advertiserId.trim() || null,
      advertiserName: form.advertiserName.trim() || null,
      accountManagerName: form.accountManagerName.trim() || null,
    };
    mutation.mutate(payload);
  };

  const handleClose = () => {
    onClose();
    setForm({ ...EMPTY_FORM });
    setError('');
    mutation.reset();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Company' : 'Add Company'}
      icon={<Building2 className="h-5 w-5 text-brand-600" />}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company Name" required>
            <Input name="companyName" value={form.companyName} onChange={handleChange} placeholder="Acme Inc." required />
          </Field>
          <Field label="Type">
            <Select name="companyType" value={form.companyType} onChange={handleChange}>
              <option value="">Select type</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
              <option value="SaaS">SaaS</option>
              <option value="Enterprise">Enterprise</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
          <Field label="Website">
            <Input name="website" value={form.website} onChange={handleChange} placeholder="https://acme.com" />
          </Field>
          <Field label="LinkedIn">
            <Input name="linkedinUrl" value={form.linkedinUrl} onChange={handleChange} placeholder="linkedin.com/company/acme" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="info@acme.com" />
          </Field>
          <Field label="Industry">
            <Input name="industry" value={form.industry} onChange={handleChange} placeholder="SaaS" />
          </Field>
          <Field label="Employees">
            <Input name="employees" type="number" min={0} value={form.employees} onChange={handleChange} />
          </Field>
          <Field label="Followers">
            <Input name="followers" type="number" min={0} value={form.followers} onChange={handleChange} />
          </Field>
          <Field label="Base GEO">
            <Input name="baseGeo" value={form.baseGeo} onChange={handleChange} placeholder="USA" />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Lead Quality">
            <Select name="leadQuality" value={form.leadQuality} onChange={handleChange}>
              <option value="A">A (High)</option>
              <option value="B">B (Medium)</option>
              <option value="C">C (Low)</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" value={form.status} onChange={handleChange} disabled={!canManageStatus && !canManage} title={canManageStatus || canManage ? undefined : 'Only Admins can change the status'}>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESS">Process</option>
              <option value="REJECT">Reject</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
                    <Field label="Contact Person Name">
            <Input name="contactPersonName" value={form.contactPersonName} onChange={handleChange} />
          </Field>
          <Field label="Contact Person Phone">
            <Input name="contactPersonPhone" value={form.contactPersonPhone} onChange={handleChange} />
          </Field>
          <Field label="Advertiser ID">
            <Input name="advertiserId" value={form.advertiserId} onChange={handleChange} placeholder="e.g. ADV-1023" />
          </Field>
          <Field label="Advertiser Name">
            <Input name="advertiserName" value={form.advertiserName} onChange={handleChange} placeholder="e.g. Acme Advertising" />
          </Field>
          <Field label="Phone">
            <Input name="phone" value={form.phone} onChange={handleChange} />
          </Field>
          <Field label="Telegram / Teams">
            <Input name="telegramTeams" value={form.telegramTeams} onChange={handleChange} />
          </Field>
          <Field label="WhatsApp Number">
            <Input name="whatsappNumber" value={form.whatsappNumber} onChange={handleChange} />
          </Field>
          <Field label="Sales Number">
            <Input name="salesNumber" value={form.salesNumber} onChange={handleChange} />
          </Field>
          {/* Affiliate Manager field is only visible to Admin / Super Admin roles */}
          {canManageAffiliateManager && (
            <Field label="Affiliate Manager — assign to user (login accounts)">
              <Select
                name="accountManagerName"
                value={assignableUsers.some((u: any) => u.name === form.accountManagerName) ? form.accountManagerName : form.accountManagerName ? `__custom__:${form.accountManagerName}` : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  // Legacy free-text value (company imported with a name that no
                  // longer matches any login account) is kept selectable so it is
                  // never silently wiped on edit.
                  setForm((f) => ({ ...f, accountManagerName: v.startsWith('__custom__:') ? v.replace(/^__custom__:/, '') : v }));
                }}
              >
                <option value="">— Select user —</option>
                {assignableUsers.map((u: any) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role === 'ADMIN' ? 'Admin' : 'Employee'})
                  </option>
                ))}
                {form.accountManagerName && !assignableUsers.some((u: any) => u.name === form.accountManagerName) && (
                  <option value={`__custom__:${form.accountManagerName}`}>
                    {form.accountManagerName} (previous — no login)
                  </option>
                )}
              </Select>
            </Field>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Lead Quality">
            <Select name="leadQuality" value={form.leadQuality} onChange={handleChange}>
              <option value="A">A (High)</option>
              <option value="B">B (Medium)</option>
              <option value="C">C (Low)</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select name="status" value={form.status} onChange={handleChange} disabled={!canManageStatus && !canManage} title={canManageStatus || canManage ? undefined : 'Only Admins can change the status'}>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESS">Process</option>
              <option value="REJECT">Reject</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
          <Field label="Address">
            <Input name="address" value={form.address} onChange={handleChange} />
          </Field>
          <Field label="Services">
            <Input name="services" value={form.services} onChange={handleChange} />
          </Field>
        </div>

        {isEdit && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Record Created</p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">{formatRecordCreated(editCompany)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Last Modified</p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">{formatRecordModified(editCompany)}</p>
            </div>
          </div>
        )}

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending} icon={isEdit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}>
            {isEdit ? 'Update' : 'Add Company'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

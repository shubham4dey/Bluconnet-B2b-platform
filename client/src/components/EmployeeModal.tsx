import React, { useState } from 'react';
import { UserPlus, UserCog } from 'lucide-react';
import { Modal, Field, Input, Select, Button } from './ui';

interface EmployeeModalProps {
  employee?: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading?: boolean;
  title: string;
}

export default function EmployeeModal({ employee, onClose, onSubmit, loading, title }: EmployeeModalProps) {
  const [form, setForm] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    password: '',
    role: employee?.role || 'EMPLOYEE',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload: any = { name: form.name, email: form.email, role: form.role };
    if (!employee && form.password) payload.password = form.password;
    if (!employee && !form.password) {
      setError('Password is required for new employees.');
      return;
    }
    onSubmit(payload);
  };

  return (
    <Modal open onClose={onClose} title={title} icon={employee ? <UserCog className="h-5 w-5 text-brand-600" /> : <UserPlus className="h-5 w-5 text-brand-600" />}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Cooper" required />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jane@company.com"
            required
          />
        </Field>
        {!employee && (
          <Field label="Password" required hint="Minimum 6 characters">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              minLength={6}
            />
          </Field>
        )}
        <Field label="Role" required>
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </Field>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {employee ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

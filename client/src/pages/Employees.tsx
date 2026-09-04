import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEmployees, createEmployee, updateEmployee, toggleEmployeeStatus, deleteEmployee } from '../lib/api';
import { Plus, Edit2, Trash2, UserCheck, UserX, Key, Users, Loader2 } from 'lucide-react';
import EmployeeModal from '../components/EmployeeModal';
import PasswordModal from '../components/PasswordModal';
import { PageHeader, Card, Button, Badge, Th, Td, EmptyState } from '../components/ui';
import { useToast } from '../components/Toast';

export default function Employees() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [passwordEmployee, setPasswordEmployee] = useState<any>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });
  const employees = data?.data || [];

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowCreate(false);
      toast.success('Employee created', 'The new team member has been added.');
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data: d }: any) => updateEmployee(id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditingEmployee(null);
      toast.success('Employee updated', 'Changes have been saved.');
    },
  });
  const toggleMutation = useMutation({
    mutationFn: toggleEmployeeStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Status changed', 'The employee access status was updated.');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee removed', 'The account has been deleted.');
    },
  });

  const roleColor = (role: string) =>
    role === 'SUPER_ADMIN' ? 'purple' : role === 'ADMIN' ? 'indigo' : 'gray';

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Employee Management"
        subtitle={`${employees.length} team members with platform access`}
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button onClick={() => setShowCreate(true)} icon={<Plus className="h-4 w-4" />}>
            Create Employee
          </Button>
        }
      />

      <Card className="overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-slate-50">
              <tr>
                <Th className="w-[22%]">Name</Th>
                <Th className="w-[28%]">Email</Th>
                <Th className="w-[14%]">Role</Th>
                <Th className="w-[12%]">Status</Th>
                <Th className="hidden w-[14%] lg:table-cell">Last Login</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin text-brand-600" /> Loading employees...
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<Users className="h-6 w-6" />}
                      title="No employees yet"
                      message="Create your first team member to grant platform access."
                    />
                  </td>
                </tr>
              ) : (
                employees.map((emp: any) => (
                  <tr key={emp.id} className="transition-colors hover:bg-slate-50/70">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-[11px] font-bold text-white">
                          {emp.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <span className="truncate text-sm font-semibold text-slate-900" title={emp.name}>{emp.name}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className="block truncate text-slate-600" title={emp.email}>{emp.email}</span>
                    </Td>
                    <Td>
                      <Badge color={roleColor(emp.role)}>{emp.role.replace('_', ' ')}</Badge>
                    </Td>
                    <Td>
                      <Badge color={emp.status === 'ACTIVE' ? 'green' : 'red'}>
                        {emp.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </Badge>
                    </Td>
                    <Td className="hidden text-sm text-slate-500 lg:table-cell">
                      {emp.lastLogin ? new Date(emp.lastLogin).toLocaleDateString() : 'Never'}
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <button onClick={() => setEditingEmployee(emp)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setPasswordEmployee(emp)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600" title="Change password">
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate(emp.id)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                          title={emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          {emp.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this employee?')) deleteMutation.mutate(emp.id);
                          }}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
                                </table>
          </Card>

      {showCreate && (
        <EmployeeModal
          onClose={() => setShowCreate(false)}
          onSubmit={(d: any) => createMutation.mutate(d)}
          loading={createMutation.isPending}
          title="Create Employee"
        />
      )}
      {editingEmployee && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSubmit={(d: any) => updateMutation.mutate({ id: editingEmployee.id, data: d })}
          loading={updateMutation.isPending}
          title="Edit Employee"
        />
      )}
      {passwordEmployee && <PasswordModal employee={passwordEmployee} onClose={() => setPasswordEmployee(null)} />}
    </div>
  );
}

import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { changeEmployeePassword } from '../lib/api';
import { Modal, Field, Input, Button } from './ui';
import { useToast } from './Toast';

export default function PasswordModal({ employee, onClose }: any) {
  const [password, setPassword] = useState('');
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: () => changeEmployeePassword(employee.id, password),
    onSuccess: () => {
      toast.success('Password changed', 'The new password is now active.');
      onClose();
    },
    onError: () => toast.error('Failed to change password', 'Please try again.'),
  });

  return (
    <Modal open onClose={onClose} title="Change Password" icon={<KeyRound className="h-5 w-5 text-brand-600" />}>
      <p className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Updating password for <strong className="text-slate-800">{employee.email}</strong>
      </p>
      <Field label="New password" required hint="Minimum 6 characters">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoFocus
        />
      </Field>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={password.length < 6}
        >
          Change
        </Button>
      </div>
    </Modal>
  );
}

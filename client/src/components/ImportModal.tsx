import React, { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importCompanies } from '../lib/api';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal, Button, Badge } from './ui';
import { useToast } from './Toast';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  /** Whether to show the "Update existing" option. Default: true */
  showUpdateOption?: boolean;
}

interface ImportResult {
  totalRows: number;
  imported: number;
  updated: number;
  duplicates: number;
  failed: number;
  status: string;
  failedRows?: { row: number; reason: string }[];
}

export default function ImportModal({ open, onClose, showUpdateOption = true }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip');
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: ({ f, action }: { f: File; action: 'skip' | 'update' }) => importCompanies(f, action),
    onSuccess: (data: any) => {
      // failedRows (per-row failure reasons) lives at the top level of the API
      // response — merge it into the result so the UI can show why rows failed.
      setResult({ ...data.data, failedRows: data.failedRows ?? data.data?.failedRows });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['importLogs'] });
      if (data.data?.status === 'FAILED') {
        toast.error('Import failed', `${data.data?.failed || 0} of ${data.data?.totalRows || 0} rows could not be imported.`);
      } else {
        toast.success('Import complete', `${data.data?.imported || 0} records imported.`);
      }
    },
    onError: (err: any) => {
      setResult(null);
      const detail = err?.response?.data?.message || err?.response?.data?.error || '';
      toast.error('Import failed', detail || 'Could not process the file. Please check the format.');
    },
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    mutation.mutate({ f: file, action: duplicateAction });
  };

  const handleClose = () => {
    onClose();
    setFile(null);
    setResult(null);
    mutation.reset();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Companies" icon={<Upload className="h-5 w-5 text-brand-600" />}>
      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File dropzone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 transition-colors hover:border-brand-400 hover:bg-brand-50/40"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB · click to change</p>
              </>
            ) : (
              <>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-colors group-hover:bg-brand-100 group-hover:text-brand-600">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Click to select a file</p>
                <p className="mt-0.5 text-xs text-slate-400">Supports .csv, .xlsx, .xls · up to 5MB</p>
              </>
            )}
          </button>

          {/* Duplicate handling */}
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Duplicate handling</p>
            <div className={`grid gap-2 ${showUpdateOption ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              <label
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  duplicateAction === 'skip' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <input type="radio" name="dup" value="skip" checked={duplicateAction === 'skip'} onChange={() => setDuplicateAction('skip')} className="accent-brand-600" />
                Skip duplicates
              </label>
              {showUpdateOption && (
                <label
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    duplicateAction === 'update' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input type="radio" name="dup" value="update" checked={duplicateAction === 'update'} onChange={() => setDuplicateAction('update')} className="accent-brand-600" />
                  Update existing
                </label>
              )}
            </div>
          </div>

          {mutation.isError && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Import failed. Please check your file and try again.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file} loading={mutation.isPending} icon={<Upload className="h-4 w-4" />}>
              {mutation.isPending ? 'Importing…' : 'Start Import'}
            </Button>
          </div>
        </form>
      ) : (
<div className="space-y-5">
          <div
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold ${
              result.status === 'FAILED'
                ? 'bg-rose-50 text-rose-700'
                : result.status === 'PARTIAL'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {result.status === 'FAILED' ? (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            )}
            {result.status === 'FAILED'
              ? `Import failed — ${result.failed} of ${result.totalRows} rows could not be imported`
              : result.status === 'PARTIAL'
              ? `Import partially completed — ${result.failed} row${result.failed === 1 ? '' : 's'} failed`
              : 'Import completed successfully'}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ResultStat label="Total rows" value={result.totalRows} />
            <ResultStat label="Imported" value={result.imported} color="green" />
            <ResultStat label="Updated" value={result.updated} color="blue" />
            <ResultStat label="Duplicates" value={result.duplicates} color="amber" />
            <ResultStat label="Failed" value={result.failed} color="rose" />
          </div>

          {result.failedRows && result.failedRows.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-rose-700">Failed rows</p>
              <div className="space-y-1.5">
                {result.failedRows.map((f, idx) => (
                  <div key={idx} className="text-xs text-rose-700">
                    <Badge color="red">Row {f.row}</Badge> <span className="ml-1">{f.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ResultStat({ label, value, color = 'slate' }: { label: string; value: number; color?: string }) {
  const colorMap: Record<string, string> = {
    slate: 'text-slate-800',
    green: 'text-emerald-600',
    blue: 'text-brand-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
  };
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-4 text-center">
      <div className={`text-2xl font-bold ${colorMap[color]}`}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-400">{label}</div>
    </div>
  );
}
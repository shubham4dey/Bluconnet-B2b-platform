import React from 'react';
import { X, Loader2 } from 'lucide-react';

/* ---------------------- Card ---------------------- */
export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>;
}

/* ---------------------- Button ---------------------- */
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500/20',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-500/10',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500/20',
  ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500/20',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-sm',
};

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold shadow-sm transition-all duration-150 hover:shadow-md focus:outline-none focus:ring-4 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* ---------------------- Badge ---------------------- */
const badgeColors: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  blue: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  red: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
  gray: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10',
  purple: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
};

export function Badge({ color = 'gray', children, className = '' }: { color?: string; children: React.ReactNode; className?: string }) {
  return <span className={`badge ${badgeColors[color] || badgeColors.gray} ${className}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; dot: string }> = {
    ACTIVE: { color: 'green', dot: 'bg-emerald-500' },
    PENDING: { color: 'amber', dot: 'bg-amber-500' },
    PROCESS: { color: 'indigo', dot: 'bg-indigo-500' },
    REJECT: { color: 'red', dot: 'bg-rose-500' },
    INACTIVE: { color: 'gray', dot: 'bg-slate-400' },
  };
  const cfg = map[status] || { color: 'gray', dot: 'bg-slate-400' };
  return (
    <Badge color={cfg.color}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </Badge>
  );
}

export function QualityBadge({ quality }: { quality: string }) {
  const map: Record<string, { color: string; label: string }> = {
    A: { color: 'green', label: 'A' },
    B: { color: 'amber', label: 'B' },
    C: { color: 'red', label: 'C' },
  };
  const cfg = map[quality] || { color: 'gray', label: quality || 'N/A' };
  return <Badge color={cfg.color}>{cfg.label}</Badge>;
}

/* ---------------------- Modal ---------------------- */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, icon, children, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full ${maxWidth} max-h-[90vh] animate-slide-up overflow-y-auto rounded-2xl bg-white shadow-modal`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 px-6 py-4 backdrop-blur">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-900">
            {icon}
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------------------- Form primitives ---------------------- */
export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => <input ref={ref} className={`input-base ${className}`} {...props} />
);
Input.displayName = 'Input';

export function Select({
  className = '',
  size = 'md',
  children,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { size?: 'sm' | 'md' }) {
  // 'sm' renders an ultra-compact control (30px tall) for filter toolbars;
  // 'md' (default) keeps the original styling so existing usages are unchanged.
  // `size` is destructured so it never leaks into the DOM as the native
  // <select size> attribute (which would turn the dropdown into a listbox).
  const sizeClasses = size === 'sm' ? 'px-2 py-1.5 pr-2 text-xs' : 'pr-10';
  return (
    <select className={`input-base appearance-none ${sizeClasses} ${className}`} {...props}>
      {children}
    </select>
  );
}

/* ---------------------- PageHeader ---------------------- */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    // Single left-aligned action bar: the title block and the action buttons
    // share one row that starts at the left edge (no justify-between), so the
    // buttons sit right after the title instead of being pushed to the far
    // right. When space runs out, the action bar wraps neatly below the title
    // (still left-aligned) instead of forcing horizontal scrolling.
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 shadow-sm ring-1 ring-brand-600/10">{icon}</div>}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        // Compact, consistent, wrap-friendly button bar (flex-1 lets it use the
        // remaining space next to the title and drop to its own full-width,
        // left-aligned row on narrow screens).
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-1.5 sm:gap-2">{actions}</div>
      )}
    </div>
  );
}

/* ---------------------- StatCard ---------------------- */
interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  gradient: string;
  hint?: string;
  onClick?: () => void;
}

export function StatCard({ label, value, icon, gradient, hint, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${gradient}`}>{icon}</div>
      </div>
      <div className={`pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full opacity-10 ${gradient}`} />
    </div>
  );
}

/* ---------------------- Skeleton ---------------------- */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/* ---------------------- EmptyState ---------------------- */
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">{icon}</div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------------- Table helpers ---------------------- */
export function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '', ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-3.5 align-middle text-sm text-slate-700 whitespace-normal break-words ${className}`} {...rest}>{children}</td>;
}

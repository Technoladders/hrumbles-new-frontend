// src/components/sales/contacts-v2/filters/FilterSection.tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  activeCount?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string; // tailwind color class like 'text-blue-400'
}

export function FilterSection({
  title,
  icon,
  activeCount = 0,
  children,
  defaultOpen = false,
  accentColor = 'text-slate-400',
}: FilterSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-slate-800/60 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors',
          'hover:bg-slate-800/40 focus:outline-none',
          open && 'bg-slate-800/20'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn('flex-shrink-0', accentColor)}>{icon}</span>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-300 truncate">
            {title}
          </span>
          {activeCount > 0 && (
            <span className="flex-shrink-0 h-4 min-w-[16px] px-1 rounded-full bg-violet-500 text-white text-[9px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <ChevronDown
          size={13}
          className={cn(
            'flex-shrink-0 text-slate-500 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-3 pt-1 space-y-1.5">{children}</div>
      </div>
    </div>
  );
}

// ─── Shared checkbox item ─────────────────────────────────────────────────────

interface FilterCheckItemProps {
  id: string;
  label: string;
  count?: number;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function FilterCheckItem({ id, label, count, checked, onChange }: FilterCheckItemProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors group',
        checked ? 'bg-violet-500/15 text-violet-300' : 'hover:bg-slate-800/60 text-slate-400'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={cn(
            'h-3.5 w-3.5 rounded flex-shrink-0 border transition-colors flex items-center justify-center',
            checked
              ? 'bg-violet-500 border-violet-500'
              : 'border-slate-600 group-hover:border-slate-400'
          )}
        >
          {checked && (
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <span className="text-xs truncate">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className={cn(
          'text-[9px] tabular-nums px-1.5 py-0.5 rounded-full flex-shrink-0',
          checked ? 'bg-violet-500/30 text-violet-300' : 'bg-slate-800 text-slate-500'
        )}>
          {count.toLocaleString()}
        </span>
      )}
    </label>
  );
}
// src/components/sales/contacts-v2/cells/PhoneCell.tsx
import React, { useState } from 'react';
import { Phone, Zap, Copy, Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parsePhoneNumber } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';

interface PhoneCellProps {
  mobile?: string | null;
  allPhones?: any[];
  contactId: string;
  apolloPersonId?: string | null;
  isDiscovery?: boolean;
  hasPhone?: boolean;
  onEnrich?: (contactId: string, apolloId: string | null, type: 'phone') => void;
}

function FlagIcon({ number }: { number: string }) {
  try {
    const parsed = parsePhoneNumber(number);
    if (parsed?.country) {
      const FlagComponent = (flags as any)[parsed.country];
      if (FlagComponent) return <FlagComponent title={parsed.country} className="w-3.5 h-2.5 rounded-[1px]" />;
    }
  } catch {}
  return <Globe size={10} className="text-slate-500" />;
}

export function PhoneCell({ mobile, allPhones, contactId, apolloPersonId, isDiscovery, hasPhone, onEnrich }: PhoneCellProps) {
  const [copied, setCopied] = useState(false);
  const count = allPhones?.length || 0;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mobile) {
      navigator.clipboard.writeText(mobile);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (isDiscovery) {
    return (
      <div className="flex items-center gap-1.5">
        <div className={cn('flex items-center justify-center h-5 w-5 rounded-full', hasPhone ? 'bg-sky-500/20' : 'bg-slate-700/60')}>
          <Phone size={10} className={hasPhone ? 'text-sky-400' : 'text-slate-600'} />
        </div>
        {hasPhone && <span className="text-[9px] text-sky-400 font-medium">Available</span>}
      </div>
    );
  }

  if (!mobile && count === 0) {
    return (
      <button
        onClick={() => onEnrich?.(contactId, apolloPersonId || null, 'phone')}
        className="flex items-center gap-1 px-2 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-[10px] font-medium"
      >
        <Zap size={9} />
        Access
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group cursor-default min-w-0">
      {mobile && (
        <div className="flex items-center justify-center h-4 w-5 flex-shrink-0">
          <FlagIcon number={mobile} />
        </div>
      )}
      <span className="text-[11px] text-slate-300 truncate font-mono">{mobile}</span>
      {count > 1 && <span className="flex-shrink-0 text-[9px] bg-slate-700 text-slate-400 px-1 rounded-full">+{count - 1}</span>}
      <button
        onClick={handleCopy}
        className="flex-shrink-0 p-0.5 rounded text-slate-600 hover:text-slate-300 transition-all opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check size={9} className="text-emerald-400" /> : <Copy size={9} />}
      </button>
    </div>
  );
}
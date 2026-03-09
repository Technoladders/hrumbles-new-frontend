// src/components/sales/contacts-v2/cells/EmailCell.tsx
import React, { useState } from 'react';
import { Mail, Zap, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EmailCellProps {
  email?: string | null;
  allEmails?: any[];
  contactId: string;
  apolloPersonId?: string | null;
  isDiscovery?: boolean;
  hasEmail?: boolean;
  onEnrich?: (contactId: string, apolloId: string | null, type: 'email') => void;
}

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  verified:   { dot: 'bg-emerald-400', label: 'Verified' },
  unverified: { dot: 'bg-amber-400',   label: 'Unverified' },
  incorrect:  { dot: 'bg-red-400',     label: 'Incorrect' },
  likely:     { dot: 'bg-sky-400',     label: 'Likely valid' },
};

export function EmailCell({ email, allEmails, contactId, apolloPersonId, isDiscovery, hasEmail, onEnrich }: EmailCellProps) {
  const [copied, setCopied] = useState(false);

  const primaryStatus = allEmails?.[0]?.email_status || 'unverified';
  const cfg = STATUS_CONFIG[primaryStatus] || STATUS_CONFIG.unverified;
  const count = allEmails?.length || 0;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (email) {
      navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Discovery row — show availability badge
  if (isDiscovery) {
    return (
      <div className="flex items-center gap-1.5">
        <div className={cn(
          'flex items-center justify-center h-5 w-5 rounded-full',
          hasEmail ? 'bg-emerald-500/20' : 'bg-slate-700/60'
        )}>
          <Mail size={10} className={hasEmail ? 'text-emerald-400' : 'text-slate-600'} />
        </div>
        {hasEmail && (
          <span className="text-[9px] text-emerald-400 font-medium">Available</span>
        )}
      </div>
    );
  }

  // No email — show enrich button
  if (!email && count === 0) {
    return (
      <button
        onClick={() => onEnrich?.(contactId, apolloPersonId || null, 'email')}
        className="flex items-center gap-1 px-2 h-6 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors text-[10px] font-medium"
      >
        <Zap size={9} />
        Access
      </button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 group cursor-default min-w-0">
            <div className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', cfg.dot)} />
            <span className="text-[11px] text-slate-300 truncate font-mono">{email}</span>
            {count > 1 && (
              <span className="flex-shrink-0 text-[9px] bg-slate-700 text-slate-400 px-1 rounded-full">+{count - 1}</span>
            )}
            <button
              onClick={handleCopy}
              className="flex-shrink-0 ml-0.5 p-0.5 rounded text-slate-600 hover:text-slate-300 transition-all opacity-0 group-hover:opacity-100"
            >
              {copied ? <Check size={9} className="text-emerald-400" /> : <Copy size={9} />}
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] bg-slate-800 border-slate-700 text-slate-200">
          {cfg.label} · Click to copy
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
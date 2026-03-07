// src/components/sales/contacts-v2/cells/CompanyCell.tsx
import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyCellProps {
  companyName?: string | null;
  companyLogo?: string | null;
  companyDomain?: string | null;
  companyId?: number | null;
}

export function CompanyCell({ companyName, companyLogo, companyDomain, companyId }: CompanyCellProps) {
  const [imgError, setImgError] = useState(false);

  if (!companyName) {
    return <span className="text-slate-700 text-[11px]">—</span>;
  }

  // Try logo_url first, then clearbit favicon as fallback
  const logoSrc = (!imgError && companyLogo)
    ? companyLogo
    : companyDomain
      ? `https://logo.clearbit.com/${companyDomain}`
      : null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="h-5 w-5 flex-shrink-0 rounded overflow-hidden bg-slate-800 flex items-center justify-center border border-slate-700/50">
        {logoSrc && !imgError ? (
          <img
            src={logoSrc}
            alt={companyName}
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <Building2 size={11} className="text-slate-500" />
        )}
      </div>
      <span className="text-[11px] text-slate-300 truncate" title={companyName}>
        {companyName}
      </span>
    </div>
  );
}
// src/components/sales/contacts-v2/cells/NameCell.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NameCellProps {
  name: string;
  photoUrl?: string | null;
  linkedinUrl?: string | null;
  id: string;
  isDiscovery?: boolean;
}

export function NameCell({ name, photoUrl, linkedinUrl, id, isDiscovery }: NameCellProps) {
  const initials = name
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="flex items-center gap-2.5 min-w-0 py-0.5">
      <Avatar className={cn('h-7 w-7 rounded-lg flex-shrink-0 border', isDiscovery ? 'border-violet-500/30' : 'border-slate-700/60')}>
        <AvatarImage src={photoUrl || undefined} className="object-cover" />
        <AvatarFallback className={cn('text-[9px] font-bold rounded-lg', isDiscovery ? 'bg-violet-900/60 text-violet-300' : 'bg-slate-700 text-slate-300')}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        {isDiscovery ? (
          <span className="text-[11px] font-semibold text-slate-200 truncate" title={name}>{name}</span>
        ) : (
          <Link
            to={`/contacts/${id}`}
            className="text-[11px] font-semibold text-slate-200 hover:text-violet-400 truncate transition-colors"
            title={name}
          >
            {name}
          </Link>
        )}
        {linkedinUrl && (
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[9px] text-slate-600 hover:text-[#0A66C2] transition-colors mt-0.5"
            onClick={e => e.stopPropagation()}
          >
            <Linkedin size={8} />
            <span>LinkedIn</span>
          </a>
        )}
      </div>
    </div>
  );
}
// src/components/sales/contacts-v2/ContactsV2Table.tsx
"use client";

import React, { useRef, useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSelectedId, clearSelection, setSelectedIds } from '@/Redux/contactsV2Slice';
import { cn } from '@/lib/utils';
import { NameCell } from './cells/NameCell';
import { EmailCell } from './cells/EmailCell';
import { PhoneCell } from './cells/PhoneCell';
import { CompanyCell } from './cells/CompanyCell';
import { ContactV2Row } from '@/hooks/sales/useContactsV2';
import {
  Eye, ListPlus, ShieldCheck, Trash2, MapPin, Zap,
  Mail, Phone, Building2, CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 44;

// ─── Data Availability Cell (discovery) ──────────────────────────────────────

function DataAvailabilityCell({ row }: { row: ContactV2Row }) {
  const icons = [
    { icon: Mail, available: row.has_email, label: 'Email', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { icon: Phone, available: row.has_phone, label: 'Phone', color: 'text-sky-400', bg: 'bg-sky-500/15' },
    { icon: MapPin, available: !!(row.city || row.country), label: 'Location', color: 'text-amber-400', bg: 'bg-amber-500/15' },
    { icon: Building2, available: !!row.company_name, label: 'Company', color: 'text-violet-400', bg: 'bg-violet-500/15' },
  ];
  return (
    <div className="flex items-center gap-1">
      {icons.map(({ icon: Icon, available, label, color, bg }) => (
        <TooltipProvider key={label}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn('h-6 w-6 rounded-full flex items-center justify-center transition-colors', available ? bg : 'bg-slate-800/60')}>
                <Icon size={11} className={available ? color : 'text-slate-700'} />
              </div>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] bg-slate-800 border-slate-700 text-slate-200">
              {available ? `${label} available` : `No ${label.toLowerCase()}`}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

// ─── Stage Badge ──────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  'New Lead': 'bg-sky-500/15 text-sky-300 border-sky-500/20',
  'Contacted': 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  'Qualified': 'bg-violet-500/15 text-violet-300 border-violet-500/20',
  'Proposal': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'Negotiation': 'bg-orange-500/15 text-orange-300 border-orange-500/20',
  'Won': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Lost': 'bg-red-500/15 text-red-300 border-red-500/20',
};

function StageBadge({ stage }: { stage?: string | null }) {
  if (!stage) return <span className="text-slate-700 text-[10px]">—</span>;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border', STAGE_COLORS[stage] || 'bg-slate-700/40 text-slate-400 border-slate-600/40')}>
      {stage}
    </span>
  );
}

// ─── Action Cell ─────────────────────────────────────────────────────────────

function ActionCell({
  row,
  onAddToList,
  onEnrich,
  onSaveDiscovery,
}: {
  row: ContactV2Row;
  onAddToList?: (contact: ContactV2Row) => void;
  onEnrich?: (contactId: string, apolloId: string | null, type: 'email' | 'phone') => void;
  onSaveDiscovery?: (person: any) => void;
}) {
  if (row.is_discovery) {
    return (
      <div className="flex items-center justify-end gap-0.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onAddToList?.(row)}
                className="h-6 w-6 flex items-center justify-center rounded-md text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
              >
                <ListPlus size={13} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] bg-slate-800 border-slate-700">Add to List</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSaveDiscovery?.(row.original_data)}
                className="h-6 w-6 flex items-center justify-center rounded-md text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                <CheckCircle2 size={13} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] bg-slate-800 border-slate-700">Save to CRM</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to={`/contacts/${row.id}`} className="h-6 w-6 flex items-center justify-center rounded-md text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors">
              <Eye size={13} />
            </Link>
          </TooltipTrigger>
          <TooltipContent className="text-[10px] bg-slate-800 border-slate-700">View Profile</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onAddToList?.(row)}
              className="h-6 w-6 flex items-center justify-center rounded-md text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
            >
              <ListPlus size={13} />
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-[10px] bg-slate-800 border-slate-700">Add to List</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onEnrich?.(row.id, row.apollo_person_id || null, 'email')}
              className="h-6 w-6 flex items-center justify-center rounded-md text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <ShieldCheck size={13} />
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-[10px] bg-slate-800 border-slate-700">Verify / Enrich</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ─── Main Table ───────────────────────────────────────────────────────────────

interface ContactsV2TableProps {
  data: ContactV2Row[];
  isLoading?: boolean;
  isFetching?: boolean;
  hasSearched?: boolean;
  onAddToList?: (contact: ContactV2Row) => void;
  onEnrich?: (contactId: string, apolloId: string | null, type: 'email' | 'phone') => void;
  onSaveDiscovery?: (person: any) => void;
}

export function ContactsV2Table({
  data,
  isLoading,
  isFetching,
  hasSearched,
  onAddToList,
  onEnrich,
  onSaveDiscovery,
}: ContactsV2TableProps) {
  const dispatch = useDispatch();
  const { selectedIds, mode } = useSelector((state: any) => state.contactsV2);
  const isDiscovery = mode === 'discovery';

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Column Definitions ────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<ContactV2Row>[]>(() => [
    // Checkbox
    {
      id: 'select',
      size: 40,
      header: ({ table }) => (
        <div className="flex justify-center">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded accent-violet-500 cursor-pointer"
            checked={data.length > 0 && selectedIds.length === data.length}
            onChange={e => {
              if (e.target.checked) dispatch(setSelectedIds(data.map(r => r.id)));
              else dispatch(clearSelection());
            }}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded accent-violet-500 cursor-pointer"
            checked={selectedIds.includes(row.original.id)}
            onChange={() => dispatch(toggleSelectedId(row.original.id))}
            onClick={e => e.stopPropagation()}
          />
        </div>
      ),
    },

    // Name
    {
      id: 'name',
      accessorKey: 'name',
      size: 200,
      header: () => <span>Name</span>,
      cell: ({ row }) => (
        <NameCell
          name={row.original.name}
          photoUrl={row.original.photo_url}
          linkedinUrl={row.original.linkedin_url}
          id={row.original.id}
          isDiscovery={row.original.is_discovery}
        />
      ),
    },

    // Job Title
    {
      id: 'job_title',
      accessorKey: 'job_title',
      size: 170,
      header: () => <span>Title</span>,
      cell: ({ getValue }) => (
        <span className="text-[11px] text-slate-400 truncate">{getValue() as string || '—'}</span>
      ),
    },

    // Company
    {
      id: 'company',
      size: 170,
      header: () => <span>Company</span>,
      cell: ({ row }) => (
        <CompanyCell
          companyName={row.original.company_name}
          companyLogo={row.original.company_logo}
          companyDomain={row.original.company_domain}
          companyId={row.original.company_id ?? undefined}
        />
      ),
    },

    // Email / Data Availability
    {
      id: 'email',
      size: isDiscovery ? 140 : 210,
      header: () => <span>{isDiscovery ? 'Data' : 'Email'}</span>,
      cell: ({ row }) =>
        isDiscovery ? (
          <DataAvailabilityCell row={row.original} />
        ) : (
          <EmailCell
            email={row.original.email}
            allEmails={row.original.all_emails}
            contactId={row.original.id}
            apolloPersonId={row.original.apollo_person_id}
            onEnrich={onEnrich}
          />
        ),
    },

    // Phone (CRM only)
    ...(!isDiscovery ? [{
      id: 'mobile',
      size: 170,
      header: () => <span>Phone</span>,
      cell: ({ row }: any) => (
        <PhoneCell
          mobile={row.original.mobile}
          allPhones={row.original.all_phones}
          contactId={row.original.id}
          apolloPersonId={row.original.apollo_person_id}
          onEnrich={onEnrich}
        />
      ),
    }] : []),

    // Location
    {
      id: 'location',
      size: 140,
      header: () => <span>Location</span>,
      cell: ({ row }) => {
        const parts = [row.original.city, row.original.country].filter(Boolean).join(', ');
        return <span className="text-[11px] text-slate-500 truncate">{parts || '—'}</span>;
      },
    },

    // Stage (CRM only)
    ...(!isDiscovery ? [{
      id: 'stage',
      size: 120,
      header: () => <span>Stage</span>,
      cell: ({ row }: any) => <StageBadge stage={row.original.contact_stage} />,
    }] : []),

    // Seniority
    {
      id: 'seniority',
      size: 100,
      header: () => <span>Seniority</span>,
      cell: ({ row }) => (
        <span className="text-[11px] text-slate-500 capitalize">{row.original.seniority || '—'}</span>
      ),
    },

    // Actions
    {
      id: 'actions',
      size: 90,
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => (
        <ActionCell
          row={row.original}
          onAddToList={onAddToList}
          onEnrich={onEnrich}
          onSaveDiscovery={onSaveDiscovery}
        />
      ),
    },
  ], [data, selectedIds, isDiscovery, onAddToList, onEnrich, onSaveDiscovery, dispatch]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: { minSize: 60 },
  });

  const { rows } = table.getRowModel();

  // ── Virtualizer ───────────────────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  // ── Empty States ─────────────────────────────────────────────────────────
  if (!hasSearched) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
        <div className="h-16 w-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5">
          <Zap className="h-7 w-7 text-violet-400" />
        </div>
        <h3 className="text-base font-bold text-slate-300 mb-1.5">
          {isDiscovery ? 'Search 275M+ Contacts' : 'Filter to find contacts'}
        </h3>
        <p className="text-sm text-slate-600 max-w-xs">
          {isDiscovery
            ? 'Set your filters in the sidebar and click Run Search to find verified contacts.'
            : 'Use the filters in the sidebar and click Run Search to load results.'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
        <div className="h-8 w-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
        <span className="text-xs font-medium">Loading contacts…</span>
      </div>
    );
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
        <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
          <span className="text-2xl">🔍</span>
        </div>
        <h3 className="text-sm font-bold text-slate-400 mb-1">No results found</h3>
        <p className="text-xs text-slate-600">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex-1 overflow-auto transition-opacity duration-200',
        isFetching && !isLoading ? 'opacity-60 pointer-events-none' : 'opacity-100'
      )}
    >
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        {/* THEAD */}
        <thead className="sticky top-0 z-20">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id} className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
              {hg.headers.map(header => (
                <th
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className={cn(
                    'px-3 py-2.5 text-left',
                    'text-[10px] font-semibold uppercase tracking-widest text-slate-500',
                    'border-r border-slate-800/60 last:border-r-0',
                    header.id === 'select' && 'text-center',
                  )}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        {/* TBODY — virtualized */}
        <tbody>
          {/* Spacer top */}
          {virtualRows.length > 0 && (
            <tr style={{ height: virtualRows[0]?.start ?? 0 }}>
              <td colSpan={columns.length} />
            </tr>
          )}

          {virtualRows.map(virtualRow => {
            const row = rows[virtualRow.index];
            const isSelected = selectedIds.includes(row.original.id);
            const isDiscRow = row.original.is_discovery;

            return (
              <tr
                key={row.id}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                className={cn(
                  'group border-b border-slate-800/40 transition-colors',
                  isSelected
                    ? 'bg-violet-500/8'
                    : isDiscRow
                      ? 'hover:bg-slate-800/40'
                      : 'hover:bg-slate-800/30',
                )}
                style={{ height: ROW_HEIGHT }}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className="px-3 py-1.5 align-middle border-r border-slate-800/30 last:border-r-0 overflow-hidden"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}

          {/* Spacer bottom */}
          {virtualRows.length > 0 && (
            <tr style={{ height: Math.max(0, totalHeight - (virtualRows[virtualRows.length - 1]?.end ?? 0)) }}>
              <td colSpan={columns.length} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
// src/components/sales/companies/companyColumns.tsx
// TanStack column definitions for the Companies table.
// Mirrors the exact pattern of contacts/columns.tsx.

import React, { useState, useRef, useEffect } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import {
  Globe, Linkedin, Twitter, Facebook, Phone, Building2,
  MapPin, Users, TrendingUp, TrendingDown, Minus,
  ExternalLink, ListPlus, MoreHorizontal, Edit2, Trash2,
  ChevronDown, Check,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompanyRow {
  id: number;
  name: string;
  normalized_name?: string;
  domain?: string;
  website?: string;
  logo_url?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  phone?: string;
  sanitized_phone?: string;
  phone_country_code?: string;
  revenue?: string;
  market_cap?: string;
  founded_year?: string;
  stage?: string;
  status?: string;
  city?: string;
  state?: string;
  country?: string;
  industry?: string;
  employee_count?: number;
  stock_symbol?: string;
  stock_exchange?: string;
  apollo_org_id?: string;
  headcount_growth_6m?: string | number;
  headcount_growth_12m?: string | number;
  headcount_growth_24m?: string | number;
  about?: string;
  description?: string;
  created_at?: string;
  // Enrichment join fields (flattened by RPC)
  enriched_employees?: number;
  enriched_revenue?: string;
  enriched_industry?: string;
  enriched_city?: string;
  enriched_state?: string;
  enriched_country?: string;
  enriched_description?: string;
}

export interface CompanyTableMeta {
  openListModal:  (company: CompanyRow) => void;
  updateStage:    (rowIndex: number, stage: string | null) => void;
  updateStatus:   (rowIndex: number, status: string) => void;
  deleteCompany?: (company: CompanyRow) => void;
  isCloudMode?:   boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGES = [
  'Identified', 'Qualified', 'Prospect',
  'Opportunity', 'Customer', 'Churned',
];

const STAGE_COLORS: Record<string, string> = {
  Identified:  'bg-slate-100 text-slate-600 border-slate-200',
  Qualified:   'bg-blue-50 text-blue-700 border-blue-200',
  Prospect:    'bg-amber-50 text-amber-700 border-amber-200',
  Opportunity: 'bg-purple-50 text-purple-700 border-purple-200',
  Customer:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  Churned:     'bg-red-50 text-red-600 border-red-200',
};

const STATUS_COLORS: Record<string, string> = {
  Customer:     'bg-emerald-50 text-emerald-700',
  Intelligence: 'bg-indigo-50 text-indigo-600',
  Prospect:     'bg-amber-50 text-amber-700',
  Lead:         'bg-orange-50 text-orange-600',
  Partner:      'bg-purple-50 text-purple-700',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

function cleanDomain(raw?: string) {
  if (!raw) return '';
  return raw.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
}

function formatRevenue(rev?: string | number) {
  if (!rev) return null;
  const s = String(rev);
  // Already formatted like "14.6B", "5M"
  if (/[BMKT]/i.test(s)) return s;
  // Raw number
  const n = parseFloat(s);
  if (isNaN(n)) return s;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3)  return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

function formatGrowth(val?: string | number) {
  if (val === undefined || val === null) return null;
  const n = parseFloat(String(val));
  if (isNaN(n)) return null;
  const pct = (n * 100).toFixed(1);
  return { n, pct };
}

const FLAG_BASE = 'https://flagcdn.com/16x12';
function flagUrl(cc?: string) {
  if (!cc) return null;
  return `${FLAG_BASE}/${cc.toLowerCase()}.png`;
}

// ── Cell Components ───────────────────────────────────────────────────────────

function LogoFallback({ name }: { name: string }) {
  const colors = [
    'bg-indigo-100 text-indigo-700',
    'bg-purple-100 text-purple-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0', colors[idx])}>
      {getInitials(name)}
    </div>
  );
}

function CompanyCell({ row }: { row: CompanyRow }) {
  const domain = cleanDomain(row.domain || row.website);
  const logoSrc = row.logo_url;
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {logoSrc && !imgError ? (
        <img
          src={logoSrc}
          alt={row.name}
          onError={() => setImgError(true)}
          className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-100 flex-shrink-0 p-0.5"
        />
      ) : (
        <LogoFallback name={row.name} />
      )}
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-slate-800 truncate leading-tight">
          {row.name}
        </p>
        {domain && (
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-400 hover:text-indigo-500 transition-colors truncate block"
            onClick={e => e.stopPropagation()}
          >
            {domain}
          </a>
        )}
      </div>
    </div>
  );
}

function PhoneCell({ row }: { row: CompanyRow }) {
  const phone = row.sanitized_phone || row.phone;
  if (!phone) return <span className="text-slate-300 text-xs">—</span>;
  const flag = flagUrl(row.phone_country_code);
  return (
    <div className="flex items-center gap-1.5">
      {flag && <img src={flag} alt="" className="w-4 h-3 flex-shrink-0" />}
      <a
        href={`tel:${phone}`}
        className="text-xs text-slate-600 hover:text-indigo-600 transition-colors whitespace-nowrap"
        onClick={e => e.stopPropagation()}
      >
        {row.phone || phone}
      </a>
    </div>
  );
}

function LinksCell({ row }: { row: CompanyRow }) {
  const links = [
    { href: row.website,  icon: <Globe size={13} />,    label: 'Website' },
    { href: row.linkedin, icon: <Linkedin size={13} />, label: 'LinkedIn' },
    { href: row.twitter,  icon: <Twitter size={13} />,  label: 'Twitter' },
    { href: row.facebook, icon: <Facebook size={13} />, label: 'Facebook' },
  ].filter(l => !!l.href);

  if (!links.length) return <span className="text-slate-300 text-xs">—</span>;

  return (
    <div className="flex items-center gap-1">
      {links.map(l => (
        <a
          key={l.label}
          href={l.href!}
          target="_blank"
          rel="noopener noreferrer"
          title={l.label}
          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          onClick={e => e.stopPropagation()}
        >
          {l.icon}
        </a>
      ))}
    </div>
  );
}

function StageCell({ row, rowIndex, meta }: { row: CompanyRow; rowIndex: number; meta: CompanyTableMeta }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const stage = row.stage;
  const colorClass = stage ? (STAGE_COLORS[stage] || 'bg-slate-100 text-slate-600 border-slate-200') : 'bg-slate-50 text-slate-400 border-dashed border-slate-200';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition-all hover:opacity-80',
          colorClass,
        )}
      >
        {stage || <span className="italic font-normal">Set stage</span>}
        <ChevronDown size={9} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-100 z-50 py-1 overflow-hidden">
          <button
            onClick={e => { e.stopPropagation(); meta.updateStage(rowIndex, null); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-[11px] text-slate-400 hover:bg-slate-50 italic"
          >
            Clear stage
          </button>
          {STAGES.map(s => (
            <button
              key={s}
              onClick={e => { e.stopPropagation(); meta.updateStage(rowIndex, s); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-indigo-50 flex items-center justify-between"
            >
              {s}
              {stage === s && <Check size={10} className="text-indigo-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-slate-300 text-xs">—</span>;
  const cls = STATUS_COLORS[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', cls)}>
      {status}
    </span>
  );
}

function LocationCell({ row }: { row: CompanyRow }) {
  const city    = row.city    || row.enriched_city;
  const country = row.country || row.enriched_country;
  if (!city && !country) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <MapPin size={11} className="text-slate-400 flex-shrink-0" />
      <span className="text-xs text-slate-600 truncate">
        {[city, country].filter(Boolean).join(', ')}
      </span>
    </div>
  );
}

function EmployeesCell({ row }: { row: CompanyRow }) {
  const count = row.enriched_employees || row.employee_count;
  const growth = formatGrowth(row.headcount_growth_12m);
  if (!count && !growth) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {count ? (
        <span className="text-xs font-medium text-slate-700">
          {count.toLocaleString()}
        </span>
      ) : null}
      {growth && (
        <div className={cn(
          'flex items-center gap-0.5 text-[9px] font-semibold',
          growth.n > 0 ? 'text-emerald-600' : growth.n < 0 ? 'text-red-500' : 'text-slate-400',
        )}>
          {growth.n > 0 ? <TrendingUp size={9} /> : growth.n < 0 ? <TrendingDown size={9} /> : <Minus size={9} />}
          {growth.pct}%
        </div>
      )}
    </div>
  );
}

function ActionsCell({ row, meta }: { row: CompanyRow; meta: CompanyTableMeta }) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <button
        title="Add to list"
        onClick={e => { e.stopPropagation(); meta.openListModal(row); }}
        className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
      >
        <ListPlus size={13} />
      </button>
      {meta.deleteCompany && (
        <button
          title="Delete"
          onClick={e => { e.stopPropagation(); meta.deleteCompany!(row); }}
          className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// ── Column Definitions ────────────────────────────────────────────────────────

const helper = createColumnHelper<CompanyRow>();

export const companyColumns = [
  // ── SELECT ──────────────────────────────────────────────────────────────────
  helper.display({
    id: 'select',
    size: 40,
    enableHiding: false,
    enableResizing: false,
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected() ? true : undefined}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        onClick={e => e.stopPropagation()}
      />
    ),
  }),

  // ── COMPANY ─────────────────────────────────────────────────────────────────
  helper.accessor('name', {
    id: 'company',
    size: 260,
    enableHiding: false,
    enableResizing: true,
    header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Company</span>,
    cell: ({ row }) => <CompanyCell row={row.original} />,
  }),

  // ── PHONE ───────────────────────────────────────────────────────────────────
  helper.accessor('phone', {
    id: 'phone',
    size: 160,
    enableResizing: true,
    header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</span>,
    cell: ({ row }) => <PhoneCell row={row.original} />,
  }),

  // ── LINKS ───────────────────────────────────────────────────────────────────
  helper.display({
    id: 'links',
    size: 100,
    enableResizing: true,
    header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Links</span>,
    cell: ({ row }) => <LinksCell row={row.original} />,
  }),

  // ── REVENUE ─────────────────────────────────────────────────────────────────
  helper.accessor('revenue', {
    id: 'revenue',
    size: 100,
    enableResizing: true,
    header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Revenue</span>,
    cell: ({ row }) => {
      const rev = formatRevenue(row.original.revenue || row.original.enriched_revenue);
      return <span className="text-xs font-medium text-slate-700">{rev || <span className="text-slate-300">—</span>}</span>;
    },
  }),

  // ── FOUNDED ─────────────────────────────────────────────────────────────────
  helper.accessor('founded_year', {
    id: 'founded',
    size: 90,
    enableResizing: true,
    header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Founded</span>,
    cell: ({ getValue }) => (
      <span className="text-xs text-slate-600">{getValue() || <span className="text-slate-300">—</span>}</span>
    ),
  }),

  // ── STAGE ───────────────────────────────────────────────────────────────────
  helper.accessor('stage', {
    id: 'stage',
    size: 130,
    enableResizing: true,
    header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stage</span>,
    cell: ({ row, table }) => (
      <StageCell
        row={row.original}
        rowIndex={row.index}
        meta={table.options.meta as CompanyTableMeta}
      />
    ),
  }),

  // ── STATUS ──────────────────────────────────────────────────────────────────
  helper.accessor('status', {
    id: 'status',
    size: 110,
    enableResizing: true,
    header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</span>,
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  }),

  // ── LOCATION ────────────────────────────────────────────────────────────────
  helper.display({
    id: 'location',
    size: 160,
    enableResizing: true,
    header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Location</span>,
    cell: ({ row }) => <LocationCell row={row.original} />,
  }),

  // ── INDUSTRY ────────────────────────────────────────────────────────────────
  helper.accessor('industry', {
    id: 'industry',
    size: 150,
    enableResizing: true,
    header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Industry</span>,
    cell: ({ getValue, row }) => {
      const val = getValue() || row.original.enriched_industry;
      return <span className="text-xs text-slate-600 truncate">{val || <span className="text-slate-300">—</span>}</span>;
    },
  }),

  // ── EMPLOYEES ───────────────────────────────────────────────────────────────
  helper.display({
    id: 'employees',
    size: 110,
    enableResizing: true,
    header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Employees</span>,
    cell: ({ row }) => <EmployeesCell row={row.original} />,
  }),

  // ── ACTIONS ─────────────────────────────────────────────────────────────────
  helper.display({
    id: 'actions',
    size: 70,
    enableHiding: false,
    enableResizing: false,
    header: () => null,
    cell: ({ row, table }) => (
      <ActionsCell
        row={row.original}
        meta={table.options.meta as CompanyTableMeta}
      />
    ),
  }),
];
// src/components/sales/contacts-table/columns.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Label } from '@/components/ui/label';
import {
  Trash2, Linkedin, Phone, Mail, Globe, Copy, Loader2, Plus,
  ShieldCheck, ListPlus, Eye, Building2, Flag, Star, Pencil,
  MapPin, Zap, DatabaseZap, Check, X, CheckCircle2, XCircle, HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CompanyCombobox } from './CompanyCombobox';
import { LocationCell } from './LocationCell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDeleteContact } from '@/hooks/sales/useDeleteContact';
import { useToast } from '@/hooks/use-toast';
import PhoneInput, { parsePhoneNumber } from "react-phone-number-input";
import flags from 'react-phone-number-input/flags';
import "react-phone-number-input/style.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type AvailState = 'yes' | 'maybe' | 'no';

// ── Helpers ───────────────────────────────────────────────────────────────────

const isDiscoveryRow = (row: any) => row.original?.is_discovery === true;

const PhoneFlag = ({ number }: { number: string }) => {
  if (!number) return <Globe size={10} className="text-slate-400" />;
  try {
    const parsed = parsePhoneNumber(number);
    if (parsed?.country) {
      const F = (flags as any)[parsed.country];
      return F ? <F title={parsed.country} className="w-4 h-3 rounded-[1px]" /> : <Globe size={10} />;
    }
  } catch { /* ignore */ }
  return <Globe size={10} />;
};

const DeliverabilityDot = ({ status }: { status?: string }) => {
  const map: Record<string, { color: string; label: string }> = {
    verified:   { color: 'bg-emerald-500', label: 'Verified' },
    likely:     { color: 'bg-blue-400',    label: 'Likely valid' },
    unverified: { color: 'bg-amber-400',   label: 'Unverified' },
    incorrect:  { color: 'bg-red-400',     label: 'Invalid' },
  };
  const cfg = map[status || ''] ?? { color: 'bg-slate-300', label: 'Unknown' };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-block h-2 w-2 rounded-full flex-shrink-0 cursor-default', cfg.color)} />
        </TooltipTrigger>
        <TooltipContent className="text-xs">{cfg.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ColHeader = ({ title }: { title: string }) => (
  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{title}</span>
);

// Small icon-button used inside asset rows
const Btn = ({ onClick, tip, children, hoverColor = 'hover:text-slate-700' }: any) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'p-1.5 rounded-lg text-slate-400 transition-colors hover:bg-slate-100',
            hoverColor,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{tip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// ── Manual entry dialogs ──────────────────────────────────────────────────────

const AddAssetDialog = ({ open, onOpenChange, type, onSave }: any) => {
  const [value,   setValue]   = useState('');
  const [phone,   setPhone]   = useState('');
  const [subtype, setSubtype] = useState(type === 'email' ? 'work' : 'mobile');
  const [status,  setStatus]  = useState(type === 'email' ? 'unverified' : 'no_status');

  const isEmail     = type === 'email';
  const accentFrom  = isEmail ? 'from-indigo-600' : 'from-emerald-600';
  const accentTo    = isEmail ? 'to-violet-600'   : 'to-teal-600';
  const btnCls      = isEmail ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700';

  const handleSave = () => {
    const v = type === 'mobile' ? phone : value;
    if (!v?.trim()) return;
    onSave(v.trim(), { type: subtype, status });
    onOpenChange(false);
    setValue(''); setPhone('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
        {/* Gradient header */}
        <div className={cn('px-5 pt-5 pb-4 bg-gradient-to-br', accentFrom, accentTo)}>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
              {isEmail ? <Mail size={16} className="text-white" /> : <Phone size={16} className="text-white" />}
            </div>
            <div>
              <p className="text-sm font-bold text-white">Add {isEmail ? 'Email Address' : 'Phone Number'}</p>
              <p className="text-[10px] text-white/70">Manually enter contact details</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 bg-white">
          {/* Value input */}
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1.5">
              {isEmail ? 'Email Address' : 'Phone Number'}
            </Label>
            {!isEmail ? (
              <div className="relative">
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all">
                  <PhoneInput
                    international
                    defaultCountry="US"
                    value={phone}
                    onChange={v => setPhone(v || '')}
                    className="h-10 px-3 text-sm w-full bg-transparent"
                  />
                </div>
              </div>
            ) : (
              <Input
                className="h-10 text-sm border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
                placeholder="name@company.com"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            )}
          </div>

          {/* Type + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1.5">Type</Label>
              <Select value={subtype} onValueChange={setSubtype}>
                <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                 {(
  isEmail
    ? [['work', 'Work'], ['personal', 'Personal'], ['other', 'Other']]
    : [['mobile', 'Mobile'], ['work_hq', 'Office/HQ'], ['other', 'Other']]
).map(([v, l]) => (
  <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1.5">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                 {(
  isEmail
    ? [['verified', '✓ Verified'], ['unverified', 'Unverified'], ['incorrect', '✗ Invalid']]
    : [['valid_number', '✓ Valid'], ['no_status', 'Unknown'], ['invalid', '✗ Invalid']]
).map(([v, l]) => (
  <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 text-xs rounded-xl border-slate-200 text-slate-600"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className={cn('flex-1 h-10 text-xs rounded-xl text-white shadow-sm', btnCls)}
            >
              {isEmail ? 'Add Email' : 'Add Phone'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EditAssetDialog = ({ open, onOpenChange, type, initialValue, initialType, initialStatus, onSave }: any) => {
  const [value,   setValue]   = useState(initialValue   || '');
  const [subtype, setSubtype] = useState(initialType    || (type === 'email' ? 'work' : 'mobile'));
  const [status,  setStatus]  = useState(initialStatus  || (type === 'email' ? 'unverified' : 'no_status'));

  useEffect(() => {
    if (open) {
      setValue(initialValue   || '');
      setSubtype(initialType  || (type === 'email' ? 'work' : 'mobile'));
      setStatus(initialStatus || (type === 'email' ? 'unverified' : 'no_status'));
    }
  }, [open, initialValue, initialType, initialStatus, type]);

  const isEmail = type === 'email';
  const accentFrom = isEmail ? 'from-indigo-600' : 'from-emerald-600';
  const accentTo   = isEmail ? 'to-violet-600'   : 'to-teal-600';
  const btnCls     = isEmail ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] p-0 overflow-hidden rounded-2xl shadow-2xl border-0">
        <div className={cn('px-5 pt-5 pb-4 bg-gradient-to-br', accentFrom, accentTo)}>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Pencil size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Edit {isEmail ? 'Email' : 'Phone'}</p>
              <p className="text-[10px] text-white/70">Update contact details</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 bg-white">
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1.5">
              {isEmail ? 'Email Address' : 'Phone Number'}
            </Label>
            {!isEmail ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all">
                <PhoneInput international defaultCountry="US" value={value} onChange={v => setValue(v || '')} className="h-10 px-3 text-sm w-full bg-transparent" />
              </div>
            ) : (
              <Input value={value} onChange={e => setValue(e.target.value)} className="h-10 text-sm border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1.5">Type</Label>
              <Select value={subtype} onValueChange={setSubtype}>
                <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(
  isEmail
    ? [['work','Work'],['personal','Personal'],['other','Other']]
    : [['mobile','Mobile'],['work_hq','Office/HQ'],['other','Other']]
).map(([v,l]) => (
  <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1.5">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 text-xs border-slate-200 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(
  isEmail
    ? [['verified','✓ Verified'],['unverified','Unverified'],['incorrect','✗ Invalid']]
    : [['valid_number','✓ Valid'],['no_status','Unknown'],['invalid','✗ Invalid']]
).map(([v,l]) => (
  <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2.5 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="flex-1 h-10 text-xs rounded-xl border-slate-200">Cancel</Button>
            <Button size="sm" onClick={() => { onSave({ value, type: subtype, status }); onOpenChange(false); }} className={cn('flex-1 h-10 text-xs rounded-xl text-white', btnCls)}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── ContactAssetRow ───────────────────────────────────────────────────────────

const ContactAssetRow = ({
  value, type, label, isPrimary, source, status,
  onSetPrimary, onDelete, onUpdateFull, onFlag,
}: any) => {
  const [hovered,  setHovered]  = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast({ title: 'Copied!' });
  };
  const handleFlagToggle = () => {
    const bad = status === 'incorrect' || status === 'invalid';
    onFlag(bad
      ? (type === 'email' ? 'unverified' : 'no_status')
      : (type === 'email' ? 'incorrect'  : 'invalid'));
  };

  return (
    <>
      <div
        className={cn(
          'flex items-start justify-between p-2.5 rounded-xl transition-all',
          isPrimary
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-100'
            : 'hover:bg-slate-50 border border-transparent',
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-start gap-2.5 overflow-hidden">
          {/* Icon */}
          <div className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 mt-0.5',
            type === 'phone'
              ? 'bg-emerald-100'
              : isPrimary ? 'bg-indigo-100' : 'bg-slate-100',
          )}>
            {type === 'phone'
              ? <PhoneFlag number={value} />
              : <Mail size={11} className={isPrimary ? 'text-indigo-600' : 'text-slate-400'} />
            }
          </div>
          {/* Value + meta */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'text-xs font-medium truncate max-w-[185px]',
                (status === 'incorrect' || status === 'invalid')
                  ? 'line-through text-slate-400'
                  : 'text-slate-800',
              )}>
                {value}
              </span>
              {type === 'email' && <DeliverabilityDot status={status} />}
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5">
              <span className="capitalize">{label || (type === 'email' ? 'work' : 'mobile')}</span>
              {isPrimary && (
                <><span>·</span><span className="text-emerald-600 font-semibold">Primary</span></>
              )}
              {source?.toLowerCase?.()?.includes('manual') && (
                <><span>·</span><span className="text-blue-500">Manual</span></>
              )}
            </div>
          </div>
        </div>

        {/* Hover actions */}
        <div className={cn('flex items-center gap-0.5 transition-opacity flex-shrink-0 ml-1', hovered ? 'opacity-100' : 'opacity-0')}>
          <Btn onClick={handleCopy} tip="Copy"><Copy size={10} /></Btn>
          <Btn onClick={() => setEditOpen(true)} tip="Edit"><Pencil size={10} /></Btn>
          {!isPrimary && (
            <Btn onClick={onSetPrimary} tip="Set Primary" hoverColor="hover:text-amber-500"><Star size={10} /></Btn>
          )}
          <Btn
            onClick={handleFlagToggle}
            tip={status === 'incorrect' || status === 'invalid' ? 'Unflag' : 'Flag bad'}
            hoverColor="hover:text-red-500"
          >
            <Flag size={10} fill={status === 'incorrect' || status === 'invalid' ? 'currentColor' : 'none'} />
          </Btn>
          <Btn onClick={onDelete} tip="Delete" hoverColor="hover:text-red-500"><Trash2 size={10} /></Btn>
        </div>
      </div>

      <EditAssetDialog
        open={editOpen} onOpenChange={setEditOpen}
        type={type} initialValue={value} initialType={label} initialStatus={status}
        onSave={onUpdateFull}
      />
    </>
  );
};

// ── Availability badge used inside popovers ───────────────────────────────────

const AvailBadge = ({ state, label }: { state: AvailState; label: string }) => {
  if (state === 'yes') return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
      <span className="text-[11px] font-semibold text-emerald-700">{label} available to reveal</span>
    </div>
  );
  if (state === 'maybe') return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />
      <span className="text-[11px] font-semibold text-amber-700">May have {label.toLowerCase()} (request to confirm)</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
      <span className="text-[11px] text-slate-500">{label} not found</span>
    </div>
  );
};

// ── Combined Contact Cell ─────────────────────────────────────────────────────

const ContactCell = ({ row, table }: any) => {
  const c = row.original;
  const [emailAddOpen, setEmailAddOpen] = useState(false);
  const [phoneAddOpen, setPhoneAddOpen] = useState(false);

  const emails: any[] = [
    ...(c.email ? [{ email: c.email, type: 'work', is_primary: true, source: 'CRM', email_status: c.email_status || 'unverified' }] : []),
    ...(c.all_emails || []).filter((e: any) => e.email !== c.email),
  ];
  const phones: any[] = [
    ...(c.mobile ? [{ phone_number: c.mobile, type: 'mobile', source_name: 'CRM', status: 'valid_number', is_primary: true }] : []),
    ...(c.all_phones || []).filter((p: any) => p.phone_number !== c.mobile),
  ];

  // 3-state availability computed in useSimpleContacts and passed via row data
  const emailAvail: AvailState = c.email_avail ?? (emails.length > 0 ? 'yes' : 'no');
  const phoneAvail: AvailState = c.phone_avail ?? (phones.length > 0 ? 'yes' : 'no');

  const execEmail = (action: string, val: string, payload?: any) =>
    table.options.meta?.handleAssetAction(row.index, 'email', action, val, payload);
  const execPhone = (action: string, val: string, payload?: any) =>
    table.options.meta?.handleAssetAction(row.index, 'mobile', action, val, payload);

  // ── Dot indicator on icon button ──────────────────────────────────────────
  const dotCls = (avail: AvailState, hasData: boolean) => {
    if (hasData) return 'bg-emerald-500';
    if (avail === 'yes')   return 'bg-emerald-500';
    if (avail === 'maybe') return 'bg-amber-400';
    return 'hidden';
  };

  // ── Reveal button helper ──────────────────────────────────────────────────
  const RevealBtn = ({ kind, avail }: { kind: 'email' | 'phone'; avail: AvailState }) => {
    const isEmail = kind === 'email';
    const base  = isEmail ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700';
    const maybe = isEmail ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-amber-500 hover:bg-amber-600';
    const label = avail === 'maybe'
      ? (isEmail ? 'Request Email' : 'Request Direct Dial')
      : (isEmail ? 'Reveal Email' : 'Reveal Phone');

    return (
      <button
        onClick={() => table.options.meta?.enrichContact(c.id, c.apollo_person_id, kind)}
        className={cn(
          'w-full flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-semibold text-white rounded-xl transition-colors shadow-sm',
          avail === 'maybe' ? maybe : base,
        )}
      >
        <Zap size={11} /> {label}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* ── Email icon button ── */}
      <HoverCard openDelay={120} closeDelay={200}>
        <HoverCardTrigger asChild>
          <button
            className={cn(
              'relative flex items-center justify-center h-7 w-7 rounded-lg transition-all border',
              emails.length > 0
                ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100'
                : emailAvail === 'yes' || emailAvail === 'maybe'
                  ? 'bg-indigo-50/60 text-indigo-400 hover:bg-indigo-100 border-indigo-100 border-dashed'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border-slate-200',
            )}
          >
            <Mail size={12} />
            <span className={cn(
              'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px] border-white',
              dotCls(emailAvail, emails.length > 0),
            )} />
          </button>
        </HoverCardTrigger>

        <HoverCardContent
          align="start" side="bottom" sideOffset={8}
          className="w-[340px] p-0 shadow-2xl border-0 rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white flex items-center gap-1.5">
              <Mail size={12} />
              {emails.length > 0 ? `Emails (${emails.length})` : 'Email'}
            </span>
            {emails.length > 0 && (
              <button onClick={() => setEmailAddOpen(true)} className="text-white/70 hover:text-white transition-colors">
                <Plus size={13} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-3 space-y-1.5 max-h-[300px] overflow-y-auto bg-white">
            {emails.length > 0 ? (
              emails.map((e: any, i: number) => (
                <ContactAssetRow
                  key={i} value={e.email} type="email" label={e.type}
                  isPrimary={i === 0} status={e.email_status} source={e.source}
                  onSetPrimary={() => execEmail('set_primary', e.email)}
                  onDelete={()     => execEmail('delete', e.email)}
                  onFlag={(s: string) => execEmail('flag', e.email, s)}
                  onUpdateFull={(p: any) => execEmail('edit', e.email, p)}
                />
              ))
            ) : (
              <div className="py-2 space-y-2">
                <AvailBadge state={emailAvail} label="Email" />
                <RevealBtn kind="email" avail={emailAvail} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/80">
            <button
              onClick={() => setEmailAddOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 h-7 text-[11px] font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Plus size={11} /> Add {emails.length > 0 ? 'another email' : 'manually'}
            </button>
          </div>

          <AddAssetDialog
            open={emailAddOpen} onOpenChange={setEmailAddOpen} type="email"
            onSave={(val: string, meta: any) => table.options.meta?.handleAssetAction(row.index, 'email', 'add', val, meta)}
          />
        </HoverCardContent>
      </HoverCard>

      {/* ── Phone icon button ── */}
      <HoverCard openDelay={120} closeDelay={200}>
        <HoverCardTrigger asChild>
          <button
            className={cn(
              'relative flex items-center justify-center h-7 w-7 rounded-lg transition-all border',
c.phone_enrichment_status === 'pending_phones'
  ? 'bg-amber-50 text-amber-500 border-amber-300 animate-pulse ring-2 ring-amber-200 ring-offset-1'
  : phones.length > 0
    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100'
    : phoneAvail === 'yes'
      ? 'bg-emerald-50/60 text-emerald-400 hover:bg-emerald-100 border-emerald-100 border-dashed'
      : phoneAvail === 'maybe'
        ? 'bg-amber-50 text-amber-500 hover:bg-amber-100 border-amber-200 border-dashed'
        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border-slate-200',
            )}
          >
            <Phone size={12} />
            <span className={cn(
              'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px] border-white',
              dotCls(phoneAvail, phones.length > 0),
            )} />
          </button>
        </HoverCardTrigger>

        <HoverCardContent
          align="start" side="bottom" sideOffset={8}
          className="w-[340px] p-0 shadow-2xl border-0 rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white flex items-center gap-1.5">
              <Phone size={12} />
              {phones.length > 0 ? `Phones (${phones.length})` : 'Phone'}
            </span>
            {phones.length > 0 && (
              <button onClick={() => setPhoneAddOpen(true)} className="text-white/70 hover:text-white transition-colors">
                <Plus size={13} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-3 space-y-1.5 max-h-[300px] overflow-y-auto bg-white">
            {phones.length > 0 ? (
              phones.map((p: any, i: number) => (
                <ContactAssetRow
                  key={i} value={p.phone_number} type="phone" label={p.type}
                  isPrimary={i === 0} status={p.status} source={p.source_name}
                  onSetPrimary={() => execPhone('set_primary', p.phone_number)}
                  onDelete={()     => execPhone('delete', p.phone_number)}
                  onFlag={(s: string) => execPhone('flag', p.phone_number, s)}
                  onUpdateFull={(pl: any) => execPhone('edit', p.phone_number, pl)}
                />
              ))
            ) : (
              <div className="py-2 space-y-2">
{c.phone_enrichment_status === 'pending_phones' ? (
  <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 overflow-hidden">
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-amber-800 leading-tight">Phone lookup in progress</p>
        <p className="text-[10px] text-amber-600 mt-0.5">Usually delivers in 1–2 min. Will update automatically.</p>
      </div>
      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
    </div>
    <div className="h-0.5 bg-amber-100">
      <div className="h-full w-3/4 bg-gradient-to-r from-amber-400 to-orange-400 animate-pulse" />
    </div>
  </div>
                ) : (
                  <>
                    <AvailBadge state={phoneAvail} label="Phone" />
                    <RevealBtn kind="phone" avail={phoneAvail} />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/80">
            <button
              onClick={() => setPhoneAddOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 h-7 text-[11px] font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <Plus size={11} /> Add {phones.length > 0 ? 'another phone' : 'manually'}
            </button>
          </div>

          <AddAssetDialog
            open={phoneAddOpen} onOpenChange={setPhoneAddOpen} type="mobile"
            onSave={(val: string, meta: any) => table.options.meta?.handleAssetAction(row.index, 'mobile', 'add', val, meta)}
          />
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};

// ── Data Availability Cell ────────────────────────────────────────────────────
// Shows for ALL rows (CRM + Discovery) using 3-state availability

const DataAvailabilityCell = ({ row }: any) => {
  const c = row.original;

  // CRM rows use computed email_avail/phone_avail from useSimpleContacts
  const emailAvail: AvailState = c.email_avail
    ?? (c.has_email ? 'yes' : 'no');
  const phoneAvail: AvailState = c.phone_avail
    ?? (c.has_phone ? 'yes' : (c.has_direct_phone ? 'maybe' : 'no'));

  const hasLocation = !!(c.city || c.state || c.country);
  const hasCompany  = !!(c.company_name || c.original_data?.organization?.name);

  const Item = ({
    avail, ok, icon: Icon, tip,
  }: { avail?: AvailState; ok?: boolean; icon: any; tip: string }) => {
    const state: AvailState = avail ?? (ok ? 'yes' : 'no');
    const cfg = {
      yes:   { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Available' },
      maybe: { bg: 'bg-amber-50',   text: 'text-amber-500',   dot: 'bg-amber-400',   label: 'Possible' },
      no:    { bg: 'bg-slate-100',  text: 'text-slate-400',   dot: '',               label: 'Not found' },
    }[state];

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'flex items-center justify-center h-6 w-6 rounded-lg transition-colors relative',
              cfg.bg, cfg.text,
            )}>
              <Icon className="h-3.5 w-3.5" />
              {state === 'maybe' && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 border border-white animate-pulse" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            {tip}: {cfg.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <Item avail={emailAvail}  icon={Mail}      tip="Email" />
      <Item avail={phoneAvail}  icon={Phone}     tip="Phone" />
      <Item ok={hasLocation}    icon={MapPin}    tip="Location" />
      <Item ok={hasCompany}     icon={Building2} tip="Company" />
    </div>
  );
};

// ── Other cells ───────────────────────────────────────────────────────────────

export const EditableCell: React.FC<any> = ({ getValue, row, column, table }) => {
  const value = getValue() as string || '';
  if (row.getIsGrouped() || isDiscoveryRow(row)) {
    return <div className="truncate text-xs text-slate-600" title={value}>{value || '—'}</div>;
  }
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <Input
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) table.options.meta?.updateData(row.index, column.id, local); }}
      className="h-full text-xs border-none bg-transparent rounded-none p-0 focus-visible:ring-1 focus-visible:ring-indigo-400/50 truncate"
      title={local}
    />
  );
};

const CompanyCell: React.FC<any> = ({ getValue, row, table }) => {
  const contact     = row.original;
  const isDiscovery = isDiscoveryRow(row);
  const companyId   = contact.company_id;
  const displayName = getValue() || contact.company_name || '—';
  const logoUrl     = contact.company_logo;

  const Logo = () =>
    logoUrl ? (
      <img src={logoUrl} alt={displayName}
        className="h-5 w-5 rounded object-contain flex-shrink-0 border border-slate-100"
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    ) : (
      <div className="h-5 w-5 rounded bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 flex-shrink-0 border border-slate-100">
        {displayName?.[0]?.toUpperCase() || <Building2 size={10} />}
      </div>
    );

  if (isDiscovery || !companyId) {
    return (
      <div className="flex items-center gap-2">
        <Logo />
        <span className="text-xs text-slate-700 truncate">{displayName}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Logo />
      <CompanyCombobox
        value={companyId}
        onSelect={id => table.options.meta?.updateData(row.index, 'company_id', id)}
        initialName={displayName}
      />
    </div>
  );
};

const StageSelectCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (isDiscoveryRow(row)) return null;
  const val = getValue();
  const { data: stages = [] } = useContactStages();
  const stageInfo = stages.find(s => s.name === val);
  return (
    <Select value={val || ''} onValueChange={v => table.options.meta?.updateData(row.index, column.id, v)}>
      <SelectTrigger className="h-7 text-[10px] border-none bg-transparent shadow-none px-0 w-full">
        <SelectValue>
          {val ? (
            <Badge className="text-[9px] font-semibold border"
              style={{ backgroundColor: (stageInfo?.color || '#94a3b8') + '18', color: stageInfo?.color || '#64748b', borderColor: (stageInfo?.color || '#94a3b8') + '40' }}>
              {val}
            </Badge>
          ) : <span className="text-slate-400">—</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {stages.map(s => (
          <SelectItem key={s.id} value={s.name} className="text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const MediumSelectCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (isDiscoveryRow(row)) return null;
  const val = getValue();
  const options = [
    { name: 'LinkedIn',       color: '#0A66C2' },
    { name: 'Cold Call',      color: '#374151' },
    { name: 'Email Campaign', color: '#10B981' },
    { name: 'Referral',       color: '#8B5CF6' },
    { name: 'Website Form',   color: '#3B82F6' },
    { name: 'Other',          color: '#6B7280' },
  ];
  const sel = options.find(o => o.name === val);
  return (
    <Select value={val || ''} onValueChange={v => table.options.meta?.updateData(row.index, column.id, v)}>
      <SelectTrigger className="h-7 text-[10px] border-none bg-transparent shadow-none px-0 w-full">
        <SelectValue>
          {val ? (
            <Badge className="text-[9px] font-medium border"
              style={{ backgroundColor: (sel?.color || '#94a3b8') + '18', color: sel?.color || '#64748b', borderColor: (sel?.color || '#94a3b8') + '40' }}>
              {val}
            </Badge>
          ) : <span className="text-slate-400">—</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.name} value={o.name} className="text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: o.color }} />
              {o.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// ── Action Cell ───────────────────────────────────────────────────────────────

const ActionCell = ({ row, table }: any) => {
  const c    = row.original;
  const meta = table.options.meta as any;
  const isDiscovery = meta?.isDiscoveryMode;
  const deleteContactMutation = useDeleteContact();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Discovery: always-visible Save + List buttons
  if (isDiscovery) {
    return (
      <div className="flex items-center gap-1.5 py-0.5">
        <button
          onClick={() => meta.saveToCRM?.(row.original)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors whitespace-nowrap"
        >
          <DatabaseZap size={10} /> Save
        </button>
        <button
          onClick={() => meta.openListModal?.(row.original, true)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
        >
          <ListPlus size={10} /> List
        </button>
      </div>
    );
  }

  // CRM: icons visible ONLY on group-hover (data-table sets group on <tr>)
  return (
    <>
      <div className="flex items-center justify-center gap-0.5 transition-opacity duration-150">
        <TooltipProvider><Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
              onClick={() => meta?.openListModal(c, false)}>
              <ListPlus size={13} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Add to List</TooltipContent>
        </Tooltip></TooltipProvider>

        <TooltipProvider><Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" asChild>
              <Link to={`/contacts/${c.id}`}><Eye size={13} /></Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">View</TooltipContent>
        </Tooltip></TooltipProvider>

        <TooltipProvider><Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
              onClick={() => meta?.enrichContact(c.id, c.apollo_person_id, 'email')}>
              <ShieldCheck size={13} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Enrich</TooltipContent>
        </Tooltip></TooltipProvider>

        <TooltipProvider><Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              onClick={() => setConfirmDelete(true)}>
              <Trash2 size={13} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Delete</TooltipContent>
        </Tooltip></TooltipProvider>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-[360px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Delete Contact</DialogTitle>
            <DialogDescription className="text-sm">
              Permanently delete <span className="font-semibold">{c.name}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button size="sm" variant="destructive"
              onClick={() => deleteContactMutation.mutate(c.id, {
                onSuccess: () => { toast({ title: 'Contact deleted' }); setConfirmDelete(false); },
                onError:   () => { toast({ variant: 'destructive', title: 'Failed to delete' }); },
              })}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ── COLUMN DEFINITIONS ────────────────────────────────────────────────────────

export const columns: ColumnDef<any>[] = [
  // SELECT
  {
    id: 'select', size: 40, minSize: 40, maxSize: 40,
    header: ({ table }) => (
      <div className="flex justify-center">
        <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)} className="h-3.5 w-3.5" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Checkbox checked={row.getIsSelected()} onCheckedChange={v => row.toggleSelected(!!v)} className="h-3.5 w-3.5" />
      </div>
    ),
    enableHiding: false, enableSorting: false,
  },

  // DATA AVAILABILITY — shows for CRM + Discovery rows
  {
    id: 'data_availability', size: 140, minSize: 130, maxSize: 170,
    header: () => <ColHeader title="Availability" />,
    enableHiding: true, enableSorting: false,
    cell: DataAvailabilityCell,
  },

  // NAME (sticky)
  {
    accessorKey: 'name',
    header: () => <ColHeader title="Name" />,
    size: 210, minSize: 160, maxSize: 300, enableSorting: false,
    cell: ({ row }) => {
      const c = row.original;
      return (
        <div className="flex items-center gap-2.5 py-1">
          <Avatar className="h-7 w-7 rounded-lg flex-shrink-0 border border-slate-100">
            <AvatarImage src={c.photo_url} />
            <AvatarFallback className={cn('text-[10px] font-bold rounded-lg', c.is_discovery ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600')}>
              {c.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            {c.is_discovery ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800 truncate">{c.name}</span>
                <Badge className="h-3.5 px-1 text-[8px] font-bold bg-violet-100 text-violet-700 border-0 rounded">NEW</Badge>
              </div>
            ) : (
              <Link to={`/contacts/${c.id}`} className="text-xs font-semibold text-slate-800 hover:text-indigo-600 truncate transition-colors">
                {c.name}
              </Link>
            )}
            {c.linkedin_url && (
              <a href={c.linkedin_url} target="_blank" rel="noreferrer"
                className="text-[9px] text-slate-400 hover:text-[#0A66C2] flex items-center gap-0.5 transition-colors w-fit">
                <Linkedin size={8} /> LinkedIn
              </a>
            )}
          </div>
        </div>
      );
    },
  },

  // CONTACT — combined Email + Phone icon buttons
{
  id: 'contact',
  header: () => <ColHeader title="Contact" />,
  size: 88,
  minSize: 80,
  maxSize: 100,
  enableSorting: false,
  enableHiding: false,
  cell: ({ row, table }) => {
    if (isDiscoveryRow(row)) return null;
    return <ContactCell row={row} table={table} />;
  },
},

  // JOB TITLE
  { accessorKey: 'job_title',    header: () => <ColHeader title="Title" />,   size: 170, enableSorting: false, cell: EditableCell },

  // COMPANY
  { accessorKey: 'company_name', header: () => <ColHeader title="Company" />, size: 170, enableSorting: false, cell: CompanyCell },

  // ACTIONS
  {
    id: 'actions',
    header: () => <ColHeader title="Actions" />,
    size: 130, cell: ActionCell, enableHiding: false, enableSorting: false,
  },

  // STAGE
  { accessorKey: 'contact_stage', header: () => <ColHeader title="Stage" />,  size: 130, enableSorting: false, cell: StageSelectCell,  enableHiding: true },

  // SOURCE
  { accessorKey: 'medium',        header: () => <ColHeader title="Source" />, size: 130, enableSorting: false, cell: MediumSelectCell, enableHiding: true },

  // OWNER
  {
    accessorFn: row => row.created_by ?? null, id: 'created_by_employee',
    header: () => <ColHeader title="Owner" />, size: 70, enableSorting: false, enableHiding: true,
    cell: ({ row }) => {
      if (isDiscoveryRow(row)) return <span className="text-slate-300">—</span>;
      const emp = row.original.created_by_employee;
      if (!emp) return <span className="text-slate-400 text-[10px]">—</span>;
      return (
        <TooltipProvider><Tooltip>
          <TooltipTrigger>
            <Avatar className="h-6 w-6 border border-slate-200">
              <AvatarImage src={emp.profile_picture_url} />
              <AvatarFallback className="text-[8px] bg-indigo-600 text-white font-bold">{emp.first_name?.[0]}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{emp.first_name} {emp.last_name}</TooltipContent>
        </Tooltip></TooltipProvider>
      );
    },
  },

  // CREATED AT
  {
    accessorKey: 'created_at', header: () => <ColHeader title="Created" />, size: 90, enableSorting: false, enableHiding: true,
    cell: ({ row, getValue }) => isDiscoveryRow(row) ? <span className="text-slate-300">—</span> : (
      <span className="text-xs text-slate-500">
        {getValue() ? new Date(getValue() as string).toLocaleDateString() : '—'}
      </span>
    ),
  },

  // LOCATION
  {
    id: 'location',
    accessorFn: row => [row.city, row.state, row.country].filter(Boolean).join(', '),
    header: () => <ColHeader title="Location" />, cell: LocationCell,
    size: 170, minSize: 120, maxSize: 240, enableSorting: false, enableHiding: true,
  },

  // HIDDEN METADATA
  { id: 'seniority',      accessorKey: 'seniority',      enableHiding: true, size: 0, header: () => <ColHeader title="Seniority" />,   cell: () => null },
  { id: 'departments',    accessorKey: 'departments',    enableHiding: true, size: 0, header: () => <ColHeader title="Departments" />, cell: () => null },
  { id: 'functions',      accessorKey: 'functions',      enableHiding: true, size: 0, header: () => <ColHeader title="Functions" />,   cell: () => null },
  { id: 'industry',       accessorKey: 'industry',       enableHiding: true, size: 0, header: () => <ColHeader title="Industry" />,    cell: () => null },
  { id: 'revenue',        accessorKey: 'revenue',        enableHiding: true, size: 0, header: () => <ColHeader title="Revenue" />,     cell: () => null },
  { id: 'employee_count', accessorKey: 'employee_count', enableHiding: true, size: 0, header: () => <ColHeader title="Employees" />,   cell: () => null },
  { id: 'updated_at',     accessorKey: 'updated_at',     enableHiding: true, size: 0, header: () => <ColHeader title="Updated" />,     cell: () => null },
];
// waterfall loader
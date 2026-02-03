// src/components/sales/contacts-table/columns.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContactStages } from '@/hooks/sales/useContactStages';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Label } from '@/components/ui/label';
import { 
  ChevronDown, ChevronRight, GripVertical, Link as LinkIcon, Trash2, AtSign, 
  Linkedin, Phone, Mail, UserPlus, Globe, MessageCircle, MoreHorizontal, 
  Copy, Check, Loader2, Plus, ShieldCheck, ListPlus, Eye, Building2, Clock, 
  CheckCircle2, Flag, Star, Pencil, Send, AlertCircle, HelpCircle, X, XCircle,
  MapPin, Briefcase, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableColumnHeader } from './data-table-column-header';
import { CompanyCombobox } from './CompanyCombobox';
import { LocationCell } from './LocationCell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDeleteContact } from '@/hooks/sales/useDeleteContact';
import { useToast } from '@/hooks/use-toast';
// --- PHONE INPUT & FLAGS ---
import PhoneInput, { parsePhoneNumber } from "react-phone-number-input";
import flags from 'react-phone-number-input/flags';
import "react-phone-number-input/style.css";

// --- 1. UTILITIES & REUSABLE COMPONENTS ---

const isDiscoveryRow = (row: any) => row.original?.is_discovery === true;

// Helper to determine Source Label
const getSourceLabel = (source: string) => {
  if (!source) return 'CRM';
  if (source.toLowerCase().includes('manual') || source.toLowerCase().includes('user')) return 'Manual';
  return 'CRM';
};

// Helper: Get Flag Component based on number
const PhoneFlag = ({ number }: { number: string }) => {
  if (!number) return <Globe size={10} className="text-slate-400" />;
  try {
    const parsed = parsePhoneNumber(number);
    if (parsed && parsed.country) {
      const FlagComponent = flags[parsed.country];
      return FlagComponent ? <FlagComponent title={parsed.country} className="w-4 h-3 shadow-sm rounded-[1px]" /> : <Globe size={10} />;
    }
  } catch (e) { return <Globe size={10} />; }
  return <Globe size={10} />;
};

const StatusIcon = ({ status }: { status?: string }) => {
  if (status === 'verified' || status === 'valid_number') return <TooltipProvider><Tooltip><TooltipTrigger><CheckCircle2 size={10} className="text-emerald-500" /></TooltipTrigger><TooltipContent>Verified</TooltipContent></Tooltip></TooltipProvider>;
  if (status === 'incorrect' || status === 'invalid') return <TooltipProvider><Tooltip><TooltipTrigger><AlertCircle size={10} className="text-red-500" /></TooltipTrigger><TooltipContent>Incorrect/Invalid</TooltipContent></Tooltip></TooltipProvider>;
  return <TooltipProvider><Tooltip><TooltipTrigger><HelpCircle size={10} className="text-slate-400" /></TooltipTrigger><TooltipContent>Unverified</TooltipContent></Tooltip></TooltipProvider>;
};

// --- DISCOVERY AVAILABILITY ICONS ---
const DiscoveryAvailabilityIcons = ({ contact }: { contact: any }) => {
  const hasEmail = contact.has_email;
  const hasPhone = contact.has_phone || contact.has_direct_phone === 'Yes';
  const hasLocation = contact.city || contact.state || contact.country || contact.original_data?.city || contact.original_data?.state || contact.original_data?.country;
  const hasOrgDetails = contact.company_name || contact.organization?.name || contact.original_data?.organization?.name;

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center justify-center h-5 w-5 rounded-full transition-colors",
              hasEmail ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
            )}>
              <Mail size={10} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{hasEmail ? 'Email Available' : 'No Email'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center justify-center h-5 w-5 rounded-full transition-colors",
              hasPhone ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
            )}>
              <Phone size={10} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{hasPhone ? 'Phone Available' : 'No Phone'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center justify-center h-5 w-5 rounded-full transition-colors",
              hasLocation ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
            )}>
              <MapPin size={10} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{hasLocation ? 'Location Available' : 'No Location'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center justify-center h-5 w-5 rounded-full transition-colors",
              hasOrgDetails ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-400"
            )}>
              <Building2 size={10} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{hasOrgDetails ? 'Company Info Available' : 'No Company Info'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// Simple Column Header (No drag, no sort from header)
const SimpleColumnHeader = ({ column, title }: { column: any; title: string }) => {
  return (
    <div className="flex items-center">
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
        {title}
      </span>
    </div>
  );
};

// --- 2. DIALOG: ADD ASSET (Phone/Email) ---

const AddAssetDialog = ({ open, onOpenChange, type, onSave }: any) => {
  const [value, setValue] = useState("");
  const [phone, setPhone] = useState("");
  const [extension, setExtension] = useState("");
  const [subtype, setSubtype] = useState(type === 'email' ? 'work' : 'mobile');
  const [status, setStatus] = useState(type === 'email' ? 'unverified' : 'no_status');

  const handleSave = () => {
    let finalValue = value;
    if (type === 'mobile' && subtype === 'mobile') {
        finalValue = extension ? `${phone} ext ${extension}` : phone;
    } else {
        if(type === 'mobile' && subtype !== 'mobile') finalValue = value;
    }
    
    onSave(finalValue, { type: subtype, status });
    onOpenChange(false);
    setValue(""); setPhone(""); setExtension("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[320px] p-4">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Add {type === 'email' ? 'Email' : 'Phone'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-slate-500">Type</Label>
            <Select value={subtype} onValueChange={setSubtype}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {type === 'email' ? (
                  <><SelectItem value="work" className="text-xs">Work</SelectItem><SelectItem value="personal" className="text-xs">Personal</SelectItem><SelectItem value="other" className="text-xs">Other</SelectItem></>
                ) : (
                  <><SelectItem value="mobile" className="text-xs">Mobile</SelectItem><SelectItem value="work_hq" className="text-xs">Office / HQ</SelectItem><SelectItem value="other" className="text-xs">Other</SelectItem></>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-slate-500">Value</Label>
            {type === "mobile" && subtype === "mobile" ? (
                <div className="flex gap-2">
                <PhoneInput international defaultCountry="US" value={phone} onChange={(v) => setPhone(v || "")} className="text-xs h-8 px-2 border rounded-md flex-1" />
                <Input placeholder="Ext" value={extension} onChange={(e) => setExtension(e.target.value)} className="h-8 w-16 text-xs" />
                </div>
            ) : type === "mobile" ? (
                <Input placeholder="+1 555 000 0000" value={value} onChange={(e) => setValue(e.target.value)} className="h-8 text-xs" />
            ) : (
                <Input placeholder="name@example.com" value={value} onChange={(e) => setValue(e.target.value)} className="h-8 text-xs" />
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-slate-500">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {type === 'email' ? (
                   <><SelectItem value="verified" className="text-xs">Verified</SelectItem><SelectItem value="unverified" className="text-xs">Unverified</SelectItem><SelectItem value="incorrect" className="text-xs">Incorrect</SelectItem></>
                ) : (
                   <><SelectItem value="valid_number" className="text-xs">Valid</SelectItem><SelectItem value="no_status" className="text-xs">No Status</SelectItem><SelectItem value="invalid" className="text-xs">Invalid</SelectItem></>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button size="sm" onClick={handleSave} className="h-7 text-xs w-full bg-indigo-600">Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- 3. ROW COMPONENT (Inside Hover Card - Fully Editable) ---

const ContactAssetRow = ({ value, type, label, isPrimary, source, status, onSetPrimary, onDelete, onUpdateFull, onFlag }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [editVal, setEditVal] = useState(value);
  const [editStatus, setEditStatus] = useState(status);

  const handleCopy = () => { navigator.clipboard.writeText(value); toast({ title: "Copied" }); };
  const handleSaveEdit = () => { onUpdateFull({ value: editVal, type: label, status: editStatus }); setEditMode(false); };
  
  const handleFlagToggle = () => {
    const isIncorrect = status === 'incorrect' || status === 'invalid';
    onFlag(isIncorrect ? (type === 'email' ? 'unverified' : 'no_status') : (type === 'email' ? 'incorrect' : 'invalid'));
  };

  return (
    <div className={cn("flex items-start justify-between p-2 rounded-md group transition-colors", isPrimary ? "bg-emerald-50/30" : "hover:bg-slate-50")} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="flex items-start gap-3 overflow-hidden w-full">
        <div className="mt-0.5 flex-shrink-0">
           {type === 'phone' ? <div className="w-5 flex justify-center"><PhoneFlag number={value} /></div> : <div className={cn("flex h-5 w-5 items-center justify-center rounded-full border", isPrimary ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-slate-100 border-slate-200 text-slate-500")}><Mail size={10} /></div>}
        </div>
        <div className="flex flex-col min-w-0 w-full">
            {editMode ? (
                <div className="flex flex-col gap-1 w-full animate-in fade-in zoom-in-95">
                    <Input className="h-6 text-xs" value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus />
                    <div className="flex gap-1">
                        <Select value={editStatus} onValueChange={setEditStatus}>
                            <SelectTrigger className="h-6 text-[10px] w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>{type === 'email' ? (<><SelectItem value="verified" className="text-xs">Verified</SelectItem><SelectItem value="unverified" className="text-xs">Unverified</SelectItem><SelectItem value="incorrect" className="text-xs">Incorrect</SelectItem></>) : (<><SelectItem value="valid_number" className="text-xs">Valid</SelectItem><SelectItem value="no_status" className="text-xs">No Status</SelectItem><SelectItem value="invalid" className="text-xs">Invalid</SelectItem></>)}</SelectContent>
                        </Select>
                        <Button size="icon" className="h-6 w-6" onClick={handleSaveEdit}><Check size={10}/></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditMode(false)}><X size={10}/></Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2"><span className={cn("text-xs font-medium truncate select-all", (status === 'incorrect' || status === 'invalid') ? 'line-through text-slate-400' : 'text-slate-800')}>{value}</span><StatusIcon status={status} /></div>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5"><Badge variant="outline" className="text-[8px] h-3.5 px-1 py-0 font-normal border-slate-200 text-slate-500 capitalize">{label || (type === 'email' ? 'Work' : 'Mobile')}</Badge><span>•</span><span className={cn(source?.toLowerCase().includes('manual') ? "text-blue-600 font-semibold" : "")}>{source?.toLowerCase().includes('manual') ? 'Manual' : 'CRM'}</span>{isPrimary && <span className="text-emerald-600 font-bold ml-1">Primary</span>}</div>
                </>
            )}
        </div>
      </div>
      {!editMode && (
          <div className={cn("flex items-center gap-0.5 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
            <TooltipProvider><Tooltip><TooltipTrigger asChild><button onClick={handleCopy} className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"><Copy size={10} /></button></TooltipTrigger><TooltipContent>Copy</TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider><Tooltip><TooltipTrigger asChild><button onClick={() => setEditMode(true)} className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"><Pencil size={10} /></button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip></TooltipProvider>
            {!isPrimary && (<TooltipProvider><Tooltip><TooltipTrigger asChild><button onClick={onSetPrimary} className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-amber-500"><Star size={10} /></button></TooltipTrigger><TooltipContent>Set Primary</TooltipContent></Tooltip></TooltipProvider>)}
            <TooltipProvider><Tooltip><TooltipTrigger asChild><button onClick={handleFlagToggle} className={cn("p-1.5 hover:bg-slate-200 rounded", (status === 'incorrect' || status === 'invalid') ? "text-red-600 bg-red-50" : "text-slate-400 hover:text-red-500")}><Flag size={10} fill={(status === 'incorrect' || status === 'invalid') ? "currentColor" : "none"} /></button></TooltipTrigger><TooltipContent>{(status === 'incorrect' || status === 'invalid') ? 'Unflag' : 'Flag Incorrect'}</TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider><Tooltip><TooltipTrigger asChild><button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"><Trash2 size={10} /></button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip></TooltipProvider>
          </div>
      )}
    </div>
  );
};

// --- 4. SMART CELL IMPLEMENTATIONS ---

const SmartEmailCell = ({ row, table }: any) => {
  const c = row.original;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Discovery mode - show availability icon
  if (c.is_discovery) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center justify-center h-6 w-6 rounded-full mx-auto cursor-help",
              c.has_email ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
            )}>
              <Mail size={12} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-medium">
              {c.has_email ? 'Email Available - Add to reveal' : 'No email available'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  const emails = [
    ...(c.email ? [{ email: c.email, type: 'work', is_primary: true, source: 'Manual', email_status: 'verified' }] : []),
    ...(c.all_emails || []).filter((e:any) => e.email !== c.email).map((e:any) => ({ ...e, source: e.source || 'CRM' }))
  ];
  const primaryEmail = emails[0]?.email;
  const count = emails.length;

  const handleAdd = (val: string, meta: any) => { table.options.meta?.handleAssetAction(row.index, 'email', 'add', val, meta); };
  const execAction = (action: string, val: string, payload?: any) => { table.options.meta?.handleAssetAction(row.index, 'email', action, val, payload); };

  if (count === 0) {
     return (
        <div className="flex items-center gap-2 group w-full">
             <Button onClick={() => table.options.meta?.enrichContact(c.id, c.apollo_person_id, 'email')} variant="secondary" size="sm" className="h-7 px-2 text-[10px] bg-slate-100 text-slate-600 hover:text-indigo-600 w-full justify-start"><Mail size={10} className="mr-2" /> Access Email</Button>
             <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-slate-100" onClick={() => setIsDialogOpen(true)}><Plus size={12} /></Button></TooltipTrigger><TooltipContent>Add manually</TooltipContent></Tooltip></TooltipProvider>
             <AddAssetDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} type="email" onSave={handleAdd} />
        </div>
     );
  }

  return (
    <HoverCard openDelay={200} closeDelay={300}>
        <HoverCardTrigger asChild>
            <div className="flex items-center justify-between w-full group cursor-pointer py-1.5 relative">
                <div className="flex items-center gap-2 overflow-hidden pr-6">
                    {c.email_status === 'verified' ? <CheckCircle2 size={10} className="text-emerald-500" /> : <Mail size={12} className="text-slate-400" />}
                    <span className="text-xs text-slate-700 truncate">{primaryEmail}</span>
                </div>
                {count > 1 && <Badge className="absolute right-0 h-4 min-w-[16px] px-1 text-[8px] bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 rounded-full pointer-events-none">+{count-1}</Badge>}
            </div>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-[340px] p-0 shadow-lg border-slate-200" sideOffset={5}>
            <div className="p-2 bg-slate-50 border-b flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase">Emails</span><div className="flex gap-2"><Badge variant="outline" className="bg-white text-[9px]">{count}</Badge><Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setIsDialogOpen(true)}><Plus size={10}/></Button></div></div>
            <div className="p-1 max-h-[250px] overflow-y-auto bg-white">
                {emails.map((e: any, idx: number) => (
                    <ContactAssetRow key={idx} value={e.email} type="email" label={e.type} isPrimary={idx===0} status={e.email_status} source={e.source}
                        onSetPrimary={() => execAction('set_primary', e.email)} onDelete={() => execAction('delete', e.email)} onFlag={(status: string) => execAction('flag', e.email, status)} onUpdateFull={(payload: any) => execAction('edit', e.email, payload)} />
                ))}
            </div>
            <AddAssetDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} type="email" onSave={handleAdd} />
        </HoverCardContent>
    </HoverCard>
  );
};

const SmartPhoneCell = ({ row, table }: any) => {
  const c = row.original;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Discovery mode - show availability icon
  if (c.is_discovery) {
    const hasPhone = c.has_phone || c.has_direct_phone === 'Yes';
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center justify-center h-6 w-6 rounded-full mx-auto cursor-help",
              hasPhone ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
            )}>
              <Phone size={12} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-medium">
              {hasPhone ? 'Phone Available - Add to reveal' : 'No phone available'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const phones = [
    ...(c.mobile ? [{ phone_number: c.mobile, type: 'mobile', source_name: 'Manual', status: 'valid_number' }] : []),
    ...(c.all_phones || []).filter((p:any) => p.phone_number !== c.mobile).map((p:any) => ({ ...p, source_name: p.source_name || 'CRM' }))
  ];
  const primaryPhone = phones[0]?.phone_number;
  const count = phones.length;

  const handleAdd = (val: string, meta: any) => { table.options.meta?.handleAssetAction(row.index, 'mobile', 'add', val, meta); };
  const execAction = (action: string, val: string, payload?: any) => { table.options.meta?.handleAssetAction(row.index, 'mobile', action, val, payload); };

  if (count === 0) {
      return (
        <div className="flex items-center gap-2 w-full group">
             {c.phone_enrichment_status === 'pending_phones' ? (
                 <Badge className="bg-amber-50 text-amber-600 border-amber-200 animate-pulse font-bold text-[9px] w-full justify-center"><Clock size={10} className="mr-1"/> Verifying...</Badge>
             ) : (
                <Button onClick={() => table.options.meta?.enrichContact(c.id, c.apollo_person_id, 'phone')} variant="secondary" size="sm" className="h-7 px-2 text-[10px] bg-slate-100 text-slate-600 hover:text-emerald-600 w-full justify-start"><Phone size={10} className="mr-2" /> Access Mobile</Button>
             )}
             <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-emerald-600 rounded-full hover:bg-slate-100" onClick={() => setIsDialogOpen(true)}><Plus size={12} /></Button></TooltipTrigger><TooltipContent>Add manually</TooltipContent></Tooltip></TooltipProvider>
             <AddAssetDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} type="mobile" onSave={handleAdd} />
        </div>
      );
  }

  return (
    <HoverCard openDelay={200} closeDelay={300}>
        <HoverCardTrigger asChild>
            <div className="flex items-center justify-between w-full group cursor-pointer py-1.5 relative">
                <div className="flex items-center gap-2 overflow-hidden pr-6">
                    <PhoneFlag number={primaryPhone} />
                    <span className="text-xs text-slate-700 truncate">{primaryPhone}</span>
                </div>
                {count > 1 && <Badge className="absolute right-0 h-4 min-w-[16px] px-1 text-[8px] bg-green-50 text-green-600 border-green-100 hover:bg-green-100 rounded-full pointer-events-none">+{count-1}</Badge>}
            </div>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-[340px] p-0 shadow-lg border-slate-200" sideOffset={5}>
            <div className="p-2 bg-slate-50 border-b flex justify-between items-center"><span className="text-[10px] font-bold text-slate-500 uppercase">Phones</span><div className="flex gap-2"><Badge variant="outline" className="bg-white text-[9px]">{count}</Badge><Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setIsDialogOpen(true)}><Plus size={10}/></Button></div></div>
            <div className="p-1 max-h-[250px] overflow-y-auto bg-white">
                {phones.map((p: any, idx: number) => (
                    <ContactAssetRow key={idx} value={p.phone_number} type="phone" label={p.type} isPrimary={idx===0} status={p.status} source={p.source_name}
                        onSetPrimary={() => execAction('set_primary', p.phone_number)} onDelete={() => execAction('delete', p.phone_number)} onFlag={(status: string) => execAction('flag', p.phone_number, status)} onUpdateFull={(payload: any) => execAction('edit', p.phone_number, payload)} />
                ))}
            </div>
            <AddAssetDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} type="mobile" onSave={handleAdd} />
        </HoverCardContent>
    </HoverCard>
  );
};


// --- 5. OTHER CELLS ---

export const EditableCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (row.getIsGrouped() || isDiscoveryRow(row)) return <span className="text-xs text-slate-600 truncate">{getValue()}</span>;
  const initialValue = getValue() || "";
  const [value, setValue] = useState(initialValue);
  const onBlur = () => { if (value !== initialValue) table.options.meta?.updateData(row.index, column.id, value); };
  useEffect(() => setValue(initialValue), [initialValue]);
  return <Input value={value} onChange={(e) => setValue(e.target.value)} onBlur={onBlur} className="h-full text-xs border-none bg-transparent rounded-none p-0 truncate focus-visible:ring-1 focus-visible:ring-blue-500" />;
};

const ActionCell = ({ row, table }: any) => {
  const c = row.original;
  const deleteContactMutation = useDeleteContact();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  // Discovery mode – show prominent ADD button
  if (c.is_discovery) {
    return (
      <div className="flex justify-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={() => table.options.meta?.openListModal(c, true)}
                className="h-7 px-3 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm active:scale-95 transition-all rounded-md"
              >
                <Plus size={12} className="mr-1.5" />
                ADD
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              Save to CRM & add to list
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Normal CRM contact – direct icon buttons
  return (
    <div className="flex items-center justify-end gap-0.5">
      {/* Add to List */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-md"
              onClick={() => table.options.meta?.openListModal(c, false)}
            >
              <ListPlus size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Add to List
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* View Profile */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50/60 rounded-md"
              asChild
            >
              <Link to={`/contacts/${c.id}`}>
                <Eye size={14} />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            View Profile
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Verify / Enrich Data */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/60 rounded-md"
              onClick={() => table.options.meta?.enrichContact(c.id, c.apollo_person_id, 'email')}
            >
              <ShieldCheck size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Verify / Enrich Data
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Delete */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50/60 rounded-md"
              onClick={() => setIsDeleting(true)}
            >
              <Trash2 size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Delete Contact
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <span className="font-medium">{c.name}</span>?
              <br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteContactMutation.mutate(c.id, {
                  onSuccess: () => {
                    toast({ title: "Contact deleted", description: "The contact has been removed." });
                    setIsDeleting(false);
                  },
                  onError: () => {
                    toast({
                      variant: "destructive",
                      title: "Failed to delete",
                      description: "Something went wrong. Please try again.",
                    });
                  },
                });
                setIsDeleting(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CompanyCell: React.FC<any> = ({ getValue, row, table }) => {
  if (isDiscoveryRow(row)) return <span className="text-xs text-slate-700 truncate">{getValue()}</span>;
  const initialCompanyId = row.original.company_id;
  const companyName = getValue() as string;
  const onSelect = (id: number | null) => table.options.meta?.updateData(row.index, 'company_id', id);
  return <CompanyCombobox value={initialCompanyId} onSelect={onSelect} initialName={companyName} />;
};

const StageSelectCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (isDiscoveryRow(row)) return null;
  const initialValue = getValue();
  const { data: stages = [] } = useContactStages();
  const onValueChange = (val: string) => table.options.meta?.updateData(row.index, column.id, val);
  const stageInfo = stages.find(s => s.name === initialValue);
  
  return (
    <Select value={initialValue || ""} onValueChange={onValueChange}>
      <SelectTrigger className="h-7 text-xs border-none bg-transparent shadow-none px-0">
        <SelectValue>
          {initialValue ? (
            <Badge variant="outline" className="border text-[10px] font-medium" style={{ backgroundColor: stageInfo?.color + '20', color: stageInfo?.color, borderColor: stageInfo?.color + '40' }}>{initialValue}</Badge>
          ) : <span className="text-slate-400 text-xs">Select...</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {stages.map(stage => (
          <SelectItem key={stage.id} value={stage.name} className="text-xs">
             <div className="flex items-center"><span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />{stage.name}</div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const MediumSelectCell: React.FC<any> = ({ getValue, row, column, table }) => {
  if (isDiscoveryRow(row)) return null;
  const initialValue = getValue();
  const onValueChange = (val: string) => table.options.meta?.updateData(row.index, column.id, val);
  const mediumOptions = [
    { name: 'LinkedIn', color: '#0A66C2', icon: LinkIcon },
    { name: 'Cold Call', color: '#413a3aff', icon: Phone },
    { name: 'Email Campaign', color: '#10B981', icon: Mail },
    { name: 'Referral', color: '#8B5CF6', icon: UserPlus },
    { name: 'Website Form', color: '#3B82F6', icon: Globe },
    { name: 'Other', color: '#6B7280', icon: MoreHorizontal },
  ];
  const selected = mediumOptions.find(o => o.name === initialValue);
  return (
    <Select value={initialValue || ""} onValueChange={onValueChange}>
      <SelectTrigger className="h-7 text-xs border-none bg-transparent shadow-none px-0">
        <SelectValue>
          {initialValue ? (
             <Badge variant="outline" className="border text-[10px] font-medium flex items-center gap-1" style={{ backgroundColor: selected?.color + '20', color: selected?.color, borderColor: selected?.color + '40' }}>
               {selected && <selected.icon size={10} />} {initialValue}
             </Badge>
          ) : <span className="text-slate-400 text-xs">Source...</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {mediumOptions.map(m => (
          <SelectItem key={m.name} value={m.name} className="text-xs">{m.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const DisplayDateCell: React.FC<any> = ({ getValue }) => {
  const date = getValue();
  if (!date) return <span className="text-slate-400 text-xs">-</span>;
  return <span className="text-slate-600 text-xs">{new Date(date).toLocaleDateString()}</span>;
};

// --- 6. EXPORTED COLUMNS ---

export const columns: ColumnDef<any>[] = [
  // 1. SELECT (Sticky)
  {
    id: 'select',
    size: 40,
    minSize: 40,
    maxSize: 40,
    header: ({ table }) => (
      <div className="px-1 flex justify-center">
        <Checkbox 
          checked={table.getIsAllPageRowsSelected()} 
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)} 
          className="h-3.5 w-3.5 border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-indigo-600" 
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="px-1 flex justify-center">
        <Checkbox 
          checked={row.getIsSelected()} 
          onCheckedChange={(v) => row.toggleSelected(!!v)} 
          className="h-3.5 w-3.5" 
        />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
  
  // 2. NAME (Sticky)
  {
    accessorKey: 'name',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Name" />,
    size: 200,
    minSize: 150,
    maxSize: 300,
    enableSorting: false,
    cell: ({ row }) => {
      const c = row.original;
      return (
        <div className="flex items-center gap-3 py-1">
          <Avatar className="h-7 w-7 border border-slate-100 rounded-lg flex-shrink-0">
            <AvatarImage src={c.photo_url} />
            <AvatarFallback className="text-[9px] bg-slate-100 text-slate-500 font-bold">{c.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            {c.is_discovery ? (
               <span className="text-xs font-bold text-slate-900 truncate" title={c.name}>{c.name}</span>
            ) : (
               <Link to={`/contacts/${c.id}`} className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline truncate" title={c.name}>
                 {c.name}
               </Link>
            )}
             {c.linkedin_url && (
                <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-blue-500">
                    <Linkedin size={9} /> LinkedIn
                </a>
             )}
          </div>
        </div>
      );
    }
  },

  // 3. SMART CONTACT INFO
  {
    accessorKey: 'email',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Email" />,
    size: 180,
    enableSorting: false,
    cell: SmartEmailCell
  },
  {
    accessorKey: 'mobile',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Phone" />,
    size: 160,
    enableSorting: false,
    cell: SmartPhoneCell
  },

  // 4. JOB & COMPANY
  {
    accessorKey: 'job_title',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Job Title" />,
    size: 180,
    enableSorting: false,
    cell: EditableCell
  },
  {
    accessorKey: 'company_name',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Company" />,
    size: 160,
    enableSorting: false,
    cell: CompanyCell
  },

  // 5. ACTIONS
  {
    id: 'actions',
    header: () => <div className="text-center text-[10px] font-bold uppercase tracking-wider text-white/90">Actions</div>,
    size: 100,
    cell: ActionCell,
    enableHiding: false,
    enableSorting: false,
  },

  // 6. CRM SPECIFIC
  {
    accessorKey: 'contact_stage',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Stage" />,
    size: 130,
    enableSorting: false,
    cell: StageSelectCell,
    enableHiding: true,
  },
  { 
    accessorKey: 'medium', 
    header: ({ column }) => <SimpleColumnHeader column={column} title="Source" />,
    size: 130, 
    enableSorting: false,
    cell: MediumSelectCell,
    enableHiding: true,
  },
  {
    accessorFn: (row) => row.created_by ?? null,
    id: 'created_by_employee',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Owner" />,
    size: 80,
    enableSorting: false,
    cell: ({ row }) => {
      if (isDiscoveryRow(row)) return <span className="text-slate-300">-</span>;
      const employee = row.original.created_by_employee;
      if (!employee) return <span className="text-slate-400 text-[10px]">-</span>;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger><Avatar className="h-5 w-5"><AvatarImage src={employee.profile_picture_url} /><AvatarFallback className="text-[8px] bg-indigo-600 text-white">{employee.first_name?.[0]}</AvatarFallback></Avatar></TooltipTrigger>
            <TooltipContent><p className="text-xs">{employee.first_name} {employee.last_name}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    enableHiding: true,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Created" />,
    size: 90,
    enableSorting: false,
    cell: ({ row, getValue }) => isDiscoveryRow(row) ? <span className="text-slate-300">-</span> : <DisplayDateCell getValue={getValue} />,
    enableHiding: true,
  },
  
  // 7. LOCATION (Editable with real-time local time)
  {
    id: 'location',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Location" />,
    accessorFn: row => [row.city, row.state, row.country].filter(Boolean).join(', '),
    cell: LocationCell,
    size: 200,
    minSize: 150,
    maxSize: 300,
    enableSorting: false,
    enableHiding: true,
  },

  // 8. HIDDEN METADATA (Helpers for filtering)
  { id: 'seniority', accessorKey: 'seniority', enableHiding: true, size: 0 },
  { id: 'departments', accessorKey: 'departments', enableHiding: true, size: 0 },
  { id: 'functions', accessorKey: 'functions', enableHiding: true, size: 0 },
  { id: 'industry', accessorKey: 'industry', enableHiding: true, size: 0 },
  { id: 'revenue', accessorKey: 'revenue', enableHiding: true, size: 0 },
  { id: 'employee_count', accessorKey: 'employee_count', enableHiding: true, size: 0 },
  { id: 'updated_at', accessorKey: 'updated_at', enableHiding: true, size: 0 },
];
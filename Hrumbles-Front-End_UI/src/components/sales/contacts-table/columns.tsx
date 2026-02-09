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
  ChevronDown, Link as LinkIcon, Trash2, 
  Linkedin, Phone, Mail, UserPlus, Globe, MoreHorizontal, 
  Copy, Check, Loader2, Plus, ShieldCheck, ListPlus, Eye, Building2, Clock, 
  CheckCircle2, Flag, Star, Pencil, AlertCircle, HelpCircle, X, XCircle,
  MapPin, Sparkles, Zap, Signal, SignalHigh, SignalLow, SignalMedium
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

// --- UTILITIES ---

const isDiscoveryRow = (row: any) => row.original?.is_discovery === true;

// Phone Flag Component
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

// Status Icons with Colors
const StatusIcon = ({ status }: { status?: string }) => {
  if (status === 'verified' || status === 'valid_number') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100">
              <CheckCircle2 size={10} className="text-emerald-600 fill-emerald-100" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Verified</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  if (status === 'incorrect' || status === 'invalid') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center justify-center h-4 w-4 rounded-full bg-red-100">
              <XCircle size={10} className="text-red-500 fill-red-100" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Invalid</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center justify-center h-4 w-4 rounded-full bg-slate-100">
            <HelpCircle size={10} className="text-slate-400" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Unverified</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Deliverability Indicator Component
const DeliverabilityIndicator = ({ level }: { level: 'high' | 'medium' | 'low' | 'none' }) => {
  const configs = {
    high: {
      icon: SignalHigh,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      fillColor: 'fill-emerald-600',
      label: 'Highly Deliverable',
      bars: 3,
    },
    medium: {
      icon: SignalMedium,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      fillColor: 'fill-amber-600',
      label: 'Likely Deliverable',
      bars: 2,
    },
    low: {
      icon: SignalLow,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
      fillColor: 'fill-orange-500',
      label: 'Low Deliverability',
      bars: 1,
    },
    none: {
      icon: Signal,
      color: 'text-slate-400',
      bgColor: 'bg-slate-100',
      fillColor: 'fill-slate-400',
      label: 'Unknown',
      bars: 0,
    },
  };

  const config = configs[level];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center justify-center h-5 w-5 rounded-full transition-all", config.bgColor)}>
            <Icon size={12} className={cn(config.color, config.fillColor)} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs font-medium">{config.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Simple Column Header
const SimpleColumnHeader = ({ column, title }: { column: any; title: string }) => (
  <div className="flex items-center">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/90">
      {title}
    </span>
  </div>
);

// --- ADD ASSET DIALOG ---
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
    } else if (type === 'mobile' && subtype !== 'mobile') {
      finalValue = value;
    }
    onSave(finalValue, { type: subtype, status });
    onOpenChange(false);
    setValue(""); setPhone(""); setExtension("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] p-0 overflow-hidden">
        <DialogHeader className={cn(
          "px-4 py-3",
          type === 'email' 
            ? "bg-gradient-to-r from-indigo-600 to-blue-600" 
            : "bg-gradient-to-r from-emerald-600 to-teal-600"
        )}>
          <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
            {type === 'email' ? <Mail size={16} /> : <Phone size={16} />}
            Add {type === 'email' ? 'Email' : 'Phone'}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-slate-500 font-semibold">Type</Label>
            <Select value={subtype} onValueChange={setSubtype}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
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
            <Label className="text-[10px] uppercase text-slate-500 font-semibold">Value</Label>
            {type === "mobile" && subtype === "mobile" ? (
              <div className="flex gap-2">
                <PhoneInput international defaultCountry="US" value={phone} onChange={(v) => setPhone(v || "")} className="text-xs h-9 px-2 border rounded-md flex-1" />
                <Input placeholder="Ext" value={extension} onChange={(e) => setExtension(e.target.value)} className="h-9 w-16 text-xs" />
              </div>
            ) : type === "mobile" ? (
              <Input placeholder="+1 555 000 0000" value={value} onChange={(e) => setValue(e.target.value)} className="h-9 text-xs" />
            ) : (
              <Input placeholder="name@example.com" value={value} onChange={(e) => setValue(e.target.value)} className="h-9 text-xs" />
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-slate-500 font-semibold">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
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
        <div className="px-4 pb-4">
          <Button size="sm" onClick={handleSave} className={cn(
            "h-9 text-xs w-full font-semibold",
            type === 'email' ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"
          )}>
            Save {type === 'email' ? 'Email' : 'Phone'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


// --- EDIT ASSET DIALOG ---
const EditAssetDialog = ({ open, onOpenChange, type, initialValue, initialType, initialStatus, onSave }: any) => {
  const [value, setValue] = useState(initialValue || "");
  const [subtype, setSubtype] = useState(initialType || (type === 'email' ? 'work' : 'mobile'));
  const [status, setStatus] = useState(initialStatus || (type === 'email' ? 'unverified' : 'no_status'));

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setValue(initialValue || "");
      setSubtype(initialType || (type === 'email' ? 'work' : 'mobile'));
      setStatus(initialStatus || (type === 'email' ? 'unverified' : 'no_status'));
    }
  }, [open, initialValue, initialType, initialStatus, type]);

  const handleSave = () => {
    onSave({ value, type: subtype, status });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] p-0 overflow-hidden">
        {/* Header with gradient (keeps consistency with Add dialog) */}
        <DialogHeader className={cn(
          "px-4 py-3",
          type === 'email' 
            ? "bg-gradient-to-r from-indigo-600 to-blue-600" 
            : "bg-gradient-to-r from-emerald-600 to-teal-600"
        )}>
          <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Pencil size={16} />
            Edit {type === 'email' ? 'Email' : 'Phone'}
          </DialogTitle>
        </DialogHeader>

        {/* Form Fields */}
        <div className="p-4 space-y-3">
          {/* Value Input */}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-slate-500 font-semibold">Value</Label>
            {type === "mobile" ? (
              <PhoneInput 
                international 
                defaultCountry="US" 
                value={value} 
                onChange={(v) => setValue(v || "")} 
                className="text-xs h-9 px-2 border rounded-md w-full"
              />
            ) : (
              <Input 
                value={value} 
                onChange={(e) => setValue(e.target.value)} 
                className="h-9 text-xs" 
                placeholder={type === 'email' ? "name@example.com" : "+1 555 000 0000"}
              />
            )}
          </div>

          {/* Type Select */}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-slate-500 font-semibold">Type</Label>
            <Select value={subtype} onValueChange={setSubtype}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {type === 'email' ? (
                  <>
                    <SelectItem value="work" className="text-xs">Work</SelectItem>
                    <SelectItem value="personal" className="text-xs">Personal</SelectItem>
                    <SelectItem value="other" className="text-xs">Other</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="mobile" className="text-xs">Mobile</SelectItem>
                    <SelectItem value="work_hq" className="text-xs">Office / HQ</SelectItem>
                    <SelectItem value="other" className="text-xs">Other</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Status Select */}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-slate-500 font-semibold">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {type === 'email' ? (
                  <>
                    <SelectItem value="verified" className="text-xs">Verified</SelectItem>
                    <SelectItem value="unverified" className="text-xs">Unverified</SelectItem>
                    <SelectItem value="incorrect" className="text-xs">Incorrect</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="valid_number" className="text-xs">Valid</SelectItem>
                    <SelectItem value="no_status" className="text-xs">No Status</SelectItem>
                    <SelectItem value="invalid" className="text-xs">Invalid</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-4 pb-4 flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="h-9 text-xs flex-1"
          >
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave} 
            className={cn(
              "h-9 text-xs flex-1 font-semibold",
              type === 'email' ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// --- CONTACT ASSET ROW (HoverCard Content) ---

const ContactAssetRow = ({ value, type, label, isPrimary, source, status, onSetPrimary, onDelete, onUpdateFull, onFlag }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleCopy = () => { 
    navigator.clipboard.writeText(value); 
    toast({ title: "Copied!", description: `${type === 'email' ? 'Email' : 'Phone'} copied to clipboard` }); 
  };
  
  const handleFlagToggle = () => {
    const isIncorrect = status === 'incorrect' || status === 'invalid';
    onFlag(isIncorrect ? (type === 'email' ? 'unverified' : 'no_status') : (type === 'email' ? 'incorrect' : 'invalid'));
  };

  // Determine deliverability level for emails
  const getDeliverability = () => {
    if (type !== 'email') return null;
    if (status === 'verified') return 'high';
    if (status === 'likely' || status === 'unverified') return 'medium';
    if (status === 'incorrect') return 'none';
    return 'low';
  };

  const deliverability = getDeliverability();

  return (
    <>
      <div 
        className={cn(
          "flex items-start justify-between p-2.5 rounded-lg group transition-all",
          isPrimary 
            ? "bg-emerald-50/80 border border-emerald-200/50" 
            : "hover:bg-slate-50 border border-transparent hover:border-slate-200/50"
        )} 
        onMouseEnter={() => setIsHovered(true)} 
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start gap-3 overflow-hidden w-full">
          {/* Icon */}
          <div className="mt-0.5 flex-shrink-0">
            {type === 'phone' ? (
              <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-100">
                <PhoneFlag number={value} />
              </div>
            ) : (
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-lg",
                isPrimary ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"
              )}>
                <Mail size={12} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col min-w-0 w-full">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-medium truncate select-all",
                (status === 'incorrect' || status === 'invalid') ? 'line-through text-slate-400' : 'text-slate-800'
              )}>
                {value}
              </span>
              {deliverability && <DeliverabilityIndicator level={deliverability} />}
              {type === 'phone' && <StatusIcon status={status} />}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-1">
              <Badge variant="outline" className="text-[8px] h-4 px-1.5 py-0 font-medium border-slate-200 text-slate-500 capitalize bg-white">
                {label || (type === 'email' ? 'Work' : 'Mobile')}
              </Badge>
              <span className="text-slate-300">•</span>
              <span className={cn(source?.toLowerCase().includes('manual') ? "text-blue-600 font-semibold" : "text-slate-400")}>
                {source?.toLowerCase().includes('manual') ? 'Manual' : 'CRM'}
              </span>
              {isPrimary && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                    <Star size={8} className="fill-emerald-600" /> Primary
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={cn("flex items-center gap-0.5 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
          {/* Copy */}
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <button onClick={handleCopy} className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition-colors">
              <Copy size={11} />
            </button>
          </TooltipTrigger><TooltipContent className="text-xs">Copy</TooltipContent></Tooltip></TooltipProvider>
          
          {/* Edit - Opens Dialog */}
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <button onClick={() => setEditDialogOpen(true)} className="p-1.5 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-700 transition-colors">
              <Pencil size={11} />
            </button>
          </TooltipTrigger><TooltipContent className="text-xs">Edit</TooltipContent></Tooltip></TooltipProvider>
          
          {/* Set Primary */}
          {!isPrimary && (
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
              <button onClick={onSetPrimary} className="p-1.5 hover:bg-amber-100 rounded-md text-slate-400 hover:text-amber-600 transition-colors">
                <Star size={11} />
              </button>
            </TooltipTrigger><TooltipContent className="text-xs">Set Primary</TooltipContent></Tooltip></TooltipProvider>
          )}
          
          {/* Flag */}
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <button 
              onClick={handleFlagToggle} 
              className={cn(
                "p-1.5 rounded-md transition-colors",
                (status === 'incorrect' || status === 'invalid') 
                  ? "text-red-600 bg-red-50 hover:bg-red-100" 
                  : "text-slate-400 hover:text-red-500 hover:bg-red-50"
              )}
            >
              <Flag size={11} fill={(status === 'incorrect' || status === 'invalid') ? "currentColor" : "none"} />
            </button>
          </TooltipTrigger><TooltipContent className="text-xs">{(status === 'incorrect' || status === 'invalid') ? 'Unflag' : 'Flag Incorrect'}</TooltipContent></Tooltip></TooltipProvider>
          
          {/* Delete */}
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600 transition-colors">
              <Trash2 size={11} />
            </button>
          </TooltipTrigger><TooltipContent className="text-xs">Delete</TooltipContent></Tooltip></TooltipProvider>
        </div>
      </div>
      
      {/* Edit Dialog */}
      <EditAssetDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        type={type}
        initialValue={value}
        initialType={label}
        initialStatus={status}
        onSave={onUpdateFull}
      />
    </>
  );
};

// --- SMART EMAIL CELL ---
const SmartEmailCell = ({ row, table }: any) => {
  const c = row.original;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Note: Discovery rows will fall through and likely hit the "Access Email" button state 
  // or return null if they have no ID/CRM data. 
  // For the discovery table specifically, this cell will be hidden by parent configuration, 
  // and the new 'data_availability' column will be used instead.

  // CRM Contact - Show actual emails with deliverability
  const emails = [
    ...(c.email ? [{ email: c.email, type: 'work', is_primary: true, source: 'Manual', email_status: 'verified' }] : []),
    ...(c.all_emails || []).filter((e:any) => e.email !== c.email).map((e:any) => ({ ...e, source: e.source || 'CRM' }))
  ];
  const primaryEmail = emails[0]?.email;
  const primaryStatus = emails[0]?.email_status;
  const count = emails.length;

  const handleAdd = (val: string, meta: any) => { table.options.meta?.handleAssetAction(row.index, 'email', 'add', val, meta); };
  const execAction = (action: string, val: string, payload?: any) => { table.options.meta?.handleAssetAction(row.index, 'email', action, val, payload); };

  // No emails - show access button
  if (count === 0) {
    return (
      <div className="flex items-center gap-2 group w-full">
        <Button 
          onClick={() => table.options.meta?.enrichContact(c.id, c.apollo_person_id, 'email')} 
          variant="outline" 
          size="sm" 
          className="h-7 px-2.5 text-[10px] font-medium bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200/60 text-indigo-700 hover:from-indigo-100 hover:to-blue-100 w-full justify-start shadow-sm"
        >
          <Zap size={10} className="mr-1.5 text-indigo-500" /> 
          Access Email
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50" onClick={() => setIsDialogOpen(true)}>
                <Plus size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Add manually</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <AddAssetDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} type="email" onSave={handleAdd} />
      </div>
    );
  }

  // Determine deliverability display
  const getDeliverabilityLevel = (status: string) => {
    if (status === 'verified') return 'high';
    if (status === 'likely' || status === 'unverified') return 'medium';
    return 'low';
  };

  return (
    <HoverCard openDelay={150} closeDelay={200}>
      <HoverCardTrigger asChild>
        <div className="flex items-center justify-between w-full group cursor-pointer py-1 relative">
          <div className="flex items-center gap-2 overflow-hidden pr-8">
            <DeliverabilityIndicator level={getDeliverabilityLevel(primaryStatus)} />
            <span className="text-xs text-slate-700 truncate font-medium">{primaryEmail}</span>
          </div>
          {count > 1 && (
            <Badge className="absolute right-0 h-5 min-w-[20px] px-1.5 text-[9px] font-semibold bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 border-indigo-200/50 rounded-full">
              +{count-1}
            </Badge>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-[360px] p-0 shadow-xl border-slate-200 rounded-xl overflow-hidden" sideOffset={5}>
        <div className="px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 flex justify-between items-center">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Mail size={12} /> Emails
          </span>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white text-[9px] font-semibold border-0">{count}</Badge>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/20" onClick={() => setIsDialogOpen(true)}>
              <Plus size={12} />
            </Button>
          </div>
        </div>
        <div className="p-2 max-h-[280px] overflow-y-auto bg-white space-y-1">
          {emails.map((e: any, idx: number) => (
            <ContactAssetRow 
              key={idx} 
              value={e.email} 
              type="email" 
              label={e.type} 
              isPrimary={idx === 0} 
              status={e.email_status} 
              source={e.source}
              onSetPrimary={() => execAction('set_primary', e.email)} 
              onDelete={() => execAction('delete', e.email)} 
              onFlag={(status: string) => execAction('flag', e.email, status)} 
              onUpdateFull={(payload: any) => execAction('edit', e.email, payload)} 
            />
          ))}
        </div>
        <AddAssetDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} type="email" onSave={handleAdd} />
      </HoverCardContent>
    </HoverCard>
  );
};

// --- SMART PHONE CELL ---
const SmartPhoneCell = ({ row, table }: any) => {
  const c = row.original;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Note: Removing the 'is_discovery' pill logic. 
  // Discovery rows will use the dedicated 'data_availability' column instead.

  // CRM Contact
  const phones = [
    ...(c.mobile ? [{ phone_number: c.mobile, type: 'mobile', source_name: 'Manual', status: 'valid_number' }] : []),
    ...(c.all_phones || []).filter((p:any) => p.phone_number !== c.mobile).map((p:any) => ({ ...p, source_name: p.source_name || 'CRM' }))
  ];
  const primaryPhone = phones[0]?.phone_number;
  const count = phones.length;

  const handleAdd = (val: string, meta: any) => { table.options.meta?.handleAssetAction(row.index, 'mobile', 'add', val, meta); };
  const execAction = (action: string, val: string, payload?: any) => { table.options.meta?.handleAssetAction(row.index, 'mobile', action, val, payload); };

  // No phones
  if (count === 0) {
    return (
      <div className="flex items-center gap-2 w-full group">
        {c.phone_enrichment_status === 'pending_phones' ? (
          <Badge className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-amber-200/60 animate-pulse font-semibold text-[9px] w-full justify-center py-1.5">
            <Loader2 size={10} className="mr-1.5 animate-spin" /> Verifying...
          </Badge>
        ) : (
          <Button 
            onClick={() => table.options.meta?.enrichContact(c.id, c.apollo_person_id, 'phone')} 
            variant="outline" 
            size="sm" 
            className="h-7 px-2.5 text-[10px] font-medium bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200/60 text-emerald-700 hover:from-emerald-100 hover:to-teal-100 w-full justify-start shadow-sm"
          >
            <Zap size={10} className="mr-1.5 text-emerald-500" /> 
            Access Phone
          </Button>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-emerald-600 rounded-full hover:bg-emerald-50" onClick={() => setIsDialogOpen(true)}>
                <Plus size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Add manually</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <AddAssetDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} type="mobile" onSave={handleAdd} />
      </div>
    );
  }

  return (
    <HoverCard openDelay={150} closeDelay={200}>
      <HoverCardTrigger asChild>
        <div className="flex items-center justify-between w-full group cursor-pointer py-1 relative">
          <div className="flex items-center gap-2 overflow-hidden pr-8">
            <div className="flex items-center justify-center h-5 w-6 rounded bg-slate-100">
              <PhoneFlag number={primaryPhone} />
            </div>
            <span className="text-xs text-slate-700 truncate font-medium">{primaryPhone}</span>
          </div>
          {count > 1 && (
            <Badge className="absolute right-0 h-5 min-w-[20px] px-1.5 text-[9px] font-semibold bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200/50 rounded-full">
              +{count-1}
            </Badge>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-[360px] p-0 shadow-xl border-slate-200 rounded-xl overflow-hidden" sideOffset={5}>
        <div className="px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 flex justify-between items-center">
          <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Phone size={12} /> Phones
          </span>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white text-[9px] font-semibold border-0">{count}</Badge>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/20" onClick={() => setIsDialogOpen(true)}>
              <Plus size={12} />
            </Button>
          </div>
        </div>
        <div className="p-2 max-h-[280px] overflow-y-auto bg-white space-y-1">
          {phones.map((p: any, idx: number) => (
            <ContactAssetRow 
              key={idx} 
              value={p.phone_number} 
              type="phone" 
              label={p.type} 
              isPrimary={idx === 0} 
              status={p.status} 
              source={p.source_name}
              onSetPrimary={() => execAction('set_primary', p.phone_number)} 
              onDelete={() => execAction('delete', p.phone_number)} 
              onFlag={(status: string) => execAction('flag', p.phone_number, status)} 
              onUpdateFull={(payload: any) => execAction('edit', p.phone_number, payload)} 
            />
          ))}
        </div>
        <AddAssetDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} type="mobile" onSave={handleAdd} />
      </HoverCardContent>
    </HoverCard>
  );
};

// --- OTHER CELLS ---

export const EditableCell: React.FC<any> = ({ getValue, row, column, table }) => {
  const value = getValue() as string || '';
  
  // Discovery or grouped rows → read-only truncated display
  if (row.getIsGrouped() || isDiscoveryRow(row)) {
    return (
      <div 
        className="truncate text-xs text-slate-600 min-w-0"
        title={value}
      >
        {value || '-'}
      </div>
    );
  }

  // Normal editable mode
  const initialValue = value;
  const [localValue, setLocalValue] = useState(initialValue);

  const onBlur = () => {
    if (localValue !== initialValue) {
      table.options.meta?.updateData(row.index, column.id, localValue);
    }
  };

  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  return (
    <Input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={onBlur}
      className="h-full text-xs border-none bg-transparent rounded-none p-0 truncate focus-visible:ring-1 focus-visible:ring-indigo-500/50 min-w-0"
      title={localValue} // tooltip on hover shows full value
    />
  );
};

const ActionCell = ({ row, table }: any) => {
  const c = row.original;
  const deleteContactMutation = useDeleteContact();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  // Discovery mode – prominent ADD button with gradient
 if (c.is_discovery) {
    return (
     <div className="flex justify-center">
                      {/* <div className="flex items-center space-x-1 rounded-full bg-slate-100 p-1 shadow-md border border-slate-200"> */}
<TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
        <Button
          variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          onClick={() => table.options.meta?.openListModal(c, true)}
        >
          <ListPlus size={12} className="mr-1.5" />
        
        </Button>
        </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Add to List</TooltipContent>

        </Tooltip>
</TooltipProvider>


      {/* </div> */}
      </div>
    );
  }

  // CRM contact actions
  return (
    <div className="flex items-center justify-end gap-0.5">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              onClick={() => table.options.meta?.openListModal(c, false)}
            >
              <ListPlus size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Add to List</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              asChild
            >
              <Link to={`/contacts/${c.id}`}>
                <Eye size={14} />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">View Profile</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              onClick={() => table.options.meta?.enrichContact(c.id, c.apollo_person_id, 'email')}
            >
              <ShieldCheck size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Verify / Enrich</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              onClick={() => setIsDeleting(true)}
            >
              <Trash2 size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Delete</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Permanently delete <span className="font-semibold">{c.name}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleting(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteContactMutation.mutate(c.id, {
                  onSuccess: () => {
                    toast({ title: "Contact deleted" });
                    setIsDeleting(false);
                  },
                  onError: () => {
                    toast({ variant: "destructive", title: "Failed to delete" });
                  },
                });
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


// --- COMPANY CELL (Professional Discovery Mode) ---
const CompanyCell: React.FC<any> = ({ getValue, row, table }) => {
  if (isDiscoveryRow(row)) {
    const companyName = getValue() || row.original.original_data?.organization?.name;
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-slate-100 text-slate-600">
          <Building2 size={12} />
        </div>
        <span className="text-xs text-slate-700 truncate font-medium">{companyName || '-'}</span>
      </div>
    );
  }
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
      <SelectTrigger className="h-7 text-xs border-none bg-transparent shadow-none px-0 hover:bg-slate-50 rounded-lg transition-colors">
        <SelectValue>
          {initialValue ? (
            <Badge 
              className="text-[10px] font-semibold border"
              style={{ 
                backgroundColor: stageInfo?.color + '15', 
                color: stageInfo?.color, 
                borderColor: stageInfo?.color + '30' 
              }}
            >
              {initialValue}
            </Badge>
          ) : <span className="text-slate-400 text-xs">Select...</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {stages.map(stage => (
          <SelectItem key={stage.id} value={stage.name} className="text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
              {stage.name}
            </div>
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
    { name: 'LinkedIn', color: '#0A66C2', icon: Linkedin },
    { name: 'Cold Call', color: '#374151', icon: Phone },
    { name: 'Email Campaign', color: '#10B981', icon: Mail },
    { name: 'Referral', color: '#8B5CF6', icon: UserPlus },
    { name: 'Website Form', color: '#3B82F6', icon: Globe },
    { name: 'Other', color: '#6B7280', icon: MoreHorizontal },
  ];
  const selected = mediumOptions.find(o => o.name === initialValue);
  
  return (
    <Select value={initialValue || ""} onValueChange={onValueChange}>
      <SelectTrigger className="h-7 text-xs border-none bg-transparent shadow-none px-0 hover:bg-slate-50 rounded-lg transition-colors">
        <SelectValue>
          {initialValue ? (
            <Badge 
              className="text-[10px] font-semibold border flex items-center gap-1"
              style={{ 
                backgroundColor: selected?.color + '15', 
                color: selected?.color, 
                borderColor: selected?.color + '30' 
              }}
            >
              {selected && <selected.icon size={10} />} {initialValue}
            </Badge>
          ) : <span className="text-slate-400 text-xs">Source...</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {mediumOptions.map(m => (
          <SelectItem key={m.name} value={m.name} className="text-xs">
            <div className="flex items-center gap-2">
              <m.icon size={12} style={{ color: m.color }} />
              {m.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const DisplayDateCell: React.FC<any> = ({ getValue }) => {
  const date = getValue();
  if (!date) return <span className="text-slate-300 text-xs">-</span>;
  return <span className="text-slate-600 text-xs">{new Date(date).toLocaleDateString()}</span>;
};


// --- NAME COLUMN (Professional Discovery Mode) ---
// In the NAME column definition, update the cell like this:
cell: ({ row }) => {
  const c = row.original;
  const isDiscovery = c.is_discovery;
  
  return (
    <div className="flex items-center gap-3 py-1">
      <Avatar className={cn(
        "h-8 w-8 border-2 rounded-xl flex-shrink-0 shadow-sm border-slate-200"
      )}>
        <AvatarImage src={c.photo_url} />
        <AvatarFallback className={cn(
          "text-[10px] font-bold bg-slate-100 text-slate-600"
        )}>
          {c.name?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        {isDiscovery ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 truncate" title={c.name}>{c.name}</span>
            <Badge className="h-4 px-1 text-[8px] font-bold bg-slate-100 text-slate-600 border-slate-200">
              DISCOVERY
            </Badge>
          </div>
        ) : (
          <Link 
            to={`/contacts/${c.id}`} 
            className="text-xs font-bold text-slate-800 hover:text-indigo-600 hover:underline truncate transition-colors" 
            title={c.name}
          >
            {c.name}
          </Link>
        )}
        {c.linkedin_url && (
          <a 
            href={c.linkedin_url} 
            target="_blank" 
            rel="noreferrer" 
            className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-[#0A66C2] transition-colors"
          >
            <Linkedin size={9} /> LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}

// --- EXPORTED COLUMNS ---

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

  // 2. DATA AVAILABILITY (For Discovery)
  {
    id: 'data_availability',
    header: () => (
      <SimpleColumnHeader column={null} title="Data Availability" />
    ),
    size: 160,
    minSize: 140,
    maxSize: 220,
    enableSorting: false,
    enableHiding: true, // Controlled by parent
    cell: ({ row }) => {
      // Only render for discovery rows (CRM rows return null or could be handled differently)
      if (!row.original.is_discovery) return null;

      const c = row.original;
      const hasEmail = !!c.has_email;
      const hasPhone = !!c.has_phone || c.has_direct_phone === "Yes";
      const hasLocation = !!(c.city || c.state || c.country ||
        c.original_data?.has_city || c.original_data?.has_state || c.original_data?.has_country);
      const hasCompany = !!(
        c.company_name ||
        c.original_data?.organization?.name ||
        c.original_data?.organization?.has_employee_count ||
        c.original_data?.organization?.has_industry
      );

      return (
       <div className="flex justify-center">
  <div 
    className="
      flex items-center space-x-1 
      rounded-full bg-slate-50/90 p-1 
      shadow-sm border border-slate-200/70
    "
  >
    {/* Email */}
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-full transition-all duration-200",
              hasEmail
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            )}
          >
            <Mail className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs font-medium">
          {hasEmail 
            ? "Email available (revealed on add)" 
            : "No email found"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    {/* Phone */}
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-full transition-all duration-200",
              hasPhone
                ? "bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            )}
          >
            <Phone className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs font-medium">
          {hasPhone 
            ? "Direct phone / mobile available" 
            : "No phone found"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    {/* Location */}
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-full transition-all duration-200",
              hasLocation
                ? "bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            )}
          >
            <MapPin className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs font-medium">
          {hasLocation 
            ? "Location data available" 
            : "No location data"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    {/* Company / Organization */}
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-full transition-all duration-200",
              hasCompany
                ? "bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            )}
          >
            <Building2 className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs font-medium">
          {hasCompany 
            ? "Company information available" 
            : "Limited company data"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
</div>
      );
    }
  },
  
  // 3. NAME (Sticky)
  {
    accessorKey: 'name',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Name" />,
    size: 200,
    minSize: 150,
    maxSize: 300,
    enableSorting: false,
    cell: ({ row }) => {
      const c = row.original;
      const isDiscovery = c.is_discovery;
      
      return (
        <div className="flex items-center gap-3 py-1">
          <Avatar className={cn(
            "h-8 w-8 border-2 rounded-xl flex-shrink-0 shadow-sm",
            isDiscovery 
              ? "border-violet-200 ring-2 ring-violet-100" 
              : "border-slate-200"
          )}>
            <AvatarImage src={c.photo_url} />
            <AvatarFallback className={cn(
              "text-[10px] font-bold",
              isDiscovery 
                ? "bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700" 
                : "bg-slate-100 text-slate-600"
            )}>
              {c.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            {isDiscovery ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate" title={c.name}>{c.name}</span>
                <Badge className="h-4 px-1 text-[8px] font-bold bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 border-violet-200/50">
                  NEW
                </Badge>
              </div>
            ) : (
              <Link 
                to={`/contacts/${c.id}`} 
                className="text-xs font-bold text-slate-800 hover:text-indigo-600 hover:underline truncate transition-colors" 
                title={c.name}
              >
                {c.name}
              </Link>
            )}
            {c.linkedin_url && (
              <a 
                href={c.linkedin_url} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-[#0A66C2] transition-colors"
              >
                <Linkedin size={9} /> LinkedIn
              </a>
            )}
          </div>
        </div>
      );
    }
  },

  // 4. EMAIL
  {
    accessorKey: 'email',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Email" />,
    size: 200,
    enableSorting: false,
    cell: SmartEmailCell
  },
  
  // 5. PHONE
  {
    accessorKey: 'mobile',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Phone" />,
    size: 180,
    enableSorting: false,
    cell: SmartPhoneCell
  },

  // 6. JOB TITLE
  {
    accessorKey: 'job_title',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Job Title" />,
    size: 180,
    enableSorting: false,
    cell: EditableCell
  },
  
  // 7. COMPANY
  {
    accessorKey: 'company_name',
    header: ({ column }) => <SimpleColumnHeader column={column} title="Company" />,
    size: 160,
    enableSorting: false,
    cell: CompanyCell
  },

  // 8. ACTIONS
  {
    id: 'actions',
    header: () => <div className="text-center text-[10px] font-semibold uppercase tracking-wider text-white/90">Actions</div>,
    size: 120,
    cell: ActionCell,
    enableHiding: false,
    enableSorting: false,
  },

  // 9. CRM SPECIFIC
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
            <TooltipTrigger>
              <Avatar className="h-6 w-6 border border-slate-200">
                <AvatarImage src={employee.profile_picture_url} />
                <AvatarFallback className="text-[8px] bg-indigo-600 text-white font-bold">
                  {employee.first_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{employee.first_name} {employee.last_name}</TooltipContent>
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
  
  // 10. LOCATION
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

  // 11. HIDDEN METADATA
  { id: 'seniority', accessorKey: 'seniority', enableHiding: true, size: 0 },
  { id: 'departments', accessorKey: 'departments', enableHiding: true, size: 0 },
  { id: 'functions', accessorKey: 'functions', enableHiding: true, size: 0 },
  { id: 'industry', accessorKey: 'industry', enableHiding: true, size: 0 },
  { id: 'revenue', accessorKey: 'revenue', enableHiding: true, size: 0 },
  { id: 'employee_count', accessorKey: 'employee_count', enableHiding: true, size: 0 },
  { id: 'updated_at', accessorKey: 'updated_at', enableHiding: true, size: 0 },
];
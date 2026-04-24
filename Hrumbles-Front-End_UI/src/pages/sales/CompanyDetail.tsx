import React, { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import ReactDOM from 'react-dom';
import { useContactStages } from '@/hooks/sales/useContactStages';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import CompanyOverviewTab          from "@/components/sales/company-detail/CompanyOverviewTab";
import EmployeeGrowthIntelligence  from "@/components/sales/company-detail/EmployeeGrowthIntelligence";
import { AddToCompanyListModal }   from '@/components/sales/company-search/AddToCompanyListModal';
import CompanyEditForm             from "@/components/sales/CompanyEditForm";
import { CompanyActivityPanel }    from "@/components/sales/company-detail/CompanyActivityPanel";

import {
  LogCallDialog, LogEmailDialog, CreateNoteDialog,
  CreateTaskDialog, LogMeetingDialog, LogLinkedInDialog, ActivityLogData
} from '@/components/sales/contact-detail/dialogs';

import {
  Sparkles, RefreshCw, ListPlus, Globe, Linkedin,
  Twitter, Facebook, MapPin, Building2, Loader2, ChevronLeft,
  Pencil, Check, X, ChevronDown, Phone, Users, TrendingUp,
  Calendar, Hash, BarChart3, ExternalLink, Copy
} from "lucide-react";
import { cn } from '@/lib/utils';
import flags from "react-phone-number-input/flags";

type ActivityModalType = 'call' | 'note' | 'email' | 'task' | 'meeting' | 'linkedin' | null;


const STAGES = [
  "Identified", "Targeting", "In Outreach", "Warm", "Qualified Company",
  "Proposal Sent / In Discussion", "Negotiation", "Closed - Won",
  "Closed - Lost", "Re-engage Later",
];

const stageColors: Record<string, string> = {
  "Identified": "bg-blue-100 text-blue-800",
  "Targeting": "bg-indigo-100 text-indigo-800",
  "In Outreach": "bg-teal-100 text-teal-800",
  "Warm": "bg-yellow-100 text-yellow-800",
  "Qualified Company": "bg-green-100 text-green-800",
  "Proposal Sent / In Discussion": "bg-purple-100 text-purple-800",
  "Negotiation": "bg-orange-100 text-orange-800",
  "Closed - Won": "bg-emerald-100 text-emerald-800",
  "Closed - Lost": "bg-red-100 text-red-800",
  "Re-engage Later": "bg-gray-100 text-gray-800",
  "default": "bg-gray-100 text-gray-800",
};

const getCountryCode = (phone: string) => {
  if (!phone) return undefined;

  if (phone.startsWith("+91")) return "IN";
  if (phone.startsWith("+1")) return "US";
  if (phone.startsWith("+44")) return "GB";
  if (phone.startsWith("+61")) return "AU";
  if (phone.startsWith("+971")) return "AE";
  if (phone.startsWith("+65")) return "SG";

  return undefined;
};

// ── Inline editable field ─────────────────────────────────────────────────────
const InlineEdit: React.FC<{
  value: string;
  onSave: (v: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  isSaving?: boolean;
}> = ({ value, onSave, placeholder, className, multiline, isSaving }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const ref = React.useRef<any>(null);
  React.useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  React.useEffect(() => { setDraft(value); }, [value]);
  const commit = async () => { if (draft.trim() !== value) await onSave(draft.trim()); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (!editing) return (
    <button onClick={() => setEditing(true)} className={`group flex items-center gap-1 text-left hover:opacity-75 transition-opacity ${className || ''}`}>
      <span className={value ? '' : 'text-slate-300 italic text-xs'}>{value || placeholder || 'Click to edit'}</span>
      <Pencil size={9} className="opacity-0 group-hover:opacity-40 transition-opacity text-slate-400 flex-shrink-0" />
    </button>
  );

  return (
    <div className="flex items-center gap-1 w-full">
      <div className="flex-1 rounded-md p-[1px] bg-gradient-to-r from-purple-500 to-indigo-500">
        {multiline
          ? <textarea ref={ref} value={draft} rows={3} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Escape' && cancel()} className="w-full bg-white rounded-[5px] px-2 py-1 text-xs focus:outline-none resize-none" />
          : <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }} className="w-full bg-white rounded-[5px] px-2 py-0.5 focus:outline-none text-xs" />
        }
      </div>
      <button onClick={commit} disabled={isSaving} className="p-0.5 rounded bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex-shrink-0">
        {isSaving ? <Loader2 size={8} className="animate-spin" /> : <Check size={8} />}
      </button>
      <button onClick={cancel} className="p-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0"><X size={8} /></button>
    </div>
  );
};

// ── Stage dropdown using useContactStages (same hook as contacts) ─────────────
const StageDropdown: React.FC<{
  current: string | null;
  onSelect: (s: string) => void;
  isSaving: boolean;
}> = ({ current, onSelect, isSaving }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
 const stages = STAGES;

  useEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, zIndex: 99999, minWidth: Math.max(r.width, 180) });
  }, [open]);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!(e.target as Element).closest('[data-stage-co]')) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

const colorMap: Record<string, string> = {
  "Identified": "#3b82f6",
  "Targeting": "#6366f1",
  "In Outreach": "#14b8a6",
  "Warm": "#eab308",
  "Qualified Company": "#22c55e",
  "Proposal Sent / In Discussion": "#a855f7",
  "Negotiation": "#f97316",
  "Closed - Won": "#10b981",
  "Closed - Lost": "#ef4444",
  "Re-engage Later": "#6b7280",
};

const dotColor = colorMap[current || ""] || "#94a3b8";

  return (
    <div data-stage-co className="flex-1">
      <button ref={ref} onClick={() => setOpen(v => !v)}
className={cn(
  "w-full flex items-center justify-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border transition-all hover:opacity-80",
  stageColors[current || "default"]
)}
      >
        {isSaving ? <Loader2 size={8} className="animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />}
        {current || 'Set Stage'}
        <ChevronDown size={8} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && ReactDOM.createPortal(
        <div style={style} className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden py-1 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
         {stages.map(s => (
  <button
    key={s}
    onMouseDown={e => {
      e.preventDefault();
      onSelect(s);
      setOpen(false);
    }}
    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-left hover:bg-slate-50"
  >
 <span
  className="w-2 h-2 rounded-full"
  style={{ backgroundColor: colorMap[s] || "#94a3b8" }}
/>
    
    <span className="text-slate-700">
      {s}
    </span>

    {current === s && (
      <Check size={9} className="ml-auto text-indigo-600" />
    )}
  </button>
))}
          {stages.length === 0 && <div className="px-3 py-2 text-[10px] text-slate-400">No stages configured</div>}
        </div>,
        document.body
      )}
    </div>
  );
};

const CompanyDetail = () => {
  const { toast }      = useToast();
  const { id }         = useParams<{ id: string }>();
  const navigate       = useNavigate();
  const queryClient    = useQueryClient();
  const companyId      = parseInt(id || "0", 10);

  const user           = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const [isSyncing,               setIsSyncing]               = useState(false);
  const [isCompanyEditDialogOpen, setIsCompanyEditDialogOpen] = useState(false);
  const [listModalOpen,           setListModalOpen]           = useState(false);
  const [activeModal,             setActiveModal]             = useState<ActivityModalType>(null);
  const [editingActivity,         setEditingActivity]         = useState<any>(null);
  const [showFullDesc,            setShowFullDesc]            = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: company, isLoading, refetch: refetchCompany } = useQuery({
    queryKey: ['company-detail', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          enrichment_organizations(
            *,
            enrichment_org_departments(*),
            enrichment_org_technologies(*),
            enrichment_org_keywords(*),
            enrichment_org_funding_events(*)
          ),
          enrichment_org_raw_responses(*),
          company_activities(
            *,
            creator:created_by(id, first_name, last_name, profile_picture_url),
            assignee:assigned_to(id, first_name, last_name, profile_picture_url)
          )
        `)
        .eq('id', companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  const { data: allContacts = [], isLoading: isLoadingContacts, refetch: refetchContacts } = useQuery({
    queryKey: ['company-contacts-all', companyId, company?.apollo_org_id, company?.name],
    queryFn: async () => {
      const safeCompanyName = company.name.replace(/"/g, '');
      const { data, error } = await supabase
        .from('contacts')
        .select(`*, enrichment_people(*, enrichment_person_metadata(*)), enrichment_contact_emails(*), enrichment_contact_phones(*)`)
        .or(`company_id.eq.${companyId},and(company_id.is.null,company_name.eq."${safeCompanyName}")`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && !!company
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members-sales', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, email, profile_picture_url')
        .eq('organization_id', organizationId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase.from('companies').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-detail', companyId] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Save failed', description: err.message }),
  });

  const logActivityMutation = useMutation({
    mutationFn: async (payload: ActivityLogData) => {
      const dbData = {
        company_id: companyId, organization_id: organizationId, created_by: user?.id,
        type: payload.type, title: payload.title, description: payload.description,
        description_html: payload.descriptionHtml, metadata: payload.metadata,
        outcome: payload.metadata?.outcome || payload.metadata?.linkedinOutcome,
        direction: payload.metadata?.direction,
        duration_minutes: payload.metadata?.duration ? parseInt(payload.metadata.duration, 10) : null,
        activity_date: payload.metadata?.activityDate || payload.metadata?.startTime || new Date().toISOString(),
        due_date: payload.metadata?.dueDate, due_time: payload.metadata?.dueTime,
        priority: payload.metadata?.priority, task_type: payload.metadata?.taskType,
        assigned_to: payload.metadata?.assignedTo || null
      };
      if (payload.id) {
        const { error } = await supabase.from('company_activities').update(dbData).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('company_activities').insert(dbData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-detail', companyId] });
      toast({ title: 'Activity Saved' });
      setActiveModal(null); setEditingActivity(null);
    },
    onError: (error: any) => toast({ variant: 'destructive', title: 'Error', description: error.message })
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('company_activities').update({ is_completed: true, completed_at: new Date().toISOString() }).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['company-detail', companyId] }); toast({ title: 'Task Completed' }); }
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase.from('company_activities').delete().eq('id', activityId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['company-detail', companyId] }); toast({ title: 'Activity Deleted' }); }
  });

  const handleFieldSave = useCallback(async (field: string, value: any) => {
    await updateFieldMutation.mutateAsync({ field, value });
  }, [updateFieldMutation]);

const handleListAdd = async (fileIds: string | string[]) => {
  const ids = Array.isArray(fileIds) ? fileIds : [fileIds];
  if (!ids.length || !company?.id) return;
  try {
    const rows = ids.map(fileId => ({
      company_id: company.id,
      file_id:    fileId,
      added_by:   user?.id,
    }));
    const { error } = await supabase
      .from('company_workspace_files')
      .upsert(rows, { onConflict: 'company_id,file_id' });
    if (error) throw error;
    toast({ title: 'Added to List', description: `${company.name} added successfully.` });
  } catch (error: any) {
    toast({ title: 'Failed', description: error.message, variant: 'destructive' });
  } finally {
    setListModalOpen(false); 
  }
};

  const handleRefreshIntelligence = async () => {
    setIsSyncing(true);
    try {
      let result;
      if (company?.apollo_org_id) {
        result = await supabase.functions.invoke('enrich-company', {
          body: { apolloOrgId: company.apollo_org_id, companyId: company.id, organizationId: company.organization_id, userId: user?.id }
        });
      } else if (company?.website || company?.domain) {
        const websiteUrl = company.website || company.domain;
        const domain = websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        result = await supabase.functions.invoke('enrich-company', {
          body: { domain, companyId: company.id, organizationId: company.organization_id, userId: user?.id }
        });
      } else {
        throw new Error("Cannot sync: Missing Website/Domain.");
      }
      if (result.error) throw result.error;
      const data = result.data;
      if (data?.error === 'insufficient_credits') {
        toast({ variant: "destructive", title: "Insufficient Credits", description: data.message }); return;
      }
      if (data?.error === 'not_found') {
        toast({ variant: "destructive", title: "Not Found", description: data.message }); return;
      }
      await supabase.from('companies').update({ intelligence_last_synced: new Date().toISOString() }).eq('id', companyId);
      const creditInfo = data?.credits?.deducted ? ` (${data.credits.deducted} credit${data.credits.deducted > 1 ? 's' : ''} used)` : '';
      toast({ title: "Success", description: "Company intelligence refreshed" + creditInfo });
      refetchCompany();
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    } catch (fetchError: any) {
      toast({ title: "Sync Failed", description: fetchError.message, variant: "destructive" });
    } finally { setIsSyncing(false); }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading || !company) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
    </div>
  );

  const dialogEntityWrapper = {
    id: company.id, name: company.name,
    photo_url: company.logo_url || company.enrichment_organizations?.logo_url,
    title: company.industry || 'Company', email: company.website,
  };

  const enrichment = company?.enrichment_organizations;

  // Description — use enrichment's long-form, truncated in col 2. Overview tab shows its own short version.
  const description = enrichment?.short_description || company.description || company.about || enrichment?.seo_description || '';
  const CHAR_LIMIT = 180;
  const descTruncated = description.length > CHAR_LIMIT ? description.slice(0, CHAR_LIMIT) + '…' : description;

  const location = [
    enrichment?.city || company.city,
    enrichment?.state || company.state,
    enrichment?.country || company.country,
  ].filter(Boolean).join(', ');

  const logoUrl  = company.logo_url || enrichment?.logo_url;
  const website  = company.website  || company.domain     || enrichment?.website_url;
  const linkedin = company.linkedin_url || company.linkedin || enrichment?.linkedin_url;
  const twitter  = company.twitter_url  || company.twitter  || enrichment?.twitter_url;
  const facebook = company.facebook_url || company.facebook || enrichment?.facebook_url;

  const fmtEmp = (n: any) => {
    if (!n) return null;
    const num = typeof n === 'string' ? parseInt(n.replace(/[^0-9]/g, '')) : n;
    if (isNaN(num)) return String(n);
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toLocaleString();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col bg-[#F7F7F8]"
      style={{ height: 'calc(100vh - 70px - 8px)', margin: '-4px', overflow: 'hidden' }}
    >
      {/* ── Hero Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 flex-shrink-0 mx-2 mt-2 rounded-lg p-4">
        <div className="h-[2px] bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-600 rounded-t-lg" />

        {/* Breadcrumb */}
        <div className="px-4 py-1.5 border-b border-slate-50 flex items-center gap-2">
          <button onClick={() => navigate('/companies')} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-purple-600 transition-colors">
            <ChevronLeft size={13} /><span>Companies</span>
          </button>
          <span className="text-slate-200 text-xs">/</span>
          <span className="text-[11px] text-slate-600 font-medium truncate max-w-[240px]">{company.name}</span>
        </div>

        {/* 3-col hero grid */}
        <div className="px-4 py-2.5 grid grid-cols-3 gap-4">

          {/* ── COL 1: Identity ─────────────────────────────────────────── */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-[100px] h-[100px] rounded-xl border-2 border-white shadow-sm ring-2 ring-purple-100 bg-slate-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {logoUrl
                ? <img src={logoUrl} alt={company.name} className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : <Building2 size={22} className="text-slate-300" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <InlineEdit
                value={company.name || ''} onSave={v => handleFieldSave('name', v)}
                isSaving={updateFieldMutation.isPending}
                className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600"
              />
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                <InlineEdit value={company.industry || enrichment?.industry || ''} onSave={v => handleFieldSave('industry', v)} placeholder="Add industry" className="text-[11px] text-slate-500" />
              </div>

              {/* Location + founding + employees + domain — compact row */}
              <div className="flex items-center flex-wrap gap-x-2.5 gap-y-0.5 mt-1">
                {location && <span className="flex items-center gap-0.5 text-[10px] text-slate-400"><MapPin size={9} />{location}</span>}
                {/* {(enrichment?.founded_year || company.founded_year) && (
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-400"><Calendar size={9} />Est. {enrichment?.founded_year || company.founded_year}</span>
                )}
                {(enrichment?.estimated_num_employees || company.employee_count) && (
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-400"><Users size={9} />{fmtEmp(enrichment?.estimated_num_employees || company.employee_count)}</span>
                )} */}
              </div>

              {/* SIC / NAICS codes */}
              {/* {(enrichment?.sic_codes?.length > 0 || enrichment?.naics_codes?.length > 0) && (
                <div className="flex items-center gap-2 mt-0.5">
                  {enrichment?.sic_codes?.length > 0 && (
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Hash size={8} />SIC {enrichment.sic_codes.slice(0, 2).join(', ')}</span>
                  )}
                  {enrichment?.naics_codes?.length > 0 && (
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Hash size={8} />NAICS {enrichment.naics_codes[0]}</span>
                  )}
                </div>
              )} */}

              {/* Social icon row */}
              <div className="flex items-center gap-1 mt-1.5">
                {website && <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 hover:opacity-80 transition-all"><Globe size={11} className="text-slate-600" /></a>}
                {linkedin && <a href={linkedin} target="_blank" rel="noreferrer" className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0A66C2]/10 hover:opacity-80 transition-all"><Linkedin size={11} className="text-[#0A66C2]" /></a>}
                {twitter  && <a href={twitter}  target="_blank" rel="noreferrer" className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 hover:opacity-80 transition-all"><Twitter size={11} className="text-slate-700" /></a>}
                {facebook && <a href={facebook} target="_blank" rel="noreferrer" className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1877F2]/10 hover:opacity-80 transition-all"><Facebook size={11} className="text-[#1877F2]" /></a>}
                {enrichment?.crunchbase_url && <a href={enrichment.crunchbase_url} target="_blank" rel="noreferrer" title="Crunchbase" className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-50 hover:opacity-80 transition-all"><ExternalLink size={11} className="text-orange-500" /></a>}
              </div>
            </div>
          </div>

          {/* ── COL 2: About — compact, truncated, no full description ──── */}
  <div className="border-x border-slate-100 px-4 py-2 space-y-2">

  {/* Founded */}
  {(enrichment?.founded_year || company.founded_year) && (
    <div className="grid grid-cols-[90px_1fr] items-center text-[10px]">
      <span className="text-slate-400 flex items-center gap-1">
        <Calendar size={9} /> Founded
      </span>
      <span className="text-slate-600 font-medium">
        {enrichment?.founded_year || company.founded_year}
      </span>
    </div>
  )}

  {/* Employees */}
  {(enrichment?.estimated_num_employees || company.employee_count) && (
    <div className="grid grid-cols-[90px_1fr] items-center text-[10px]">
      <span className="text-slate-400 flex items-center gap-1">
        <Users size={9} /> Employees
      </span>
      <span className="text-slate-600 font-medium">
        {fmtEmp(enrichment?.estimated_num_employees || company.employee_count)}
      </span>
    </div>
  )}

  {/* SIC */}
  {enrichment?.sic_codes?.length > 0 && (
    <div className="grid grid-cols-[90px_1fr] items-center text-[10px]">
      <span className="text-slate-400 flex items-center gap-1">
        <Hash size={9} /> SIC
      </span>
      <span className="text-slate-600 font-medium">
        {enrichment.sic_codes.slice(0, 2).join(', ')}
      </span>
    </div>
  )}

  {/* NAICS */}
  {enrichment?.naics_codes?.length > 0 && (
    <div className="grid grid-cols-[90px_1fr] items-center text-[10px]">
      <span className="text-slate-400 flex items-center gap-1">
        <Hash size={9} /> NAICS
      </span>
      <span className="text-slate-600 font-medium">
        {enrichment.naics_codes[0]}
      </span>
    </div>
  )}

  {/* Phone */}
{(enrichment?.sanitized_phone || enrichment?.primary_phone || company.phone) && (() => {
  const phone = enrichment?.sanitized_phone || enrichment?.primary_phone || company.phone;
  const country = getCountryCode(phone);
  const Flag = country ? flags[country] : null;

  return (
    <div className="grid grid-cols-[90px_1fr] items-center text-[10px]">
      <span className="text-slate-400 flex items-center gap-1">
        <Phone size={9} /> Phone
      </span>

      <div className="flex items-center gap-2">
        {/* Flag */}
        {Flag && <Flag className="w-4 h-3 rounded-sm shadow-sm" />}

        {/* Number */}
        <span className="text-slate-600 font-mono">
          {phone}
        </span>

        {/* Copy */}
        <button
          onClick={() => navigator.clipboard.writeText(phone)}
          className="text-slate-400 hover:text-indigo-600 transition-colors"
          title="Copy number"
        >
          <Copy size={9} />
        </button>
      </div>
    </div>
  );
})()}

  {/* Headcount Growth */}
  {(enrichment?.headcount_growth_6m != null || enrichment?.headcount_growth_12m != null) && (
    <div className="grid grid-cols-[90px_1fr] items-start text-[10px]">
      <span className="text-slate-400 flex items-center gap-1">
        <TrendingUp size={9} /> Growth
      </span>

      <div className="flex gap-1 flex-wrap">
        {enrichment?.headcount_growth_6m != null && (
          <span className={cn(
            'px-1.5 py-0.5 rounded-full border font-mono text-[9px]',
            enrichment.headcount_growth_6m >= 0
              ? 'bg-green-50 text-green-700 border-green-100'
              : 'bg-red-50 text-red-700 border-red-100'
          )}>
            6m {(enrichment.headcount_growth_6m * 100).toFixed(1)}%
          </span>
        )}

        {enrichment?.headcount_growth_12m != null && (
          <span className={cn(
            'px-1.5 py-0.5 rounded-full border font-mono text-[9px]',
            enrichment.headcount_growth_12m >= 0
              ? 'bg-green-50 text-green-700 border-green-100'
              : 'bg-red-50 text-red-700 border-red-100'
          )}>
            12m {(enrichment.headcount_growth_12m * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )}

</div>

          {/* ── COL 3: Actions ──────────────────────────────────────────── */}
          <div className="space-y-1.5">
            {/* Stage — identical structure to ContactHeroPanel col 3 */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-400 w-10 flex-shrink-0">Stage</span>
              <StageDropdown
                current={company.stage || null}
                onSelect={s => handleFieldSave('stage', s)}
                isSaving={updateFieldMutation.isPending}
              />
            </div>

            <div className="space-y-1">
              <button onClick={handleRefreshIntelligence} disabled={isSyncing}
                className="w-full flex items-center justify-center gap-1.5 h-7 text-[11px] font-semibold text-white rounded-lg transition-all disabled:opacity-60 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:opacity-90 shadow-[0_0_20px_rgba(99,102,241,0.35)]">
                {isSyncing ? <><RefreshCw size={10} className="animate-spin" />Syncing…</> : <><Sparkles size={10} />Enrich Company</>}
              </button>
              <button onClick={() => setListModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 h-7 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 hover:border-purple-300 hover:text-purple-600 rounded-lg transition-all">
                <ListPlus size={10} />Add to List
              </button>
              {/* <button onClick={() => setIsCompanyEditDialogOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 h-7 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg transition-all">
                <Pencil size={10} />Edit Details
              </button> */}
            </div>

            {company.intelligence_last_synced && (
              <div className="flex items-center gap-1">
                <RefreshCw size={8} className="text-slate-400" />
                <span className="text-[9px] text-slate-400">
                  Enriched on {new Date(company.intelligence_last_synced).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto m-2" style={{ width: 340, minWidth: 340 }}>
          <CompanyActivityPanel
            company={company}
            onOpenModal={(m) => { setEditingActivity(null); setActiveModal(m); }}
            onEditActivity={(act) => { setEditingActivity(act); setActiveModal(act.type); }}
            onCompleteTask={(id) => completeTaskMutation.mutate(id)}
            onDeleteActivity={(id) => deleteActivityMutation.mutate(id)}
          />
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto bg-[#F7F7F8]">
          <div className="p-3 space-y-3 max-w-[1200px] mx-auto">
            <CompanyOverviewTab
              company={company}
              refetchParent={refetchCompany}
              employees={allContacts}
              isLoadingEmployees={isLoadingContacts}
              onEditEmployee={(emp) => navigate(`/contacts/${emp.id}`)}
            />
            <EmployeeGrowthIntelligence company={company} />
          </div>
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <Dialog open={isCompanyEditDialogOpen} onOpenChange={setIsCompanyEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-[#E5E0D8]">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-[17px] font-[650] text-[#1C1916]">Edit {company.name}</DialogTitle>
            <DialogDescription className="text-[12px] text-[#9C9189]">Update company information.</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <CompanyEditForm company={company} onClose={() => { setIsCompanyEditDialogOpen(false); refetchCompany(); refetchContacts(); }} />
          </div>
        </DialogContent>
      </Dialog>

      {company && (
        <AddToCompanyListModal
          open={listModalOpen}
          onOpenChange={setListModalOpen}
          onConfirm={handleListAdd}
          companyName={company.name}
          isFromSearch={false}
        />
      )}

      <LogCallDialog     open={activeModal === 'call'}    onOpenChange={o => !o && (setActiveModal(null), setEditingActivity(null))} contact={dialogEntityWrapper} activity={editingActivity} onSubmit={d => logActivityMutation.mutateAsync(d)} isSubmitting={logActivityMutation.isPending} />
      <LogEmailDialog    open={activeModal === 'email'}   onOpenChange={o => !o && (setActiveModal(null), setEditingActivity(null))} contact={dialogEntityWrapper} activity={editingActivity} onSubmit={d => logActivityMutation.mutateAsync(d)} isSubmitting={logActivityMutation.isPending} />
      <CreateNoteDialog  open={activeModal === 'note'}    onOpenChange={o => !o && (setActiveModal(null), setEditingActivity(null))} contact={dialogEntityWrapper} activity={editingActivity} onSubmit={d => logActivityMutation.mutateAsync(d)} isSubmitting={logActivityMutation.isPending} />
      <CreateTaskDialog  open={activeModal === 'task'}    onOpenChange={o => !o && (setActiveModal(null), setEditingActivity(null))} contact={dialogEntityWrapper} activity={editingActivity} teamMembers={teamMembers || []} onSubmit={d => logActivityMutation.mutateAsync(d)} isSubmitting={logActivityMutation.isPending} />
      <LogMeetingDialog  open={activeModal === 'meeting'} onOpenChange={o => !o && (setActiveModal(null), setEditingActivity(null))} contact={dialogEntityWrapper} activity={editingActivity} onSubmit={d => logActivityMutation.mutateAsync(d)} isSubmitting={logActivityMutation.isPending} />
      <LogLinkedInDialog open={activeModal === 'linkedin'}onOpenChange={o => !o && (setActiveModal(null), setEditingActivity(null))} contact={dialogEntityWrapper} activity={editingActivity} onSubmit={d => logActivityMutation.mutateAsync(d)} isSubmitting={logActivityMutation.isPending} />
    </div>
  );
};

export default CompanyDetail;
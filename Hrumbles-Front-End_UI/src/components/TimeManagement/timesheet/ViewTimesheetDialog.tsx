import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimeLog, DetailedTimesheetEntry, JobLog } from "@/types/time-tracker-types";
import { toast } from "sonner";
import { TimeLogDetails } from "./dialog/TimeLogDetails";
import { TimesheetBasicInfo } from "./dialog/TimesheetBasicInfo";
import { TimesheetDialogContent } from './dialog/TimesheetDialogContent';
import { TimesheetEditForm } from "./dialog/TimesheetEditForm";
import { TimesheetProjectDetails } from "./TimesheetProjectDetails";
import { useTimesheetValidation } from './hooks/useTimesheetValidation';
import { useSelector } from 'react-redux';
import { fetchHrProjectEmployees, submitTimesheet } from '@/api/timeTracker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import { fetchEmployees } from '@/api/user';
import { MultiSelect } from '@/components/ui/multi-selector';
import { DateTime } from 'luxon';
import { RecruiterTimesheetForm } from "./dialog/RecruiterTimesheetForm";
import {
  Share2, ChevronDown, ChevronUp, BarChart2, FileText,
  X, Search, Loader2, Building2, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface ViewTimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timesheet: TimeLog;
  onSubmitTimesheet: () => void;
  employeeHasProjects: boolean;
  finalDurationMinutes?: number;
}

interface Submission {
  candidate_name: string; email: string; phone: string; experience: string;
  skills: string; match_score: string; overall_score: string; applied_date: string;
  submission_date: string; applied_from: string; current_salary: string;
  expected_salary: string; location: string; preferred_location: string;
  notice_period: string; resume_url: string; main_status: string; sub_status: string;
  interview_date: string; interview_time: string; interview_type: string;
  interview_round: string; interviewer_name: string; interview_result: string;
  reject_reason: string; ctc: string; joining_date: string; created_at: string;
  job_title: string; client_name: string;
}
interface EmployeeOption { value: string; label: string; }

interface SalesActivity {
  id: string; type: string; outcome: string | null; direction: string | null;
  duration_minutes: number | null; title: string | null; activity_date: string;
  contact_name: string | null; company_name: string | null;
}
interface SalesContact {
  id: string; name: string; email: string | null;
  job_title: string | null; contact_stage: string | null; company_name: string | null;
}
interface SalesCompany { id: string | number; name: string; industry: string | null; website: string | null; }
interface SalesStageChange {
  id: string; entity_type: 'contact' | 'company'; entity_name: string;
  company_name: string | null; to_stage: string; changed_at: string;
}
interface SalesListActivity {
  id: string; entity_type: 'contact' | 'company'; entity_name: string;
  company_name: string | null; list_name: string; list_type: string; added_at: string;
}
interface SalesEODData {
  activities: SalesActivity[]; contactsAdded: SalesContact[];
  companiesAdded: SalesCompany[]; stageChanges: SalesStageChange[];
  listActivities: SalesListActivity[];
}
interface AdditionalNote {
  entity_type: 'contact' | 'company';
  entity_id: string;
  entity_name: string;
  company_name: string | null;
  note: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const SALES_ACTIVITY_TYPES = ['call', 'email', 'meeting', 'linkedin'];
const ACTIVITY_LABELS: Record<string, string> = {
  call: 'Calls', email: 'Emails', meeting: 'Meetings', linkedin: 'LinkedIn',
};
const fmtOutcome   = (v: string | null) => v ? v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null;
const fmtDirection = (v: string | null) => v ? v.charAt(0).toUpperCase() + v.slice(1) : null;
const fmtDuration  = (mins: number | null | undefined) => {
  if (!mins) return null;
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
};
const fmtTime = (iso: string) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  }) : '';

// ─────────────────────────────────────────────
// Collapsible Section
// ─────────────────────────────────────────────
const Section: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {title}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">({count})</span>
        </div>
        {open ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
};

const Row: React.FC<{ left: React.ReactNode; right?: React.ReactNode }> = ({ left, right }) => (
  <div className="flex items-baseline justify-between py-1 text-xs border-b border-slate-50 last:border-0">
    <span className="text-slate-700 min-w-0 pr-3 leading-relaxed">{left}</span>
    {right && <span className="text-slate-400 flex-shrink-0 text-right tabular-nums">{right}</span>}
  </div>
);

// ─────────────────────────────────────────────
// Sales Activity Preview
// ─────────────────────────────────────────────
const SalesActivityPreview: React.FC<{ data: SalesEODData }> = ({ data }) => {
  const { activities, contactsAdded, companiesAdded, stageChanges, listActivities } = data;

  const grouped = activities.reduce((acc, a) => {
    const t = a.type || 'other';
    if (!acc[t]) acc[t] = [];
    acc[t].push(a);
    return acc;
  }, {} as Record<string, SalesActivity[]>);

  const summaryItems = [
    ...SALES_ACTIVITY_TYPES.filter(t => grouped[t]?.length).map(t => ({ label: ACTIVITY_LABELS[t], count: grouped[t].length })),
    ...(contactsAdded.length  ? [{ label: 'Contacts',      count: contactsAdded.length  }] : []),
    ...(companiesAdded.length ? [{ label: 'Companies',     count: companiesAdded.length }] : []),
    ...(stageChanges.length   ? [{ label: 'Stage Changes', count: stageChanges.length   }] : []),
    ...(listActivities.length ? [{ label: 'Lists',         count: listActivities.length }] : []),
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden mt-4">
      {/* Always-visible summary bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2.5 flex-wrap bg-gradient-to-r from-purple-50/30 to-pink-50/30">
        <BarChart2 className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
        <span className="text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Sales Activity
        </span>
        <span className="text-slate-300 text-xs">|</span>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          {summaryItems.map(item => (
            <span key={item.label} className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700 tabular-nums">{item.count}</span>
              {' '}{item.label}
            </span>
          ))}
        </div>
      </div>

      <div>
        {SALES_ACTIVITY_TYPES.filter(t => grouped[t]?.length).map(type => (
          <Section key={type} title={ACTIVITY_LABELS[type]} count={grouped[type].length}>
            {grouped[type].map(a => {
              const meta = [fmtDirection(a.direction), fmtOutcome(a.outcome), fmtDuration(a.duration_minutes)]
                .filter(Boolean).join(' · ');
              return (
                <Row key={a.id}
                  left={<>
                    <span className="font-medium">{a.contact_name || '—'}</span>
                    {a.company_name && <span className="text-slate-400"> ({a.company_name})</span>}
                    {meta && <span className="text-slate-400"> · {meta}</span>}
                  </>}
                  right={fmtTime(a.activity_date)}
                />
              );
            })}
          </Section>
        ))}

        {contactsAdded.length > 0 && (
          <Section title="Contacts Added" count={contactsAdded.length}>
            {contactsAdded.map(c => (
              <Row key={c.id}
                left={<>
                  <span className="font-medium">{c.name}</span>
                  {c.company_name && <span className="text-slate-400"> · {c.company_name}</span>}
                  {c.job_title    && <span className="text-slate-400"> · {c.job_title}</span>}
                </>}
                right={c.contact_stage || undefined}
              />
            ))}
          </Section>
        )}

        {companiesAdded.length > 0 && (
          <Section title="Companies Added" count={companiesAdded.length}>
            {companiesAdded.map(c => (
              <Row key={c.id}
                left={<>
                  <span className="font-medium">{c.name}</span>
                  {c.industry && <span className="text-slate-400"> · {c.industry}</span>}
                </>}
              />
            ))}
          </Section>
        )}

        {stageChanges.length > 0 && (
          <Section title="Stage Changes" count={stageChanges.length}>
            {stageChanges.map(s => (
              <Row key={s.id}
                left={<>
                  <span className="font-medium">{s.entity_name}</span>
                  {s.company_name && <span className="text-slate-400"> ({s.company_name})</span>}
                  <span className="text-slate-400"> → </span>
                  <span className="font-medium text-slate-600">{s.to_stage}</span>
                  <span className="ml-1.5 text-[10px] text-slate-300 uppercase tracking-wide">
                    {s.entity_type}
                  </span>
                </>}
                right={fmtTime(s.changed_at)}
              />
            ))}
          </Section>
        )}

        {listActivities.length > 0 && (
          <Section title="Added to Lists" count={listActivities.length}>
            {listActivities.map(l => (
              <Row key={l.id}
                left={<>
                  <span className="font-medium">{l.entity_name}</span>
                  {l.company_name && <span className="text-slate-400"> ({l.company_name})</span>}
                  <span className="text-slate-400"> → </span>
                  <span className="font-medium text-slate-600">{l.list_name}</span>
                </>}
                right={fmtTime(l.added_at)}
              />
            ))}
          </Section>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-50/60 border-t border-slate-100">
        <p className="text-[11px] text-slate-400 italic">
          A Sales EOD email with PDF + CSV attached will be sent on submission.
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Additional Notes — inline dropdown, mousedown-flag prevents blur-close
// ─────────────────────────────────────────────
interface SearchResult {
  id: string;
  entity_type: 'contact' | 'company';
  name: string;
  sub: string | null;
  company_name: string | null;
}

const AdditionalNotesSection: React.FC<{
  organizationId: string;
  notes: AdditionalNote[];
  onChange: (notes: AdditionalNote[]) => void;
}> = ({ organizationId, notes, onChange }) => {
  const [expanded, setExpanded]   = useState(false);
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropOpen, setDropOpen]   = useState(false);
  const inputRef       = useRef<HTMLInputElement>(null);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flag: mousedown fired inside dropdown — don't close on blur
  const mouseInDrop    = useRef(false);

  // Debounced DB search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setResults([]); setDropOpen(false); return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const q = query.trim();
        const [contactRes, companyRes] = await Promise.all([
          supabase.from('contacts')
            .select('id, name, job_title, company_name')
            .eq('organization_id', organizationId)
            .ilike('name', `%${q}%`)
            .limit(8),
          supabase.from('companies')
            .select('id, name, industry')
            .eq('organization_id', organizationId)
            .ilike('name', `%${q}%`)
            .limit(5),
        ]);
        const selectedKeys = new Set(notes.map(n => `${n.entity_type}::${n.entity_id}`));
        const merged: SearchResult[] = [
          ...(contactRes.data || []).map((c: any) => ({
            id: c.id, entity_type: 'contact' as const, name: c.name,
            sub: c.job_title || null, company_name: c.company_name || null,
          })),
          ...(companyRes.data || []).map((c: any) => ({
            id: String(c.id), entity_type: 'company' as const, name: c.name,
            sub: c.industry || null, company_name: null,
          })),
        ].filter(r => !selectedKeys.has(`${r.entity_type}::${r.id}`));
        setResults(merged);
        setDropOpen(merged.length > 0);
      } catch (err) {
        console.error('Notes search error:', err);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query, organizationId, notes]);

  const addNote = (result: SearchResult) => {
    mouseInDrop.current = false;
    onChange([...notes, {
      entity_type: result.entity_type, entity_id: result.id,
      entity_name: result.name, company_name: result.company_name, note: '',
    }]);
    setQuery(''); setResults([]); setDropOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const removeNote = (key: string) =>
    onChange(notes.filter(n => `${n.entity_type}::${n.entity_id}` !== key));

  const updateNote = (key: string, note: string) =>
    onChange(notes.map(n => `${n.entity_type}::${n.entity_id}` === key ? { ...n, note } : n));

  const filledCount = notes.filter(n => n.note.trim()).length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white mt-3">
      {/* Toggle header */}
      <button type="button" onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gradient-to-r from-purple-50/30 to-pink-50/30 hover:from-purple-50/60 hover:to-pink-50/60 transition-colors">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Additional Notes
          </span>
          <span className="text-[10px] text-slate-400">— optional, included in report</span>
          {filledCount > 0 && (
            <span className="text-[9px] font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full w-4 h-4 flex items-center justify-center">
              {filledCount}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-4">
          {/* Search input + inline dropdown */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Search &amp; select a contact or company
            </p>

            {/* Wrapper — relative so dropdown positions against it */}
            <div className="relative">
              {/* Gradient border input */}
              <div className={cn(
                "rounded-lg p-[1px] transition-all",
                "bg-slate-200 focus-within:bg-gradient-to-r focus-within:from-purple-600 focus-within:to-pink-600"
              )}>
                <div className="relative bg-white rounded-lg">
                  {searching
                    ? <Loader2 size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                    : <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  }
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setDropOpen(true)}
                    onBlur={() => {
                      // Only close if mouse is NOT inside the dropdown
                      if (!mouseInDrop.current) setDropOpen(false);
                    }}
                    placeholder="Type a contact or company name…"
                    autoComplete="off"
                    className="w-full h-8 pl-7 pr-3 bg-transparent text-[11px] text-slate-600 font-medium placeholder:text-[10px] placeholder:text-slate-400 placeholder:italic border-none outline-none focus:ring-0"
                  />
                </div>
              </div>

              {/* Dropdown — opens UPWARD to avoid being clipped at bottom of dialog */}
              {dropOpen && results.length > 0 && (
                <div
                  className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                  onMouseEnter={() => { mouseInDrop.current = true; }}
                  onMouseLeave={() => { mouseInDrop.current = false; }}
                >
                  {/* Legend */}
                  <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                    <span className="flex items-center gap-1 text-[9px] text-slate-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" /> Contact
                    </span>
                    <span className="flex items-center gap-1 text-[9px] text-slate-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block" /> Company
                    </span>
                  </div>
                  {/* Results — scrollable */}
                  <div className="max-h-48 overflow-y-auto">
                    {results.map(r => (
                      <button
                        key={`${r.entity_type}::${r.id}`}
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault(); // prevent blur
                          addNote(r);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-violet-50 text-left transition-colors border-b border-slate-50 last:border-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                            r.entity_type === 'contact' ? 'bg-purple-400' : 'bg-pink-400'
                          )} />
                          <div className="min-w-0">
                            <span className="text-[11px] font-medium text-slate-700 block truncate">{r.name}</span>
                            {(r.sub || r.company_name) && (
                              <span className="text-[10px] text-slate-400 block truncate">
                                {[r.sub, r.company_name].filter(Boolean).join(' · ')}userName: `${user.first_name||''} ${user.last_name||''}`.trim() || user.email
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-300 uppercase tracking-wide flex-shrink-0 ml-2">
                          {r.entity_type}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected entities with note textareas */}
          {notes.length > 0 && (
            <div className="space-y-3">
              {notes.map(note => {
                const key = `${note.entity_type}::${note.entity_id}`;
                return (
                  <div key={key} className="rounded-lg border border-slate-100 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50/70 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          note.entity_type === 'contact' ? 'bg-purple-400' : 'bg-pink-400'
                        )} />
                        <span className="text-xs font-semibold text-slate-700 truncate">{note.entity_name}</span>
                        {note.company_name && (
                          <span className="text-[10px] text-slate-400 truncate">({note.company_name})</span>
                        )}
                        <span className="text-[9px] text-slate-300 uppercase tracking-widest font-semibold ml-0.5">
                          {note.entity_type}
                        </span>
                      </div>
                      <button type="button" onClick={() => removeNote(key)}
                        className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 ml-2">
                        <X size={12} />
                      </button>
                    </div>
                    <div className="p-[1px] bg-slate-100 focus-within:bg-gradient-to-r focus-within:from-purple-600 focus-within:to-pink-600 transition-all">
                      <textarea
                        value={note.note}
                        onChange={e => updateNote(key, e.target.value)}
                        placeholder="Add notes about this contact/company…"
                        rows={2}
                        className="w-full px-3 py-2 bg-white text-xs text-slate-700 placeholder:text-slate-400 placeholder:italic resize-none outline-none border-none focus:ring-0"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-slate-400">
            Notes included in the PDF &amp; CSV attached to your report email.
          </p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN DIALOG
// ─────────────────────────────────────────────
export const ViewTimesheetDialog: React.FC<ViewTimesheetDialogProps> = ({
  open, onOpenChange, timesheet, onSubmitTimesheet, employeeHasProjects, finalDurationMinutes,
}) => {
  const user            = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const employeeId      = user?.id || '';

  const [isEditing,               setIsEditing]               = useState(!timesheet?.is_submitted);
  const [isLoading,               setIsLoading]               = useState(false);
  const [isFormValid,             setIsFormValid]             = useState(true);
  const [temporaryClockOutTime,   setTemporaryClockOutTime]   = useState<string | null>(null);
  const [temporaryDurationMinutes,setTemporaryDurationMinutes]= useState<number | null>(null);

  const [isRecruiter,       setIsRecruiter]       = useState(false);
  const [recruiterJobLogs,  setRecruiterJobLogs]  = useState<JobLog[] | null>(null);
  const [overallWorkReport, setOverallWorkReport] = useState('');
  const [submissions,       setSubmissions]       = useState<Submission[]>([]);

  const [title,              setTitle]              = useState('');
  const [workReport,         setWorkReport]         = useState('');
  const [totalWorkingHours,  setTotalWorkingHours]  = useState(8);
  const [detailedEntries,    setDetailedEntries]    = useState<DetailedTimesheetEntry[]>([]);
  const [projectEntries,     setProjectEntries]     = useState<any[]>([]);
  const [hrProjectEmployees, setHrProjectEmployees] = useState<any[]>([]);
  const [formData,           setFormData]           = useState({ workReport: '' });

  const [emailStatus,          setEmailStatus]          = useState<string | null>(null);
  const [allEmployees,         setAllEmployees]         = useState<EmployeeOption[]>([]);
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([]);

  const [salesEODData, setSalesEODData] = useState<SalesEODData>({
    activities: [], contactsAdded: [], companiesAdded: [], stageChanges: [], listActivities: [],
  });
  const [additionalNotes, setAdditionalNotes] = useState<AdditionalNote[]>([]);

  const hasSalesData =
    salesEODData.activities.length > 0     ||
    salesEODData.contactsAdded.length > 0  ||
    salesEODData.companiesAdded.length > 0 ||
    salesEODData.stageChanges.length > 0   ||
    salesEODData.listActivities.length > 0;

  const { validateForm } = useTimesheetValidation();


  useEffect(() => {
    if (!timesheet) return;
    setTitle(timesheet.title || '');
    setWorkReport(timesheet.notes || '');
    setTotalWorkingHours(timesheet?.total_working_hours || 8);
    setDetailedEntries(timesheet?.project_time_data?.projects || []);
    setProjectEntries(timesheet?.project_time_data?.projects || []);
    setFormData({ workReport: timesheet.notes || '' });
    setOverallWorkReport(timesheet.notes || '');
    setIsEditing(!timesheet.is_submitted);
    if (!timesheet.is_submitted) {
      const nowISO = new Date().toISOString();
      setTemporaryClockOutTime(nowISO);
      if (timesheet.clock_in_time) {
        const diff   = DateTime.fromISO(nowISO).diff(DateTime.fromISO(timesheet.clock_in_time), 'minutes').minutes || 0;
        const breaks = timesheet.break_logs?.reduce((s, b) => s + (b.duration_minutes || 0), 0) || 0;
        setTemporaryDurationMinutes(Math.max(0, Math.floor(diff) - breaks));
      }
    }
  }, [timesheet, open]);

  // ── Sales fetch ──
  const fetchSalesEODData = useCallback(async () => {
    if (!employeeId || !timesheet?.date) return;
    const istStart = DateTime.fromISO(timesheet.date, { zone: 'Asia/Kolkata' }).startOf('day');
    const istEnd   = DateTime.fromISO(timesheet.date, { zone: 'Asia/Kolkata' }).endOf('day');
    const utcStart = istStart.toUTC().toISO()!;
    const utcEnd   = istEnd.toUTC().toISO()!;
    console.log('🔍 [Sales] UTC range:', utcStart, '→', utcEnd);

    try {
      const [actRes, contactStageRes, companyStageRes, contactsRes, companiesRes, contactListRes, companyListRes] =
        await Promise.all([
          supabase.from('contact_activities')
            .select('id, type, outcome, direction, duration_minutes, title, activity_date, contacts(name, company_name)')
            .eq('created_by', employeeId).in('type', SALES_ACTIVITY_TYPES)
            .gte('activity_date', utcStart).lte('activity_date', utcEnd).order('activity_date', { ascending: true }),

          supabase.from('contact_stage_history')
            .select('id, stage_name, changed_at, contacts(name, company_name)')
            .eq('employee_id', employeeId)
            .gte('changed_at', utcStart).lte('changed_at', utcEnd).order('changed_at', { ascending: true }),

          supabase.from('company_status_history')
            .select('id, status_name, changed_at, companies(name)')
            .eq('employee_id', employeeId)
            .gte('changed_at', utcStart).lte('changed_at', utcEnd).order('changed_at', { ascending: true }),

          supabase.from('contacts')
            .select('id, name, email, job_title, contact_stage, company_name')
            .eq('created_by', employeeId)
            .gte('created_at', utcStart).lte('created_at', utcEnd).order('created_at', { ascending: true }),

          supabase.from('companies')
            .select('id, name, industry, website')
            .eq('created_by', employeeId)
            .gte('created_at', utcStart).lte('created_at', utcEnd).order('created_at', { ascending: true }),

          supabase.from('contact_workspace_files')
            .select('id, added_at, contacts(name, company_name), workspace_files(name, type)')
            .eq('added_by', employeeId)
            .gte('added_at', utcStart).lte('added_at', utcEnd).order('added_at', { ascending: true }),

          supabase.from('company_workspace_files')
            .select('id, added_at, companies(name), workspace_files(name, type)')
            .eq('added_by', employeeId)
            .gte('added_at', utcStart).lte('added_at', utcEnd).order('added_at', { ascending: true }),
        ]);

      if (actRes.error)          console.error('❌ [Sales] activities:', actRes.error);
      if (contactStageRes.error) console.error('❌ [Sales] contact_stage_history:', contactStageRes.error);
      if (companyStageRes.error) console.error('❌ [Sales] company_status_history:', companyStageRes.error);
      if (contactsRes.error)     console.error('❌ [Sales] contacts:', contactsRes.error);
      if (companiesRes.error)    console.error('❌ [Sales] companies:', companiesRes.error);
      if (contactListRes.error)  console.error('❌ [Sales] contact_workspace_files:', contactListRes.error);
      if (companyListRes.error)  console.error('❌ [Sales] company_workspace_files:', companyListRes.error);

      const stageChanges: SalesStageChange[] = [
        ...(contactStageRes.data||[]).map((item:any)=>({
          id: item.id, entity_type: 'contact' as const,
          entity_name: item.contacts?.name || 'Unknown Contact',
          company_name: item.contacts?.company_name || null,
          to_stage: item.stage_name, changed_at: item.changed_at,
        })),
        ...(companyStageRes.data||[]).map((item:any)=>({
          id: item.id, entity_type: 'company' as const,
          entity_name: item.companies?.name || 'Unknown Company',
          company_name: null, to_stage: item.status_name, changed_at: item.changed_at,
        })),
      ].sort((a,b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());

      const listActivities: SalesListActivity[] = [
        ...(contactListRes.data||[]).map((item:any)=>({
          id: item.id, entity_type: 'contact' as const,
          entity_name: item.contacts?.name || 'Unknown Contact',
          company_name: item.contacts?.company_name || null,
          list_name: item.workspace_files?.name || 'Unknown List',
          list_type: item.workspace_files?.type || 'people', added_at: item.added_at,
        })),
        ...(companyListRes.data||[]).map((item:any)=>({
          id: item.id, entity_type: 'company' as const,
          entity_name: item.companies?.name || 'Unknown Company',
          company_name: null, list_name: item.workspace_files?.name || 'Unknown List',
          list_type: item.workspace_files?.type || 'companies', added_at: item.added_at,
        })),
      ].sort((a,b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime());

      setSalesEODData({
        activities: (actRes.data||[]).map((item:any)=>({
          id: item.id, type: item.type, outcome: item.outcome, direction: item.direction,
          duration_minutes: item.duration_minutes, title: item.title,
          activity_date: item.activity_date,
          contact_name: item.contacts?.name || null,
          company_name: item.contacts?.company_name || null,
        })),
        contactsAdded: (contactsRes.data||[]).map((item:any)=>({
          id: item.id, name: item.name, email: item.email, job_title: item.job_title,
          contact_stage: item.contact_stage, company_name: item.company_name || null,
        })),
        companiesAdded: (companiesRes.data||[]).map((item:any)=>({
          id: item.id, name: item.name, industry: item.industry, website: item.website,
        })),
        stageChanges, listActivities,
      });
    } catch (err) { console.error('❌ [Sales] fetchSalesEODData threw:', err); }
  }, [employeeId, timesheet?.date]);

  useEffect(() => {
    if (!open || !organization_id || !employeeId) return;
    const setup = async () => {
      setIsLoading(true);
      try {
        const employees = await fetchEmployees(organization_id);
        setAllEmployees(employees.map(e => ({ value: e.email, label: `${e.first_name} ${e.last_name}` })));
        const { data: empData } = await supabase.from('hr_employees').select('department_id').eq('id', employeeId).single();
        if (empData?.department_id) {
          const { data: deptData } = await supabase.from('hr_departments').select('name').eq('id', empData.department_id).single();
          const isRec = deptData?.name === 'Human Resource';
          setIsRecruiter(isRec);
          if (isRec) await fetchSubmissions();
          if (!isRec && employeeHasProjects) setHrProjectEmployees(await fetchHrProjectEmployees(employeeId));
        }
        await fetchSalesEODData();
      } catch (err) {
        console.error('❌ [Dialog] setup error:', err);
        toast.error('Failed to load necessary data.');
      } finally { setIsLoading(false); }
    };
    setup();
  }, [open, organization_id, employeeId, employeeHasProjects, timesheet?.date, fetchSalesEODData]);

  // ── Recipients helper ──
  const getRecipients = async () => {
    let defaults: string[] = [];
    const { data: config } = await supabase.from('hr_email_configurations').select('recipients')
      .eq('organization_id', organization_id).eq('report_type', 'eod_report').single();
    if (config?.recipients?.length > 0) {
      const { data: emps } = await supabase.from('hr_employees').select('email').in('id', config.recipients);
      if (emps) defaults = emps.map(e => e.email);
    }
    return [...new Set([user.email, ...additionalRecipients, ...defaults].filter(Boolean))];
  };

  // ── Sales EOD (this IS the EOD when sales data exists) ──
  const sendSalesActivityEODReport = async (finalWorkReport: string, newClockOutTime: string) => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) throw new Error('Auth session not found');
      const uniqueRecipients = await getRecipients();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-activity-eod-report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            userName: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || user?.email,
            timesheetDetails: { date: timesheet.date, duration_minutes: finalDurationMinutes, clock_in_time: timesheet.clock_in_time, clock_out_time: newClockOutTime },
            breakLogs: timesheet.break_logs || [],
            workReport: finalWorkReport,
            salesData: salesEODData,
            additionalNotes: additionalNotes.filter(n => n.note.trim()),
            allRecipients: uniqueRecipients,
          }),
        }
      );
      if (!response.ok) { const e = await response.json(); throw new Error(e.error || `Status ${response.status}`); }
      console.log('✅ [Sales] EOD sent');
      setEmailStatus('EOD report sent successfully!');
    } catch (err: any) {
      console.error('❌ [Sales] EOD failed:', err.message);
      setEmailStatus(`Failed to send EOD report: ${err.message}`);
    }
  };

  // ── Standard EOD (report-manager) — only when NO sales data ──
  const sendEODReport = async (finalWorkReport: string, newClockOutTime: string) => {
    setEmailStatus('Sending EOD report...');
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) throw new Error('Authentication session not found.');
      const uniqueRecipients = await getRecipients();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ userName: `${user.first_name||''} ${user.last_name||''}`.trim()||user.email, isRecruiter, submissions: isRecruiter ? submissions : [], workReport: finalWorkReport, timesheetDetails: { date: timesheet.date, duration_minutes: finalDurationMinutes, clock_in_time: timesheet.clock_in_time, clock_out_time: newClockOutTime }, breakLogs: timesheet.break_logs||[], allRecipients: uniqueRecipients, csvContent: isRecruiter && submissions.length > 0 ? generateCSV(submissions) : null }),
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.error || `Status ${response.status}`); }
      setEmailStatus('EOD report sent successfully!');
    } catch (err: any) { setEmailStatus(`Failed to send EOD report: ${err.message}`); toast.error(`EOD Send Failed: ${err.message}`); }
  };

  // ── Recruiter EOD ──
  const sendRecruiterEODReport = async (newClockOutTime: string) => {
    setEmailStatus('Sending EOD report...');
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) throw new Error('Authentication session not found.');
      const uniqueRecipients = await getRecipients();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recruiter-eod-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ userName: `${user.first_name||''} ${user.last_name||''}`.trim()||user.email, timesheetDetails: { date: timesheet.date, duration_minutes: finalDurationMinutes, clock_in_time: timesheet.clock_in_time, clock_out_time: newClockOutTime }, jobLogs: recruiterJobLogs, overallSummary: overallWorkReport, breakLogs: timesheet.break_logs||[], allRecipients: uniqueRecipients, csvContent: recruiterJobLogs?.length ? generateRecruiterCSV(recruiterJobLogs) : null }),
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.error || `Status ${response.status}`); }
      setEmailStatus('EOD report sent successfully!');
    } catch (err: any) { setEmailStatus(`Failed to send EOD report: ${err.message}`); toast.error(`EOD Send Failed: ${err.message}`); }
  };

  const fetchSubmissions = async () => {
    if (!employeeId || !timesheet) return;
    setIsLoading(true);
    try {
      const { data: candidates, error } = await supabase.from('hr_job_candidates')
        .select(`name,email,phone,experience,skills,match_score,overall_score,applied_date,submission_date,applied_from,current_salary,expected_salary,location,preferred_location,notice_period,resume_url,main_status_id,sub_status_id,interview_date,interview_time,interview_type,round,interviewer_name,interview_result,reject_reason,ctc,joining_date,created_at,status:job_statuses!hr_job_candidates_main_status_id_fkey(name),sub_status:job_statuses!hr_job_candidates_sub_status_id_fkey(name),hr_jobs!hr_job_candidates_job_id_fkey(title,client_owner)`)
        .eq('created_by', employeeId)
        .gte('created_at', format(startOfDay(new Date(timesheet.date)), "yyyy-MM-dd'T'HH:mm:ss"))
        .lte('created_at', format(endOfDay(new Date(timesheet.date)), "yyyy-MM-dd'T'HH:mm:ss"));
      if (error) throw error;
      setSubmissions(candidates.map((c: any) => ({
        candidate_name: c.name||'n/a', email: c.email||'n/a', phone: c.phone||'n/a', experience: c.experience||'n/a',
        skills: c.skills?.length ? c.skills.join(', ') : 'n/a', match_score: c.match_score?.toString()||'n/a',
        overall_score: c.overall_score?.toString()||'n/a',
        applied_date: c.applied_date ? format(new Date(c.applied_date),'dd:MM:yyyy') : 'n/a',
        submission_date: c.submission_date||'n/a', applied_from: c.applied_from||'n/a',
        current_salary: c.current_salary ? `₹${c.current_salary}` : 'n/a',
        expected_salary: c.expected_salary ? `₹${c.expected_salary}` : 'n/a',
        location: c.location||'n/a', preferred_location: c.preferred_location||'n/a',
        notice_period: c.notice_period||'n/a', resume_url: c.resume_url||'n/a',
        main_status: c.status?.name||'n/a', sub_status: c.sub_status?.name||'n/a',
        interview_date: c.interview_date||'n/a', interview_time: c.interview_time||'n/a',
        interview_type: c.interview_type||'n/a', interview_round: c.round||'n/a',
        interviewer_name: c.interviewer_name||'n/a', interview_result: c.interview_result||'n/a',
        reject_reason: c.reject_reason||'n/a', ctc: c.ctc||'n/a',
        joining_date: c.joining_date||'n/a', created_at: c.created_at||'n/a',
        job_title: c.hr_jobs?.title||'n/a', client_name: c.hr_jobs?.client_owner||'n/a',
      })));
    } catch (err) { console.error('Error fetching submissions:', err); }
    finally { setIsLoading(false); }
  };

  const generateCSV = (data: Submission[]) => {
    const headers = ['Candidate Name','Email','Phone','Experience','Skills','Match Score','Overall Score','Applied Date','Submission Date','Applied From','Current Salary','Expected Salary','Location','Preferred Location','Notice Period','Resume URL','Main Status','Sub Status','Interview Date','Interview Time','Interview Type','Interview Round','Interviewer Name','Interview Result','Reject Reason','CTC Offered','Joining Date','Created At'];
    return Papa.unparse({ fields: headers, data: data.map(s=>[s.candidate_name,s.email,s.phone,s.experience,s.skills,s.match_score,s.overall_score,s.applied_date,s.submission_date,s.applied_from,s.current_salary,s.expected_salary,s.location,s.preferred_location,s.notice_period,s.resume_url,s.main_status,s.sub_status,s.interview_date,s.interview_time,s.interview_type,s.interview_round,s.interviewer_name,s.interview_result,s.reject_reason,s.ctc,s.joining_date,s.created_at]) }, { delimiter: ', ', quotes: true });
  };

  const generateRecruiterCSV = (jobLogs: JobLog[]) => {
    const headers = ['Job Title','Job ID','Client Name','Job Type','Job Category','Candidate Name','Submission Date','Main Status','Sub Status','Time Spent (Hours)','Time Spent (Minutes)','Total Time (Minutes)','Challenges/Notes'];
    const rows: any[] = [];
    jobLogs.forEach(job => (job.candidates||[]).forEach(c => rows.push([job.jobTitle,job.job_display_id,job.clientName,job.job_type,job.job_type_category,c.name,c.submissionDate?format(new Date(c.submissionDate),'dd/MM/yyyy'):'N/A',c.mainStatus,c.subStatus,c.hours,c.minutes,(c.hours*60)+c.minutes,job.challenges?job.challenges.replace(/<[^>]+>/g,''):''])));
    return Papa.unparse({ fields: headers, data: rows }, { delimiter: ',', quotes: true });
  };

  const handleRecruiterDataChange = (d: { logs: JobLog[] | null; report: string }) => {
    setRecruiterJobLogs(d.logs); setOverallWorkReport(d.report);
  };

  const handleClose = () => {
    setTitle(''); setWorkReport(''); setTotalWorkingHours(8); setDetailedEntries([]); setProjectEntries([]);
    setFormData({ workReport: '' }); setRecruiterJobLogs(null); setOverallWorkReport(''); setSubmissions([]);
    setIsEditing(false); setIsFormValid(true); setEmailStatus(null);
    setTemporaryClockOutTime(null); setTemporaryDurationMinutes(null);
    setSalesEODData({ activities: [], contactsAdded: [], companiesAdded: [], stageChanges: [], listActivities: [] });
    setAdditionalNotes([]);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!timesheet?.employee_id) { toast.error('User not authenticated.'); return; }
    if (isRecruiter) {
      if (!isFormValid) { toast.error('Please fill all required fields.'); return; }
    } else if (employeeHasProjects) {
      const hours = projectEntries.reduce((s, p) => s + (p.hours || 0), 0);
      if (!validateForm({ title, workReport, totalWorkingHours: hours, employeeHasProjects, projectEntries, detailedEntries: projectEntries })) return;
    } else {
      if (!formData.workReport.replace(/<[^>]+>/g, '').trim().length) { toast.error('Work Summary is required'); return; }
    }

    const newClockOutTime = new Date().toISOString();
    setIsLoading(true);
    try {
      const clockIn = timesheet.clock_in_time
        ? DateTime.fromISO(timesheet.clock_in_time, { zone: 'utc' }).setZone('Asia/Kolkata').toFormat('HH:mm')
        : undefined;
      let timesheetData: any = { employeeId: timesheet.employee_id, date: new Date(timesheet.date), clockIn };
      let isOk = false;
      let finalWorkReport = '';

      if (isRecruiter) {
        timesheetData.notes = overallWorkReport;
        timesheetData.recruiter_report_data = recruiterJobLogs;
        isOk = await submitTimesheet(timesheet.id, timesheetData, organization_id, finalDurationMinutes);
        if (isOk) {
          await sendRecruiterEODReport(newClockOutTime);
          if (hasSalesData) await sendSalesActivityEODReport(overallWorkReport, newClockOutTime);
        }
      } else {
        if (employeeHasProjects) {
          timesheetData.title = title; timesheetData.notes = title || workReport;
          timesheetData.workReport = workReport; timesheetData.totalWorkingHours = totalWorkingHours;
          timesheetData.projectEntries = projectEntries; timesheetData.detailedEntries = detailedEntries;
          finalWorkReport = workReport;
        } else {
          timesheetData.notes = formData.workReport; timesheetData.workReport = formData.workReport;
          timesheetData.totalWorkingHours = timesheet.duration_minutes ? timesheet.duration_minutes / 60 : 8;
          finalWorkReport = formData.workReport;
        }
        isOk = await submitTimesheet(timesheet.id, timesheetData, organization_id, finalDurationMinutes);
        if (isOk) {
          if (hasSalesData) {
            // Sales users → ONLY sales EOD (which includes work report) — report-manager NOT called
            await sendSalesActivityEODReport(finalWorkReport, newClockOutTime);
          } else {
            // No sales data → standard report-manager
            await sendEODReport(finalWorkReport, newClockOutTime);
          }
        }
      }

      if (isOk) {
        if (!emailStatus?.startsWith('Failed')) {
          toast.success('Timesheet submitted successfully');
          onSubmitTimesheet();
          handleClose();
        }
      } else {
        toast.error('Failed to submit timesheet');
      }
    } catch (error: any) {
      console.error('Error during submission:', error);
      toast.error(`Submission Failed: ${error.message || 'An unknown error occurred'}`);
    } finally { setIsLoading(false); }
  };

  const canSubmit = !timesheet?.is_submitted && !isLoading && isFormValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{timesheet?.is_submitted ? 'View Timesheet' : 'Submit Timesheet'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {isLoading && isEditing ? <div>Loading...</div> : (
            <>
              <TimesheetBasicInfo timesheet={timesheet} temporaryClockOutTime={temporaryClockOutTime} temporaryDurationMinutes={temporaryDurationMinutes} />

              {isEditing ? (
                <>
                  {isRecruiter ? (
                    <RecruiterTimesheetForm timesheet={timesheet} onDataChange={handleRecruiterDataChange} onValidationChange={setIsFormValid} />
                  ) : employeeHasProjects ? (
                    <TimesheetDialogContent
                      date={new Date(timesheet.date)} mode="submit" setDate={() => {}}
                      title={title} setTitle={setTitle}
                      totalWorkingHours={totalWorkingHours} setTotalWorkingHours={setTotalWorkingHours}
                      workReport={workReport} setWorkReport={setWorkReport}
                      detailedEntries={detailedEntries} setDetailedEntries={setDetailedEntries}
                      projectEntries={projectEntries} setProjectEntries={setProjectEntries}
                      employeeHasProjects={employeeHasProjects} isSubmitting={isLoading}
                      handleClose={handleClose} handleSubmit={handleSubmit}
                      employeeId={employeeId} hrProjectEmployees={hrProjectEmployees}
                    />
                  ) : (
                    <TimesheetEditForm formData={formData} setFormData={setFormData} timesheet={timesheet} />
                  )}

                  {/* Sales preview + notes — all roles */}
                  {hasSalesData && (
                    <>
                      <SalesActivityPreview data={salesEODData} />
                      <AdditionalNotesSection
                        organizationId={organization_id}
                        notes={additionalNotes}
                        onChange={setAdditionalNotes}
                      />
                    </>
                  )}

                  {/* Recipients */}
                  <div className="p-5 bg-white rounded-lg border border-slate-200 mt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Share2 className="h-5 w-5 mr-3 text-indigo-600" />
                        <Label htmlFor="recipients" className="text-lg font-bold text-gray-800">Add Timesheet Recipients</Label>
                      </div>
                      <span className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded-md">Optional</span>
                    </div>
                    <p className="mt-1 mb-4 text-sm text-gray-500">Forward this report to additional recipients if needed.</p>
                    <MultiSelect id="recipients" options={allEmployees} selected={additionalRecipients} onChange={setAdditionalRecipients} placeholder="Select employees to notify..." />
                  </div>
                </>
              ) : (
                <>
                  <TimeLogDetails timeLog={timesheet} employeeHasProjects={employeeHasProjects} />
                  {employeeHasProjects && <TimesheetProjectDetails timesheet={timesheet} />}
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {emailStatus && <div className="text-sm text-gray-600 mr-4">{emailStatus}</div>}
          {!timesheet?.is_submitted && !isEditing && <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>}
          {canSubmit && isEditing && <Button onClick={handleSubmit} disabled={isLoading || !isFormValid}>{isLoading ? 'Submitting...' : 'Submit Timesheet'}</Button>}
          {timesheet?.is_submitted && <Button variant="outline" onClick={handleClose}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
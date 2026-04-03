import { useState, useMemo } from 'react';
import {
  Phone, Mail, MessageSquare, Linkedin, StickyNote,
  ChevronDown, ChevronUp, Trash2, Inbox, Pencil,
  ArrowUpRight, ArrowDownLeft, Clock, Tag, User
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useCandidateActivity, ActivityType, ACTIVITY_META,
  CandidateActivity, LogActivityPayload
} from './hooks/useCandidateActivity';
import { LogCallDialog }      from './dialogs/LogCallDialog';
import { LogEmailDialog }     from './dialogs/LogEmailDialog';
import { LogWhatsAppDialog }  from './dialogs/LogWhatsAppDialog';
import { LogLinkedInDialog }  from './dialogs/LogLinkedInDialog';
import { CreateNoteDialog }   from './dialogs/CreateNoteDialog';

// ─── Types ────────────────────────────────────────────────────────────────────
type ModalType = ActivityType | null;
type FilterType = ActivityType | 'all';
interface EditState { activity: CandidateActivity; type: ActivityType; }

// ─── Quick log buttons ────────────────────────────────────────────────────────
const QUICK_LOG: { type: ActivityType; label: string; icon: React.ReactNode; cls: string }[] = [
  { type: 'call',     label: 'Call',     cls: 'from-emerald-500 to-teal-500',   icon: <Phone className="h-4 w-4" /> },
  { type: 'email',    label: 'Email',    cls: 'from-blue-500 to-indigo-500',    icon: <Mail className="h-4 w-4" /> },
  { type: 'whatsapp', label: 'WhatsApp', cls: 'from-green-500 to-emerald-600',  icon: (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  )},
  { type: 'linkedin', label: 'LinkedIn', cls: 'from-sky-500 to-blue-600',      icon: <Linkedin className="h-4 w-4" /> },
  { type: 'note',     label: 'Note',     cls: 'from-violet-500 to-purple-600', icon: <StickyNote className="h-4 w-4" /> },
];

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'call', label: 'Calls' },
  { value: 'email', label: 'Emails' }, { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'linkedin', label: 'LinkedIn' }, { value: 'note', label: 'Notes' },
];

// ─── Activity Icon ────────────────────────────────────────────────────────────
const ActivityIcon = ({ type, cls = 'h-3.5 w-3.5' }: { type: ActivityType; cls?: string }) => {
  if (type === 'call')     return <Phone className={cls} />;
  if (type === 'email')    return <Mail className={cls} />;
  if (type === 'linkedin') return <Linkedin className={cls} />;
  if (type === 'note')     return <StickyNote className={cls} />;
  return <svg viewBox="0 0 24 24" className={`${cls} fill-current`}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
const dateLabel = (d: string) => {
  const p = parseISO(d);
  if (isToday(p)) return 'Today';
  if (isYesterday(p)) return 'Yesterday';
  return format(p, 'dd MMM yyyy');
};
const groupByDate = (acts: CandidateActivity[]) => {
  const g: Record<string, CandidateActivity[]> = {};
  acts.forEach(a => { const l = dateLabel(a.activity_date); if (!g[l]) g[l] = []; g[l].push(a); });
  return g;
};

// ─── Activity Card ────────────────────────────────────────────────────────────
const ActivityCard = ({
  activity, onDelete, onEdit,
}: {
  activity: CandidateActivity;
  onDelete: (id: string) => void;
  onEdit: (a: CandidateActivity) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTIVITY_META[activity.type];
  const creatorName = activity.creator
    ? `${activity.creator.first_name} ${activity.creator.last_name}`.trim()
    : 'System';
  const hasContent = !!activity.description?.trim();
  const hasHtml    = !!activity.description_html?.trim();
  const isOut = ['outbound', 'sent'].includes((activity.direction ?? '').toLowerCase());

  return (
    <div className={`relative rounded-xl border ${meta.border} ${meta.bg} overflow-hidden transition-all hover:shadow-sm`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${meta.dot}`} />
      <div className="pl-3.5 pr-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${meta.bg} border ${meta.border}`}>
              <span className={meta.color}><ActivityIcon type={activity.type} /></span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{activity.title}</p>
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                {activity.direction && activity.type !== 'note' && activity.type !== 'linkedin' && (
                  <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold border ${isOut ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-cyan-50 text-cyan-600 border-cyan-200'}`}>
                    {isOut ? <ArrowUpRight className="h-2 w-2" /> : <ArrowDownLeft className="h-2 w-2" />}
                    {activity.direction.charAt(0).toUpperCase() + activity.direction.slice(1)}
                  </span>
                )}
                {activity.outcome && (
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}>
                    {activity.outcome}
                  </span>
                )}
                {activity.duration_minutes && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400">
                    <Clock className="h-2 w-2" />{activity.duration_minutes}m
                  </span>
                )}
                {activity.metadata?.tag && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-600">
                    <Tag className="h-2 w-2" />{activity.metadata.tag}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <span className="text-[9px] text-slate-400 whitespace-nowrap mr-1">
              {format(parseISO(activity.activity_date), 'h:mm a')}
            </span>
            {hasContent && (
              <button onClick={() => setExpanded(e => !e)}
                className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-slate-600 transition-colors">
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
            {/* Edit button */}
            <button onClick={() => onEdit(activity)}
              className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-violet-600 transition-colors">
              <Pencil className="h-3 w-3" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-slate-600 transition-colors text-xs">⋯</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={() => onEdit(activity)} className="text-violet-600 focus:text-violet-600 focus:bg-violet-50">
                  <Pencil className="h-3 w-3 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(activity.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <Trash2 className="h-3 w-3 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Expanded body */}
        {expanded && hasContent && (
          <div className="mt-2 ml-8 rounded-lg border border-white/60 bg-white/70 px-3 py-2">
            {hasHtml
              ? <div className="prose prose-xs max-w-none text-slate-700 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: activity.description_html! }} />
              : <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{activity.description}</p>
            }
          </div>
        )}

        <div className="mt-1.5 ml-8 flex items-center gap-1">
          <User className="h-2 w-2 text-slate-300" />
          <span className="text-[9px] text-slate-400">{creatorName}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────
interface Props { candidateId: string; candidateName: string; }

export const CandidateActivityPanel = ({ candidateId, candidateName }: Props) => {
  const [activeModal, setActiveModal]   = useState<ModalType>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [editState, setEditState]       = useState<EditState | null>(null);

  const { activities, isLoading, logActivity, updateActivity, deleteActivity, isLogging, isUpdating } =
    useCandidateActivity(candidateId);

  const filtered = useMemo(() =>
    activeFilter === 'all' ? activities : activities.filter(a => a.type === activeFilter),
    [activities, activeFilter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const handleSubmitCreate = async (payload: LogActivityPayload) => { await logActivity(payload); };
  const handleSubmitEdit   = async (payload: LogActivityPayload) => {
    if (!editState) return;
    await updateActivity({ id: editState.activity.id, ...payload });
    setEditState(null);
  };

  const handleEdit = (a: CandidateActivity) => setEditState({ activity: a, type: a.type });
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this activity?')) return;
    await deleteActivity(id);
  };

  const isEditOpen = (type: ActivityType) => editState?.type === type;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-3">
          <h3 className="text-sm font-bold text-white">Activity Log</h3>
          <p className="text-purple-200 text-[10px] mt-0.5">
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'} recorded
          </p>
        </div>

        {/* Quick Log */}
        <div className="px-3 pt-3 pb-2">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Quick Log</p>
          <div className="grid grid-cols-5 gap-1.5">
            {QUICK_LOG.map((btn) => (
              <Tooltip key={btn.type}>
                <TooltipTrigger asChild>
                  <button onClick={() => setActiveModal(btn.type)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br ${btn.cls} py-2.5 text-white shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95`}>
                    {btn.icon}
                    <span className="text-[9px] font-semibold leading-tight text-center">{btn.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{btn.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const count = f.value === 'all' ? activities.length : activities.filter(a => a.type === f.value).length;
            return (
              <button key={f.value} onClick={() => setActiveFilter(f.value)}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all ${
                  activeFilter === f.value ? 'border-purple-500 bg-purple-500 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-purple-300 hover:text-purple-600'}`}>
                {f.label}
                {count > 0 && <span className={`ml-1 rounded-full px-1 py-0.5 text-[8px] font-bold ${activeFilter === f.value ? 'bg-white/30' : 'bg-slate-100 text-slate-400'}`}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Timeline */}
        <div className="px-3 pb-3 space-y-3 max-h-[520px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 mb-2">
                <Inbox className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-xs font-medium text-slate-500">No activities yet</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Use the buttons above to log your first activity</p>
            </div>
          ) : (
            Object.entries(grouped).map(([label, acts]) => (
              <div key={label}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="space-y-1.5">
                  {acts.map(activity => (
                    <ActivityCard key={activity.id} activity={activity} onDelete={handleDelete} onEdit={handleEdit} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Create dialogs ── */}
      <LogCallDialog     open={activeModal === 'call'}     onOpenChange={(o) => !o && setActiveModal(null)} candidateName={candidateName} onSubmit={handleSubmitCreate} isSubmitting={isLogging} />
      <LogEmailDialog    open={activeModal === 'email'}    onOpenChange={(o) => !o && setActiveModal(null)} candidateName={candidateName} onSubmit={handleSubmitCreate} isSubmitting={isLogging} />
      <LogWhatsAppDialog open={activeModal === 'whatsapp'} onOpenChange={(o) => !o && setActiveModal(null)} candidateName={candidateName} onSubmit={handleSubmitCreate} isSubmitting={isLogging} />
      <LogLinkedInDialog open={activeModal === 'linkedin'} onOpenChange={(o) => !o && setActiveModal(null)} candidateName={candidateName} onSubmit={handleSubmitCreate} isSubmitting={isLogging} />
      <CreateNoteDialog  open={activeModal === 'note'}     onOpenChange={(o) => !o && setActiveModal(null)} candidateName={candidateName} onSubmit={handleSubmitCreate} isSubmitting={isLogging} />

      {/* ── Edit dialogs ── */}
      <LogCallDialog     open={isEditOpen('call')}     onOpenChange={(o) => !o && setEditState(null)} candidateName={candidateName} onSubmit={handleSubmitEdit} isSubmitting={isUpdating} activity={editState?.activity} mode="edit" />
      <LogEmailDialog    open={isEditOpen('email')}    onOpenChange={(o) => !o && setEditState(null)} candidateName={candidateName} onSubmit={handleSubmitEdit} isSubmitting={isUpdating} activity={editState?.activity} mode="edit" />
      <LogWhatsAppDialog open={isEditOpen('whatsapp')} onOpenChange={(o) => !o && setEditState(null)} candidateName={candidateName} onSubmit={handleSubmitEdit} isSubmitting={isUpdating} activity={editState?.activity} mode="edit" />
      <LogLinkedInDialog open={isEditOpen('linkedin')} onOpenChange={(o) => !o && setEditState(null)} candidateName={candidateName} onSubmit={handleSubmitEdit} isSubmitting={isUpdating} activity={editState?.activity} mode="edit" />
      <CreateNoteDialog  open={isEditOpen('note')}     onOpenChange={(o) => !o && setEditState(null)} candidateName={candidateName} onSubmit={handleSubmitEdit} isSubmitting={isUpdating} activity={editState?.activity} mode="edit" />
    </TooltipProvider>
  );
};
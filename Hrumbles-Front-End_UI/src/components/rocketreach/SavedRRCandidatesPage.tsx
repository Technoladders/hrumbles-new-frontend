/**
 * SavedRRCandidatesPage.tsx
 * Route: /search/rocketreach/saved
 *
 * Mirrors SavedCandidatesPage.tsx exactly but for RocketReach candidates.
 * Uses same: useSavedCandidates, useFolders, FolderSidebar, FolderPickerModal
 * Differences:
 *   - RevealCell replaced with inline RR reveal (calls rocketreach-lookup)
 *   - "Back to Search" → goes to /search/rocketreach
 *   - Detects rocketreach candidates by checking rr_profile_id in saved_candidates
 *   - Search source filter: searchSource = "rocketreach"
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector }    from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { supabase }       from "@/integrations/supabase/client";
import {
  ArrowLeft, Search, Users, Sparkles, Pencil,
  Star, Send, ChevronLeft, ChevronRight,
  RefreshCw, Archive, Building2, MapPin, ExternalLink, FolderPlus,
  Mail, Phone, Copy, Check, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  useSavedCandidates, SavedCandidate, SaveTypeFilter, StatusFilter, SortOption,
} from "@/components/CandidateSearch/hooks/useSavedCandidates";
import { useFolders }         from "@/components/CandidateSearch/hooks/useFolders";
import { useAddToFolder }     from "@/components/CandidateSearch/hooks/useAddToFolder";
import { FolderSidebar }      from "@/components/CandidateSearch/components/FolderSidebar";
import { FolderPickerModal }  from "@/components/CandidateSearch/components/FolderPickerModal";
import { SAVED_CANDIDATES_QUERY_KEY } from "@/components/CandidateSearch/hooks/useUpsertSavedCandidate";

const PER_PAGE = 25;

// ─── RR Reveal cell (inline) ──────────────────────────────────────────────────
// Replaces Apollo's RevealCell — calls rocketreach-lookup directly
async function resolveAuth(): Promise<{ organizationId: string; userId: string } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const userId = session.user.id;
  const orgFromMeta =
    session.user.user_metadata?.organization_id    ??
    session.user.user_metadata?.hr_organization_id ??
    (session.user.app_metadata as any)?.organization_id ?? null;
  if (orgFromMeta) return { organizationId: orgFromMeta, userId };
  const { data: emp } = await supabase.from("hr_employees").select("organization_id").eq("user_id", userId).maybeSingle();
  if (!emp?.organization_id) return null;
  return { organizationId: emp.organization_id, userId };
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="text-slate-300 hover:text-violet-500 transition-colors ml-1 flex-shrink-0">
      {done ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
    </button>
  );
}

interface RRRevealCellProps {
  type:          "email" | "phone";
  rrProfileId:   string | null;
  savedValue:    string | null;
  onRevealed:    (type: "email" | "phone", value: string) => void;
}

const RRRevealCell: React.FC<RRRevealCellProps> = ({ type, rrProfileId, savedValue, onRevealed }) => {
  const [loading,  setLoading]  = useState(false);
  const [revealed, setRevealed] = useState<string | null>(savedValue);
  const [error,    setError]    = useState<string | null>(null);

  // Sync if savedValue changes externally
  useEffect(() => { setRevealed(savedValue); }, [savedValue]);

  const doReveal = async () => {
    if (!rrProfileId) return;
    setLoading(true); setError(null);
    const auth = await resolveAuth();
    if (!auth) { setLoading(false); setError("Auth failed"); return; }
    const { data, error: fnErr } = await supabase.functions.invoke("rocketreach-lookup", {
      body: { rrProfileId, organizationId: auth.organizationId, userId: auth.userId, revealType: type },
    });
    setLoading(false);
    if (fnErr || !data?.success) { setError("Failed"); return; }
    const value = type === "email" ? data.email : data.phone;
    if (value) { setRevealed(value); onRevealed(type, value); }
  };

  if (revealed) {
    return (
      <div className="flex items-center gap-1 text-[11px]">
        {type === "email"
          ? <Mail size={9} className="text-violet-400 flex-shrink-0" />
          : <Phone size={9} className="text-violet-400 flex-shrink-0" />
        }
        <span className="font-mono text-slate-600 truncate max-w-[140px]">{revealed}</span>
        <CopyBtn text={revealed} />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={e => { e.stopPropagation(); doReveal(); }}
        disabled={loading || !rrProfileId}
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-semibold border rounded-md px-2 py-1 transition-colors",
          type === "email"
            ? "text-violet-600 border-violet-400 hover:bg-violet-50"
            : "text-slate-500 border-slate-300 hover:border-violet-400 hover:text-violet-600",
          (!rrProfileId || loading) && "opacity-40 cursor-not-allowed"
        )}
      >
        {loading
          ? <Loader2 size={9} className="animate-spin" />
          : type === "email" ? <Mail size={9} /> : <Phone size={9} />
        }
        {loading ? "Revealing…" : type === "email" ? "View email" : "Find phone"}
      </button>
      {error && <p className="text-[9px] text-red-500 mt-0.5">{error}</p>}
    </div>
  );
};

// ─── Config ────────────────────────────────────────────────────────────────────
const SAVE_TYPE_CFG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  enriched:    { label: "Enriched",    bg: "#FFF7ED", color: "#9A3412", border: "#FDBA74" },
  manual_edit: { label: "Manual",      bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  shortlisted: { label: "Shortlisted", bg: "#F0FDF4", color: "#065F46", border: "#A7F3D0" },
  invited:     { label: "Invited",     bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
};
const STATUS_CFG: Record<string, { label: string; dot: string }> = {
  saved:       { label: "Saved",       dot: "bg-slate-400" },
  contacted:   { label: "Contacted",   dot: "bg-blue-500"  },
  in_progress: { label: "In Progress", dot: "bg-amber-500" },
  archived:    { label: "Archived",    dot: "bg-slate-200" },
};
const TABS: { key: SaveTypeFilter; label: string; icon: React.ElementType }[] = [
  { key: "all",         label: "All",         icon: Users    },
  { key: "enriched",    label: "Enriched",    icon: Sparkles },
  { key: "manual_edit", label: "Manual",      icon: Pencil   },
  { key: "shortlisted", label: "Shortlisted", icon: Star     },
  { key: "invited",     label: "Invited",     icon: Send     },
];

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso); const diff = Date.now() - d.getTime();
    if (diff < 3600000)   return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000)  return `${Math.floor(diff/3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return ""; }
};

// ─── Status cell ──────────────────────────────────────────────────────────────
const StatusCell: React.FC<{ row: SavedCandidate; onUpdate: (id: string, s: string) => void }> = ({ row, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[row.status] ?? STATUS_CFG.saved;
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold bg-white border border-slate-200 hover:border-violet-300 transition-colors whitespace-nowrap">
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />{cfg.label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute left-0 top-8 z-20 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
            {Object.entries(STATUS_CFG).filter(([k]) => k !== "archived").map(([key, c]) => (
              <button key={key} onClick={e => { e.stopPropagation(); onUpdate(row.id, key); setOpen(false); }}
                className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium hover:bg-violet-50 transition-colors",
                  key === row.status ? "bg-violet-50 text-violet-700" : "text-slate-600")}>
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} />{c.label}
              </button>
            ))}
            <div className="h-px bg-slate-100 my-1" />
            <button onClick={e => { e.stopPropagation(); onUpdate(row.id, "archived"); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-red-500 hover:bg-red-50">
              <Archive size={10} /> Archive
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Table row ─────────────────────────────────────────────────────────────────
interface RowProps {
  row: SavedCandidate; selected: boolean; onSelect: () => void;
  onAddToFolder: (r: SavedCandidate) => void;
  onStatusUpdate: (id: string, s: string) => void;
  onRevealDone: (id: string, type: "email"|"phone", value: string) => void;
}

const TableRow: React.FC<RowProps> = ({ row, selected, onSelect, onAddToFolder, onStatusUpdate, onRevealDone }) => {
  const typeCfg  = SAVE_TYPE_CFG[row.save_type] ?? SAVE_TYPE_CFG.enriched;
  // Extract rr_profile_id from the row (saved_candidates has rr_profile_id column if migrated)
  const rrProfileId = (row as any).rr_profile_id ?? null;

  return (
    <tr onClick={onSelect}
      className={cn("border-b border-slate-100 cursor-pointer transition-colors group",
        selected ? "bg-violet-50 border-violet-100" : "hover:bg-slate-50/60")}>
      {/* Candidate */}
      <td className="px-4 py-3 min-w-[185px]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {(row.snapshot_name ?? "?")[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-800 leading-tight truncate max-w-[148px]">{row.snapshot_name ?? "—"}</p>
            {row.snapshot_title && <p className="text-[10px] text-slate-400 truncate max-w-[148px]">{row.snapshot_title}</p>}
            {rrProfileId && <p className="text-[8px] text-orange-500 font-mono">RR #{rrProfileId}</p>}
          </div>
        </div>
      </td>
      {/* Company + Location */}
      <td className="px-4 py-3 min-w-[130px]">
        {row.snapshot_company
          ? <div className="flex items-center gap-1.5"><Building2 size={10} className="text-slate-400 flex-shrink-0" /><span className="text-[11px] text-slate-600 truncate max-w-[110px]">{row.snapshot_company}</span></div>
          : <span className="text-slate-300 text-[11px]">—</span>}
        {row.snapshot_location && <div className="flex items-center gap-1 mt-0.5"><MapPin size={9} className="text-slate-300 flex-shrink-0" /><span className="text-[10px] text-slate-400 truncate max-w-[110px]">{row.snapshot_location}</span></div>}
      </td>
      {/* Email */}
      <td className="px-4 py-3 min-w-[195px]" onClick={e => e.stopPropagation()}>
        <RRRevealCell type="email" rrProfileId={rrProfileId} savedValue={row.email}
          onRevealed={(t, v) => onRevealDone(row.id, t, v)} />
      </td>
      {/* Phone */}
      <td className="px-4 py-3 min-w-[175px]" onClick={e => e.stopPropagation()}>
        <RRRevealCell type="phone" rrProfileId={rrProfileId} savedValue={row.phone}
          onRevealed={(t, v) => onRevealDone(row.id, t, v)} />
      </td>
      {/* Type badge */}
      <td className="px-4 py-3 w-[105px]">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap"
          style={{ background: typeCfg.bg, color: typeCfg.color, borderColor: typeCfg.border }}>
          {typeCfg.label}
        </span>
      </td>
      {/* Job */}
      <td className="px-4 py-3 min-w-[115px]">
        {row.hr_jobs
          ? <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-medium truncate max-w-[105px] block">{row.hr_jobs.title}</span>
          : <span className="text-slate-300 text-[11px]">—</span>}
      </td>
      {/* Status */}
      <td className="px-4 py-3 w-[115px]" onClick={e => e.stopPropagation()}>
        <StatusCell row={row} onUpdate={onStatusUpdate} />
      </td>
      {/* Saved */}
      <td className="px-4 py-3 w-[80px]">
        <span className="text-[10px] text-slate-400 whitespace-nowrap">{fmtDate(row.created_at)}</span>
      </td>
      {/* Actions */}
      <td className="px-4 py-3 w-[80px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onAddToFolder(row)} title="Add to folder"
            className="p-1.5 rounded-md text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-colors">
            <FolderPlus size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── Empty state ───────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ tab: SaveTypeFilter; onSearch: () => void }> = ({ tab, onSearch }) => (
  <tr><td colSpan={9}>
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-3">
        <span className="text-2xl font-black text-orange-300">RR</span>
      </div>
      <p className="text-[13px] font-semibold text-slate-700 mb-1">
        {tab === "all" ? "No saved RocketReach candidates yet" : `No ${tab.replace("_"," ")} candidates`}
      </p>
      <p className="text-[11px] text-slate-400 max-w-xs mb-4">
        Candidates appear here when you reveal, shortlist, or save from RocketReach search.
      </p>
      {tab === "all" && (
        <button onClick={onSearch}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition-colors"
          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
          Go to RocketReach Search
        </button>
      )}
    </div>
  </td></tr>
);

// ─── Page ──────────────────────────────────────────────────────────────────────
const SavedRRCandidatesPage: React.FC = () => {
  const navigate       = useNavigate();
  const [urlParams, setUrlParams] = useSearchParams();
  const orgId  = useSelector((s: any) => s.auth?.organization_id  ?? s.auth?.user?.organization_id ?? null);
  const userId = useSelector((s: any) => s.auth?.user?.id         ?? s.auth?.id                    ?? null);
  const queryClient = useQueryClient();

  const [tab,      setTab]    = useState<SaveTypeFilter>("all");
  const [folderId, setFolder] = useState<string | null>(urlParams.get("folder") ?? null);
  const [status,   setStatus] = useState<StatusFilter>("all");
  const [sort,     setSort]   = useState<SortOption>("newest");
  const [search,   setSearch] = useState("");
  const [page,     setPage]   = useState(1);
  const [showArch, setShowArch] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [addFolderTarget, setAddFolderTarget] = useState<SavedCandidate | null>(null);
  const [revealedOverrides, setRevealedOverrides] = useState<Record<string, { email?: string; phone?: string }>>({});

  const { folders, createFolder, deleteFolder, renameFolder } = useFolders(orgId, userId);
  const { addToFolder } = useAddToFolder();

  const effectiveStatus: StatusFilter = showArch ? "archived" : status;
  const { candidates, totalCount, isLoading, refetch } = useSavedCandidates({
    organizationId: orgId, saveType: tab, status: effectiveStatus,
    folderId: folderId ?? undefined, search, sort, page, perPage: PER_PAGE,
  });

  // Filter to RR candidates only (those with rr_profile_id set)
  // Note: This requires the useSavedCandidates to support searchSource filter
  // For now, filter client-side by checking if rr_profile_id is present
  const rrCandidates = useMemo(() =>
    candidates.filter(c => (c as any).rr_profile_id || (c as any).search_source === "rocketreach"),
  [candidates]);

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  const handleStatusUpdate = useCallback(async (id: string, newStatus: string) => {
    await supabase.from("saved_candidates").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: [SAVED_CANDIDATES_QUERY_KEY] });
    refetch();
  }, [queryClient, refetch]);

  const handleRevealDone = useCallback((rowId: string, type: "email"|"phone", value: string) => {
    setRevealedOverrides(prev => ({ ...prev, [rowId]: { ...prev[rowId], [type]: value } }));
    setTimeout(() => refetch(), 800);
  }, [refetch]);

  const displayCandidates = useMemo(() =>
    rrCandidates.map(c => {
      const ov = revealedOverrides[c.id];
      return ov ? { ...c, email: ov.email ?? c.email, phone: ov.phone ?? c.phone } : c;
    }),
  [rrCandidates, revealedOverrides]);

  const TH: React.FC<{ children: React.ReactNode; cls?: string }> = ({ children, cls }) => (
    <th className={cn("px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider whitespace-nowrap select-none bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent", cls)}>
      {children}
    </th>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="px-6 py-3 flex items-center gap-4">
          <button onClick={() => navigate("/search/rocketreach")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 transition-colors">
            <ArrowLeft size={13} /> Back to Search
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] text-white font-black leading-none">RR</span>
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-800 leading-tight">Saved RocketReach Candidates</p>
              <p className="text-[10px] text-slate-400">{isLoading ? "Loading…" : `${totalCount} candidate${totalCount !== 1 ? "s" : ""}`}</p>
            </div>
          </div>
          <div className="flex-1" />
          <button onClick={() => refetch()}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-orange-600 hover:border-orange-300 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
        {/* Folder sidebar */}
        <FolderSidebar
          folders={folders} activeFolderId={folderId} isLoading={isLoading}
          totalCount={totalCount} onSelectFolder={setFolder}
          onCreateFolder={async name => { await createFolder(name); return null; }}
          onRenameFolder={renameFolder} onDeleteFolder={deleteFolder}
        />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-4 space-y-4">

              {/* Filter toolbar */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 space-y-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TABS.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => { setTab(key); setPage(1); }}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all",
                        tab === key ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600")}>
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button onClick={() => setShowArch(!showArch)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all",
                      showArch ? "bg-slate-600 text-white border-slate-600" : "bg-white text-slate-400 border-slate-200")}>
                    <Archive size={12} /> Archived
                  </button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                      placeholder="Search name, title, company, email…"
                      className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400" />
                  </div>
                  <select value={status} onChange={e => { setStatus(e.target.value as StatusFilter); setPage(1); }}
                    className="px-3 py-1.5 text-[12px] border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none">
                    <option value="all">All Status</option>
                    <option value="saved">Saved</option>
                    <option value="contacted">Contacted</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                  <select value={sort} onChange={e => { setSort(e.target.value as SortOption); setPage(1); }}
                    className="px-3 py-1.5 text-[12px] border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none">
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name_az">Name A–Z</option>
                  </select>
                  <span className="ml-auto text-[11px] text-slate-400 font-medium whitespace-nowrap">
                    {isLoading ? "…" : `${displayCandidates.length} result${displayCandidates.length !== 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-orange-100 bg-orange-50/40">
                        <TH cls="pl-4">Candidate</TH>
                        <TH>Company</TH>
                        <TH>Email</TH>
                        <TH>Phone</TH>
                        <TH>Type</TH>
                        <TH>Job</TH>
                        <TH>Status</TH>
                        <TH>Saved</TH>
                        <TH>Actions</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading
                        ? Array.from({ length: 8 }).map((_, i) => (
                            <tr key={i} className="border-b border-slate-100">
                              {Array.from({ length: 9 }).map((_, j) => (
                                <td key={j} className="px-4 py-3">
                                  <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: j === 0 ? 140 : j === 2 || j === 3 ? 100 : 70 }} />
                                </td>
                              ))}
                            </tr>
                          ))
                        : displayCandidates.length === 0
                        ? <EmptyState tab={tab} onSearch={() => navigate("/search/rocketreach")} />
                        : displayCandidates.map(c => (
                            <TableRow
                              key={c.id} row={c}
                              selected={selected === c.id}
                              onSelect={() => setSelected(p => p === c.id ? null : c.id)}
                              onAddToFolder={setAddFolderTarget}
                              onStatusUpdate={handleStatusUpdate}
                              onRevealDone={handleRevealDone}
                            />
                          ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">
                    Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, totalCount)} of {totalCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}
                      className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors",
                        page > 1 ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "border-slate-100 text-slate-300 cursor-not-allowed")}>
                      <ChevronLeft size={13} /> Previous
                    </button>
                    <span className="text-[12px] text-slate-500 font-mono px-2">{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
                      className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors",
                        page < totalPages ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "border-slate-100 text-slate-300 cursor-not-allowed")}>
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add to folder */}
      {addFolderTarget && (
        <FolderPickerModal
          folders={folders}
          onSelect={async (fId) => {
            if (addFolderTarget && userId) await addToFolder(fId, addFolderTarget.id, userId);
            setAddFolderTarget(null); refetch();
          }}
          onCreate={async name => {
            const id = await createFolder(name);
            if (id && addFolderTarget && userId) { await addToFolder(id, addFolderTarget.id, userId); setAddFolderTarget(null); refetch(); }
          }}
          onSkip={() => setAddFolderTarget(null)}
          onClose={() => setAddFolderTarget(null)}
          title="Add to Folder" showSkip={false}
        />
      )}
    </div>
  );
};

export default SavedRRCandidatesPage;
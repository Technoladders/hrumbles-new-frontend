/**
 * SavedCandidatesPage.tsx — v3
 * Route: /search/candidates/saved
 *
 * Every piece of state — tab, folder, status, sort, search, page, archived —
 * is persisted in URL searchParams. Refresh and back/forward all work.
 *
 * URL example:
 *   /search/candidates/saved?tab=enriched&folder=<uuid>&status=contacted
 *   &sort=name_az&q=daniel&pg=2
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Search, Users, Sparkles, Pencil,
  Star, Send, ChevronLeft, ChevronRight,
  RefreshCw, Archive,
  Check, Building2, MapPin, ExternalLink, FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSavedCandidates, SavedCandidate, SaveTypeFilter, StatusFilter, SortOption,
} from "@/components/CandidateSearch/hooks/useSavedCandidates";
import { useFolders } from "@/components/CandidateSearch/hooks/useFolders";
import { useAddToFolder } from "@/components/CandidateSearch/hooks/useAddToFolder";
import { FolderSidebar } from "@/components/CandidateSearch/components/FolderSidebar";
import { FolderPickerModal } from "@/components/CandidateSearch/components/FolderPickerModal";
import { CandidateInviteGate } from "@/components/CandidateSearch/components/CandidateInviteGate";
import { SavedCandidateDetailPanel } from "@/components/CandidateSearch/components/SavedCandidateDetailPanel";
import { RevealCell } from "@/components/CandidateSearch/components/RevealCell";
import { SAVED_CANDIDATES_QUERY_KEY } from "@/components/CandidateSearch/hooks/useUpsertSavedCandidate";
import {
  deserializeSavedParams,
  serializeSavedParams,
} from "@/components/CandidateSearch/hooks/savedCandidatesParams";

const PER_PAGE = 25;

// ─── Config ───────────────────────────────────────────────────────────────────
const SAVE_TYPE_CFG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  enriched:    { label: "Enriched",    bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE" },
  manual_edit: { label: "Manual",      bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  shortlisted: { label: "Shortlisted", bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" },
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

// ─── StatusCell ───────────────────────────────────────────────────────────────
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
          <div className="absolute left-0 top-8 z-20 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1 overflow-hidden">
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

// ─── TableRow ─────────────────────────────────────────────────────────────────
interface RowProps {
  row: SavedCandidate; organizationId: string; userId: string;
  selected: boolean; onSelect: () => void;
  onInvite: (r: SavedCandidate) => void;
  onAddToFolder: (r: SavedCandidate) => void;
  onStatusUpdate: (id: string, s: string) => void;
  onRevealDone: (id: string, t: "email"|"phone", v: string) => void;
}
const TableRow: React.FC<RowProps> = ({
  row, organizationId, userId, selected, onSelect,
  onInvite, onAddToFolder, onStatusUpdate, onRevealDone,
}) => {
  const navigate = useNavigate();
  const typeCfg  = SAVE_TYPE_CFG[row.save_type] ?? SAVE_TYPE_CFG.enriched;
  return (
    <tr onClick={onSelect}
      className={cn("border-b border-slate-100 cursor-pointer transition-colors group",
        selected ? "bg-violet-50 border-violet-100" : "hover:bg-slate-50/60")}>
      {/* Candidate */}
      <td className="px-4 py-3 min-w-[185px]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {(row.snapshot_name ?? "?")[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-800 leading-tight truncate max-w-[148px]">{row.snapshot_name ?? "—"}</p>
            {row.snapshot_title && <p className="text-[10px] text-slate-400 truncate max-w-[148px]">{row.snapshot_title}</p>}
          </div>
        </div>
      </td>
      {/* Company */}
      <td className="px-4 py-3 min-w-[130px]">
        {row.snapshot_company
          ? <div className="flex items-center gap-1.5"><Building2 size={10} className="text-slate-400 flex-shrink-0" /><span className="text-[11px] text-slate-600 truncate max-w-[110px]">{row.snapshot_company}</span></div>
          : <span className="text-slate-300 text-[11px]">—</span>}
        {row.snapshot_location && <div className="flex items-center gap-1 mt-0.5"><MapPin size={9} className="text-slate-300 flex-shrink-0" /><span className="text-[10px] text-slate-400 truncate max-w-[110px]">{row.snapshot_location}</span></div>}
      </td>
      {/* Email */}
      <td className="px-4 py-3 min-w-[195px]" onClick={e => e.stopPropagation()}>
        <RevealCell type="email" apolloPersonId={row.apollo_person_id} organizationId={organizationId} userId={userId} savedValue={row.email} onRevealed={(t,v) => onRevealDone(row.id,t,v)} />
      </td>
      {/* Phone */}
      <td className="px-4 py-3 min-w-[175px]" onClick={e => e.stopPropagation()}>
        <RevealCell type="phone" apolloPersonId={row.apollo_person_id} organizationId={organizationId} userId={userId} savedValue={row.phone} onRevealed={(t,v) => onRevealDone(row.id,t,v)} />
      </td>
      {/* Type */}
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
      <td className="px-4 py-3 w-[90px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onInvite(row)} disabled={!row.email && !row.phone} title={row.email||row.phone ? "Invite" : "Reveal contact first"}
            className={cn("p-1.5 rounded-md transition-colors", row.email||row.phone ? "text-violet-500 hover:bg-violet-50" : "text-slate-200 cursor-not-allowed")}>
            <Send size={12} />
          </button>
          <button onClick={() => onAddToFolder(row)} title="Add to folder"
            className="p-1.5 rounded-md text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-colors">
            <FolderPlus size={12} />
          </button>
          <button onClick={() => navigate(`/search/candidates/beta?kw=${encodeURIComponent(row.snapshot_name ?? "")}`)} title="Search similar"
            className="p-1.5 rounded-md text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-colors">
            <ExternalLink size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ tab: SaveTypeFilter; onSearch: () => void }> = ({ tab, onSearch }) => (
  <tr><td colSpan={9}>
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-3">
        <Users size={24} className="text-violet-300" />
      </div>
      <p className="text-[13px] font-semibold text-slate-700 mb-1">
        {tab === "all" ? "No saved candidates yet" : `No ${tab.replace("_"," ")} candidates`}
      </p>
      <p className="text-[11px] text-slate-400 max-w-xs mb-4">
        {tab === "all" ? "Candidates appear here when you reveal contact info, add it manually, shortlist, or send an invite." : "No candidates with this save type yet."}
      </p>
      {tab === "all" && (
        <button onClick={onSearch} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-[12px] font-semibold hover:bg-violet-700 transition-colors">
          Go to Candidate Search
        </button>
      )}
    </div>
  </td></tr>
);

// ─── Main page ────────────────────────────────────────────────────────────────
const SavedCandidatesPage: React.FC = () => {
  const navigate       = useNavigate();
  const [urlParams, setUrlParams] = useSearchParams();
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const userId         = useSelector((s: any) => s.auth.user?.id);
  const queryClient    = useQueryClient();

  // ── Deserialize all state from URL on mount ───────────────────────────────
  const parsed = useMemo(() => deserializeSavedParams(urlParams), []); // eslint-disable-line

  const [tab,      setTabState]    = useState(parsed.tab);
  const [folderId, setFolderState] = useState<string | null>(parsed.folderId);
  const [status,   setStatusState] = useState(parsed.status);
  const [sort,     setSortState]   = useState(parsed.sort);
  const [search,   setSearchState] = useState(parsed.search);
  const [page,     setPageState]   = useState(parsed.page);
  const [showArch, setArchState]   = useState(parsed.showArch);
  const [selected,     setSelected]     = useState<string | null>(null);
  const [panelTarget,  setPanelTarget]  = useState<SavedCandidate | null>(null);
  const [inviteTarget,     setInviteTarget]     = useState<SavedCandidate | null>(null);
  const [addFolderTarget,  setAddFolderTarget]  = useState<SavedCandidate | null>(null);
  const [revealedOverrides, setRevealedOverrides] = useState<Record<string, { email?: string; phone?: string }>>({});
  const isFirstMount = useRef(true);

  // ── Sync state → URL whenever any filter/page changes ────────────────────
  const syncUrl = useCallback((overrides?: Partial<typeof parsed>) => {
    const current = { tab, folderId, status, sort, search, page, showArch, ...overrides };
    setUrlParams(serializeSavedParams(current), { replace: true });
  }, [tab, folderId, status, sort, search, page, showArch, setUrlParams]);

  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    syncUrl();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, folderId, status, sort, search, page, showArch]);

  // ── Setters that also reset page ──────────────────────────────────────────
  const setTab      = (v: SaveTypeFilter)    => { setTabState(v);    setPageState(1); setSelected(null); };
  const setFolder   = (v: string | null)     => { setFolderState(v); setPageState(1); setSelected(null); };
  const setStatus   = (v: StatusFilter)      => { setStatusState(v); setPageState(1); };
  const setSort     = (v: SortOption)        => { setSortState(v);   setPageState(1); };
  const setSearch   = (v: string)            => { setSearchState(v); setPageState(1); };
  const setShowArch = (v: boolean)           => { setArchState(v);   setPageState(1); };

  // ── Folder hooks ──────────────────────────────────────────────────────────
  const { folders, createFolder, deleteFolder, renameFolder } = useFolders(organizationId, userId);
  const { addToFolder } = useAddToFolder();

  // ── Data ──────────────────────────────────────────────────────────────────
  const effectiveStatus: StatusFilter = showArch ? "archived" : status;
  const { candidates, totalCount, isLoading, refetch } = useSavedCandidates({
    organizationId, saveType: tab, status: effectiveStatus,
    folderId: folderId ?? undefined,
    search, sort, page, perPage: PER_PAGE,
  });
  const totalPages = Math.ceil(totalCount / PER_PAGE);

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    candidates.map(c => {
      const ov = revealedOverrides[c.id];
      return ov ? { ...c, email: ov.email ?? c.email, phone: ov.phone ?? c.phone } : c;
    }),
  [candidates, revealedOverrides]);

  const TH: React.FC<{ children: React.ReactNode; cls?: string }> = ({ children, cls }) => (
    <th className={cn("px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider whitespace-nowrap select-none bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent", cls)}>
      {children}
    </th>
  );

  // Active folder name for display
  const activeFolderName = folderId
    ? folders.find(f => f.folderId === folderId)?.folderName
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* TOPBAR */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="px-6 py-3 flex items-center gap-4">
          <button onClick={() => navigate("/search/candidates/beta")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:bg-slate-50 transition-colors">
            <ArrowLeft size={13} /> Back to Search
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <p className="text-[14px] font-bold text-slate-800 leading-tight">
              My Candidates{activeFolderName ? ` · ${activeFolderName}` : ""}
            </p>
            <p className="text-[10px] text-slate-400">{isLoading ? "Loading…" : `${totalCount} candidate${totalCount !== 1 ? "s" : ""}`}</p>
          </div>
          <div className="flex-1" />
          <button onClick={() => refetch()}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-300 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* BODY: sidebar + main */}
      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>

        {/* Folder sidebar */}
        <FolderSidebar
          folders={folders}
          activeFolderId={folderId}
          isLoading={isLoading}
          totalCount={totalCount}
          onSelectFolder={setFolder}
          onCreateFolder={async (name) => { await createFolder(name); return null; }}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-4 space-y-4">

              {/* FILTER TOOLBAR */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 space-y-3">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TABS.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all",
                        tab === key ? "bg-violet-600 text-white border-violet-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600")}>
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button onClick={() => { setShowArch(!showArch); }}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all",
                      showArch ? "bg-slate-600 text-white border-slate-600" : "bg-white text-slate-400 border-slate-200 hover:border-slate-400")}>
                    <Archive size={12} /> Archived
                  </button>
                </div>
                {/* Search + status + sort */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search name, title, company, email…"
                      className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400" />
                  </div>
                  <select value={status} onChange={e => setStatus(e.target.value as StatusFilter)}
                    className="px-3 py-1.5 text-[12px] border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-400">
                    <option value="all">All Status</option>
                    <option value="saved">Saved</option>
                    <option value="contacted">Contacted</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                  <select value={sort} onChange={e => setSort(e.target.value as SortOption)}
                    className="px-3 py-1.5 text-[12px] border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-400">
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name_az">Name A–Z</option>
                  </select>
                  <span className="ml-auto text-[11px] text-slate-400 font-medium whitespace-nowrap">
                    {isLoading ? "…" : `${totalCount} result${totalCount !== 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>

              {/* TABLE */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-violet-100 bg-violet-50/40">
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
                                  <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: j === 0 ? "140px" : j === 2 || j === 3 ? "100px" : "70px" }} />
                                </td>
                              ))}
                            </tr>
                          ))
                        : displayCandidates.length === 0
                        ? <EmptyState tab={tab} onSearch={() => navigate("/search/candidates/beta")} />
                        : displayCandidates.map(c => (
                            <TableRow
                              key={c.id} row={c}
                              organizationId={organizationId} userId={userId}
                              selected={selected === c.id}
                              onSelect={() => {
                                setSelected(p => p === c.id ? null : c.id);
                                setPanelTarget(prev => prev?.id === c.id ? null : c);
                              }}
                              onInvite={setInviteTarget}
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

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">
                    Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, totalCount)} of {totalCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPageState(p => Math.max(1, p-1))} disabled={page <= 1}
                      className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors",
                        page > 1 ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "border-slate-100 text-slate-300 cursor-not-allowed")}>
                      <ChevronLeft size={13} /> Previous
                    </button>
                    <span className="text-[12px] text-slate-500 font-mono px-2">{page} / {totalPages}</span>
                    <button onClick={() => setPageState(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
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

      {/* Invite gate */}
      {inviteTarget && (
        <CandidateInviteGate
          candidateName={inviteTarget.snapshot_name ?? ""}
          candidateEmail={inviteTarget.email  ?? undefined}
          candidatePhone={inviteTarget.phone  ?? undefined}
          apolloPersonId={inviteTarget.apollo_person_id}
          organizationId={organizationId} userId={userId}
          onClose={() => setInviteTarget(null)}
          onInviteSent={() => { setInviteTarget(null); refetch(); }}
        />
      )}

      {/* Candidate detail panel — opens on row click */}
      {panelTarget && (
        <SavedCandidateDetailPanel
          candidate={panelTarget}
          organizationId={organizationId}
          userId={userId}
          onClose={() => { setPanelTarget(null); setSelected(null); }}
          onRevealDone={(id, type, value) => {
            handleRevealDone(id, type, value);
            // Keep panel open — update its data via revealedOverrides
          }}
        />
      )}

      {/* Add to folder picker */}
      {addFolderTarget && (
        <FolderPickerModal
          folders={folders}
          onSelect={async (folderId) => {
            if (addFolderTarget) {
              await addToFolder(folderId, addFolderTarget.id, userId);
            }
            setAddFolderTarget(null);
            refetch();
          }}
          onCreate={async (name) => {
            const id = await createFolder(name);
            if (id && addFolderTarget) {
              await addToFolder(id, addFolderTarget.id, userId);
              setAddFolderTarget(null);
              refetch();
            }
          }}
          onSkip={() => setAddFolderTarget(null)}
          onClose={() => setAddFolderTarget(null)}
          title="Add to Folder"
          showSkip={false}
        />
      )}
    </div>
  );
};

export default SavedCandidatesPage;
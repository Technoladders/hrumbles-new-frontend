// src/components/sales/company-search/AddToCompanyListModal.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  X, Search, FolderOpen, Folder, Building2,
  ChevronDown, Loader2, ListPlus, Save,
  CheckCircle2, Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AddToCompanyListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  /** CRM company IDs — used to pre-check lists they're already in.
   *  Pass [] for cloud/unsaved companies (no pre-check possible). */
  companyIds?: string[];
  onConfirm: (fileIds: string[]) => void | Promise<void>;
  isFromSearch?: boolean;
}

interface WorkspaceRow { id: string; name: string; }
interface FileRow      { id: string; name: string; workspace_id: string; }

// ─────────────────────────────────────────────────────────────────────────────
// Checkbox with indeterminate support
// ─────────────────────────────────────────────────────────────────────────────

const ListCheckbox: React.FC<{
  state: 'checked' | 'partial' | 'none';
  alreadyAdded?: boolean;
  onChange: () => void;
}> = ({ state, alreadyAdded, onChange }) => {
  if (alreadyAdded) {
    return (
      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0" title="Already in this list">
        <CheckCircle2 size={14} className="text-emerald-500" />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0",
        state === 'checked'
          ? "bg-indigo-600 border-indigo-600"
          : state === 'partial'
            ? "bg-indigo-100 border-indigo-400"
            : "border-slate-300 bg-white hover:border-indigo-400",
      )}
    >
      {state === 'checked' && (
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {state === 'partial' && <Minus size={8} className="text-indigo-600" />}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Modal
// ─────────────────────────────────────────────────────────────────────────────

export const AddToCompanyListModal: React.FC<AddToCompanyListModalProps> = ({
  open,
  onOpenChange,
  companyName,
  companyIds = [],
  onConfirm,
  isFromSearch = false,
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [openFolders,  setOpenFolders]  = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBulk       = companyName.includes('companies') || companyName.match(/^\d+/);
  const companyCount = companyIds.length;

  // ── Fetch companies workspaces ─────────────────────────────────────────────
  const { data: workspaces = [], isLoading: wsLoading } = useQuery<WorkspaceRow[]>({
    queryKey: ['modal-workspaces-companies', organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('organization_id', organization_id)
        .eq('type', 'companies')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!organization_id,
  });

  // ── Fetch all companies files ──────────────────────────────────────────────
  const { data: files = [], isLoading: filesLoading } = useQuery<FileRow[]>({
    queryKey: ['modal-files-companies', organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_files')
        .select('id, name, workspace_id')
        .eq('organization_id', organization_id)
        .eq('type', 'companies')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!organization_id,
  });

  // ── Fetch existing memberships ─────────────────────────────────────────────
  const { data: membershipMap = new Map<string, number>() } = useQuery<Map<string, number>>({
    queryKey: ['company-list-memberships', companyIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_workspace_files')
        .select('file_id, company_id')
        .in('company_id', companyIds);
      if (error) throw error;
      const map = new Map<string, number>();
      data?.forEach(row => { map.set(row.file_id, (map.get(row.file_id) ?? 0) + 1); });
      return map;
    },
    enabled: open && companyIds.length > 0,
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getMembershipState = (fileId: string): 'all' | 'some' | 'none' => {
    if (companyCount === 0) return 'none';
    const count = membershipMap.get(fileId) ?? 0;
    if (count === 0) return 'none';
    if (count >= companyCount) return 'all';
    return 'some';
  };

  const toggleFolder = (wsId: string) =>
    setOpenFolders(prev => { const n = new Set(prev); n.has(wsId) ? n.delete(wsId) : n.add(wsId); return n; });

  const toggleFile = (fileId: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(fileId) ? n.delete(fileId) : n.add(fileId); return n; });

  // ── Filtered tree ──────────────────────────────────────────────────────────

  const q = search.toLowerCase().trim();

  const filteredWorkspaces = useMemo(() =>
    workspaces.filter(ws => {
      const wsFiles = files.filter(f => f.workspace_id === ws.id);
      if (q) return wsFiles.some(f => f.name.toLowerCase().includes(q)) || ws.name.toLowerCase().includes(q);
      return wsFiles.length > 0;
    }),
  [workspaces, files, q]);

  const getFilesForWs = (wsId: string) =>
    files.filter(f => f.workspace_id === wsId && (!q || f.name.toLowerCase().includes(q)));

  const foldersToShow = useMemo(() => {
    if (!q) return openFolders;
    const auto = new Set(openFolders);
    filteredWorkspaces.forEach(ws => auto.add(ws.id));
    return auto;
  }, [q, openFolders, filteredWorkspaces]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirm(Array.from(selected));
      handleClose(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (o: boolean) => {
    if (!o) { setSearch(''); setSelected(new Set()); setOpenFolders(new Set()); }
    onOpenChange(o);
  };

  const isLoading = wsLoading || filesLoading;
  const addCount  = selected.size;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={e => { if (e.target === e.currentTarget) handleClose(false); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col overflow-hidden max-h-[85vh]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            {isFromSearch
              ? <Save size={13} className="text-emerald-600" />
              : <ListPlus size={13} className="text-emerald-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800 leading-tight">
              {isFromSearch ? 'Save & Add to List' : 'Add to List'}
            </h2>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              <span className="font-semibold text-slate-600">{companyName}</span>
              {isFromSearch && ' · will be saved to CRM'}
            </p>
          </div>
          <button
            onClick={() => handleClose(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Cloud/Search banner ────────────────────────────────────────── */}
        {isFromSearch && (
          <div className="flex items-center gap-2 mx-4 mt-3 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <p className="text-[10px] text-emerald-700">
              {isBulk
                ? `${companyName} will be saved to CRM and added to the selected lists.`
                : 'This company will be saved to your CRM and added to the selected lists simultaneously.'}
            </p>
          </div>
        )}

        {/* ── Search ─────────────────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search lists…"
              className="w-full pl-7 pr-3 h-8 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* ── Legend ─────────────────────────────────────────────────────── */}
        {companyCount > 0 && membershipMap.size > 0 && (
          <div className="flex items-center gap-3 px-4 pb-1 flex-shrink-0">
            <span className="flex items-center gap-1 text-[9px] text-slate-400">
              <CheckCircle2 size={9} className="text-emerald-500" /> Already added
            </span>
            {isBulk && (
              <span className="flex items-center gap-1 text-[9px] text-slate-400">
                <Minus size={9} className="text-indigo-400" /> Partially added
              </span>
            )}
          </div>
        )}

        {/* ── Tree ───────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-4 pb-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin text-emerald-400" />
            </div>
          ) : filteredWorkspaces.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2">
              <Building2 size={18} className="text-slate-200" />
              <p className="text-xs text-slate-400">
                {q ? 'No lists match your search' : 'No company lists found'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 pt-1">
              {filteredWorkspaces.map(ws => {
                const wsFiles    = getFilesForWs(ws.id);
                const isOpen     = foldersToShow.has(ws.id);
                const wsSelected = wsFiles.length > 0 && wsFiles.every(f => selected.has(f.id));
                const wsPartial  = !wsSelected && wsFiles.some(f => selected.has(f.id));

                const toggleWsFiles = () => {
                  setSelected(prev => {
                    const next = new Set(prev);
                    if (wsSelected) {
                      wsFiles.forEach(f => next.delete(f.id));
                    } else {
                      wsFiles.forEach(f => { if (getMembershipState(f.id) !== 'all') next.add(f.id); });
                    }
                    return next;
                  });
                };

                return (
                  <div key={ws.id} className="rounded-xl border border-slate-100 overflow-hidden">
                    {/* Folder header */}
                    <div
                      className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleFolder(ws.id)}
                    >
                      <ChevronDown size={11} className={cn("text-slate-400 transition-transform flex-shrink-0", !isOpen && "-rotate-90")} />
                      {isOpen
                        ? <FolderOpen size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                        : <Folder     size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                      <span className="flex-1 text-[11px] font-semibold text-slate-700 truncate">{ws.name}</span>
                      <span className="text-[9px] font-bold bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {wsFiles.length}
                      </span>
                      <div onClick={e => { e.stopPropagation(); toggleWsFiles(); }}>
                        <ListCheckbox
                          state={wsSelected ? 'checked' : wsPartial ? 'partial' : 'none'}
                          onChange={toggleWsFiles}
                        />
                      </div>
                    </div>

                    {/* Files */}
                    {isOpen && (
                      <div className="divide-y divide-slate-50">
                        {wsFiles.map(file => {
                          const mState    = getMembershipState(file.id);
                          const isAlready = mState === 'all';
                          const isSome    = mState === 'some';
                          const isChecked = selected.has(file.id);

                          return (
                            <div
                              key={file.id}
                              onClick={() => { if (!isAlready) toggleFile(file.id); }}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2.5 transition-colors",
                                isAlready ? "opacity-60 cursor-default" : "cursor-pointer hover:bg-emerald-50/60",
                              )}
                            >
                              <Building2 size={11} className="text-emerald-400 flex-shrink-0" />
                              <span className={cn(
                                "flex-1 text-[11px] font-medium truncate",
                                isAlready ? "text-slate-400" : "text-slate-700",
                              )}>
                                {file.name}
                              </span>
                              {isSome && !isAlready && (
                                <span className="text-[9px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                  partial
                                </span>
                              )}
                              <ListCheckbox
                                state={isChecked ? 'checked' : isSome ? 'partial' : 'none'}
                                alreadyAdded={isAlready}
                                onChange={() => { if (!isAlready) toggleFile(file.id); }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 flex-shrink-0 bg-slate-50">
          <button
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
            className="flex-1 h-8 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={addCount === 0 || isSubmitting}
            className="flex-[2] h-8 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <><Loader2 size={11} className="animate-spin" /> Adding…</>
            ) : addCount > 0 ? (
              <><ListPlus size={11} /> Add to {addCount} list{addCount !== 1 ? 's' : ''}</>
            ) : (
              'Select a list'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
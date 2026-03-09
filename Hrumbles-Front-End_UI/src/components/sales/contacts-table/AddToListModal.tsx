// src/components/sales/contacts-table/AddToListModal.tsx
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import {
  UserPlus, ListPlus, Loader2, Search, Check, ChevronRight,
  Users, FolderOpen, X, Clock, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AddToListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (fileId: string) => void;
  personName: string;
  isFromDiscovery?: boolean;
}

// ── Member row in the preview panel ──────────────────────────────────────────
const MemberRow = ({ member }: { member: any }) => {
  const ago = member.added_at
    ? formatDistanceToNow(new Date(member.added_at), { addSuffix: true })
    : null;
  const initials = member.contact_name
    ? member.contact_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const adderName = member.added_by_name || 'Unknown';

  return (
    <div className="flex items-center gap-2.5 py-2 px-3 hover:bg-slate-50 rounded-lg transition-colors">
      <Avatar className="h-6 w-6 rounded-lg flex-shrink-0 border border-slate-100">
        <AvatarImage src={member.photo_url} />
        <AvatarFallback className="text-[9px] font-bold bg-slate-100 text-slate-600 rounded-lg">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate">{member.contact_name || '—'}</p>
        <p className="text-[10px] text-slate-400 truncate">{member.job_title || member.company_name || ''}</p>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Avatar className="h-4.5 w-4.5 rounded-full border border-slate-200" style={{ height: '18px', width: '18px' }}>
                <AvatarImage src={member.added_by_photo} />
                <AvatarFallback className="text-[7px] bg-indigo-100 text-indigo-700 font-bold">
                  {adderName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {ago && <span className="text-[9px] text-slate-400">{ago}</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Added by {adderName}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// ── Main Modal ────────────────────────────────────────────────────────────────
export const AddToListModal = ({
  open,
  onOpenChange,
  onConfirm,
  personName,
  isFromDiscovery = false,
}: AddToListModalProps) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // State
  const [selectedWsId,   setSelectedWsId]   = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [searchQ,        setSearchQ]        = useState('');
  const [creatorQ,       setCreatorQ]       = useState('');
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [previewFileId,  setPreviewFileId]  = useState<string | null>(null);

  // ── Fetch all 'people'-type lists (with workspace + creator info) ─────────
  const { data: allLists = [], isLoading: loadingLists } = useQuery({
    queryKey: ['people-lists-for-modal', organization_id],
    queryFn: async () => {
      // Join workspace_files → workspaces → hr_employees (creator)
      const { data, error } = await supabase
        .from('workspace_files')
        .select(`
          id, name, created_at, created_by,
          workspace:workspaces!fk_workspace(id, name),
          creator:hr_employees!fk_created_by(id, first_name, last_name, profile_picture_url)
        `)
        .eq('organization_id', organization_id)
        .eq('type', 'people')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!organization_id,
    staleTime: 30_000,
  });

  // ── Fetch member count per file (for badge) ───────────────────────────────
  const fileIds = useMemo(() => allLists.map((l: any) => l.id), [allLists]);
  const { data: memberCounts = {} } = useQuery({
    queryKey: ['member-counts', fileIds],
    queryFn: async () => {
      if (!fileIds.length) return {};
      const { data, error } = await supabase
        .from('contact_workspace_files')
        .select('file_id')
        .in('file_id', fileIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.file_id] = (counts[r.file_id] || 0) + 1;
      });
      return counts;
    },
    enabled: fileIds.length > 0,
    staleTime: 30_000,
  });

  // ── Fetch members of the previewed list ──────────────────────────────────
  const { data: previewMembers = [], isLoading: loadingPreview } = useQuery({
    queryKey: ['list-members-preview', previewFileId],
    queryFn: async () => {
      if (!previewFileId) return [];
      const { data, error } = await supabase
        .from('contact_workspace_files')
        .select(`
          id, added_at, added_by,
          contact:contacts!contact_workspace_files_contact_id_fkey(
            id, name, job_title, photo_url, company_name
          )
        `)
        .eq('file_id', previewFileId)
        .order('added_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      // Also fetch adder info via auth.users → hr_employees
      const adderIds = [...new Set((data || []).map((r: any) => r.added_by).filter(Boolean))];
      let adderMap: Record<string, any> = {};
      if (adderIds.length) {
        const { data: empData } = await supabase
          .from('hr_employees')
          .select('user_id, first_name, last_name, profile_picture_url')
          .in('user_id', adderIds);
        (empData || []).forEach((e: any) => {
          adderMap[e.user_id] = e;
        });
      }

      return (data || []).map((r: any) => ({
        id: r.id,
        added_at: r.added_at,
        contact_name:   r.contact?.name       || null,
        job_title:      r.contact?.job_title  || null,
        company_name:   r.contact?.company_name || null,
        photo_url:      r.contact?.photo_url  || null,
        added_by_name:  r.added_by ? `${adderMap[r.added_by]?.first_name || ''} ${adderMap[r.added_by]?.last_name || ''}`.trim() : 'Unknown',
        added_by_photo: adderMap[r.added_by]?.profile_picture_url || null,
      }));
    },
    enabled: !!previewFileId,
  });

  // ── Filter lists by name + creator ───────────────────────────────────────
  const filteredLists = useMemo(() => {
    let out = allLists as any[];
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      out = out.filter((l: any) => l.name?.toLowerCase().includes(q));
    }
    if (creatorQ.trim()) {
      const q = creatorQ.toLowerCase();
      out = out.filter((l: any) => {
        const creator = l.creator;
        if (!creator) return false;
        const full = `${creator.first_name || ''} ${creator.last_name || ''}`.toLowerCase();
        return full.includes(q);
      });
    }
    return out;
  }, [allLists, searchQ, creatorQ]);

  // Group filtered lists by workspace
  const grouped = useMemo(() => {
    const map: Record<string, { ws: any; files: any[] }> = {};
    filteredLists.forEach((l: any) => {
      const wsId = l.workspace?.id;
      if (!wsId) return;
      if (!map[wsId]) map[wsId] = { ws: l.workspace, files: [] };
      map[wsId].files.push(l);
    });
    return Object.values(map);
  }, [filteredLists]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedFileId) return;
    setIsSubmitting(true);
    try { await onConfirm(selectedFileId); }
    finally {
      setIsSubmitting(false);
      handleClose(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedWsId(null); setSelectedFileId(null);
      setSearchQ(''); setCreatorQ('');
      setPreviewFileId(null);
    }
    onOpenChange(v);
  };

  const selectedList = allLists.find((l: any) => l.id === selectedFileId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl max-h-[85vh] flex flex-col">

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 bg-gradient-to-br from-indigo-700 to-violet-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              {isFromDiscovery ? <UserPlus size={18} className="text-white" /> : <ListPlus size={18} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">
                {isFromDiscovery ? 'Save & Add to List' : 'Add to List'}
              </p>
              <p className="text-[11px] text-white/70 truncate mt-0.5">
                {isFromDiscovery
                  ? `Save "${personName}" to CRM and add to a people list`
                  : `Adding "${personName}" to a people list`
                }
              </p>
            </div>
            <button onClick={() => handleClose(false)} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Discovery notice */}
          {isFromDiscovery && (
            <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <Badge className="bg-white/20 text-white text-[9px] border-0 h-4 px-1.5">NEW</Badge>
              <span className="text-[11px] text-white/80">Contact will be saved to CRM and added to the list simultaneously</span>
            </div>
          )}
        </div>

        {/* ── Body: split list picker | member preview ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* LEFT: List picker */}
          <div className={cn(
            'flex flex-col border-r border-slate-100 transition-all duration-200',
            previewFileId ? 'w-[280px] flex-shrink-0' : 'flex-1',
          )}>
            {/* Search bar */}
            <div className="px-3 py-3 border-b border-slate-100 space-y-2 flex-shrink-0">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search lists…"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="pl-7 h-8 text-xs border-slate-200 bg-slate-50 focus:bg-white rounded-lg"
                />
              </div>
              <div className="relative">
                <Users size={12} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Filter by creator…"
                  value={creatorQ}
                  onChange={e => setCreatorQ(e.target.value)}
                  className="pl-7 h-8 text-xs border-slate-200 bg-slate-50 focus:bg-white rounded-lg"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loadingLists ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs">Loading lists…</span>
                </div>
              ) : grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                    <ListPlus size={16} className="text-slate-400" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mb-1">No people lists found</p>
                  <p className="text-[11px] text-slate-400">
                    {searchQ || creatorQ ? 'Try adjusting your filters' : 'Create a people list first'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-3">
                  {grouped.map(({ ws, files }) => (
                    <div key={ws.id}>
                      {/* Workspace label */}
                      <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5">
                        <FolderOpen size={11} className="text-slate-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{ws.name}</span>
                      </div>
                      {/* Files */}
                      {files.map((file: any) => {
                        const isSelected  = selectedFileId === file.id;
                        const isPreviewed = previewFileId  === file.id;
                        const count = memberCounts[file.id] || 0;
                        const creatorFull = file.creator
                          ? `${file.creator.first_name || ''} ${file.creator.last_name || ''}`.trim()
                          : null;

                        return (
                          <div
                            key={file.id}
                            onClick={() => {
                              setSelectedFileId(file.id);
                              setSelectedWsId(ws.id);
                            }}
                            className={cn(
                              'flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all',
                              isSelected
                                ? 'bg-indigo-50 border border-indigo-200'
                                : 'hover:bg-slate-50 border border-transparent',
                            )}
                          >
                            {/* Check */}
                            <span className={cn(
                              'h-4 w-4 rounded flex items-center justify-center flex-shrink-0 transition-colors',
                              isSelected ? 'bg-indigo-600' : 'bg-slate-200',
                            )}>
                              {isSelected && <Check size={9} className="text-white" strokeWidth={3} />}
                            </span>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  'text-xs font-semibold truncate',
                                  isSelected ? 'text-indigo-900' : 'text-slate-800',
                                )}>
                                  {file.name}
                                </span>
                                {count > 0 && (
                                  <span className="text-[9px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 font-semibold flex-shrink-0">
                                    {count}
                                  </span>
                                )}
                              </div>
                              {creatorFull && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Avatar className="flex-shrink-0" style={{ height: '14px', width: '14px' }}>
                                    <AvatarImage src={file.creator?.profile_picture_url} />
                                    <AvatarFallback className="text-[7px] bg-indigo-100 text-indigo-700 font-bold">
                                      {creatorFull[0]?.toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-[10px] text-slate-400 truncate">{creatorFull}</span>
                                </div>
                              )}
                            </div>

                            {/* Preview toggle */}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setPreviewFileId(isPreviewed ? null : file.id);
                              }}
                              className={cn(
                                'p-1 rounded-lg transition-all flex-shrink-0',
                                isPreviewed
                                  ? 'bg-indigo-100 text-indigo-600'
                                  : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100',
                              )}
                              title={isPreviewed ? 'Close preview' : 'Preview members'}
                            >
                              <ChevronRight
                                size={12}
                                className={cn('transition-transform', isPreviewed && 'rotate-180')}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Member preview panel */}
          {previewFileId && (() => {
            const previewList = allLists.find((l: any) => l.id === previewFileId);
            return (
              <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
                {/* Preview header */}
                <div className="px-4 py-3 border-b border-slate-100 bg-white flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setPreviewFileId(null)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                  >
                    <ArrowLeft size={13} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{previewList?.name}</p>
                    <p className="text-[10px] text-slate-400">{previewMembers.length} member{previewMembers.length !== 1 ? 's' : ''} shown</p>
                  </div>
                </div>

                {/* Member list */}
                <div className="flex-1 overflow-y-auto p-2">
                  {loadingPreview ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                      <Loader2 size={13} className="animate-spin" />
                      <span className="text-xs">Loading members…</span>
                    </div>
                  ) : previewMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                      <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
                        <Users size={14} className="text-slate-400" />
                      </div>
                      <p className="text-xs font-semibold text-slate-500">No members yet</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Be the first to add someone</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {previewMembers.map((m: any) => (
                        <MemberRow key={m.id} member={m} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex items-center justify-between flex-shrink-0">
          {/* Selected list pill */}
          <div className="flex-1 min-w-0 mr-4">
            {selectedList ? (
              <div className="flex items-center gap-1.5">
                <Check size={11} className="text-emerald-500 flex-shrink-0" />
                <span className="text-[11px] text-slate-600 truncate">
                  <span className="font-semibold text-slate-800">{selectedList.name}</span>
                  {selectedList.workspace && (
                    <span className="text-slate-400"> · {selectedList.workspace.name}</span>
                  )}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">No list selected</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
              className="h-9 text-xs rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!selectedFileId || isSubmitting}
              className="h-9 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm min-w-[110px]"
            >
              {isSubmitting ? (
                <><Loader2 size={12} className="animate-spin mr-1.5" /> Saving…</>
              ) : isFromDiscovery ? (
                <><UserPlus size={12} className="mr-1.5" /> Save & Add</>
              ) : (
                <><ListPlus size={12} className="mr-1.5" /> Add to List</>
              )}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};
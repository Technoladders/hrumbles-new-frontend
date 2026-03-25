// src/components/sales/contacts-kanban/KanbanView.tsx
// Standalone board view — does NOT import or modify any existing table code.

import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, RefreshCw, Layers, Database, LayoutGrid,
  Search, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  useKanbanContacts,
  type KanbanBoardType,
  type KanbanContact,
} from '@/hooks/sales/useKanbanContacts';
import { KanbanColumn } from './KanbanColumn';
import type { DragItem } from './KanbanCard';
import { AddToListModal } from '@/components/sales/contacts-table/AddToListModal';

// ── Props ─────────────────────────────────────────────────────────────────────

interface KanbanViewProps {
  fileId?: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const KanbanView: React.FC<KanbanViewProps> = ({ fileId }) => {
  const { toast }       = useToast();
  const queryClient     = useQueryClient();
  const user            = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // Board type: 'stage' | 'list'
  // File-mode always uses stage board (only one list = current file)
  const [boardType, setBoardType] = useState<KanbanBoardType>('stage');

  // Force stage board when in file-mode
  useEffect(() => { if (fileId) setBoardType('stage'); }, [fileId]);

  // AddToList modal state — own instance, not shared with table
  const [listModalOpen,      setListModalOpen]      = useState(false);
  const [selectedForList,    setSelectedForList]    = useState<KanbanContact | null>(null);

  // ── Data ────────────────────────────────────────────────────────────────────
  const {
    columns,
    isLoading,
    isFetching,
    refetch,
    loadMore,
    loadingMore,
    moveCard,
    moveToList,
  } = useKanbanContacts({ fileId, boardType });

  // ── Enrich contact ───────────────────────────────────────────────────────────
  const handleEnrich = useCallback(async (
    contactId: string,
    apolloId:  string | null,
    type:      'email' | 'phone',
  ) => {
    toast({ title: 'Verifying…', description: `Checking ${type}` });
    try {
      const { data, error } = await supabase.functions.invoke('enrich-contact', {
        body: {
          contactId,
          apolloPersonId:  apolloId,
          revealType:      type,
          organizationId:  organization_id,
          userId:          user?.id,
        },
      });
      if (error) throw error;
      if (data?.error === 'insufficient_credits') {
        toast({ variant: 'destructive', title: 'Insufficient Credits', description: data.message });
        return;
      }
      const credit = data?.credits?.deducted
        ? ` (${data.credits.deducted} credit${data.credits.deducted > 1 ? 's' : ''})`
        : '';
      toast({ title: 'Enriched!', description: (data?.message ?? 'Done') + credit });
      // Invalidate both board caches
      queryClient.invalidateQueries({ queryKey: ['kanban-stage'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-list-contacts'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Enrich failed', description: err.message });
    }
  }, [organization_id, user?.id, toast, queryClient]);

  // ── Add to list ──────────────────────────────────────────────────────────────
  const handleOpenAddToList = useCallback((contact: KanbanContact) => {
    setSelectedForList(contact);
    setListModalOpen(true);
  }, []);

  const handleListConfirm = useCallback(async (targetFileIds: string[]) => {
    if (!selectedForList || !targetFileIds.length) return;
    let added = 0, already = 0;
    for (const fid of targetFileIds) {
      const { error } = await supabase
        .from('contact_workspace_files')
        .insert({ contact_id: selectedForList.id, file_id: fid, added_by: user?.id });
      if (!error) { added++; }
      else if (error.code === '23505') { already++; }
    }
    if (added > 0 && already > 0) {
      toast({ title: `${added} added · ${already} already in list` });
    } else if (added > 0) {
      toast({ title: `Added to ${added} list${added > 1 ? 's' : ''}` });
    } else {
      toast({ title: 'Already in list' });
    }
    queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] });
    setListModalOpen(false);
    setSelectedForList(null);
  }, [selectedForList, user?.id, toast, queryClient]);

  // ── Drag and drop handler ────────────────────────────────────────────────────
  const handleDrop = useCallback((item: DragItem, targetKey: string) => {
    if (boardType === 'stage') {
      moveCard?.(item.contactId, item.sourceKey, targetKey, item.contact);
    } else {
      moveToList?.(item.contactId, item.sourceKey, targetKey, item.contact);
    }
  }, [boardType, moveCard, moveToList]);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
        <p className="text-xs font-medium text-slate-500">Loading board…</p>
      </div>
    );
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalContacts    = columns.reduce((s, c) => s + c.total, 0);
  const nonEmptyColumns  = columns.filter(c => c.total > 0).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/40">

      {/* ── Board sub-header ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white shadow-sm">

        {/* Stats */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{totalContacts.toLocaleString()}</span>
            {' '}contacts in{' '}
            <span className="font-semibold text-slate-700">{nonEmptyColumns}</span>
            {' '}column{nonEmptyColumns !== 1 ? 's' : ''}
          </span>
          {isFetching && (
            <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Board type toggle — hidden in file-mode (only one list) */}
          {!fileId && (
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 gap-0.5">
              <button
                onClick={() => setBoardType('stage')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all',
                  boardType === 'stage'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Layers size={10} /> Stages
              </button>
              <button
                onClick={() => setBoardType('list')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all',
                  boardType === 'list'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Database size={10} /> Lists
              </button>
            </div>
          )}

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-xl"
            onClick={() => refetch()}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* ── Board body: horizontal scroll columns ────────────────────────── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div
          className="flex gap-3 p-4 h-full items-start"
          style={{ minWidth: 'max-content' }}
        >
          {columns.length === 0 ? (
            /* Empty board */
            <div className="flex flex-col items-center justify-center w-full min-w-[400px] py-20 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                {boardType === 'list'
                  ? <Database className="h-6 w-6 text-slate-400" />
                  : <LayoutGrid className="h-6 w-6 text-slate-400" />
                }
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">
                {boardType === 'list' ? 'No lists found' : 'No contacts in board'}
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                {boardType === 'list'
                  ? 'Create workspace lists to use the list board.'
                  : 'Try adjusting your filters or switch to List view.'}
              </p>
            </div>
          ) : (
            columns.map(column => (
              <KanbanColumn
                key={column.key}
                column={column}
                boardType={boardType}
                isLoadingMore={loadingMore?.[column.key] ?? false}
                onDrop={handleDrop}
                onLoadMore={loadMore}
                onEnrich={handleEnrich}
                onAddToList={handleOpenAddToList}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Add-to-list modal ────────────────────────────────────────────── */}
      {selectedForList && (
        <AddToListModal
          open={listModalOpen}
          onOpenChange={open => {
            setListModalOpen(open);
            if (!open) setSelectedForList(null);
          }}
          personName={selectedForList.name}
          contactIds={[selectedForList.id]}
          onConfirm={handleListConfirm}
          isFromDiscovery={false}
        />
      )}
    </div>
  );
};
// src/components/sales/contacts-kanban/KanbanColumn.tsx
import React from 'react';
import { useDrop } from 'react-dnd';
import { Loader2, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanCard, DRAG_TYPE, type DragItem } from './KanbanCard';
import type { KanbanColumnData, KanbanContact, KanbanBoardType } from '@/hooks/sales/useKanbanContacts';

// ── Skeleton card ─────────────────────────────────────────────────────────────

const CardSkeleton = () => (
  <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 animate-pulse">
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-slate-100 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 bg-slate-100 rounded w-3/4" />
        <div className="h-2 bg-slate-100 rounded w-1/2" />
      </div>
    </div>
    <div className="h-2 bg-slate-100 rounded w-2/3" />
    <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-5 w-5 rounded-md bg-slate-100" />
      ))}
    </div>
  </div>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  column:            KanbanColumnData;
  boardType:         KanbanBoardType;
  isInitialLoading?: boolean;
  isLoadingMore?:    boolean;
  onDrop:            (item: DragItem, targetKey: string) => void;
  onLoadMore:        (key: string) => void;
  onEnrich?:         (contactId: string, apolloId: string | null, type: 'email' | 'phone') => void;
  onAddToList?:      (contact: KanbanContact) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column, boardType, isInitialLoading, isLoadingMore,
  onDrop, onLoadMore, onEnrich, onAddToList,
}) => {

  // ── Drop target: the ENTIRE column is the drop zone ──────────────────────
  const [{ isOver, canDrop }, dropRef] = useDrop<
    DragItem, void, { isOver: boolean; canDrop: boolean }
  >({
    accept:  DRAG_TYPE,
    canDrop: item => item.sourceKey !== column.key,
    drop:    (item, monitor) => {
      // Only handle if not already handled by a child
      if (!monitor.didDrop()) {
        onDrop(item, column.key);
      }
    },
    collect: monitor => ({
      isOver:  monitor.isOver({ shallow: false }),
      canDrop: monitor.canDrop(),
    }),
  });

  const isActive    = isOver && canDrop;
  const isCandidate = canDrop && !isOver;
  const accentColor = column.color ?? '#6366f1';

  return (
    <div
      ref={dropRef}
      className={cn(
        'flex flex-col flex-shrink-0 w-[272px] rounded-2xl border-2 transition-all duration-150',
        // Active drop target: strong indigo outline
        isActive    && 'border-indigo-400 shadow-xl shadow-indigo-100/60 scale-[1.01]',
        // Candidate (dragging something that could go here): subtle dashed
        isCandidate && 'border-dashed border-slate-300',
        // Idle
        !isActive && !isCandidate && 'border-transparent',
        'bg-slate-50/70',
      )}
    >
      {/* ── Column header ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center justify-between px-3.5 py-3 rounded-t-2xl border-b transition-colors duration-150',
          isActive ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100',
        )}
        style={{ borderTop: `3px solid ${accentColor}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-[11.5px] font-bold text-slate-800 truncate">
            {column.label}
          </span>
        </div>

        <span className={cn(
          'flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors',
          isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600',
        )}>
          {column.total.toLocaleString()}
        </span>
      </div>

      {/* ── Active drop indicator strip ───────────────────────────────── */}
      {isActive && (
        <div className="mx-2.5 mt-2 flex items-center justify-center h-10 border-2 border-dashed border-indigo-300 rounded-xl bg-indigo-50/80">
          <span className="text-[10px] font-bold text-indigo-500 tracking-wide uppercase">
            Drop here
          </span>
        </div>
      )}

      {/* ── Cards area ───────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-[120px] rounded-b-2xl"
        style={{ maxHeight: 'calc(100vh - 240px)' }}
      >
        {/* Loading skeletons */}
        {isInitialLoading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state — only show when not dragging over */}
        {!isInitialLoading && column.contacts.length === 0 && !isActive && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
              <Plus className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">No contacts</p>
            <p className="text-[9px] text-slate-300 mt-0.5">Drag a card here</p>
          </div>
        )}

        {/* Contact cards */}
        {!isInitialLoading && column.contacts.map(contact => (
          <KanbanCard
            key={contact.id}
            contact={contact}
            sourceKey={column.key}
            stageColor={accentColor}
            boardType={boardType}
            showStageBadge={boardType === 'list'}
            onEnrich={onEnrich}
            onAddToList={onAddToList}
          />
        ))}

        {/* Load more */}
        {column.hasMore && !isInitialLoading && (
          <button
            onClick={() => onLoadMore(column.key)}
            disabled={isLoadingMore}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold',
              'text-slate-500 hover:text-indigo-600',
              'rounded-xl border border-dashed border-slate-200 hover:border-indigo-200',
              'hover:bg-indigo-50 transition-all mt-1',
              isLoadingMore && 'opacity-70 cursor-not-allowed',
            )}
          >
            {isLoadingMore
              ? <><Loader2 size={10} className="animate-spin" /> Loading…</>
              : <><ChevronDown size={10} /> Load more ({column.total - column.contacts.length} remaining)</>
            }
          </button>
        )}
      </div>
    </div>
  );
};
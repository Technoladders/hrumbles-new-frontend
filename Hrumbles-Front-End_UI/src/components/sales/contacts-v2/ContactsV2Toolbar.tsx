// src/components/sales/contacts-v2/ContactsV2Toolbar.tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPage, setPerPage, clearSelection } from '@/Redux/contactsV2Slice';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ListPlus, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecentSearchesBadges } from './RecentSearchesBadges';

interface ContactsV2ToolbarProps {
  count: number;
  isFetching?: boolean;
  onBulkAddToList?: () => void;
}

const PAGE_SIZES = [25, 50, 100, 200];

export function ContactsV2Toolbar({ count, isFetching, onBulkAddToList }: ContactsV2ToolbarProps) {
  const dispatch = useDispatch();
  const { currentPage, perPage, selectedIds, appliedFilters } = useSelector((state: any) => state.contactsV2);

  const totalPages = Math.max(1, Math.ceil(count / perPage));
  const from = count === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, count);
  const hasSelected = selectedIds.length > 0;

  return (
    <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/80 px-4 py-2 space-y-2">
      {/* Row 1: count + bulk actions + pagination */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: count + bulk actions */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-200 tabular-nums">
              {count.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">
              {count === 1 ? 'contact' : 'contacts'}
            </span>
            {isFetching && (
              <div className="h-3 w-3 rounded-full border border-violet-500/40 border-t-violet-500 animate-spin" />
            )}
          </div>

          {/* Bulk actions */}
          {hasSelected && (
            <div className="flex items-center gap-1 pl-3 border-l border-slate-700">
              <span className="text-[10px] text-violet-400 font-semibold">{selectedIds.length} selected</span>
              <button
                onClick={onBulkAddToList}
                className="flex items-center gap-1 px-2 h-6 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors text-[10px] font-medium"
              >
                <ListPlus size={10} /> Add to List
              </button>
              <button
                onClick={() => dispatch(clearSelection())}
                className="flex items-center gap-1 px-2 h-6 rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-300 transition-colors text-[10px]"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Right: rows per page + pagination */}
        <div className="flex items-center gap-3">
          {/* Rows per page */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500">Rows</span>
            <select
              value={perPage}
              onChange={e => dispatch(setPerPage(Number(e.target.value)))}
              className="h-7 px-1.5 text-xs bg-slate-800 border border-slate-700 rounded-md text-slate-300 focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              {PAGE_SIZES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Page info */}
          {count > 0 && (
            <span className="text-[11px] text-slate-500 tabular-nums">
              {from}–{to} of {count.toLocaleString()}
            </span>
          )}

          {/* Nav buttons */}
          <div className="flex items-center gap-0.5">
            {[
              { icon: ChevronsLeft, action: () => dispatch(setPage(1)), disabled: currentPage <= 1, label: 'First' },
              { icon: ChevronLeft, action: () => dispatch(setPage(currentPage - 1)), disabled: currentPage <= 1, label: 'Prev' },
              { icon: ChevronRight, action: () => dispatch(setPage(currentPage + 1)), disabled: currentPage >= totalPages, label: 'Next' },
              { icon: ChevronsRight, action: () => dispatch(setPage(totalPages)), disabled: currentPage >= totalPages, label: 'Last' },
            ].map(({ icon: Icon, action, disabled, label }) => (
              <button
                key={label}
                onClick={action}
                disabled={disabled}
                className={cn(
                  'h-7 w-7 flex items-center justify-center rounded-md transition-colors',
                  disabled
                    ? 'text-slate-700 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
              >
                <Icon size={13} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Recent searches (only when we have them) */}
      {appliedFilters !== null && <RecentSearchesBadges />}
    </div>
  );
}
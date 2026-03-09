// src/components/ui/data-table-pagination.tsx
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { type Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount   = table.getPageCount();
  const totalRows   = table.getRowCount?.() ?? 0;
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="flex items-center justify-between px-1">
      {/* Left: selection info */}
      <div className="text-xs text-slate-500 min-w-[120px]">
        {selectedCount > 0 ? (
          <span><span className="font-semibold text-slate-700">{selectedCount}</span> selected</span>
        ) : (
          <span><span className="font-semibold text-slate-700">{totalRows.toLocaleString()}</span> records</span>
        )}
      </div>

      {/* Center: page nav */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <div className="flex items-center gap-1.5 px-2">
          <span className="text-xs text-slate-500">Page</span>
          <span className="text-xs font-semibold text-slate-700">{pageIndex + 1}</span>
          <span className="text-xs text-slate-400">of</span>
          <span className="text-xs font-semibold text-slate-700">{Math.max(pageCount, 1)}</span>
        </div>

        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Right: rows per page */}
      <div className="flex items-center gap-2 min-w-[120px] justify-end">
        <span className="text-xs text-slate-500 hidden sm:block">Rows</span>
        <Select
          value={`${pageSize}`}
          onValueChange={v => table.setPageSize(Number(v))}
        >
          <SelectTrigger className="h-7 w-[64px] text-xs border-slate-200 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top" align="end">
            {[10, 25, 50, 100].map(n => (
              <SelectItem key={n} value={`${n}`} className="text-xs">{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
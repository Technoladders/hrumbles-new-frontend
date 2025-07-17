// src/components/ui/data-table.tsx
import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  ColumnOrderState,
  GroupingState,
  ColumnSizingState,
  ExpandedState,
  useReactTable
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTablePagination } from './data-table-pagination';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowUpdate: (rowIndex: number, columnId: string, value: unknown) => void;
  renderToolbar?: (table: ReturnType<typeof useReactTable<TData>>) => React.ReactNode;
  columnOrder: ColumnOrderState;
  setColumnOrder: (updater: React.SetStateAction<ColumnOrderState>) => void;
  grouping: GroupingState;
  setGrouping: React.Dispatch<React.SetStateAction<GroupingState>>;
  columnSizing: ColumnSizingState;
  setColumnSizing: (updater: React.SetStateAction<ColumnSizingState>) => void;
  columnVisibility: VisibilityState;
  setColumnVisibility: React.Dispatch<React.SetStateAction<VisibilityState>>;
  meta?: any;
   table: ReturnType<typeof useReactTable<TData>>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowUpdate,
  renderToolbar,
  columnOrder,
  setColumnOrder,
  grouping,
  setGrouping,
  columnSizing,
  setColumnSizing,
  columnVisibility,
  setColumnVisibility,
  meta,
  table
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [expanded, setExpanded] = React.useState<ExpandedState>({});


 return (
    <Table>
      <TableHeader className="bg-gray-50/95 sticky top-0 z-10 backdrop-blur-sm">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                colSpan={header.colSpan}
                style={{ width: header.getSize() }}
                className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <div className="flex items-center gap-1">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
                <div
                  onMouseDown={header.getResizeHandler()}
                  onTouchStart={header.getResizeHandler()}
                  className={cn(
                    "absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none touch-none",
                    header.column.getIsResizing() ? "bg-blue-500" : "hover:bg-blue-300"
                  )}
                />
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className="bg-white divide-y divide-gray-200">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && 'selected'}
              className={cn("hover:bg-gray-50 transition", row.getCanExpand() && "bg-slate-50 hover:bg-slate-100")}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  style={{ width: cell.column.getSize() }}
                  className="px-3 py-1 whitespace-nowrap text-sm text-gray-900 h-10"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}





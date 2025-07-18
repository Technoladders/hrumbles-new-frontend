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
  useReactTable,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  table: ReturnType<typeof useReactTable<TData>>;
}

export function DataTable<TData, TValue>({
  table,
}: DataTableProps<TData, TValue>) {
  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full">
        <TableHeader className="bg-gray-50/95 sticky top-0 z-10 backdrop-blur-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  style={{ width: header.getSize() }}
                  className="relative px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider"
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
                    style={{ width: cell.column.getSize(), maxWidth: cell.column.columnDef.maxSize }}
                    className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-900"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center text-[11px] text-gray-500">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
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
    <div className="absolute inset-0 overflow-auto">
      <Table className="min-w-full table-fixed">
         <TableHeader className="bg-purple-600 sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                // Determine if the column is 'select' or 'name' for sticky positioning
                const isSticky = header.column.id === 'select' || header.column.id === 'name';
                const stickyStyle = {
                  position: isSticky ? 'sticky' : 'relative',
                  left: header.column.id === 'select' ? 0 : header.column.id === 'name' ? 40 : undefined, // 40px is the width of the select column
                  zIndex: isSticky ? 20 : 10, // Higher z-index for sticky columns
                   backgroundColor: isSticky ? '#5e39e5ff' : undefined, // Match TableHeader bg
                };

                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ width: header.getSize(), ...stickyStyle }}
                    className={cn(
                      "px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider",
                      isSticky && "border-r border-gray-200" // Add right border for visual separation
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={cn(
                        "absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none touch-none",
                        header.column.getIsResizing() ? "bg-blue-500" : "hover:bg-blue-300",
                        isSticky && "z-20" // Ensure resizer is above other content
                      )}
                    />
                  </TableHead>
                );
              })}
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
                {row.getVisibleCells().map((cell) => {
                  // Apply sticky positioning to cells in 'select' and 'name' columns
                  const isSticky = cell.column.id === 'select' || cell.column.id === 'name';
                  const stickyStyle = {
                    position: isSticky ? 'sticky' : 'relative',
                    left: cell.column.id === 'select' ? 0 : cell.column.id === 'name' ? 40 : undefined, // Match header offsets
                    zIndex: isSticky ? 20 : 10,
                    backgroundColor: isSticky ? '#ffffff' : undefined, // Match TableBody bg
                  };

                  return (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize(), ...stickyStyle }}
                      className={cn(
                        "px-2 py-2 whitespace-nowrap text-[11px] text-gray-900",
                      
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
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
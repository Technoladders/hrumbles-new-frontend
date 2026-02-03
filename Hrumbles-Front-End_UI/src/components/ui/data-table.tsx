// src/components/ui/data-table.tsx
import * as React from 'react';
import { flexRender, useReactTable } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/sales/contacts-table/EmptyState';
import { cn } from '@/lib/utils';

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  }),
  exit: { opacity: 0, x: -15, transition: { duration: 0.2 } },
};

export function DataTable<TData, TValue>({
  table,
  onAddContact,
}: any) {
  const isFiltering = table.getState().columnFilters.length > 0;
  const totalTableWidth = table.getTotalSize();

  return (
    /* MAIN CONTAINER: Handles both X and Y scrolling with ONE scrollbar */
    <div className="relative w-full h-full overflow-auto border rounded-md border-slate-200 bg-white shadow-sm">
      <table 
        className="table-fixed border-collapse" 
        style={{ width: totalTableWidth, minWidth: '100%' }}
      >
        {/* THEAD: Sticky so it stays at the top during Y-scroll - New modern gradient header */}
        <thead className="sticky top-0 z-40">
          {table.getHeaderGroups().map((headerGroup: any) => (
            <tr 
              key={headerGroup.id} 
              className="bg-gradient-to-r from-purple-600 to-violet-600"
            >
              {headerGroup.headers.map((header: any) => {
                const isStickyColumn = header.column.id === 'select' || header.column.id === 'name';
                
                // Calculate left position for sticky columns
                let leftPosition = 0;
                if (header.column.id === 'name') {
                  leftPosition = 40; // width of select column
                }
                
                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ 
                      width: header.getSize(),
                      position: isStickyColumn ? 'sticky' : 'relative',
                      left: isStickyColumn ? leftPosition : undefined,
                    }}
                    className={cn(
                      "px-3 py-3 text-left text-[10px] font-bold text-white uppercase tracking-wider",
                      "border-r border-slate-600/30 last:border-r-0",
                      // Sticky columns need solid background to hide content scrolling behind
                      isStickyColumn && "z-50",
                      header.column.id === 'select' && "bg-gradient-to-r from-purple-600 to-violet-600",
                      header.column.id === 'name' && "bg-gradient-to-r from-purple-600 to-violet-600 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.3)]"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                    
                    {/* Resize Handle */}
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={cn(
                        "absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none touch-none opacity-0 hover:opacity-100 transition-opacity",
                        "before:absolute before:inset-y-0 before:right-0 before:w-0.5 before:bg-white/30",
                        header.column.getIsResizing() && "opacity-100 before:bg-indigo-400 before:w-1"
                      )}
                    />
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody className="bg-white">
          {table.getRowModel().rows?.length ? (
            <AnimatePresence mode="popLayout">
              {table.getRowModel().rows.map((row: any, index: number) => (
                <motion.tr
                  key={row.id}
                  custom={index}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className={cn(
                    "group border-b border-slate-100 transition-colors duration-150",
                    row.getIsSelected() ? "bg-indigo-50/60" : "hover:bg-slate-50/80",
                  )}
                >
                  {row.getVisibleCells().map((cell: any) => {
                    const isStickyColumn = cell.column.id === 'select' || cell.column.id === 'name';
                    
                    // Calculate left position for sticky columns
                    let leftPosition = 0;
                    if (cell.column.id === 'name') {
                      leftPosition = 40; // width of select column
                    }
                    
                    return (
                      <td
                        key={cell.id}
                        style={{ 
                          width: cell.column.getSize(),
                          position: isStickyColumn ? 'sticky' : 'relative',
                          left: isStickyColumn ? leftPosition : undefined,
                        }}
                        className={cn(
                          "px-3 py-1.5 text-xs text-slate-700 align-middle border-r border-slate-100/50 last:border-r-0",
                          // Sticky columns need solid opaque background - not transparent!
                          isStickyColumn && "z-20",
                          // Default state background
                          cell.column.id === 'select' && "bg-white group-hover:bg-slate-50/80",
                          cell.column.id === 'name' && "bg-white group-hover:bg-slate-50/80 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.05)]",
                          // Selected state override
                          cell.column.id === 'select' && row.getIsSelected() && "bg-indigo-50/60",
                          cell.column.id === 'name' && row.getIsSelected() && "bg-indigo-50/60",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </AnimatePresence>
          ) : (
            <tr>
              <td colSpan={table.getAllColumns().length} className="h-64 p-0">
                <EmptyState
                  type={isFiltering ? 'no-results' : 'no-contacts'}
                  onReset={() => table.resetColumnFilters()}
                  onAddContact={onAddContact}
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
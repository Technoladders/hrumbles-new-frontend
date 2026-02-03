// src/components/ui/data-table.tsx
import * as React from 'react';
import { flexRender } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/sales/contacts-table/EmptyState';
import { cn } from '@/lib/utils';

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.02, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
  }),
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } },
};

export function DataTable<TData, TValue>({
  table,
  onAddContact,
}: any) {
  const isFiltering = table.getState().columnFilters.length > 0;
  const totalTableWidth = table.getTotalSize();
  const isDiscoveryMode = table.getRowModel().rows.some((row: any) => row.original?.is_discovery);

  return (
    <div className="relative w-full h-full overflow-auto border rounded-xl border-slate-200 bg-white shadow-sm">
      <table 
        className="table-fixed border-collapse" 
        style={{ width: totalTableWidth, minWidth: '100%' }}
      >
        {/* THEAD - Modern gradient header */}
        <thead className="sticky top-0 z-40">
          {table.getHeaderGroups().map((headerGroup: any) => (
            <tr 
              key={headerGroup.id} 
              className={cn(
                "transition-all",
                isDiscoveryMode 
                  ? "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600"
                  : "bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800"
              )}
            >
              {headerGroup.headers.map((header: any) => {
                const isStickyColumn = header.column.id === 'select' || header.column.id === 'name';
                
                let leftPosition = 0;
                if (header.column.id === 'name') {
                  leftPosition = 40;
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
                      "px-3 py-3.5 text-left text-[10px] font-semibold text-white/90 uppercase tracking-wider",
                      "border-r border-white/10 last:border-r-0",
                      isStickyColumn && "z-50",
                      header.column.id === 'select' && (isDiscoveryMode 
                        ? "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600"
                        : "bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800"
                      ),
                      header.column.id === 'name' && (isDiscoveryMode 
                        ? "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.2)]"
                        : "bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.2)]"
                      )
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
                        "before:absolute before:inset-y-0 before:right-0 before:w-0.5 before:bg-white/20",
                        header.column.getIsResizing() && "opacity-100 before:bg-white/50 before:w-1"
                      )}
                    />
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody className="bg-white divide-y divide-slate-100">
          {table.getRowModel().rows?.length ? (
            <AnimatePresence mode="popLayout">
              {table.getRowModel().rows.map((row: any, index: number) => {
                const isDiscoveryRow = row.original?.is_discovery;
                
                return (
                  <motion.tr
                    key={row.id}
                    custom={index}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className={cn(
                      "group transition-all duration-150",
                      row.getIsSelected() 
                        ? "bg-indigo-50/70 hover:bg-indigo-50" 
                        : isDiscoveryRow
                          ? "bg-gradient-to-r from-violet-50/30 via-white to-purple-50/30 hover:from-violet-50/60 hover:to-purple-50/60"
                          : "hover:bg-slate-50/80",
                    )}
                  >
                    {row.getVisibleCells().map((cell: any) => {
                      const isStickyColumn = cell.column.id === 'select' || cell.column.id === 'name';
                      
                      let leftPosition = 0;
                      if (cell.column.id === 'name') {
                        leftPosition = 40;
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
                            "px-3 py-2 text-xs text-slate-700 align-middle border-r border-slate-100/50 last:border-r-0",
                            isStickyColumn && "z-20",
                            // Select column backgrounds
                            cell.column.id === 'select' && !row.getIsSelected() && !isDiscoveryRow && "bg-white group-hover:bg-slate-50/80",
                            cell.column.id === 'select' && !row.getIsSelected() && isDiscoveryRow && "bg-gradient-to-r from-violet-50/30 via-white to-white group-hover:from-violet-50/60",
                            cell.column.id === 'select' && row.getIsSelected() && "bg-indigo-50/70",
                            // Name column backgrounds
                            cell.column.id === 'name' && !row.getIsSelected() && !isDiscoveryRow && "bg-white group-hover:bg-slate-50/80 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.03)]",
                            cell.column.id === 'name' && !row.getIsSelected() && isDiscoveryRow && "bg-gradient-to-r from-white to-white group-hover:from-violet-50/40 shadow-[2px_0_8px_-2px_rgba(139,92,246,0.1)]",
                            cell.column.id === 'name' && row.getIsSelected() && "bg-indigo-50/70 shadow-[2px_0_8px_-2px_rgba(99,102,241,0.1)]",
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </motion.tr>
                );
              })}
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
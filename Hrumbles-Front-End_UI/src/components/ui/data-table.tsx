// src/components/ui/data-table.tsx
import * as React from 'react';
import { flexRender } from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const rowVariants = {
  hidden:  { opacity: 0, y: 4 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.015, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  }),
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// Sticky columns: select (left: 0) and name (left: 40)
const STICKY_COLS = new Set(['select', 'name']);

export function DataTable<TData, TValue>({ table }: any) {
  const totalWidth = table.getTotalSize();
  const isFiltering = table.getState().columnFilters.length > 0;

  return (
    <div className="relative w-full h-full overflow-auto">
      <table className="border-collapse" style={{ width: totalWidth, minWidth: '100%' }}>

        {/* ── THEAD ── */}
        <thead className="sticky top-0 z-30">
          {table.getHeaderGroups().map((hg: any) => (
            <tr key={hg.id} className="border-b border-slate-200">
              {hg.headers.map((header: any) => {
                const isSticky = STICKY_COLS.has(header.column.id);
                const leftPos  = header.column.id === 'name' ? 40 : 0;
                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      width:    header.getSize(),
                      position: isSticky ? 'sticky' : 'relative',
                      left:     isSticky ? leftPos  : undefined,
                    }}
                    className={cn(
                      'px-3 py-2.5 text-left border-r border-slate-100 last:border-r-0',
                      'text-[10px] font-semibold text-slate-500 uppercase tracking-wider',
                      // Solid bg — no opacity, so scrolled content never bleeds through
                      'bg-slate-50',
                      isSticky && 'z-20',
                      header.column.id === 'name' && 'shadow-[1px_0_0_0_#e2e8f0]',
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                    {/* Resize handle */}
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={cn(
                        'absolute top-0 right-0 h-full w-1 cursor-col-resize select-none touch-none',
                        'hover:bg-indigo-300 transition-colors',
                        header.column.getIsResizing() && 'bg-indigo-400',
                      )}
                    />
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        {/* ── TBODY ── */}
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows?.length ? (
            <AnimatePresence mode="popLayout">
              {table.getRowModel().rows.map((row: any, i: number) => {
                const isSelected = row.getIsSelected();
                return (
                  <motion.tr
                    key={row.id}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className={cn(
                      'group transition-colors duration-100',
                      isSelected ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50',
                    )}
                  >
                    {row.getVisibleCells().map((cell: any) => {
                      const isSticky = STICKY_COLS.has(cell.column.id);
                      const leftPos  = cell.column.id === 'name' ? 40 : 0;

                      // Sticky cells need explicit solid bg matching the row state
                      // to prevent scrolled content from bleeding through
                      const stickyBg = isSticky
                        ? isSelected
                          ? 'bg-indigo-50'
                          : 'bg-white group-hover:bg-slate-50'
                        : undefined;

                      return (
                        <td
                          key={cell.id}
                          style={{
                            width:    cell.column.getSize(),
                            position: isSticky ? 'sticky' : 'relative',
                            left:     isSticky ? leftPos  : undefined,
                          }}
                          className={cn(
                            'px-3 py-0 text-xs text-slate-700 align-middle',
                            'border-r border-slate-100/80 last:border-r-0',
                            'h-[42px] max-h-[42px]',
                            isSticky && 'z-10',
                            stickyBg,
                            cell.column.id === 'name' && 'shadow-[1px_0_0_0_#f1f5f9]',
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
              <td colSpan={table.getAllColumns().length} className="h-32">
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                  {isFiltering ? (
                    <>
                      <span className="font-medium text-slate-600 mb-1">No results found</span>
                      <span className="text-xs text-slate-400">Try adjusting your filters</span>
                    </>
                  ) : (
                    <span>No contacts</span>
                  )}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
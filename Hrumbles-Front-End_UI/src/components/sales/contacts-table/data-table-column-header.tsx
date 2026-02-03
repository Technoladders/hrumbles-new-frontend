// src/components/sales/contacts-table/data-table-column-header.tsx

import React from 'react';
import { type Column } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  return (
    <div className={cn('flex items-center', className)}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
        {title}
      </span>
    </div>
  );
}
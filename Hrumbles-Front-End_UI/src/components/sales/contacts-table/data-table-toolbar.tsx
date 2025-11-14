// src/components/sales/contacts-table/data-table-toolbar.tsx
import React from 'react';
import { X, Plus, Columns, GripVertical, Upload } from 'lucide-react';
import { type Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DataTableFacetedFilter } from './data-table-faceted-filter';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  onOpenAddContactDialog: () => void; // Prop is renamed for clarity
  onOpenImportDialog: () => void;
  onToggleGrouping: () => void;
   createdByOptions: {
    label: string;
    value: string;
  }[];
}

export function DataTableToolbar<TData>({ table, onOpenAddContactDialog, onToggleGrouping, createdByOptions, onOpenImportDialog }: DataTableToolbarProps<TData>) {

  const isFiltered = table.getState().columnFilters.length > 0;
  const isGrouped = table.getState().grouping.length > 0;

  return (
<div className="flex flex-wrap items-center justify-start gap-3 md:gap-4 w-full mb-6">
  {/* Search Input */}
  <div className="relative flex-grow order-1 min-w-[200px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px]">
    <Input
      placeholder="Filter contacts..."
      value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
      onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
      className="pl-10 h-10 w-full rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner text-sm md:text-base placeholder:text-xs md:placeholder:text-sm"
    />
  </div>

  {/* Created By Filter */}
  {table.getColumn('created_by_employee') && (
    <div className="flex-shrink-0 order-2">
      <DataTableFacetedFilter
        column={table.getColumn('created_by_employee')}
        title="Created By"
        options={createdByOptions}
        className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm"
      />
    </div>
  )}

  {/* Reset Button */}
  {isFiltered && (
    <Button 
      variant="ghost" 
      onClick={() => table.resetColumnFilters()} 
      className="flex-shrink-0 order-3 rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm px-2 lg:px-3"
    >
      Reset
      <X className="ml-2 h-4 w-4" />
    </Button>
  )}

  {/* Group Button */}
  <Button 
    variant="outline" 
    size="sm" 
    className="flex-shrink-0 order-4 rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm"
    onClick={onToggleGrouping}
  >
    {isGrouped ? "Ungroup" : "Group by Stage"}
  </Button>

  {/* View Columns Dropdown */}
  <div className="flex-shrink-0 order-5">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm lg:flex">
          <Columns className="mr-2 h-4 w-4" />View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table.getAllColumns().filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide()).map((column) => (
          <DropdownMenuCheckboxItem key={column.id} className="capitalize" checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(!!value)}>
            {column.id.replace(/_/g, ' ')}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>

  {/* Import Button */}
  <Button 
    variant="outline" 
    size="sm" 
    className="flex-shrink-0 order-6 rounded-full h-10 text-gray-600 bg-gray-100 dark:bg-gray-800 shadow-inner text-sm"
    onClick={onOpenImportDialog}
  >
    <Upload className="mr-2 h-4 w-4" /> Import
  </Button>

  {/* Add People Button */}
  <Button 
    size="sm" 
    className="flex-shrink-0 order-7 rounded-full h-10 bg-violet-600 hover:bg-violet-700 text-white text-sm"
    onClick={onOpenAddContactDialog}
  >
    <Plus className="mr-2 h-4 w-4" /> Add People
  </Button>
</div>
  );
}
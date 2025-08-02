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
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter contacts..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
          className="h-9 w-[150px] lg:w-[250px]"
        />
        {table.getColumn('created_by_employee') && (
          <DataTableFacetedFilter
            column={table.getColumn('created_by_employee')}
            title="Created By"
            options={createdByOptions}
          />
        )}
        {isFiltered && <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-9 px-2 lg:px-3">Reset<X className="ml-2 h-4 w-4" /></Button>}
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" className="h-9" onClick={onToggleGrouping}>{isGrouped ? "Ungroup" : "Group by Stage"}</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-9 lg:flex"><Columns className="mr-2 h-4 w-4" />View</Button>
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
         <Button variant="outline" size="sm" className="h-9" onClick={onOpenImportDialog}>
            <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
        <Button size="sm" className="h-9 bg-purple-600 hover:bg-purple-700 text-white" onClick={onOpenAddContactDialog}>
          <Plus className="mr-2 h-4 w-4" /> Add People
        </Button>
      </div>
    </div>
  );
}